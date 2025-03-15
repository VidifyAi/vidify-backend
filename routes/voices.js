const express = require('express');
const Voice = require('../models/voices');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Voice:
 *       type: object
 *       required:
 *         - key
 *         - language
 *         - country
 *         - gender
 *         - locale
 *         - voiceName
 *       properties:
 *         key:
 *           type: string
 *           description: Unique identifier for the voice
 *         language:
 *           type: string
 *           description: Language of the voice
 *         country:
 *           type: string
 *           description: Country of origin for the voice
 *         gender:
 *           type: string
 *           enum: [Male, Female]
 *           description: Gender of the voice
 *         locale:
 *           type: string
 *           description: Locale code (e.g., en-US)
 *         voiceName:
 *           type: string
 *           description: Display name of the voice
 */

/**
 * @swagger
 * tags:
 *   name: Voices
 *   description: Voice management endpoints
 */

/**
 * @swagger
 * /api/voices:
 *   get:
 *     summary: Get list of available voices
 *     description: Retrieves all available voices for text-to-speech
 *     tags: [Voices]
 *     responses:
 *       200:
 *         description: A list of voices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Number of voices returned
 *                 voices:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Voice'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 details:
 *                   type: string
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