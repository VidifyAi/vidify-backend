require("dotenv").config();
var express = require("express");
const axios = require("axios");
const Task = require("../models/task");
const { v4: uuidv4 } = require("uuid");
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

var router = express.Router();
const SUBSCRIPTION_KEY = process.env.AVATAR_SUBSCRIPTION_KEY;
const URL = "https://ai-vidifyai-8342.cognitiveservices.azure.com/";
const API_VERSION = "2024-08-01";
const STATUS = {
  NotStarted: "pending",
  Running: "processing",
  Succeeded: "completed",
  Failed: "failed"
};

// Define status phases for better client-side progress tracking
const PROGRESS_PHASES = {
  NotStarted: 0,
  Running: 30,
  ProcessingAudio: 60,
  RenderingVideo: 80,
  Succeeded: 100,
  Failed: 0
};

/**
 * Health check endpoint - public, no auth required
 */
router.get("/", function (req, res) {
  res.json({ status: "operational", service: "avatar-api" });
});

// Apply authentication middleware to all routes below this line
router.use(ClerkExpressRequireAuth());

/**
 * Create an avatar video
 * 
 * @route POST /api/avatar/generate
 * @param {string} req.body.script - The script text for the avatar to speak
 * @param {string} req.body.avatarId - The avatar character identifier
 * @param {string} req.body.voiceId - The voice identifier
 * @param {string} req.body.background - The background setting for the video
 * @param {string} req.body.aspectRatio - The aspect ratio for the video
 * @returns {object} Job ID and status information
 */
