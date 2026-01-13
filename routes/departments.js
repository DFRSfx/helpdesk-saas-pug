const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');
const { departmentValidation, validate } = require('../middlewares/validation');

// All department routes require authentication
router.use(isAuthenticated);

// List departments (all users can view)
router.get('/', departmentController.index);

// Department stats (admin and agents)
router.get('/stats', hasRole('admin', 'agent'), departmentController.stats);

// Create department (admin only)
router.get('/create', hasRole('admin'), departmentController.showCreate);
router.post('/create', hasRole('admin'), departmentValidation.create, validate, departmentController.create);

// Department stats for specific department (admin and agents)
router.get('/:id/stats', hasRole('admin', 'agent'), departmentController.departmentStats);

// Edit department (admin only)
router.get('/:id/edit', hasRole('admin'), departmentController.showEdit);
router.post('/:id/edit', hasRole('admin'), departmentValidation.create, validate, departmentController.update);

// Delete department (admin only)
router.post('/:id/delete', hasRole('admin'), departmentController.delete);

module.exports = router;
