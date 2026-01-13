/**
 * Notification Routes
 * Routes for notification management and preferences
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const notificationController = require('../controllers/notificationController');

// All notification routes require authentication
router.use(isAuthenticated);

/**
 * GET /notifications
 * Display notification center page
 */
router.get('/', notificationController.index);

/**
 * GET /notifications/preferences
 * Display notification preferences page
 */
router.get('/preferences', notificationController.preferences);

/**
 * POST /notifications/preferences
 * Update notification preferences
 */
router.post('/preferences', notificationController.updatePreferences);

/**
 * GET /api/notifications
 * Get notifications (JSON, for AJAX/API)
 */
router.get('/api/notifications', notificationController.apiGetNotifications);

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/api/notifications/unread-count', notificationController.apiGetUnreadCount);

/**
 * PATCH /api/notifications/:id/read
 * Mark specific notification as read
 */
router.patch('/api/notifications/:id/read', notificationController.apiMarkAsRead);

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/api/notifications/read-all', notificationController.apiMarkAllAsRead);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/api/notifications/:id', notificationController.apiDeleteNotification);

module.exports = router;
