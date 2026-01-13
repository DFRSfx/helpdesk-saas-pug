/**
 * Notification Controller
 * Handles notification-related requests
 */

const Notification = require('../models/Notification');
const Ticket = require('../models/Ticket');
const User = require('../models/User');

/**
 * GET /notifications
 * Display notification center
 */
exports.index = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const filter = req.query.filter || 'all'; // all, unread, type

    // Get notifications
    const filters = {
      limit,
      offset
    };

    if (filter === 'unread') {
      filters.isRead = false;
    } else if (filter !== 'all' && ['ticket_assigned', 'new_message', 'mention', 'chat_message', 'escalation'].includes(filter)) {
      filters.type = filter;
    }

    const [notifications, totalCount] = await Promise.all([
      Notification.getByUser(userId, filters),
      Notification.countByUser(userId, filter === 'unread' ? { isRead: false } : (filter !== 'all' ? { type: filter } : {}))
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.render('notifications/index', {
      title: 'Notifications',
      notifications,
      currentPage: page,
      totalPages,
      totalCount,
      filter,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /notifications/preferences
 * Display notification preferences page
 */
exports.preferences = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const preferences = await Notification.getPreferences(userId);

    res.render('notifications/preferences', {
      title: 'Notification Preferences',
      preferences
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /notifications/preferences
 * Update notification preferences
 */
exports.updatePreferences = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const {
      email_ticket_assigned,
      email_new_message,
      email_status_change,
      email_mention,
      email_chat_message,
      email_escalation,
      push_ticket_assigned,
      push_new_message,
      push_status_change,
      push_mention,
      push_chat_message,
      push_escalation
    } = req.body;

    const preferences = {
      email_ticket_assigned: email_ticket_assigned === 'on' ? 1 : 0,
      email_new_message: email_new_message === 'on' ? 1 : 0,
      email_status_change: email_status_change === 'on' ? 1 : 0,
      email_mention: email_mention === 'on' ? 1 : 0,
      email_chat_message: email_chat_message === 'on' ? 1 : 0,
      email_escalation: email_escalation === 'on' ? 1 : 0,
      push_ticket_assigned: push_ticket_assigned === 'on' ? 1 : 0,
      push_new_message: push_new_message === 'on' ? 1 : 0,
      push_status_change: push_status_change === 'on' ? 1 : 0,
      push_mention: push_mention === 'on' ? 1 : 0,
      push_chat_message: push_chat_message === 'on' ? 1 : 0,
      push_escalation: push_escalation === 'on' ? 1 : 0
    };

    await Notification.updatePreferences(userId, preferences);

    req.flash('success', 'Notification preferences updated successfully');
    res.redirect('/notifications/preferences');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
exports.apiGetUnreadCount = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const count = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count'
    });
  }
};

/**
 * GET /api/notifications
 * Get notifications (paginated, JSON response)
 */
exports.apiGetNotifications = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const filter = req.query.filter || 'all';

    const filters = {
      limit,
      offset
    };

    if (filter === 'unread') {
      filters.isRead = false;
    }

    const notifications = await Notification.getByUser(userId, filters);
    const totalCount = await Notification.countByUser(userId, filters.isRead !== undefined ? { isRead: filters.isRead } : {});

    res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
exports.apiMarkAsRead = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.session.userId;

    // Verify notification belongs to user
    const notification = await Notification.findById(notificationId);
    if (!notification || notification.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await Notification.markAsRead(notificationId);

    // Emit socket event
    const io = req.app.get('io');
    io.to(`user:${userId}`).emit('notification:read', {
      id: notificationId
    });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read'
    });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for user
 */
exports.apiMarkAllAsRead = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    await Notification.markAllAsRead(userId);

    // Emit socket event
    const io = req.app.get('io');
    io.to(`user:${userId}`).emit('notifications:all_read', {
      markedAt: new Date()
    });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notifications as read'
    });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
exports.apiDeleteNotification = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.session.userId;

    // Verify notification belongs to user
    const notification = await Notification.findById(notificationId);
    if (!notification || notification.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await Notification.delete(notificationId);

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification'
    });
  }
};

/**
 * Helper: Create notification and emit via Socket.io
 * @param {Object} io - Socket.io instance
 * @param {Object} notificationData - Notification data
 */
