/**
 * Socket.io Authentication Middleware
 * Validates socket connections and manages room assignments
 */

const SocketService = require('../services/socketService');

/**
 * Socket.io middleware to authenticate connections
 */
function socketAuthMiddleware(io) {
  const socketService = new SocketService(io);

  // Store socket service on io for use in event handlers
  io.socketService = socketService;

  // Handle new socket connections
  io.on('connection', (socket) => {
    console.log(`🔗 New socket connection: ${socket.id}`);

    // Get user data from the client-side window.currentUser
    // The client will send this via the socket when it's ready
    socket.once('socket:authenticate', (userData) => {
      const userId = userData?.id;
      const userRole = userData?.role;
      const userName = userData?.name;

      console.log(`🔐 Socket authentication received - User ${userId} (${userRole})`);

      if (!userId) {
        console.warn('❌ No user ID provided, disconnecting socket');
        socket.disconnect();
        return;
      }

      // Store user info on socket
      socket.userId = userId;
      socket.userRole = userRole;
      socket.userName = userName;

      // Register user socket
      socketService.registerUserSocket(userId, socket.id);

      // Join personal room
      socket.join(`user:${userId}`);

      // Join role-based room
      if (userRole) {
        socket.join(`role:${userRole}`);
      }

      console.log(`✅ User ${userId} connected with socket ${socket.id}`);

      /**
       * AUTHENTICATION EVENT: User joins their personal room (already done above)
       * Client can use this to confirm connection
       */
      socket.emit('authenticated', {
        userId,
        userRole,
        socketId: socket.id,
        message: 'Connected to notification system'
      });
    });

    /**
     * TICKET EVENTS
     */

    // Join specific ticket room
    socket.on('join:ticket', (ticketId) => {
      if (ticketId && !isNaN(ticketId)) {
        const room = `ticket:${ticketId}`;
        socket.join(room);
        const userId = socket.userId || 'unknown';
        console.log(`📍 User ${userId} joined ticket room ${room}`);

        // Notify others in the room
        socket.broadcast.to(room).emit('user:joined_ticket', {
          userId: socket.userId,
          ticketId,
          joinedAt: new Date()
        });
      }
    });

    // Leave specific ticket room
    socket.on('leave:ticket', (ticketId) => {
      if (ticketId && !isNaN(ticketId)) {
        const room = `ticket:${ticketId}`;
        socket.leave(room);
        const userId = socket.userId || 'unknown';
        console.log(`📍 User ${userId} left ticket room ${room}`);

        // Notify others in the room
        socket.broadcast.to(room).emit('user:left_ticket', {
          userId: socket.userId,
          ticketId,
          leftAt: new Date()
        });
      }
    });

    // Typing indicator in ticket
    socket.on('typing:start', (ticketId) => {
      if (ticketId && !isNaN(ticketId)) {
        socket.broadcast.to(`ticket:${ticketId}`).emit('typing:start', {
          userId: socket.userId,
          ticketId,
          startedAt: new Date()
        });
      }
    });

    socket.on('typing:stop', (ticketId) => {
      if (ticketId && !isNaN(ticketId)) {
        socket.broadcast.to(`ticket:${ticketId}`).emit('typing:stop', {
          userId: socket.userId,
          ticketId,
          stoppedAt: new Date()
        });
      }
    });

    /**
     * CHAT EVENTS
     */

    // Join chat conversation room
    socket.on('join:chat', (conversationId) => {
      if (conversationId && !isNaN(conversationId)) {
        const room = `chat:${conversationId}`;
        socket.join(room);
        const userId = socket.userId || 'unknown';
        console.log(`💬 User ${userId} joined chat room ${room}`);

        // Notify others that user is online
        socket.broadcast.to(room).emit('chat:user_online', {
          userId: socket.userId,
          conversationId,
          onlineAt: new Date()
        });
      }
    });

    // Leave chat conversation room
    socket.on('leave:chat', (conversationId) => {
      if (conversationId && !isNaN(conversationId)) {
        const room = `chat:${conversationId}`;
        socket.leave(room);
        const userId = socket.userId || 'unknown';
        console.log(`💬 User ${userId} left chat room ${room}`);

        // Notify others that user is offline
        socket.broadcast.to(room).emit('chat:user_offline', {
          userId: socket.userId,
          conversationId,
          offlineAt: new Date()
        });
      }
    });

    // Typing indicator in chat
    socket.on('chat:typing', (conversationId) => {
      if (conversationId && !isNaN(conversationId)) {
        socket.broadcast.to(`chat:${conversationId}`).emit('chat:typing', {
          userId: socket.userId,
          conversationId,
          startedAt: new Date()
        });
      }
    });

    socket.on('chat:stop_typing', (conversationId) => {
      if (conversationId && !isNaN(conversationId)) {
        socket.broadcast.to(`chat:${conversationId}`).emit('chat:stop_typing', {
          userId: socket.userId,
          conversationId,
          stoppedAt: new Date()
        });
      }
    });

    /**
     * NOTIFICATION EVENTS
     */

    // Mark notification as read
    socket.on('notification:mark_read', (notificationId) => {
      if (notificationId && !isNaN(notificationId)) {
        // This will be handled by the controller
        // Just broadcast to confirm
        socket.emit('notification:marked_read', {
          id: notificationId,
          markedAt: new Date()
        });
      }
    });

    /**
     * DISCONNECT EVENT
     */
    socket.on('disconnect', () => {
      const userId = socket.userId;
      socketService.unregisterUserSocket(userId, socket.id);
      console.log(`👋 User ${userId} disconnected with socket ${socket.id}`);

      // Check if user has any other connections
      if (userId && !socketService.isUserOnline(userId)) {
        console.log(`⭕ User ${userId} is now offline`);
        socketService.emitUserOffline(userId, socket.userName || 'User');
      }
    });

    /**
     * ERROR HANDLING
     */
    socket.on('error', (error) => {
      const userId = socket.userId || 'unknown';
      console.error(`❌ Socket error for user ${userId}:`, error);
    });
  });

  return socketService;
}

module.exports = socketAuthMiddleware;
