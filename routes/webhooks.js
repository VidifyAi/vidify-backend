const express = require('express');
const { Webhook } = require('svix');
const User = require('../models/user');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Webhooks
 *   description: Webhook endpoints for third-party integrations
 */

// This is used to verify webhook signatures from Clerk using the svix library
const verifyClerkWebhook = (req, res, next) => {
  try {
    // Get the webhook signing secret from environment variables
    const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    
    if (!SIGNING_SECRET) {
      console.error("CLERK_WEBHOOK_SECRET is not set");
      return res.status(500).json({
        message: "Server configuration error"
      });
    }

    // Create a new Svix webhook instance with the signing secret
    const wh = new Webhook(SIGNING_SECRET);
    
    // Get the webhook headers
    const svix_id = req.headers['svix-id'];
    const svix_timestamp = req.headers['svix-timestamp'];
    const svix_signature = req.headers['svix-signature'];
    
    // If any of these are missing, the request is invalid
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({
        message: "Missing webhook signature headers"
      });
    }
    
    // Get the raw body as a string
    const payload = JSON.stringify(req.body);
    
    // Verify the payload with headers using svix
    wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature
    });
    
    // If verification passes, continue to the next middleware
    next();
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return res.status(401).json({
      message: "Invalid webhook signature",
      details: error.message
    });
  }
};

/**
 * @swagger
 * /api/webhooks/clerk:
 *   post:
 *     summary: Clerk webhook endpoint
 *     description: Processes webhook events from Clerk authentication service
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: Event type from Clerk
 *               data:
 *                 type: object
 *                 description: Event data
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Missing webhook signature headers
 *       401:
 *         description: Invalid webhook signature
 *       500:
 *         description: Server error
 */
router.post('/clerk', verifyClerkWebhook, async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log(`Received webhook: ${type}`);
    
    // Handle different event types from Clerk
    switch (type) {
      case 'user.created': {
        // Create a new user in our database when a user is created in Clerk
        const newUser = new User({
          clerkId: data.id,
          email: data.email_addresses[0]?.email_address || '',
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          profileImageUrl: data.profile_image_url || '',
          createdAt: new Date(data.created_at),
          isActive: true
        });
        
        await newUser.save();
        console.log(`User created: ${newUser.clerkId}`);
        break;
      }
      
      case 'user.updated': {
        // Update user information when it changes in Clerk
        await User.findOneAndUpdate(
          { clerkId: data.id },
          {
            email: data.email_addresses[0]?.email_address,
            firstName: data.first_name,
            lastName: data.last_name,
            profileImageUrl: data.profile_image_url
          }
        );
        console.log(`User updated: ${data.id}`);
        break;
      }
      
      case 'user.deleted': {
        // Mark user as inactive when deleted in Clerk
        await User.findOneAndUpdate(
          { clerkId: data.id },
          { isActive: false }
        );
        console.log(`User deleted: ${data.id}`);
        break;
      }
      
      case 'session.created': {
        // Update last sign-in time when a session is created
        await User.findOneAndUpdate(
          { clerkId: data.user_id },
          { lastSignIn: new Date() }
        );
        console.log(`Session created for user: ${data.user_id}`);
        break;
      }
      
      default:
        // Log unhandled event types for debugging
        console.log(`Unhandled Clerk webhook event: ${type}`);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    // Still return 200 to prevent Clerk from retrying the webhook
    res.status(200).json({ 
      received: true,
      error: error.message 
    });
  }
});

module.exports = router;
