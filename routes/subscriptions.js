const express = require('express');
const Subscription = require('../models/subscription');
const PLANS = require('../config/plans');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Plan:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the subscription plan
 *         monthlyLimit:
 *           type: integer
 *           description: Number of videos that can be generated per month
 *         videoLengthLimit:
 *           type: integer
 *           description: Maximum video length in seconds
 *         videoQuality:
 *           type: string
 *           description: Quality level of generated videos
 *         customizationOptions:
 *           type: array
 *           items:
 *             type: string
 *           description: Available customization options
 *         watermark:
 *           type: boolean
 *           description: Whether videos include a watermark
 *     Subscription:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           description: User ID associated with the subscription
 *         plan:
 *           type: string
 *           enum: [free, basic, premium]
 *           description: Type of subscription plan
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Start date of subscription
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: End date of subscription (for paid plans)
 *         active:
 *           type: boolean
 *           description: Whether the subscription is active
 *         usage:
 *           type: object
 *           properties:
 *             videosGenerated:
 *               type: integer
 *               description: Number of videos generated in current period
 *             lastResetDate:
 *               type: string
 *               format: date-time
 *               description: Date when usage counters were last reset
 */

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription management endpoints
 */

// Apply authentication middleware
router.use(ClerkExpressRequireAuth());

/**
 * @swagger
 * /api/subscriptions:
 *   get:
 *     summary: Get current user subscription
 *     description: Retrieves the authenticated user's subscription details
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscription:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       type: string
 *                     planName:
 *                       type: string
 *                     active:
 *                       type: boolean
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     usage:
 *                       type: object
 *                       properties:
 *                         videosGenerated:
 *                           type: integer
 *                         videosRemaining:
 *                           type: integer
 *                         monthlyLimit:
 *                           type: integer
 *                     features:
 *                       type: object
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    let subscription = await Subscription.findOne({ userId });
    
    if (!subscription) {
      subscription = new Subscription({
        userId,
        plan: 'free',
        startDate: new Date(),
        active: true
      });
      await subscription.save();
    }
    
    const planDetails = PLANS[subscription.plan];
    
    res.status(200).json({
      subscription: {
        plan: subscription.plan,
        planName: planDetails.name,
        active: subscription.active,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        usage: {
          videosGenerated: subscription.usage.videosGenerated,
          videosRemaining: planDetails.monthlyLimit - subscription.usage.videosGenerated,
          monthlyLimit: planDetails.monthlyLimit
        },
        features: {
          videoLengthLimit: planDetails.videoLengthLimit,
          videoQuality: planDetails.videoQuality,
          customizationOptions: planDetails.customizationOptions,
          watermark: planDetails.watermark
        }
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      message: 'Failed to retrieve subscription',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     summary: Get all available subscription plans
 *     description: Retrieves details of all available subscription plans
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of available plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Plan'
 *       500:
 *         description: Server error
 */
router.get('/plans', async (req, res) => {
  console.warn("Yaha aya");
  try {
    const plansList = Object.entries(PLANS).map(([id, plan]) => ({
      id,
      name: plan.name,
      monthlyLimit: plan.monthlyLimit,
      videoLengthLimit: plan.videoLengthLimit,
      videoQuality: plan.videoQuality,
      customizationOptions: plan.customizationOptions,
      watermark: plan.watermark
    }));
    
    res.status(200).json({
      plans: plansList
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      message: 'Failed to retrieve plans',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/subscriptions/upgrade:
 *   post:
 *     summary: Upgrade subscription plan
 *     description: Upgrades the current user to a specified subscription plan
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [free, basic, premium]
 *                 description: Plan to upgrade to
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
 *       400:
 *         description: Invalid plan specified
 *       500:
 *         description: Server error
 */
router.post('/upgrade', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { plan } = req.body;
    
    if (!PLANS[plan]) {
      return res.status(400).json({
        message: 'Invalid plan',
        details: 'The specified plan does not exist'
      });
    }
    
    // In a real application, you would handle payment processing here
    // This is just a simplified version
    
    const subscription = await Subscription.findOneAndUpdate(
      { userId },
      { 
        plan,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
        active: true
      },
      { new: true, upsert: true }
    );
    
    res.status(200).json({
      message: 'Subscription upgraded successfully',
      subscription: {
        plan: subscription.plan,
        active: subscription.active,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({
      message: 'Failed to upgrade subscription',
      details: error.message
    });
  }
});

module.exports = router;