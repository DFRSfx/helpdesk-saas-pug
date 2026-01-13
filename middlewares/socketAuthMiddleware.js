/**
 * Socket.io Authentication Middleware
 * Validates socket connections and manages room assignments
 */

const db = require('../config/database');
const SocketService = require('../services/socketService');

/**
 * Socket.io middleware to authenticate connections
 */
function socketAuthMiddleware(io) {
  const socketService = new SocketService(io);

  // Store socket service on io for use in event handlers
  io.socketService = socketService;

  io.use(async (socket, next) => {
    try {
      // Get session ID from handshake
      const sessionID = socket.handshake.headers.cookie
        ?.split('; ')
        ?.find(c => c.startsWith('connect.sid'))
        ?.split('=')[1];

      if (!sessionID) {
        return next(new Error('No session found'));
      }

      // Session will be available in socket.request.session via express-session middleware
      // For now, we'll rely on the session being attached to the request

      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Authentication error'));
    }
  });

  // Handle new socket connections
  io.on('connection', (socket) => {
    const userId = socket.request.session?.userId;
    const userRole = socket.request.session?.userRole;

    if (!userId) {
      socket.disconnect();
      return;
    }

    // Register user socket
    socketService.registerUserSocket(userId, socket.id);

    // Join personal room
    socket.join(`user:${userId}`);

    // Join role-based room
    if (userRole) {
      socket.join(`role:${userRole}`);
    }

    console.log(`User ${userId} connected with socket ${socket.id}`);

    // Log to database (optional)
    logUserSession(userId, socket.id, 1); // is_online = 1

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

    /**
     * TICKET EVENTS
     */

    // Join specific ticket room
    socket.on('join:ticket', (ticketId) => {
      if (ticketId && !isNaN(ticketId)) {
        const room = `ticket:${ticketId}`;
        socket.join(room);
        console.log(`User ${userId} joined ticket room ${room}`);

        // Notify others in the room
        socket.broadcast.to(room).emit('user:joined_ticket', {
          userId,
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
        console.log(`User ${userId} left ticket room ${room}`);

        // Notify others in the room
        socket.broadcast.to(room).emit('user:left_ticket', {
          userId,
          ticketId,
          leftAt: new Date()
        });
      }
    });

    // Typing indicator in ticket
    socket.on('typing:start', (ticketId) => {
      if (ticketId && !isNaN(ticketId)) {
        socket.broadcast.to(`ticket:${ticketId}`).emit('typing:start', {
          userId,
          ticketId,
          startedAt: new Date()
        });
      }
    });

    socket.on('typing:stop', (ticketId) => {
      if (ticketId && !isNaN(ticketId)) {
        socket.broadcast.to(`ticket:${ticketId}`).emit('typing:stop', {
          userId,
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
        console.log(`User ${userId} joined chat room ${room}`);

        // Notify others that user is online
        socket.broadcast.to(room).emit('chat:user_online', {
          userId,
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
        console.log(`User ${userId} left chat room ${room}`);

        // Notify others that user is offline
        socket.broadcast.to(room).emit('chat:user_offline', {
          userId,
          conversationId,
          offlineAt: new Date()
        });
      }
    });

    // Typing indicator in chat
    socket.on('chat:typing', (conversationId) => {
      if (conversationId && !isNaN(conversationId)) {
        socket.broadcast.to(`chat:${conversationId}`).emit('chat:typing', {
          userId,
          conversationId,
          startedAt: new Date()
        });
      }
    });

    socket.on('chat:stop_typing', (conversationId) => {
      if (conversationId && !isNaN(conversationId)) {
        socket.broadcast.to(`chat:${conversationId}`).emit('chat:stop_typing', {
          userId,
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
      socketService.unregisterUserSocket(userId, socket.id);
      console.log(`User ${userId} disconnected with socket ${socket.id}`);

      // Log to database
      logUserSession(userId, socket.id, 0); // is_online = 0

      // Check if user has any other connections
      if (!socketService.isUserOnline(userId)) {
        console.log(`User ${userId} is now offline`);
        socketService.emitUserOffline(userId, socket.request.session?.userName || 'User');
      }
    });

    /**
     * ERROR HANDLING
     */
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  return socketService;
}

/**
 * Log user session to database (optional feature)
 * @param {number} userId - User ID
 * @param {string} socketId - Socket ID
 * @param {number} isOnline - 1 = online, 0 = offline
 */
async function logUserSession(userId, socketId, isOnline) {
  try {
    if (isOnline === 1) {
      // Insert or update session
      await db.query(
        `INSERT INTO user_sessions (user_id, socket_id, is_online)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
         is_online = ?,
         last_seen = CURRENT_TIMESTAMP`,
        [userId, socketId, 1, 1]
      );
    } else {
      // Mark session as offline
      await db.query(
        `UPDATE user_sessions SET is_online = 0 WHERE user_id = ? AND socket_id = ?`,
        [userId, socketId]
      );
    }
  } catch (error) {
    // Log but don't fail - this is optional
    console.error('Error logging user session:', error);
  }
}

module.exports = socketAuthMiddleware;