exports.createAndEmit = async (io, notificationData) => {
  try {
    const notificationId = await Notification.create(notificationData);
    const notification = await Notification.findById(notificationId);

    // Emit to user
    if (io && io.socketService) {
      io.socketService.emitNotification(notificationData.user_id, notification);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Helper: Create ticket assigned notification
 * @param {Object} io - Socket.io instance
 * @param {Object} ticket - Ticket object
 * @param {number} agentId - Agent ID
 */
exports.notifyTicketAssigned = async (io, ticket, agentId) => {
  const agent = await User.findById(agentId);

  return exports.createAndEmit(io, {
    user_id: agentId,
    type: 'ticket_assigned',
    title: `New Ticket Assigned`,
    message: `Ticket #${ticket.id}: "${ticket.title}" has been assigned to you`,
    related_entity_type: 'ticket',
    related_entity_id: ticket.id,
    action_url: `/tickets/${ticket.id}`
  });
};

/**
 * Helper: Create new message notification
 * @param {Object} io - Socket.io instance
 * @param {Object} ticket - Ticket object
 * @param {Object} message - Message object
 * @param {number} recipientId - Recipient user ID
 */
exports.notifyNewMessage = async (io, ticket, message, recipientId) => {
  return exports.createAndEmit(io, {
    user_id: recipientId,
    type: 'new_message',
    title: `New Message on Ticket #${ticket.id}`,
    message: `${message.user_name} replied: "${message.message.substring(0, 50)}..."`,
    related_entity_type: 'ticket',
    related_entity_id: ticket.id,
    action_url: `/tickets/${ticket.id}`
  });
};

/**
 * Helper: Create status change notification
 * @param {Object} io - Socket.io instance
 * @param {Object} ticket - Ticket object
 * @param {string} newStatus - New status
 * @param {number} recipientId - Recipient user ID
 */
exports.notifyStatusChange = async (io, ticket, newStatus, recipientId) => {
  return exports.createAndEmit(io, {
    user_id: recipientId,
    type: 'ticket_status_change',
    title: `Ticket Status Updated`,
    message: `Ticket #${ticket.id} status changed to: ${newStatus}`,
    related_entity_type: 'ticket',
    related_entity_id: ticket.id,
    action_url: `/tickets/${ticket.id}`
  });
};

/**
 * Helper: Create mention notification
 * @param {Object} io - Socket.io instance
 * @param {Object} ticket - Ticket object
 * @param {string} mentionerName - Name of person who mentioned
 * @param {number} recipientId - Recipient user ID
 */
exports.notifyMention = async (io, ticket, mentionerName, recipientId) => {
  return exports.createAndEmit(io, {
    user_id: recipientId,
    type: 'mention',
    title: `You were mentioned on Ticket #${ticket.id}`,
    message: `${mentionerName} mentioned you on ticket "${ticket.title}"`,
    related_entity_type: 'ticket',
    related_entity_id: ticket.id,
    action_url: `/tickets/${ticket.id}`
  });
};

/**
 * Helper: Create escalation notification
 * @param {Object} io - Socket.io instance
 * @param {Object} ticket - Ticket object
 * @param {number[]} managerIds - Manager user IDs to notify
 */
exports.notifyEscalation = async (io, ticket, managerIds = []) => {
  const promises = managerIds.map(managerId =>
    exports.createAndEmit(io, {
      user_id: managerId,
      type: 'escalation',
      title: `Ticket Escalated`,
      message: `Ticket #${ticket.id} "${ticket.title}" has been escalated due to time-based rules`,
      related_entity_type: 'ticket',
      related_entity_id: ticket.id,
      action_url: `/tickets/${ticket.id}`
    })
  );

  return Promise.all(promises);
};

/**
 * Helper: Create chat message notification
 * @param {Object} io - Socket.io instance
 * @param {number} conversationId - Conversation ID
 * @param {string} senderName - Sender name
 * @param {number[]} recipientIds - Recipient user IDs
 */
exports.notifyChatMessage = async (io, conversationId, senderName, recipientIds = []) => {
  const promises = recipientIds.map(recipientId =>
    exports.createAndEmit(io, {
      user_id: recipientId,
      type: 'chat_message',
      title: `New Message from ${senderName}`,
      message: `You have a new message`,
      related_entity_type: 'chat',
      related_entity_id: conversationId,
      action_url: `/chat?conversation=${conversationId}`
    })
  );

  return Promise.all(promises);
};
