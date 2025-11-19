const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');
const { userValidation, validate } = require('../middlewares/validation');

// All user routes require authentication
router.use(isAuthenticated);

// User profile (all authenticated users)
router.get('/profile', userController.profile);
router.post('/profile', userController.updateProfile);
router.post('/profile/password', userController.changePassword);

// User management (admin only)
router.get('/', hasRole('admin'), userController.index);
router.get('/create', hasRole('admin'), userController.showCreate);
router.post('/create', hasRole('admin'), userValidation.create, validate, userController.create);
router.get('/:id/edit', hasRole('admin'), userController.showEdit);
router.post('/:id/edit', hasRole('admin'), userController.update);
router.post('/:id/delete', hasRole('admin'), userController.delete);

module.exports = router;
