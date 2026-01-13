const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');
const { ticketValidation, validate } = require('../middlewares/validation');
const upload = require('../middlewares/uploadMiddleware');

// All ticket routes require authentication
router.use(isAuthenticated);

// List tickets
router.get('/', ticketController.index);

// Customer portal (ticket selection and chat)
router.get('/portal', ticketController.portal);

// Create ticket
router.get('/create', ticketController.showCreate);
router.post('/create', ticketValidation.create, validate, ticketController.create);

// View ticket
router.get('/:id', ticketController.show);

// Edit ticket (agents and admins only)
router.get('/:id/edit', hasRole('admin', 'agent'), ticketController.showEdit);
router.post('/:id/edit', hasRole('admin', 'agent'), ticketValidation.update, validate, ticketController.update);

// Add message to ticket
router.post('/:id/message', ticketController.addMessage);

// Add attachment to ticket
router.post('/:id/attachment', upload.single('file'), ticketController.addAttachment);

// Delete ticket (admin only)
router.post('/:id/delete', hasRole('admin'), ticketController.delete);

module.exports = router;
