const Subscription = require('../models/subscription');
const PLANS = require('../config/plans');

const checkSubscription = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    
    // Find or create user subscription
    let subscription = await Subscription.findOne({ userId });
    
    if (!subscription) {
      // Create a free subscription for new users
      subscription = new Subscription({
        userId,
        plan: 'free',
        startDate: new Date(),
        active: true
      });
      await subscription.save();
    }
    
    // Check if subscription is active
    if (!subscription.active) {
      return res.status(403).json({
        message: 'Subscription inactive',
        details: 'Your subscription is not active'
      });
    }
    
    // Check if usage needs to be reset (monthly)
    const now = new Date();
    const lastReset = new Date(subscription.usage.lastResetDate);
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      subscription.usage.videosGenerated = 0;
      subscription.usage.lastResetDate = now;
      await subscription.save();
    }
    
    // Attach subscription and plan info to the request
    req.subscription = subscription;
    req.plan = PLANS[subscription.plan];
    
    next();
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({
      message: 'Subscription check failed',
      details: error.message
    });
  }
};

const checkVideoGenerationLimit = async (req, res, next) => {
  try {
    const subscription = req.subscription;
    const plan = req.plan;
    
    // Check if user has reached their monthly limit
    if (subscription.usage.videosGenerated >= plan.monthlyLimit) {
      return res.status(403).json({
        message: 'Monthly limit reached',
        details: `You've reached your monthly limit of ${plan.monthlyLimit} videos. Upgrade your plan for more.`,
        currentUsage: subscription.usage.videosGenerated,
        limit: plan.monthlyLimit,
        planType: subscription.plan
      });
    }
    
    // Check video length limit based on script length (rough estimate)
    if (req.body.script) {
      const words = req.body.script.trim().split(/\s+/).length;
      const estimatedSeconds = words / 2.5; // Average speaking rate of 150 words per minute (2.5 words per second)
      
      if (estimatedSeconds > plan.videoLengthLimit) {
        return res.status(403).json({
          message: 'Video length limit exceeded',
          details: `Your plan allows videos up to ${plan.videoLengthLimit} seconds. This script is too long.`,
          estimatedLength: Math.round(estimatedSeconds),
          limit: plan.videoLengthLimit,
          planType: subscription.plan
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Error checking video generation limit:', error);
    res.status(500).json({
      message: 'Limit check failed',
      details: error.message
    });
  }
};

module.exports = {
  checkSubscription,
  checkVideoGenerationLimit
};