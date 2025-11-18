/**
 * User Routes
 * Handles user management (admin only, except profile views)
 */

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { isAuthenticated, isAdmin } = require('../middlewares/authMiddleware');
const { userValidation, passwordChangeValidation, idValidation } = require('../middlewares/validation');

// All user routes require authentication
router.use(isAuthenticated);

// List users (admins only)
router.get('/', isAdmin, UserController.index);

// Create user (admins only)
router.get('/create', isAdmin, UserController.showCreate);
router.post('/create', isAdmin, userValidation, UserController.create);

// View user profile (users can view their own, admins can view all)
router.get('/:id', idValidation, UserController.show);

// Edit user (admins only)
router.get('/:id/edit', isAdmin, idValidation, UserController.showEdit);
router.post('/:id/edit', isAdmin, idValidation, userValidation, UserController.update);

// Change password (users can change their own, admins can change any)
router.get('/:id/change-password', idValidation, UserController.showChangePassword);
router.post('/:id/change-password', idValidation, passwordChangeValidation, UserController.changePassword);

// Delete user (admins only)
router.post('/:id/delete', isAdmin, idValidation, UserController.delete);

module.exports = router;
