/**
 * Chat Model
 * Handles chat conversations and messages CRUD operations
 */

const db = require('../config/database');

class Chat {
  /**
   * Create a new conversation
   * @param {Object} conversationData - Conversation data
   * @returns {Promise<number>} - Conversation ID
   */
  static async createConversation(conversationData) {
    const { type = 'direct', name, created_by, participant_ids = [] } = conversationData;

    const [result] = await db.query(
      'INSERT INTO chat_conversations (type, name, created_by) VALUES (?, ?, ?)',
      [type, name || null, created_by]
    );

    const conversationId = result.insertId;

    // Add creator as first participant
    await db.query(
      'INSERT INTO chat_participants (conversation_id, user_id) VALUES (?, ?)',
      [conversationId, created_by]
    );

    // Add other participants
    if (participant_ids.length > 0) {
      for (const participantId of participant_ids) {
        try {
          await db.query(
            'INSERT INTO chat_participants (conversation_id, user_id) VALUES (?, ?)',
            [conversationId, participantId]
          );
        } catch (error) {
          // Ignore duplicate key errors
          if (!error.message.includes('Duplicate')) throw error;
        }
      }
    }

    return conversationId;
  }

  /**
   * Get conversations for a user
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of conversations
   */
  static async getConversationsByUser(userId, filters = {}) {
    let query = `
      SELECT
        c.*,
        u.name as creator_name,
        (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) as message_count,
        (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND created_at > cp.last_read_at) as unread_count,
        (SELECT message FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT sender_id FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_sender_id,
        (SELECT su.name FROM users su WHERE su.id = (SELECT sender_id FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1)) as last_sender_name
      FROM chat_conversations c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN chat_participants cp ON c.id = cp.conversation_id AND cp.user_id = ?
      WHERE c.id IN (
        SELECT conversation_id FROM chat_participants WHERE user_id = ? AND is_active = 1
      )
    `;

    const params = [userId, userId];

    query += ' ORDER BY c.last_message_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Get conversation details
   * @param {number} conversationId - Conversation ID
   * @returns {Promise<Object|null>} - Conversation or null
   */
  static async getConversationById(conversationId) {
    const [rows] = await db.query(
      `SELECT c.*,
              u.name as creator_name,
              (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) as message_count
       FROM chat_conversations c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = ?`,
      [conversationId]
    );
    return rows[0] || null;
  }

  /**
   * Get conversation participants
   * @param {number} conversationId - Conversation ID
   * @returns {Promise<Array>} - Array of participants
   */
  static async getParticipants(conversationId) {
    const [rows] = await db.query(
      `SELECT cp.*, u.name, u.email, u.role
       FROM chat_participants cp
       LEFT JOIN users u ON cp.user_id = u.id
       WHERE cp.conversation_id = ? AND cp.is_active = 1
       ORDER BY cp.joined_at ASC`,
      [conversationId]
    );
    return rows;
  }

  /**
   * Add a message to conversation
   * @param {Object} messageData - Message data
   * @returns {Promise<number>} - Message ID
   */
  static async addMessage(messageData) {
    const { conversation_id, sender_id, message } = messageData;

    const [result] = await db.query(
      `INSERT INTO chat_messages (conversation_id, sender_id, message)
       VALUES (?, ?, ?)`,
      [conversation_id, sender_id, message]
    );

    // Update last_message_at in conversation
    await db.query(
      'UPDATE chat_conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?',
      [conversation_id]
    );

    return result.insertId;
  }

  /**
   * Get messages for a conversation
   * @param {number} conversationId - Conversation ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of messages
   */
  static async getMessages(conversationId, filters = {}) {
    let query = `
      SELECT
        m.*,
        u.name as sender_name,
        u.role as sender_role,
        u.id as sender_id
      FROM chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
    `;

    const params = [conversationId];

    if (filters.limit) {
      const limit = parseInt(filters.limit);
      const offset = parseInt(filters.offset || 0);
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Get message count for a conversation
   * @param {number} conversationId - Conversation ID
   * @returns {Promise<number>} - Message count
   */
  static async getMessageCount(conversationId) {
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM chat_messages WHERE conversation_id = ?',
      [conversationId]
    );
    return result[0].count;
  }

  /**
   * Edit a message
   * @param {number} messageId - Message ID
   * @param {string} newMessage - New message text
   * @returns {Promise<void>}
   */
  static async editMessage(messageId, newMessage) {
    await db.query(
      'UPDATE chat_messages SET message = ?, is_edited = 1, edited_at = NOW() WHERE id = ?',
      [newMessage, messageId]
    );
  }

  /**
   * Delete a message (soft delete)
   * @param {number} messageId - Message ID
   * @returns {Promise<void>}
   */
  static async deleteMessage(messageId) {
    await db.query(
      'UPDATE chat_messages SET message = "[deleted]", is_edited = 1, edited_at = NOW() WHERE id = ?',
      [messageId]
    );
  }

  /**
   * Mark conversation as read
   * @param {number} conversationId - Conversation ID
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async markAsRead(conversationId, userId) {
    await db.query(
      'UPDATE chat_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
      [conversationId, userId]
    );
  }

  /**
   * Get unread count for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} - Total unread message count
   */
  static async getUnreadCount(userId) {
    const [result] = await db.query(
      `SELECT COALESCE(SUM(
        (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND created_at > cp.last_read_at)
      ), 0) as total
       FROM chat_conversations c
       JOIN chat_participants cp ON c.id = cp.conversation_id
       WHERE cp.user_id = ? AND cp.is_active = 1`,
      [userId]
    );
    return result[0].total;
  }

  /**
   * Get or create direct message conversation
   * @param {number} userId1 - First user ID
   * @param {number} userId2 - Second user ID
   * @returns {Promise<number>} - Conversation ID
   */
  static async getOrCreateDMConversation(userId1, userId2) {
    // Normalize user IDs (smaller ID first) for consistency
    const [smaller, larger] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

    // Check if conversation exists
    const [existing] = await db.query(
      `SELECT c.id FROM chat_conversations c
       WHERE c.type = 'direct'
       AND (
         (SELECT COUNT(*) FROM chat_participants WHERE conversation_id = c.id AND user_id IN (?, ?)) = 2
       )
       LIMIT 1`,
      [smaller, larger]
    );

    if (existing.length > 0) {
      return existing[0].id;
    }

    // Create new conversation
    return await Chat.createConversation({
      type: 'direct',
      created_by: smaller,
      participant_ids: [larger]
    });
  }

  /**
   * Check if user is participant of conversation
   * @param {number} conversationId - Conversation ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>}
   */
  static async isParticipant(conversationId, userId) {
    const [rows] = await db.query(
      'SELECT id FROM chat_participants WHERE conversation_id = ? AND user_id = ? AND is_active = 1',
      [conversationId, userId]
    );
    return rows.length > 0;
  }

  /**
   * Add participant to conversation
   * @param {number} conversationId - Conversation ID
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async addParticipant(conversationId, userId) {
    try {
      await db.query(
        `INSERT INTO chat_participants (conversation_id, user_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE is_active = 1`,
        [conversationId, userId]
      );
    } catch (error) {
      if (!error.message.includes('Duplicate')) throw error;
    }
  }

  /**
   * Remove participant from conversation
   * @param {number} conversationId - Conversation ID
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async removeParticipant(conversationId, userId) {
    await db.query(
      'UPDATE chat_participants SET is_active = 0 WHERE conversation_id = ? AND user_id = ?',
      [conversationId, userId]
    );
  }

  /**
   * Search messages in conversation
   * @param {number} conversationId - Conversation ID
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} - Matching messages
   */
  static async searchMessages(conversationId, searchTerm) {
    const [rows] = await db.query(
      `SELECT m.*, u.name as sender_name
       FROM chat_messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ? AND MATCH(m.message) AGAINST(? IN BOOLEAN MODE)
       ORDER BY m.created_at DESC`,
      [conversationId, searchTerm]
    );
    return rows;
  }

  /**
   * Get recent conversations for a user
   * @param {number} userId - User ID
   * @param {number} limit - Number of conversations to return
   * @returns {Promise<Array>}
   */
  static async getRecentConversations(userId, limit = 10) {
    const [rows] = await db.query(
      `SELECT c.*, u.name as creator_name
       FROM chat_conversations c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id IN (
         SELECT conversation_id FROM chat_participants WHERE user_id = ? AND is_active = 1
       )
       ORDER BY c.last_message_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    return rows;
  }

  /**
   * Delete conversation (admin only, soft delete)
   * @param {number} conversationId - Conversation ID
   * @returns {Promise<void>}
   */
  static async deleteConversation(conversationId) {
    // Mark all participants as inactive
    await db.query(
      'UPDATE chat_participants SET is_active = 0 WHERE conversation_id = ?',
      [conversationId]
    );
  }
}

module.exports = Chat;
