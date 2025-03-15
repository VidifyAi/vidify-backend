/**
 * @swagger
 * tags:
 *   name: Users
 *   description: The User managing API
 * /users:
 *   get:
 *     summary: Lists all the users
 *     tags: [users]
 *     responses:
 *       200:
 *         description: The list of the users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/users'
 *   post:
 *     summary: Create a new users
 *     tags: [users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/users'
 *     responses:
 *       200:
 *         description: The created users.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/users'
 *       500:
 *         description: Some server error
 * /users/{id}:
 *   get:
 *     summary: Get the users by id
 *     tags: [users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The users id
 *     responses:
 *       200:
 *         description: The users response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/users'
 *       404:
 *         description: The users was not found
 *   put:
 *    summary: Update the users by the id
 *    tags: [users]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: The users id
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/users'
 *    responses:
 *      200:
 *        description: The users was updated
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/users'
 *      404:
 *        description: The users was not found
 *      500:
 *        description: Some error happened
 *   delete:
 *     summary: Remove the users by id
 *     tags: [users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The users id
 *
 *     responses:
 *       200:
 *         description: The users was deleted
 *       404:
 *         description: The users was not found
 */

const express = require('express');
const User = require('../models/user');
const { requireAuth } = require('@clerk/express');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         clerkId:
 *           type: string
 *           description: Unique identifier from Clerk
 *         email:
 *           type: string
 *           description: User's email address
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         profileImageUrl:
 *           type: string
 *           description: URL to user's profile image
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         lastSignIn:
 *           type: string
 *           format: date-time
 *           description: Last sign-in timestamp
 *         metadata:
 *           type: object
 *           description: Custom user metadata
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management API
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user's profile
 *     description: Retrieves the profile of the currently authenticated user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - not authenticated
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/me', ClerkExrequireAuthpressRequireAuth(), async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    
    // Find user in our database
    let user = await User.findOne({ clerkId }).lean();
    
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        details: "User profile has not been created yet"
      });
    }
    
    // Return user info
    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
        lastSignIn: user.lastSignIn,
        metadata: user.metadata
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      message: "Failed to retrieve user profile",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/users/update:
 *   post:
 *     summary: Update user profile
 *     description: Updates the current user's profile information
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metadata:
 *                 type: object
 *                 description: Custom user metadata
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Unauthorized - not authenticated
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/update', requireAuth(), async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const { metadata } = req.body;
    
    // Find and update user (only metadata can be updated through this endpoint)
    const user = await User.findOneAndUpdate(
      { clerkId }, 
      { 
        $set: { 
          metadata,
          lastUpdated: new Date()
        } 
      },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        details: "User profile has not been created yet"
      });
    }
    
    res.status(200).json({
      message: "User profile updated successfully",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        metadata: user.metadata
      }
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      message: "Failed to update user profile",
      details: error.message
    });
  }
});

module.exports = router;
