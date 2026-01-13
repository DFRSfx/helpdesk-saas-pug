/**
 * Notification Model
 * Handles notification CRUD operations
 */

const db = require('../config/database');

class Notification {
  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<number>} - Notification ID
   */
  static async create(notificationData) {
    const {
      user_id,
      type,
      title,
      message,
      related_entity_type,
      related_entity_id,
      action_url
    } = notificationData;

    const [result] = await db.query(
      `INSERT INTO notifications
       (user_id, type, title, message, related_entity_type, related_entity_id, action_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, type, title, message, related_entity_type || null, related_entity_id || null, action_url || null]
    );

    return result.insertId;
  }

  /**
   * Get notifications for a user
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of notifications
   */
  static async getByUser(userId, filters = {}) {
    let query = `
      SELECT *
      FROM notifications
      WHERE user_id = ?
    `;
    const params = [userId];

    if (filters.isRead !== undefined) {
      query += ' AND is_read = ?';
      params.push(filters.isRead ? 1 : 0);
    }

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Count notifications for a user
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} - Total count
   */
  static async countByUser(userId, filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    const params = [userId];

    if (filters.isRead !== undefined) {
      query += ' AND is_read = ?';
      params.push(filters.isRead ? 1 : 0);
    }

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    const [result] = await db.query(query, params);
    return result[0].total;
  }

  /**
   * Count unread notifications for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} - Unread count
   */
  static async getUnreadCount(userId) {
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return result[0].count;
  }

  /**
   * Mark notification as read
   * @param {number} notificationId - Notification ID
   * @returns {Promise<void>}
   */
  static async markAsRead(notificationId) {
    await db.query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?',
      [notificationId]
    );
  }

  /**
   * Mark multiple notifications as read
   * @param {number[]} notificationIds - Array of notification IDs
   * @returns {Promise<void>}
   */
  static async markMultipleAsRead(notificationIds) {
    if (notificationIds.length === 0) return;

    const placeholders = notificationIds.map(() => '?').join(',');
    await db.query(
      `UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id IN (${placeholders})`,
      notificationIds
    );
  }

  /**
   * Mark all notifications as read for a user
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async markAllAsRead(userId) {
    await db.query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0',
      [userId]
    );
  }

  /**
   * Get single notification by ID
   * @param {number} notificationId - Notification ID
   * @returns {Promise<Object|null>} - Notification or null
   */
  static async findById(notificationId) {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE id = ?',
      [notificationId]
    );
    return rows[0] || null;
  }

  /**
   * Delete notification
   * @param {number} notificationId - Notification ID
   * @returns {Promise<void>}
   */
  static async delete(notificationId) {
    await db.query('DELETE FROM notifications WHERE id = ?', [notificationId]);
  }

  /**
   * Delete multiple notifications
   * @param {number[]} notificationIds - Array of notification IDs
   * @returns {Promise<void>}
   */
  static async deleteMultiple(notificationIds) {
    if (notificationIds.length === 0) return;

    const placeholders = notificationIds.map(() => '?').join(',');
    await db.query(
      `DELETE FROM notifications WHERE id IN (${placeholders})`,
      notificationIds
    );
  }

  /**
   * Delete all notifications for a user
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async deleteAllForUser(userId) {
    await db.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
  }

  /**
   * Get notification preferences for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} - Preferences or null
   */
  static async getPreferences(userId) {
    const [rows] = await db.query(
      'SELECT * FROM notification_preferences WHERE user_id = ?',
      [userId]
    );
    return rows[0] || null;
  }

  /**
   * Update notification preferences
   * @param {number} userId - User ID
   * @param {Object} preferences - Preferences object
   * @returns {Promise<void>}
   */
  static async updatePreferences(userId, preferences) {
    const allowed_fields = [
      'email_ticket_assigned',
      'email_new_message',
      'email_status_change',
      'email_mention',
      'email_chat_message',
      'email_escalation',
      'push_ticket_assigned',
      'push_new_message',
      'push_status_change',
      'push_mention',
      'push_chat_message',
      'push_escalation'
    ];

    // Filter to only allowed fields
    const updates = {};
    Object.keys(preferences).forEach(key => {
      if (allowed_fields.includes(key)) {
        updates[key] = preferences[key] ? 1 : 0;
      }
    });

    if (Object.keys(updates).length === 0) return;

    // Build dynamic UPDATE query
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);

    await db.query(
      `UPDATE notification_preferences SET ${fields}, updated_at = NOW() WHERE user_id = ?`,
      [...values, userId]
    );
  }

  /**
   * Clean old notifications (older than 30 days)
   * @returns {Promise<void>}
   */
  static async cleanOldNotifications() {
    await db.query(
      'DELETE FROM notifications WHERE is_read = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
  }

  /**
   * Get recent activity (for dashboard)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of notifications
   */
  static async getRecentActivity(filters = {}) {
    let query = `
      SELECT n.*,
             u.name as user_name
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.type) {
      query += ' AND n.type = ?';
      params.push(filters.type);
    }

    if (filters.days) {
      query += ' AND n.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(parseInt(filters.days));
    }

    query += ' ORDER BY n.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }
}

module.exports = Notification;
