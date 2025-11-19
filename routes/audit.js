const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

// All audit routes require admin access
router.use(isAuthenticated);
router.use(hasRole('admin'));

// List audit logs
router.get('/', auditController.index);

// Export audit logs to CSV
router.get('/export', auditController.exportCSV);

module.exports = router;
