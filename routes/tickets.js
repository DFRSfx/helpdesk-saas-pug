/**
 * Ticket Routes
 * Handles all ticket-related routes (view, create, update, messages, assignments)
 */

const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/ticketController');
const { isAuthenticated, isAgentOrAdmin } = require('../middlewares/authMiddleware');
const { uploadTicketAttachments, handleUploadError } = require('../middlewares/uploadMiddleware');
const { ticketValidation, messageValidation, idValidation } = require('../middlewares/validation');

// All ticket routes require authentication
router.use(isAuthenticated);

// List tickets
router.get('/', TicketController.index);

// Create ticket
router.get('/create', TicketController.showCreate);
router.post('/create', 
  uploadTicketAttachments.array('attachments', 5),
  ticketValidation,
  TicketController.create,
  handleUploadError
);

// View single ticket
router.get('/:id', idValidation, TicketController.show);

// Edit ticket (agents and admins only)
router.get('/:id/edit', isAgentOrAdmin, idValidation, TicketController.showEdit);
router.post('/:id/edit', isAgentOrAdmin, idValidation, ticketValidation, TicketController.update);

// Add message/reply to ticket
router.post('/:id/reply', 
  idValidation,
  uploadTicketAttachments.array('attachments', 5),
  messageValidation,
  TicketController.addMessage,
  handleUploadError
);

// Assign ticket to agent (agents and admins only)
router.post('/:id/assign', isAgentOrAdmin, idValidation, TicketController.assign);

// Update ticket status
router.post('/:id/status', isAgentOrAdmin, idValidation, TicketController.updateStatus);

// Delete ticket (admins only - implement isAdmin check in controller)
router.post('/:id/delete', isAgentOrAdmin, idValidation, TicketController.delete);

module.exports = router;
