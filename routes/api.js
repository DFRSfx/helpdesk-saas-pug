const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcrypt');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');
const Audit = require('../models/Audit');
const Chat = require('../models/Chat');
const userController = require('../controllers/userController');
const emailService = require('../services/emailService');
const notificationController = require('../controllers/notificationController');
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

    // Set default priority
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

    // Find or create user
    let [existingUser] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    let customerId;
    let isNewUser = false;
    let temporaryPassword = null;

    if (existingUser.length > 0) {
      customerId = existingUser[0].id;
    } else {
      temporaryPassword = generateTemporaryPassword();
      // Hash password asynchronously in background (don't await)
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const [result] = await db.query(
        'INSERT INTO users (name, email, role, password_hash, is_active) VALUES (?, ?, ?, ?, ?)',
        [name, email, 'customer', hashedPassword, 1]
      );
      customerId = result.insertId;
      isNewUser = true;
    }

    // Create ticket
    const capitalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);

    const [ticketResult] = await db.query(
      'INSERT INTO tickets (title, description, priority, department_id, customer_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [subject, message, capitalizedPriority, department_id, customerId, 'Open']
    );

    const ticketId = ticketResult.insertId;

    // Send response immediately - don't wait for background tasks
    res.json({
      success: true,
      message: 'Ticket submitted successfully',
      ticketId: ticketId,
      email: email,
      portalUrl: `/tickets/portal?ticketId=${ticketId}`
    });

    // Execute background tasks AFTER response is sent
    // This prevents slow database operations from blocking the response
    process.nextTick(async () => {
      try {
        // Create initial chat conversation
        const conversationId = await Chat.createConversation({
          type: 'ticket',
          ticket_id: ticketId,
          created_by: customerId
        });

        // Add customer as participant
        await Chat.addParticipant(conversationId, customerId);

        // Create initial message
        if (message) {
          await Chat.addMessage({
            conversation_id: conversationId,
            sender_id: customerId,
            message
          });
        }

        // Handle file attachments
        if (req.files && req.files.length > 0) {
          for (const file of req.files) {
            await Ticket.addAttachment({
              ticket_id: ticketId,
              file_path: file.filename,
              uploaded_by: customerId,
              original_name: file.originalname,
              file_size: file.size
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
          const assignedAgentId = agents[0].id;
          await db.query(
            'UPDATE tickets SET agent_id = ? WHERE id = ?',
            [assignedAgentId, ticketId]
          );

          // Send notification to assigned agent
          const io = req.app.get('io');
          if (io) {
            const ticketData = {
              id: ticketId,
              title: subject,
              customer_id: customerId
            };
            await notificationController.notifyTicketAssigned(io, ticketData, assignedAgentId);
          }
        }

        // Send welcome email if new user
        if (isNewUser && temporaryPassword) {
          emailService.sendWelcomeEmail(email, name, temporaryPassword)
            .catch(err => console.error('Email send failed:', err));
        }
      } catch (error) {
        console.error('Error in ticket creation background tasks:', error);
      }
    });

  } catch (error) {
    console.error('Error creating public ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket'
    });
  }
});

// Session endpoints (no auth required for check, refresh uses session auth)
router.get('/session/check', (req, res) => {
  // Returns current session status
  if (req.session && req.session.userId) {
    // Refresh the session
    req.session.touch();
    return res.json({
      authenticated: true,
      userId: req.session.userId,
      userRole: req.session.userRole
    });
  }
  res.json({ authenticated: false });
});