router.post("/generate", async (req, res) => {
  try {
    // Get the user ID from auth context
    const userId = req.auth.userId;
    
    // Extract required fields from request body
    const { 
      script, 
      avatarId, 
      voiceId, 
      background = 'office', 
      aspectRatio = '169',
      name = 'Video Generation' 
    } = req.body;

    // Validate required fields
    if (!script || !avatarId || !voiceId) {
      return res.status(400).json({
        message: "Missing required fields",
        details: "Script, avatarId, and voiceId are required"
      });
    }

    // Map avatar IDs to Azure AI service format
    const avatarMapping = {
      'avatar1': 'lisa',
      'avatar2': 'marcus',
      'avatar3': 'sarah',
      'avatar4': 'dave',
      'avatar5': 'eliza',
      'avatar6': 'john'
    };
    
    // Map voice IDs to Azure AI service format
    const voiceMapping = {
      'voice1': 'en-US-JennyNeural',
      'voice2': 'en-US-GuyNeural',
      'voice3': 'en-GB-SoniaNeural',
      'voice4': 'en-GB-RyanNeural',
      'voice5': 'es-ES-ElviraNeural',
      'voice6': 'fr-FR-HenriNeural'
    };

    // Map aspect ratio to appropriate setting
    const aspectRatioMapping = {
      '169': 'landscape',
      '11': 'square',
      '916': 'portrait'
    };

    // Generate a unique ID for this request
    const jobId = uuidv4();

    // Prepare the request payload for Azure AI avatar service
    const data = {
      inputKind: "SSML",
      inputs: [
        {
          content: `<speak version='1.0' xml:lang='en-US'><voice name='${voiceMapping[voiceId]}'>${script}</voice></speak>`,
        },
      ],
      avatarConfig: {
        talkingAvatarCharacter: avatarMapping[avatarId] || 'lisa',
        talkingAvatarStyle: background || 'office',
        videoFormat: aspectRatioMapping[aspectRatio] || 'landscape'
      },
      properties: {
        customName: name
      }
    };

    // Call Azure AI avatar service
    const response = await axios.put(
      `${URL}avatar/batchsyntheses/${jobId}?api-version=${API_VERSION}`,
      data,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // Save task information to database
    const task = new Task({
      userId: userId, // Store the authenticated user's ID with the task
      taskName: name,
      taskId: response.data.id,
      createDate: response.data.createdDateTime,
      status: STATUS[response.data.status] || 'pending',
      metadata: {
        script,
        avatarId,
        voiceId,
        background,
        aspectRatio
      }
    });

    await task.save();
    
    // Return success response
    res.status(200).json({
      jobId: response.data.id,
      status: STATUS[response.data.status] || 'pending',
      progress: PROGRESS_PHASES[response.data.status] || 0,
      message: "Video generation started successfully"
    });
  } catch (error) {
    console.error("Error creating avatar:", error);
    
    // Provide appropriate error response
    res.status(error.response?.status || 500).json({
      message: "Failed to create avatar video",
      details: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * Get avatar generation status
 * 
 * @route GET /api/avatar/status/:id
 * @param {string} req.params.id - The job ID
 * @returns {object} Status information and video URL if available
 */
router.get("/status/:id", async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.auth.userId;

    if (!jobId) {
      return res.status(400).json({
        message: "Missing job ID",
        details: "A valid job ID is required"
      });
    }

    // Check if the task belongs to the authenticated user
    const task = await Task.findOne({ taskId: jobId });
    if (!task) {
      return res.status(404).json({
        message: "Task not found",
        details: "No task with that ID exists"
      });
    }

    // If task has userId and it doesn't match the current user
    if (task.userId && task.userId !== userId) {
      return res.status(403).json({
        message: "Unauthorized",
        details: "You don't have permission to access this task"
      });
    }

    // Call Azure AI avatar service for status
    const response = await axios.get(
      `${URL}avatar/batchsyntheses/${jobId}?api-version=${API_VERSION}`, 
      {
        headers: {
          "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
        },
      }
    );

    // Find more specific status information
    let detailedStatus = response.data.status;
    let progressValue = PROGRESS_PHASES[detailedStatus] || 0;
    
    // Extract the status information from the response
    if (response.data.status === 'Running') {
      if (response.data.lastActionDateTime) {
        const lastActionTime = new Date(response.data.lastActionDateTime);
        const creationTime = new Date(response.data.createdDateTime);
        const timeDiff = lastActionTime - creationTime;
        
        // If it's been more than 1 minute, assume it's processing audio
        if (timeDiff > 60000) {
          detailedStatus = 'ProcessingAudio';
          progressValue = PROGRESS_PHASES.ProcessingAudio;
        }
      }
    }

    // Update task status in the database
    await Task.findOneAndUpdate(
      { taskId: jobId },
      { 
        status: STATUS[response.data.status] || 'processing',
        lastUpdated: new Date()
      }
    );

    // Prepare the response data
    const responseData = {
      jobId: response.data.id,
      status: STATUS[response.data.status] || 'processing',
      progress: progressValue,
      videoUrl: response.data.outputs?.result?.url || null,
      detailedStatus: detailedStatus
    };

    // If the status is 'Succeeded', add the video URL
    if (response.data.status === 'Succeeded' && response.data.outputs?.result?.url) {
      // Update task with video URL in the database
      await Task.findOneAndUpdate(
        { taskId: jobId },
        { 
          videoUrl: response.data.outputs.result.url,
          completedDate: new Date()
        }
      );
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error checking avatar status:", error);
    
    // Provide appropriate error response
    res.status(error.response?.status || 500).json({
      message: "Failed to retrieve avatar status",
      details: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * Mark a task as complete
 */
router.post("/completeTask", async (req, res) => {
  try {
    const { taskId } = req.body;
    const userId = req.auth.userId;
    
    if (!taskId) {
      return res.status(400).json({
        message: "Missing task ID",
        details: "A valid task ID is required"
      });
    }
    
    // Find the task first to check ownership
    const task = await Task.findOne({ taskId: taskId });
    if (!task) {
      return res.status(404).json({
        message: "Task not found",
        details: "No task with that ID exists"
      });
    }

    // If task has userId and it doesn't match the current user
    if (task.userId && task.userId !== userId) {
      return res.status(403).json({
        message: "Unauthorized",
        details: "You don't have permission to modify this task"
      });
    }
    
    const result = await Task.findOneAndUpdate(
      { taskId: taskId },
      { 
        status: 'completed',
        completedDate: new Date()
      },
      { new: true }
    );
    
    res.status(200).json({
      message: "Task marked as complete",
      taskId: result.taskId
    });
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({
      message: "Failed to complete task",
      details: error.message
    });
  }
});

/**
 * Delete a task
 */
router.post("/deleteTask", async (req, res) => {
  try {
    const { taskId } = req.body;
    const userId = req.auth.userId;
    
    if (!taskId) {
      return res.status(400).json({
        message: "Missing task ID",
        details: "A valid task ID is required"
      });
    }
    
    // Find the task first to check ownership
    const task = await Task.findOne({ taskId: taskId });
    if (!task) {
      return res.status(404).json({
        message: "Task not found",
        details: "No task with that ID exists"
      });
    }

    // If task has userId and it doesn't match the current user
    if (task.userId && task.userId !== userId) {
      return res.status(403).json({
        message: "Unauthorized",
        details: "You don't have permission to delete this task"
      });
    }
    
    const result = await Task.findOneAndDelete({ taskId: taskId });
    
    res.status(200).json({
      message: "Task deleted successfully",
      taskId: taskId
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({
      message: "Failed to delete task",
      details: error.message
    });
  }
});

/**
 * Get all tasks for the current user
 * 
 * @route GET /api/avatar/tasks
 * @returns {object} List of all user's tasks with status information
 */
router.get("/list", async (req, res) => {
  try {
    const userId = req.auth.userId;


    // Find all tasks belonging to the authenticated user
    const tasks = await Task.find({ userId: userId })
      .sort({ createDate: -1 }) // Sort by creation date (newest first)
      .lean(); // Use lean for better performance when you don't need Mongoose document methods

    if (!tasks || tasks.length === 0) {
      return res.status(200).json({
        message: "No tasks found",
        tasks: []
      });
    }

    

    // Return the list of tasks
    res.status(200).json({
      count: tasks.length,
      tasks: tasks.map(task => ({
        id: task.taskId,
        name: task.taskName,
        status: task.status,
        progress: PROGRESS_PHASES[task.status === 'processing' ? 'Running' : task.status] || 0,
        createdAt: task.createDate,
        updatedAt: task.lastUpdated,
        completedAt: task.completedDate || null,
        videoUrl: task.videoUrl || null,
        metadata: task.metadata || {}
      }))
    });
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    
    res.status(500).json({
      message: "Failed to retrieve tasks",
      details: error.message
    });
  }
});

module.exports = router;