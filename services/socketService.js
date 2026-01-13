/**
 * Socket.io Service
 * Centralized management of Socket.io events and rooms
 */

class SocketService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // { userId: [socketIds] }
  }

  /**
   * Register a user socket connection
   * @param {number} userId - User ID
   * @param {string} socketId - Socket ID
   */
  registerUserSocket(userId, socketId) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }

    const sockets = this.userSockets.get(userId);
    if (!sockets.includes(socketId)) {
      sockets.push(socketId);
    }
  }

  /**
   * Unregister a user socket
   * @param {number} userId - User ID
   * @param {string} socketId - Socket ID
   */
  unregisterUserSocket(userId, socketId) {
    if (this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      const index = sockets.indexOf(socketId);
      if (index > -1) {
        sockets.splice(index, 1);
      }

      // Remove user entry if no sockets left
      if (sockets.length === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * Check if user is online
   * @param {number} userId - User ID
   * @returns {boolean}
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).length > 0;
  }

  /**
   * Get all online user IDs
   * @returns {number[]}
   */
  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  /**
   * NOTIFICATIONS: Emit notification to user
   * @param {number} userId - User ID
   * @param {Object} notification - Notification object
   */
  emitNotification(userId, notification) {
    this.io.to(`user:${userId}`).emit('notification:new', notification);
  }

  /**
   * NOTIFICATIONS: Broadcast notification to multiple users
   * @param {number[]} userIds - Array of user IDs
   * @param {Object} notification - Notification object
   */
  broadcastNotification(userIds, notification) {
    userIds.forEach(userId => {
      this.emitNotification(userId, notification);
    });
  }

  /**
   * NOTIFICATIONS: Emit when notification is read
   * @param {number} userId - User ID
   * @param {number} notificationId - Notification ID
   */
  emitNotificationRead(userId, notificationId) {
    this.io.to(`user:${userId}`).emit('notification:read', { id: notificationId });
  }

  /**
   * TICKETS: Emit ticket created event
   * @param {Object} ticket - Ticket object
   * @param {number[]} userIds - User IDs to notify (agents, admins)
   */
  emitTicketCreated(ticket, userIds = []) {
    const event = {
      id: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      customerName: ticket.customer_name,
      createdAt: ticket.created_at
    };

    // Broadcast to all agents/admins
    this.io.to('role:agent').emit('ticket:created', event);
    this.io.to('role:admin').emit('ticket:created', event);

    // Also notify specific users if provided
    if (userIds.length > 0) {
      userIds.forEach(userId => {
        this.io.to(`user:${userId}`).emit('ticket:created', event);
      });
    }
  }

  /**
   * TICKETS: Emit ticket assigned to agent
   * @param {Object} ticket - Ticket object
   * @param {number} agentId - Agent ID
   */
  emitTicketAssigned(ticket, agentId) {
    const event = {
      id: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      assignedTo: agentId,
      assignedAt: new Date()
    };

    this.io.to(`user:${agentId}`).emit('ticket:assigned', event);
  }

  /**
   * TICKETS: Emit ticket status changed
   * @param {number} ticketId - Ticket ID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {number[]} participantIds - Users to notify
   */
  emitTicketStatusChanged(ticketId, oldStatus, newStatus, participantIds = []) {
    const event = {
      id: ticketId,
      oldStatus,
      newStatus,
      changedAt: new Date()
    };

    // Notify ticket room (all participants)
    this.io.to(`ticket:${ticketId}`).emit('ticket:status_changed', event);

    // Also notify specific users
    participantIds.forEach(userId => {
      this.io.to(`user:${userId}`).emit('ticket:status_changed', event);
    });
  }

  /**
   * MESSAGES: Emit new message in ticket
   * @param {number} ticketId - Ticket ID
   * @param {Object} message - Message object
   */
  emitMessageAdded(ticketId, message) {
    const event = {
      id: message.id,
      ticketId,
      message: message.message,
      userName: message.user_name,
      userId: message.user_id,
      isInternal: message.is_internal,
      createdAt: message.created_at
    };

    // Notify ticket room
    this.io.to(`ticket:${ticketId}`).emit('message:new', event);
  }

  /**
   * MESSAGES: Emit message edited
   * @param {number} ticketId - Ticket ID
   * @param {number} messageId - Message ID
   * @param {string} newMessage - Updated message text
   */
  emitMessageEdited(ticketId, messageId, newMessage) {
    const event = {
      id: messageId,
      ticketId,
      message: newMessage,
      editedAt: new Date()
    };

    this.io.to(`ticket:${ticketId}`).emit('message:edited', event);
  }

  /**
   * MESSAGES: Emit message deleted
   * @param {number} ticketId - Ticket ID
   * @param {number} messageId - Message ID
   */
  emitMessageDeleted(ticketId, messageId) {
    const event = {
      id: messageId,
      ticketId,
      deletedAt: new Date()
    };

    this.io.to(`ticket:${ticketId}`).emit('message:deleted', event);
  }

  /**
   * MESSAGES: Emit typing indicator
   * @param {number} ticketId - Ticket ID
   * @param {number} userId - User ID
   * @param {string} userName - User name
   * @param {boolean} isTyping - Is user typing
   */
  emitTypingIndicator(ticketId, userId, userName, isTyping = true) {
    const event = {
      userId,
      userName,
      isTyping
    };

    this.io.to(`ticket:${ticketId}`).emit('typing:indicator', event);
  }

  /**
   * CHAT: Emit new chat message
   * @param {number} conversationId - Conversation ID
   * @param {Object} message - Message object
   */
  emitChatMessage(conversationId, message) {
    const event = {
      id: message.id,
      conversationId,
      message: message.message,
      senderName: message.sender_name,
      senderId: message.sender_id,
      createdAt: message.created_at
    };

    this.io.to(`chat:${conversationId}`).emit('chat:message', event);
  }

  /**
   * CHAT: Emit chat message edited
   * @param {number} conversationId - Conversation ID
   * @param {number} messageId - Message ID
   * @param {string} newMessage - Updated message
   */
  emitChatMessageEdited(conversationId, messageId, newMessage) {
    const event = {
      id: messageId,
      conversationId,
      message: newMessage,
      editedAt: new Date()
    };

    this.io.to(`chat:${conversationId}`).emit('chat:message_edited', event);
  }

  /**
   * CHAT: Emit chat message deleted
   * @param {number} conversationId - Conversation ID
   * @param {number} messageId - Message ID
   */
  emitChatMessageDeleted(conversationId, messageId) {
    const event = {
      id: messageId,
      conversationId,
      deletedAt: new Date()
    };

    this.io.to(`chat:${conversationId}`).emit('chat:message_deleted', event);
  }

  /**
   * CHAT: Emit typing indicator in chat
   * @param {number} conversationId - Conversation ID
   * @param {number} userId - User ID
   * @param {string} userName - User name
   * @param {boolean} isTyping - Is user typing
   */
  emitChatTyping(conversationId, userId, userName, isTyping = true) {
    const event = {
      userId,
      userName,
      isTyping
    };

    this.io.to(`chat:${conversationId}`).emit('chat:typing', event);
  }

  /**
   * CHAT: Notify conversation has new unread messages
   * @param {number} conversationId - Conversation ID
   * @param {number[]} userIds - User IDs to notify
   * @param {number} unreadCount - Number of unread messages
   */
  emitConversationUnread(conversationId, userIds, unreadCount) {
    const event = {
      conversationId,
      unreadCount
    };

    userIds.forEach(userId => {
      if (userId && this.userSockets.has(userId)) {
        this.io.to(`user:${userId}`).emit('chat:unread', event);
      }
    });
  }

  /**
   * PRESENCE: Emit user went online
   * @param {number} userId - User ID
   * @param {string} userName - User name
   */
  emitUserOnline(userId, userName) {
    const event = {
      userId,
      userName,
      onlineAt: new Date()
    };

    // Broadcast to all agents and admins
    this.io.to('role:agent').emit('user:online', event);
    this.io.to('role:admin').emit('user:online', event);

    // Broadcast to department if user is agent
    // This will be handled in the controller based on department_id
  }

  /**
   * PRESENCE: Emit user went offline
   * @param {number} userId - User ID
   * @param {string} userName - User name
   */
  emitUserOffline(userId, userName) {
    const event = {
      userId,
      userName,
      offlineAt: new Date()
    };

    // Broadcast to all agents and admins
    this.io.to('role:agent').emit('user:offline', event);
    this.io.to('role:admin').emit('user:offline', event);
  }

  /**
   * ESCALATION: Emit ticket escalated
   * @param {Object} ticket - Ticket object
   * @param {number[]} managerIds - Manager IDs to notify
   */
  emitTicketEscalated(ticket, managerIds = []) {
    const event = {
      id: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      reason: 'Time-based escalation',
      escalatedAt: new Date()
    };

    // Notify admins and managers
    this.io.to('role:admin').emit('ticket:escalated', event);

    if (managerIds.length > 0) {
      managerIds.forEach(managerId => {
        this.io.to(`user:${managerId}`).emit('ticket:escalated', event);
      });
    }
  }

  /**
   * Get Socket.io instance for direct access if needed
   * @returns {Object} Socket.io instance
   */
  getIO() {
    return this.io;
  }
}

module.exports = SocketService;
