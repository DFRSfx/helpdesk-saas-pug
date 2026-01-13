/**
 * Bulk Operations Routes
 * Routes for bulk ticket operations
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const bulkController = require('../controllers/bulkController');

// All bulk routes require authentication
router.use(isAuthenticated);

/**
 * GET /api/bulk/actions
 * Get available bulk actions
 */
router.get('/actions', bulkController.apiGetActions);

/**
 * POST /api/bulk/assign-agent
 * Bulk assign tickets to agent
 */
router.post('/assign-agent', bulkController.apiAssignAgent);

/**
 * POST /api/bulk/change-status
 * Bulk change ticket status
 */
router.post('/change-status', bulkController.apiChangeStatus);

/**
 * POST /api/bulk/change-priority
 * Bulk change ticket priority
 */
router.post('/change-priority', bulkController.apiChangePriority);

/**
 * POST /api/bulk/export
 * Export tickets to CSV
 */
router.post('/export', bulkController.apiExport);

/**
 * POST /api/bulk/delete
 * Bulk delete tickets (admin only)
 */
router.post('/delete', bulkController.apiDelete);

module.exports = router;
