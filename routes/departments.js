/**
 * Department Routes
 * Handles department management (admin and agents only)
 */

const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/departmentController');
const { isAuthenticated, isAgentOrAdmin, isAdmin } = require('../middlewares/authMiddleware');
const { departmentValidation, idValidation } = require('../middlewares/validation');

// All department routes require authentication
router.use(isAuthenticated);

// List departments (all authenticated users can view)
router.get('/', DepartmentController.index);

// Create department (admins only)
router.get('/create', isAdmin, DepartmentController.showCreate);
router.post('/create', isAdmin, departmentValidation, DepartmentController.create);

// View department details
router.get('/:id', idValidation, DepartmentController.show);

// Edit department (admins only)
router.get('/:id/edit', isAdmin, idValidation, DepartmentController.showEdit);
router.post('/:id/edit', isAdmin, idValidation, DepartmentController.update);

// Delete department (admins only)
router.post('/:id/delete', isAdmin, idValidation, DepartmentController.delete);

module.exports = router;
