const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middlewares/authMiddleware');
const { userValidation, validate } = require('../middlewares/validation');

// Login routes
router.get('/login', redirectIfAuthenticated, authController.showLogin);
router.post('/login', redirectIfAuthenticated, userValidation.login, validate, authController.login);

// Register routes
router.get('/register', redirectIfAuthenticated, authController.showRegister);
router.post('/register', redirectIfAuthenticated, userValidation.register, validate, authController.register);

// Logout
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

module.exports = router;
