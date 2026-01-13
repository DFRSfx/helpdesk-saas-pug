/**
 * Mention Service
 * Handles parsing, storing, and notifying @mentions in messages
 */

const db = require('../config/database');
const User = require('../models/User');

class MentionService {
  /**
   * Parse mentions from message text
   * Returns array of usernames mentioned
   * @param {string} text - Message text
   * @returns {Array<string>} - Array of mentioned usernames
   */
  static parseMentions(text) {
    if (!text) return [];

    // Match @username patterns (alphanumeric and underscore)
    const mentionPattern = /@([a-zA-Z0-9_.-]+)/g;
    const mentions = [];
    let match;

    while ((match = mentionPattern.exec(text)) !== null) {
      const username = match[1];
      if (!mentions.includes(username)) {
        mentions.push(username);
      }
    }

    return mentions;
  }

  /**
   * Resolve mentioned usernames to user IDs
   * @param {Array<string>} mentionedUsernames - Array of usernames
   * @returns {Promise<Array<{id, name, email}>>} - Array of user objects
   */
  static async resolveUsernames(mentionedUsernames) {
    if (!mentionedUsernames || mentionedUsernames.length === 0) {
      return [];
    }

    const placeholders = mentionedUsernames.map(() => '?').join(',');
    const [users] = await db.query(
      `SELECT id, name, email FROM users WHERE name IN (${placeholders}) AND is_active = 1`,
      mentionedUsernames
    );

    return users;
  }

  /**
   * Store mentions for a message
   * @param {number} messageId - Message ID
   * @param {Array<number>} userIds - Array of user IDs mentioned
   * @returns {Promise<void>}
   */
  static async storeMentions(messageId, userIds) {
    if (!userIds || userIds.length === 0) return;

    const values = userIds.map(userId => [messageId, userId]);

    await db.query(
      `INSERT INTO message_mentions (message_id, mentioned_user_id)
       VALUES ${values.map(() => '(?, ?)').join(',')}
       ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`,
      values.flat()
    );
  }

  /**
   * Get mentions for a message
   * @param {number} messageId - Message ID
   * @returns {Promise<Array>} - Array of mentioned users
   */
  static async getMentions(messageId) {
    const [rows] = await db.query(
      `SELECT mm.*, u.name, u.email
       FROM message_mentions mm
       LEFT JOIN users u ON mm.mentioned_user_id = u.id
       WHERE mm.message_id = ?
       ORDER BY mm.created_at ASC`,
      [messageId]
    );

    return rows;
  }

  /**
   * Create mention notifications
   * @param {Object} params - Parameters
   * @param {number} params.messageId - Message ID
   * @param {number} params.ticketId - Ticket ID
   * @param {Array<number>} params.mentionedUserIds - User IDs mentioned
   * @param {number} params.senderId - User who sent message
   * @param {string} params.senderName - Name of sender
   * @returns {Promise<void>}
   */
  static async notifyMentions({
    messageId,
    ticketId,
    mentionedUserIds,
    senderId,
    senderName
  }) {
    if (!mentionedUserIds || mentionedUserIds.length === 0) return;

    const Notification = require('../models/Notification');

    for (const userId of mentionedUserIds) {
      if (userId === senderId) continue; // Don't notify sender

      try {
        await Notification.create({
          user_id: userId,
          type: 'mention',
          title: `You were mentioned by ${senderName}`,
          message: `${senderName} mentioned you in a ticket message`,
          related_entity_type: 'ticket',
          related_entity_id: ticketId,
          action_url: `/tickets/${ticketId}#message-${messageId}`
        });
      } catch (error) {
        console.error('Error creating mention notification:', error);
      }
    }
  }

  /**
   * Sanitize mentions in message for display
   * Replaces @username with highlighted mentions
   * @param {string} text - Message text
   * @returns {string} - HTML with highlighted mentions
   */
  static highlightMentions(text) {
    if (!text) return '';

    // Replace @username with span (for frontend CSS styling)
    return text.replace(/@([a-zA-Z0-9_.-]+)/g, '<mark class="mention">@$1</mark>');
  }

  /**
   * Get mentioned user IDs from message text
   * Resolves usernames to IDs in one operation
   * @param {string} text - Message text
   * @returns {Promise<Array<number>>} - Array of user IDs
   */
  static async extractUserIds(text) {
    const usernames = MentionService.parseMentions(text);
    if (usernames.length === 0) return [];

    const users = await MentionService.resolveUsernames(usernames);
    return users.map(u => u.id);
  }

  /**
   * Check if message contains mentions
   * @param {string} text - Message text
   * @returns {boolean}
   */
  static hasMentions(text) {
    return /@([a-zA-Z0-9_.-]+)/.test(text);
  }

  /**
   * Get recent mentions for a user
   * @param {number} userId - User ID
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} - Recent mentions
   */
  static async getRecentMentions(userId, limit = 10) {
    const [rows] = await db.query(
      `SELECT
        mm.created_at,
        m.id as message_id,
        m.message,
        m.ticket_id,
        u.name as sender_name,
        u.id as sender_id,
        t.title as ticket_title
       FROM message_mentions mm
       LEFT JOIN ticket_messages m ON mm.message_id = m.id
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN tickets t ON m.ticket_id = t.id
       WHERE mm.mentioned_user_id = ?
       ORDER BY mm.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    return rows;
  }

  /**
   * Count unread mentions for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} - Count of unread mentions
   */
  static async countUnreadMentions(userId) {
    const [result] = await db.query(
      `SELECT COUNT(*) as count
       FROM message_mentions mm
       LEFT JOIN ticket_messages m ON mm.message_id = m.id
       WHERE mm.mentioned_user_id = ?
         AND m.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [userId]
    );

    return result[0]?.count || 0;
  }
}

module.exports = MentionService;
