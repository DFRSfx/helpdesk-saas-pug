/**
 * Chat Controller
 * Handles chat conversations and messaging
 */

const Chat = require('../models/Chat');
const User = require('../models/User');
const Audit = require('../models/Audit');

/**
 * GET /chat
 * Display chat interface
 */
exports.index = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const conversationId = req.query.conversation;

    // Get user's conversations
    const conversations = await Chat.getConversationsByUser(userId, { limit: 50 });

    // Get selected conversation (if any)
    let selectedConversation = null;
    let messages = [];
    let participants = [];

    if (conversationId) {
      // Check if user is participant
      const isParticipant = await Chat.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return res.status(403).render('errors/404', {
          title: 'Conversation Not Found'
        });
      }

      selectedConversation = await Chat.getConversationById(conversationId);
      messages = await Chat.getMessages(conversationId, { limit: 50, offset: 0 });
      participants = await Chat.getParticipants(conversationId);

      // Mark as read
      await Chat.markAsRead(conversationId, userId);
    }

    res.render('chat/index', {
      title: 'Messages',
      conversations,
      selectedConversation,
      messages,
      participants,
      currentUserId: userId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/conversations
 * Get user's conversations (JSON)
 */
exports.apiGetConversations = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const conversations = await Chat.getConversationsByUser(userId, { limit, offset });

    res.json({
      success: true,
      conversations,
      pagination: {
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations'
    });
  }
};

/**
 * POST /api/chat/conversations
 * Create new conversation with user(s)
 */
exports.apiCreateConversation = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { participant_id, type = 'direct', name } = req.body;

    // Validate
    if (!participant_id && type === 'direct') {
      return res.status(400).json({
        success: false,
        message: 'Participant ID required'
      });
    }

    // Get or create DM conversation
    let conversationId;
    if (type === 'direct') {
      conversationId = await Chat.getOrCreateDMConversation(userId, parseInt(participant_id));
    } else {
      // Create group chat
      conversationId = await Chat.createConversation({
        type: 'group',
        name,
        created_by: userId,
        participant_ids: [parseInt(participant_id)]
      });
    }

    const conversation = await Chat.getConversationById(conversationId);

    res.json({
      success: true,
      conversation,
      redirectUrl: `/chat?conversation=${conversationId}`
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating conversation'
    });
  }
};

/**
 * GET /api/chat/conversations/:id/messages
 * Get messages for a conversation
 */
exports.apiGetMessages = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    // Check if user is participant
    const isParticipant = await Chat.isParticipant(conversationId, userId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const messages = await Chat.getMessages(conversationId, { limit, offset });
    const messageCount = await Chat.getMessageCount(conversationId);

    // Mark as read
    await Chat.markAsRead(conversationId, userId);

    res.json({
      success: true,
      messages,
      pagination: {
        page,
        limit,
        total: messageCount,
        totalPages: Math.ceil(messageCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages'
    });
  }
};

/**
 * POST /api/chat/conversations/:id/messages
 * Send a message
 */
exports.apiSendMessage = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const userId = req.session.userId;
    const { message } = req.body;

    // Validate
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    // Check if user is participant
    const isParticipant = await Chat.isParticipant(conversationId, userId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Add message
    const messageId = await Chat.addMessage({
      conversation_id: conversationId,
      sender_id: userId,
      message: message.trim()
    });

    // Get full message object
    const messages = await Chat.getMessages(conversationId, { limit: 1, offset: 0 });
    const newMessage = messages[messages.length - 1];

    // Get participants for notification
    const participants = await Chat.getParticipants(conversationId);
    const otherParticipants = participants
      .filter(p => p.user_id !== userId)
      .map(p => p.user_id);

    // Emit Socket.io event to conversation room
    const io = req.app.get('io');
    if (io && io.socketService) {
      io.socketService.emitChatMessage(conversationId, newMessage);

      // Notify other participants
      const currentUser = await User.findById(userId);
      otherParticipants.forEach(participantId => {
        io.to(`user:${participantId}`).emit('chat:new_message', {
          conversationId,
          senderName: currentUser.name,
          messagePreview: message.substring(0, 50)
        });
      });
    }

    // Audit log
    await Audit.log({
      user_id: userId,
      action: 'chat_message_sent',
      new_value: `Chat message in conversation ${conversationId}`,
      entity_type: 'chat',
      entity_id: conversationId
    });

    res.json({
      success: true,
      message: newMessage,
      messageId
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message'
    });
  }
};

/**
 * PATCH /api/chat/messages/:id
 * Edit a message
 */
exports.apiEditMessage = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const userId = req.session.userId;
    const { message: newMessage, conversationId } = req.body;

    // Validate
    if (!newMessage || newMessage.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    // Get original message
    const messages = await Chat.getMessages(conversationId, { limit: 1000 });
    const originalMessage = messages.find(m => m.id === parseInt(messageId));

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check permissions (only owner or admin can edit)
    const currentUser = await User.findById(userId);
    if (originalMessage.sender_id !== userId && currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Check time limit (only edit within 15 minutes)
    const messageTime = new Date(originalMessage.created_at);
    const now = new Date();
    const minutesPassed = (now - messageTime) / (1000 * 60);

    if (minutesPassed > 15 && currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Can only edit messages within 15 minutes'
      });
    }

    // Edit message
    await Chat.editMessage(messageId, newMessage.trim());

    // Emit Socket.io event
    const io = req.app.get('io');
    if (io && io.socketService) {
      io.socketService.emitChatMessageEdited(conversationId, messageId, newMessage);
    }

    res.json({
      success: true,
      message: 'Message updated'
    });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({
      success: false,
      message: 'Error editing message'
    });
  }
};

/**
 * DELETE /api/chat/messages/:id
 * Delete a message
 */
exports.apiDeleteMessage = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const userId = req.session.userId;
    const { conversationId } = req.body;

    // Get original message
    const messages = await Chat.getMessages(conversationId, { limit: 1000 });
    const originalMessage = messages.find(m => m.id === parseInt(messageId));

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check permissions (only owner or admin can delete)
    const currentUser = await User.findById(userId);
    if (originalMessage.sender_id !== userId && currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Delete message (soft delete)
    await Chat.deleteMessage(messageId);

    // Emit Socket.io event
    const io = req.app.get('io');
    if (io && io.socketService) {
      io.socketService.emitChatMessageDeleted(conversationId, messageId);
    }

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message'
    });
  }
};

/**
 * PATCH /api/chat/conversations/:id/read
 * Mark conversation as read
 */
exports.apiMarkAsRead = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const userId = req.session.userId;

    // Check if user is participant
    const isParticipant = await Chat.isParticipant(conversationId, userId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await Chat.markAsRead(conversationId, userId);

    res.json({
      success: true,
      message: 'Conversation marked as read'
    });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking conversation as read'
    });
  }
};

/**
 * GET /api/chat/users/search
 * Search users to start conversation with
 */
exports.apiSearchUsers = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const query = req.query.q;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        users: []
      });
    }

    // Search users
    const users = await User.getAll({
      search: query,
      limit: 10
    });

    // Filter out current user
    const filtered = users.filter(u => u.id !== userId);

    res.json({
      success: true,
      users: filtered.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role
      }))
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching users'
    });
  }
};

/**
 * GET /api/chat/unread-count
 * Get total unread message count
 */
exports.apiGetUnreadCount = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const unreadCount = await Chat.getUnreadCount(userId);

    res.json({
      success: true,
      count: unreadCount
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting unread count'
    });
  }
};
