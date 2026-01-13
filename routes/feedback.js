/**
 * Feedback Routes
 * Routes for ticket feedback and surveys
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const feedbackController = require('../controllers/feedbackController');

// All feedback routes require authentication
router.use(isAuthenticated);

/**
 * PAGE ROUTES
 */

/**
 * GET /feedback/survey/:ticketId
 * Display feedback survey for a ticket
 */
router.get('/survey/:ticketId', feedbackController.getSurvey);

/**
 * GET /feedback/report
 * Display feedback report (admin)
 */
router.get('/report', feedbackController.getFeedbackReport);

/**
 * API ROUTES
 */

/**
 * POST /api/feedback/submit
 * Submit ticket feedback
 */
router.post('/api/submit', feedbackController.apiSubmitFeedback);

/**
 * GET /api/feedback/:ticketId
 * Get feedback for a ticket
 */
router.get('/api/:ticketId', feedbackController.apiGetFeedback);

/**
 * GET /api/feedback/stats
 * Get feedback statistics (admin)
 */
router.get('/api/stats', feedbackController.apiGetStats);

/**
 * GET /api/feedback/agent-ratings
 * Get agent ratings (admin)
 */
router.get('/api/agent-ratings', feedbackController.apiGetAgentRatings);

/**
 * GET /api/feedback/pending
 * Get pending feedback requests
 */
router.get('/api/pending', feedbackController.apiGetPending);

/**
 * POST /api/feedback/request-survey
 * Request feedback survey (admin)
 */
router.post('/api/request-survey', feedbackController.apiRequestSurvey);

/**
 * DELETE /api/feedback/:feedbackId
 * Delete feedback (admin)
 */
router.delete('/api/:feedbackId', feedbackController.apiDeleteFeedback);

module.exports = router;
