/**
 * SLA Routes
 * Routes for SLA management and dashboard
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const slaController = require('../controllers/slaController');

// All SLA routes require authentication
router.use(isAuthenticated);

/**
 * PAGE ROUTES
 */

/**
 * GET /sla
 * SLA management page (admin only)
 */
router.get('/', slaController.index);

/**
 * GET /sla/dashboard
 * SLA performance dashboard
 */
router.get('/dashboard', slaController.dashboard);

/**
 * API ROUTES
 */

/**
 * GET /api/sla/ticket/:ticketId
 * Get SLA metrics for a ticket
 */
router.get('/api/ticket/:ticketId', slaController.apiGetTicketSLA);

/**
 * GET /api/sla/at-risk
 * Get tickets at risk of SLA breach
 */
router.get('/api/at-risk', slaController.apiGetAtRiskTickets);

/**
 * GET /api/sla/compliance-report
 * Get SLA compliance report
 */
router.get('/api/compliance-report', slaController.apiGetComplianceReport);

/**
 * GET /api/sla/dashboard-stats
 * Get dashboard statistics
 */
router.get('/api/dashboard-stats', slaController.apiGetDashboardStats);

/**
 * POST /api/sla/policies
 * Create new SLA policy (admin only)
 */
router.post('/api/policies', slaController.apiCreatePolicy);

/**
 * PATCH /api/sla/policies/:id
 * Update SLA policy (admin only)
 */
router.patch('/api/policies/:id', slaController.apiUpdatePolicy);

/**
 * POST /api/sla/check-breaches
 * Check and update SLA breaches (admin only)
 */
router.post('/api/check-breaches', slaController.apiCheckBreaches);

module.exports = router;
