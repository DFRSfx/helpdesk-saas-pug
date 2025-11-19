const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// All dashboard routes require authentication
router.use(isAuthenticated);

// Main dashboard (role-based redirect)
router.get('/', dashboardController.index);

module.exports = router;