router.post('/session/refresh', (req, res) => {
  // Explicitly refresh session (extend expiry)
  if (req.session && req.session.userId) {
    req.session.touch();
    return res.json({
      success: true,
      message: 'Session refreshed',
      authenticated: true,
      userId: req.session.userId,
      userRole: req.session.userRole
    });
  }
  res.status(401).json({ 
    success: false,
    authenticated: false,
    message: 'Not authenticated'
  });
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

    // Send notification to the other party
    const io = req.app.get('io');
    if (io) {
      const recipientId = user.role === 'customer' ? ticket.agent_id : ticket.customer_id;
      if (recipientId) {
        await notificationController.notifyStatusChange(io, ticket, status, recipientId);
      }
    }

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

    // Get attachments with full details including who uploaded them
    const [attachmentsData] = await db.query(
      `SELECT ta.id, ta.file_path, ta.original_name, ta.file_size, ta.uploaded_by, u.name as uploader_name, ta.created_at
       FROM ticket_attachments ta
       LEFT JOIN users u ON ta.uploaded_by = u.id
       WHERE ta.ticket_id = ?
       ORDER BY ta.created_at DESC`,
      [ticketId]
    );

    res.json({
      success: true,
      ticket: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        attachments: attachmentsData || []
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

    // Get or create chat conversation for this ticket
    const conversation = await Chat.getConversationByTicketId(ticketId);

    if (!conversation) {
      // No messages yet
      return res.json({
        success: true,
        messages: []
      });
    }

    // Get messages from chat conversation
    const messages = await Chat.getMessages(conversation.id);

    res.json({
      success: true,
      messages: messages.map(m => {
        // Check if message is an attachment (JSON string)
        let isAttachment = false;
        let attachmentData = null;

        try {
          const parsed = JSON.parse(m.message);
          if (parsed.type === 'attachment') {
            isAttachment = true;
            attachmentData = parsed;
          }
        } catch (e) {
          // Not JSON, treat as regular message
        }

        if (isAttachment && attachmentData) {
          return {
            id: m.id,
            user_id: m.sender_id,
            user_name: m.sender_name,
            user_role: m.sender_role,
            created_at: m.created_at,
            is_attachment: true,
            file_name: attachmentData.file_name,
            file_path: attachmentData.file_path,
            file_size: attachmentData.file_size,
            file_url: attachmentData.file_url
          };
        } else {
          return {
            id: m.id,
            user_id: m.sender_id,
            content: m.message,
            user_name: m.sender_name,
            user_role: m.sender_role,
            is_internal: false,
            is_edited: m.is_edited,
            edited_at: m.edited_at,
            created_at: m.created_at,
            isOwn: m.sender_id === userId,
            is_attachment: false
          };
        }
      })
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Post a message to a ticket
router.post('/tickets/:id/messages', upload.array('attachments', 5), async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.session.userId;
    const userRole = res.locals.currentUser.role;
    const { content } = req.body;

    // Validate that at least message or files are provided
    if ((!content || content.trim() === '') && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ success: false, message: 'Message and/or attachments required' });
    }

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

    // Get or create chat conversation for this ticket
    const conversation = await Chat.getOrCreateTicketConversation(ticketId, ticket.customer_id);

    // Ensure user is a participant
    await Chat.addParticipant(conversation, userId);

    // Add message if content exists
    let messageId = null;
    if (content && content.trim()) {
      messageId = await Chat.addMessage({
        conversation_id: conversation,
        sender_id: userId,
        message: content.trim()
      });
    }

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      // Get user info for attachment message
      const [userInfo] = await db.query('SELECT name FROM users WHERE id = ?', [userId]);
      const userName = userInfo[0]?.name || 'User';

      for (const file of req.files) {
        // Add attachment to ticket with metadata
        await Ticket.addAttachment({
          ticket_id: ticketId,
          file_path: file.filename,
          uploaded_by: userId,
          original_name: file.originalname,
          file_size: file.size
        });

        // Create a special attachment message in chat
        const fileSize = file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Unknown';
        const attachmentMessage = await Chat.addMessage({
          conversation_id: conversation,
          sender_id: userId,
          message: JSON.stringify({
            type: 'attachment',
            file_name: file.originalname,
            file_path: file.filename,
            file_size: fileSize,
            file_url: `/uploads/tickets/${file.filename}`
          })
        });
      }
    }

    // Log to audit
    const auditAction = req.files && req.files.length > 0
      ? `Chat message with ${req.files.length} attachment(s)`
      : 'Chat message';

    await Audit.log({
      ticket_id: ticketId,
      user_id: userId,
      action: 'message_added',
      new_value: auditAction
    });

    // Emit Socket.IO event for real-time message update to ticket room
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket:${ticketId}`).emit('message:new', {
        ticket_id: ticketId,
        message_id: messageId,
        sender_id: userId,
        timestamp: new Date()
      });
      
      // Send notification to the other party in the conversation
      const recipientId = userRole === 'customer' ? ticket.agent_id : ticket.customer_id;
      if (recipientId && content && content.trim()) {
        const messagePreview = content.trim().substring(0, 50);
        await notificationController.notifyNewMessage(io, 
          { id: ticketId, title: ticket.title }, 
          { user_name: res.locals.currentUser.name, message: messagePreview }, 
          recipientId
        );
      }
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      messageId,
      attachmentCount: req.files ? req.files.length : 0
    });
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Edit a message
router.put('/messages/:messageId', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.session.userId;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    // Get the message to check if user is the sender
    const [messages] = await db.query(
      'SELECT cm.*, c.ticket_id FROM chat_messages cm LEFT JOIN chat_conversations c ON cm.conversation_id = c.id WHERE cm.id = ?',
      [messageId]
    );

    if (messages.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const message = messages[0];

    // Only message sender can edit their own messages
    if (message.sender_id !== userId) {
      return res.status(403).json({ success: false, message: 'You can only edit your own messages' });
    }

    // Update the message
    await Chat.editMessage(messageId, content.trim());

    // Log to audit if ticket exists
    if (message.ticket_id) {
      await Audit.log({
        ticket_id: message.ticket_id,
        user_id: userId,
        action: 'message_edited',
        new_value: 'Chat message edited'
      });
    }

    // Emit Socket.IO event for real-time message update to ticket room
    const io = req.app.get('io');
    if (io && message.ticket_id) {
      io.to(`ticket:${message.ticket_id}`).emit('message:updated', {
        ticket_id: message.ticket_id,
        message_id: messageId,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Message updated successfully'
    });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Download/View ticket attachment with permission check
router.get('/tickets/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const attachmentId = req.params.attachmentId;
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

    // Check basic permission to view ticket
    if (userRole === 'customer' && ticket.customer_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (userRole === 'agent' && ticket.agent_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Get attachment to check who uploaded it
    const [attachments] = await db.query(
      'SELECT * FROM ticket_attachments WHERE id = ? AND ticket_id = ?',
      [attachmentId, ticketId]
    );

    if (attachments.length === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const attachment = attachments[0];

    // Check permission to access this specific attachment
    // Allow if: user is admin, user is agent, or user uploaded the attachment
    if (userRole !== 'admin' && userRole !== 'agent' && attachment.uploaded_by !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this attachment' });
    }

    // File download would happen here (currently just returns permission allowed)
    res.json({
      success: true,
      message: 'Permission granted',
      file_url: `/uploads/tickets/${attachment.file_path}`,
      file_name: attachment.file_path,
      original_name: attachment.file_path
    });
  } catch (error) {
    console.error('Error accessing attachment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Notification API endpoints
/**
 * GET /api/notifications
 * Get notifications (JSON, for AJAX/API)
 */
router.get('/notifications', notificationController.apiGetNotifications);

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/notifications/unread-count', notificationController.apiGetUnreadCount);

/**
 * PATCH /api/notifications/:id/read
 * Mark specific notification as read
 */
router.patch('/notifications/:id/read', notificationController.apiMarkAsRead);

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/notifications/read-all', notificationController.apiMarkAllAsRead);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/notifications/:id', notificationController.apiDeleteNotification);

module.exports = router;
