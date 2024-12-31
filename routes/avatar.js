require("dotenv").config();
var express = require("express");
const axios = require("axios");
const Task = require("../models/task");
const { v4: uuidv4 } = require("uuid");

var router = express.Router();
const SUBSCRIPTION_KEY = process.env.AVATAR_SUBSCRIPTION_KEY;
const URL = "https://ai-vidifyai-8342.cognitiveservices.azure.com/";
const API_VERSION = "2024-08-01";
const STATUS = {
  NotStarted: "pending",
  Succeeded: "success"
}

router.get("/", function (req, res, next) {
  res.send("Testing avatar");
});

router.post("/createAvatar", async (req, res, next) => {
  const id = uuidv4();
  const { name, text, voice, avatar, avatarStyle } = req.body;
  const data = {
    inputKind: "SSML",
    inputs: [
      {
        content: `<speak version='1.0' xml:lang='en-US'><voice name=${voice}>${text}</voice></speak>`,
      },
    ],
    avatarConfig: {
      talkingAvatarCharacter: avatar,
      talkingAvatarStyle: avatarStyle,
    },
  };
  const response = await axios
    .put(
      `${URL}avatar/batchsyntheses/${id}?api-version=${API_VERSION}`,
      { ...data },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
          "Content-Type": "application/json",
        },
      }
    )
    .catch((error) => {
      console.error("Axios Error:", error);
      console.error(error.message);
      console.error(error.code);
      console.error(error.response); // If available
      res.send('Sorry! Something went wrong.');
    });

  const responseData = { message: "Success", data: { id: response.data.id } };
  var task = new Task({
    taskName: name,
    taskId: response.data.id,
    createDate: response.data.createdDateTime,
    status: STATUS[response.data.status]
  });

  task.save()
  .then(() => { 
    console.log(`Added new task ${taskName} - createDate ${createDate}`)        
    res.status(200).json(responseData)
  })
  .catch((err) => {
      console.log(err);
      res.send('Sorry! Something went wrong.');
  });
  // Send the processed data as a response
});

router.get("/status/:id", async (req, res, next) => {
  const id = req.params.id;

  const response = await axios
    .get(`${URL}avatar/batchsyntheses/${id}?api-version=${API_VERSION}`, {
      headers: {
        "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
        // "Content-Type": "application/json",
      },
    })
    .catch((error) => {
      console.error("Axios Error:", error);
      console.error(error.message);
      console.error(error.code);
      console.error(error.response); // If available
    });

  const responseData = {
    message: "Success",
    data: {
      id: response.data.id,
      status: response.data.status,
      result: response.data.outputs.result,
    },
  };
  res.status(200).json(responseData);
});

router.post("/completeTask", (req, res, next) => {});

router.post("/deleteTask", (req, res, next) => {});

module.exports = router;
