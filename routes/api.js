const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');
const Audit = require('../models/Audit');
const userController = require('../controllers/userController');

// All API routes require authentication
router.use(isAuthenticated);

// Update ticket status (drag and drop)
router.patch('/tickets/:id/status', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status } = req.body;
    const userId = req.session.userId;

    // Validate status
    const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Get ticket to check permissions
    const [tickets] = await db.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Check permissions
    const user = res.locals.currentUser;
    if (user.role === 'customer' && ticket.customer_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Get old status for audit log
    const oldStatus = ticket.status;

    // Check if status is actually changing
    if (oldStatus === status) {
      return res.status(200).json({
        success: true,
        message: 'Ticket is already in this status',
        skipped: true
      });
    }

    // Update ticket status
    await db.query(
      'UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, ticketId]
    );

    // Log audit
    await Audit.log({
      ticket_id: ticketId,
      user_id: userId,
      action: 'status_changed',
      old_value: oldStatus,
      new_value: status
    });

    res.json({ 
      success: true, 
      message: 'Ticket status updated successfully',
      ticketId: ticketId,
      newStatus: status
    });

  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get users with filters (for real-time filtering)
router.get('/users', hasRole('admin'), userController.api);

module.exports = router;
