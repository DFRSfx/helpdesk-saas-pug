/**
 * Dashboard Routes
 * Handles dashboard views and analytics
 */

const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// All dashboard routes require authentication
router.use(isAuthenticated);

// Main dashboard (redirects based on role)
router.get('/', DashboardController.index);

// Analytics API endpoint
router.get('/analytics', DashboardController.getAnalytics);

module.exports = router;
