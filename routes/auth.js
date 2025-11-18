/**
 * Authentication Routes
 * Handles user authentication (login, register, logout, password reset)
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { isNotAuthenticated } = require('../middlewares/authMiddleware');
const { registerValidation, loginValidation } = require('../middlewares/validation');

// Public routes (not authenticated)
router.get('/login', isNotAuthenticated, AuthController.showLogin);
router.post('/login', isNotAuthenticated, loginValidation, AuthController.login);

router.get('/register', isNotAuthenticated, AuthController.showRegister);
router.post('/register', isNotAuthenticated, registerValidation, AuthController.register);

router.get('/forgot-password', isNotAuthenticated, AuthController.showForgotPassword);
router.post('/forgot-password', isNotAuthenticated, AuthController.forgotPassword);

router.get('/reset-password/:token', isNotAuthenticated, AuthController.showResetPassword);
router.post('/reset-password', isNotAuthenticated, AuthController.resetPassword);

// Logout route (authenticated)
router.get('/logout', AuthController.logout);

module.exports = router;
