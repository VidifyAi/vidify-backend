const express = require('express');
const router = express.Router();
const { requireAuth } = require('@clerk/express');
const User = require('../models/user');
const Subscription = require('../models/subscription');
const Task = require('../models/task');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administration endpoints (admin access required)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of items
 *         page:
 *           type: integer
 *           description: Current page number
 *         pages:
 *           type: integer
 *           description: Total number of pages
 */

// Admin middleware to check admin role
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user || user.metadata?.role !== 'admin') {
      return res.status(403).json({
        message: "Forbidden",
        details: "Admin privileges required"
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      message: "Authentication error",
      details: error.message
    });
  }
};

// Apply auth and admin middleware to all routes
router.use(requireAuth());
router.use(requireAdmin);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieves a paginated list of all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       403:
 *         description: Forbidden - admin privileges required
 *       500:
 *         description: Server error
 */

// Get all users with pagination
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await User.countDocuments();
    
    res.status(200).json({
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve users",
      details: error.message
    });
  }
});

// Add other admin endpoints (get user details, update subscriptions, etc.)

module.exports = router;