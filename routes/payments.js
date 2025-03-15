const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const Subscription = require('../models/subscription');

router.use(ClerkExpressRequireAuth());

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CheckoutSession:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *           description: Stripe checkout session ID
 *         url:
 *           type: string
 *           description: URL to redirect the user to for payment
 */

/**
 * @swagger
 * /api/payments/create-checkout-session:
 *   post:
 *     summary: Create checkout session
 *     description: Creates a Stripe checkout session for plan subscription
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: string
 *                 description: ID of the plan to subscribe to
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutSession'
 *       400:
 *         description: Invalid plan
 *       500:
 *         description: Failed to create checkout session
 */

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     description: Handles webhook events from Stripe for subscription management
 *     tags: [Webhooks, Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 */

// Create a Stripe checkout session
router.post('/create-checkout-session', async (req, res) => {
  const { planId } = req.body;
  const userId = req.auth.userId;
  
  try {
    // Get plan details
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    // Get or create user in Stripe
    const user = await User.findOne({ clerkId: userId });
    let stripeCustomerId = user.metadata?.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { clerkId: userId }
      });
      stripeCustomerId = customer.id;
      
      // Store Stripe customer ID
      await User.findOneAndUpdate(
        { clerkId: userId },
        { 'metadata.stripeCustomerId': stripeCustomerId }
      );
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} Plan`,
              description: `Up to ${plan.monthlyLimit} videos per month, ${plan.videoLengthLimit} seconds max length`,
            },
            unit_amount: getPlanPrice(planId),
            recurring: { interval: 'month' }
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?payment=canceled`,
      metadata: {
        userId,
        planId
      }
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe webhook handler
// router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
//   const sig = req.headers['stripe-signature'];
//   let event;
  
//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body, 
//       sig, 
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }
  
//   // Handle subscription events
//   switch (event.type) {
//     case 'checkout.session.completed':
//       const session = event.data.object;
//       await handleSuccessfulPayment(session);
//       break;
//     case 'customer.subscription.updated':
//       const subscription = event.data.object;
//       await handleSubscriptionUpdate(subscription);
//       break;
//     case 'customer.subscription.deleted':
//       const canceledSubscription = event.data.object;
//       await handleSubscriptionCancellation(canceledSubscription);
//       break;
//     // Add other relevant event handlers
//   }
  
//   res.status(200).send();
// });

module.exports = router;
