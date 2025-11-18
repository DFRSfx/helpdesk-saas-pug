/**
 * Audit Routes
 * Handles audit log viewing and filtering (admin only)
 */

const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/auditController');
const { isAuthenticated, isAdmin } = require('../middlewares/authMiddleware');

// All audit routes require authentication and admin role
router.use(isAuthenticated, isAdmin);

// List audit logs with filters
router.get('/', AuditController.index);

// View single audit log
router.get('/:id', AuditController.show);

// Export audit logs
router.get('/export', AuditController.export);

module.exports = router;
