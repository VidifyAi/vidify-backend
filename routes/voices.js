const express = require('express');
const Voice = require('../models/voices');

const router = express.Router();

/**
 * Get list of available voices
 * 
 * @route GET /api/voices
 * @returns {object} List of available voices with details
 */
router.get("/", async (req, res) => {
  try {
    const voices = await Voice.find().lean();

    if (!voices || voices.length === 0) {
      return res.status(200).json({
        message: "No voices found",
        voices: []
      });
    }

    res.status(200).json({
      count: voices.length,
      voices: voices
    });
  } catch (error) {
    console.error("Error fetching voices:", error);
    res.status(500).json({
      message: "Failed to retrieve voices",
      details: error.message
    });
  }
});

module.exports = router;