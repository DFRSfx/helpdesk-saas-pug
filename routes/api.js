const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcrypt');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');
const Audit = require('../models/Audit');
const userController = require('../controllers/userController');
const emailService = require('../services/emailService');
const { generateTemporaryPassword } = require('../utils/passwordGenerator');
const upload = require('../middlewares/uploadMiddleware');
const Ticket = require('../models/Ticket');

// Public: Create ticket from landing page (no authentication required)
router.post('/tickets/public/create', upload.array('attachments', 5), async (req, res) => {
  try {
    const { name, email, subject, message, department_id } = req.body;

    // Validation
    if (!name || !email || !subject || !message || !department_id) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Set default priority - customers cannot select priority
    // Priority will be assigned by support agent based on actual need
    const priority = 'medium';

    // Check if department exists
    const [deptCheck] = await db.query(
      'SELECT id FROM departments WHERE id = ? AND is_active = true',
      [department_id]
    );

    if (deptCheck.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department'
      });
    }

    // Find or create user (check all roles, not just customer)
    let [existingUser] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    let customerId;
    let isNewUser = false;
    let temporaryPassword = null;

    if (existingUser.length > 0) {
      // User exists with any role, use their ID
      customerId = existingUser[0].id;
    } else {
      // Generate temporary password for new user
      temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      // Create new customer user
      const [result] = await db.query(
        'INSERT INTO users (name, email, role, password_hash, is_active) VALUES (?, ?, ?, ?, ?)',
        [name, email, 'customer', hashedPassword, 1]
      );
      customerId = result.insertId;
      isNewUser = true;
    }

    // Create ticket
    // Capitalize priority for database enum (Low, Medium, High, Critical)
    const capitalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);

    const [ticketResult] = await db.query(
      'INSERT INTO tickets (title, description, priority, department_id, customer_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [subject, message, capitalizedPriority, department_id, customerId, 'Open']
    );

    const ticketId = ticketResult.insertId;

    // Create initial message with ticket description
    if (message) {
      await db.query(
        'INSERT INTO ticket_messages (ticket_id, user_id, message, is_internal) VALUES (?, ?, ?, ?)',
        [ticketId, customerId, message, false]
      );
    }

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await Ticket.addAttachment({
          ticket_id: ticketId,
          file_path: file.filename,
          uploaded_by: customerId
        });
      }
    }

    // Log to audit
    await Audit.log({
      ticket_id: ticketId,
      user_id: null,
      action: 'ticket_created_public',
      new_value: `Created from landing page by ${email}`
    });

    // Auto-assign to agent with lowest workload
    const [agents] = await db.query(
      `SELECT u.id FROM users u
       LEFT JOIN tickets t ON u.id = t.agent_id
       WHERE u.role = 'agent' AND u.is_active = 1 AND (u.department_id = ? OR u.department_id IS NULL)
       GROUP BY u.id
       ORDER BY COUNT(t.id) ASC
       LIMIT 1`,
      [department_id]
    );

    if (agents.length > 0) {
      await db.query(
        'UPDATE tickets SET agent_id = ? WHERE id = ?',
        [agents[0].id, ticketId]
      );
    }

    // Send welcome email with temporary password if new user
    if (isNewUser && temporaryPassword) {
      await emailService.sendWelcomeEmail(email, name, temporaryPassword);
    }

    // Auto-login the user by creating a session
    if (req.session) {
      req.session.userId = customerId;
      req.session.userRole = 'customer';
    }

    res.json({
      success: true,
      message: 'Account created and ticket submitted successfully',
      ticketId: ticketId,
      email: email,
      portalUrl: `/tickets/portal?ticketId=${ticketId}`
    });
  } catch (error) {
    console.error('Error creating public ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket'
    });
  }
});

// All other API routes require authentication
router.use(isAuthenticated);

// Update ticket status (drag and drop)
router.patch('/tickets/:id/status', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status } = req.body;
    const userId = req.session.userId;

    // Validate status
    const validStatuses = ['Open', 'In Progress', 'Waiting', 'Escalated', 'Resolved', 'Closed'];
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

// Get ticket details for API
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.session.userId;
    const userRole = res.locals.currentUser.role;

    const [tickets] = await db.query(
      'SELECT * FROM tickets WHERE id = ?',
      [ticketId]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Check permissions - customer can only see their own tickets, agents/admins can see all
    if (userRole === 'customer' && ticket.customer_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (userRole === 'agent' && ticket.agent_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({
      success: true,
      ticket: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get ticket messages for API
router.get('/tickets/:id/messages', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.session.userId;
    const userRole = res.locals.currentUser.role;

    // Get ticket to check permissions
    const [tickets] = await db.query(
      'SELECT * FROM tickets WHERE id = ?',
      [ticketId]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Check permissions
    if (userRole === 'customer' && ticket.customer_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (userRole === 'agent' && ticket.agent_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Get messages - filter internal messages for customers
    let query = `
      SELECT tm.*, u.name as user_name, u.role as user_role
      FROM ticket_messages tm
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE tm.ticket_id = ?
    `;

    if (userRole === 'customer') {
      query += ' AND tm.is_internal = FALSE';
    }

    query += ' ORDER BY tm.created_at ASC';

    const [messages] = await db.query(query, [ticketId]);

    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
