/**
 * Chat Routes
 * Routes for chat conversations and messaging
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const chatController = require('../controllers/chatController');

// All chat routes require authentication
router.use(isAuthenticated);

/**
 * PAGE ROUTES
 */

/**
 * GET /chat
 * Display chat interface
 */
router.get('/', chatController.index);

/**
 * API ROUTES
 */

/**
 * GET /api/chat/conversations
 * Get user's conversations (paginated)
 */
router.get('/api/conversations', chatController.apiGetConversations);

/**
 * POST /api/chat/conversations
 * Create new conversation with user
 */
router.post('/api/conversations', chatController.apiCreateConversation);

/**
 * GET /api/chat/conversations/:id/messages
 * Get messages for a conversation (paginated)
 */
router.get('/api/conversations/:id/messages', chatController.apiGetMessages);

/**
 * POST /api/chat/conversations/:id/messages
 * Send a message to conversation
 */
router.post('/api/conversations/:id/messages', chatController.apiSendMessage);

/**
 * PATCH /api/chat/messages/:id
 * Edit a message
 */
router.patch('/api/messages/:id', chatController.apiEditMessage);

/**
 * DELETE /api/chat/messages/:id
 * Delete a message
 */
router.delete('/api/messages/:id', chatController.apiDeleteMessage);

/**
 * PATCH /api/chat/conversations/:id/read
 * Mark conversation as read
 */
router.patch('/api/conversations/:id/read', chatController.apiMarkAsRead);

/**
 * GET /api/chat/users/search
 * Search users to start conversation
 */
router.get('/api/users/search', chatController.apiSearchUsers);

/**
 * GET /api/chat/unread-count
 * Get total unread message count
 */
router.get('/api/unread-count', chatController.apiGetUnreadCount);

module.exports = router;
