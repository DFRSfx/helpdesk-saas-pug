/**
 * Notification Model
 * Handles notification operations
 */

const { pool } = require('../config/database');

class Notification {
  /**
   * Create notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  static async create(notificationData) {
    const { user_id, ticket_id, type, title, message, link } = notificationData;

    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, ticket_id, type, title, message, link) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, ticket_id, type, title, message, link]
    );

    return { id: result.insertId, ...notificationData };
  }

  /**
   * Get notifications for user
   * @param {number} userId - User ID
   * @param {boolean} unreadOnly - Return only unread notifications
   * @param {number} limit - Results limit
   * @returns {Promise<Array>} Array of notifications
   */
  static async getByUser(userId, unreadOnly = false, limit = 50) {
    let query = `
      SELECT n.*, t.ticket_number, t.subject as ticket_subject
      FROM notifications n
      LEFT JOIN tickets t ON n.ticket_id = t.id
      WHERE n.user_id = ?
    `;

    if (unreadOnly) {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ?';

    const [rows] = await pool.query(query, [userId, limit]);
    return rows;
  }

  /**
   * Mark notification as read
   * @param {number} id - Notification ID
   * @returns {Promise<boolean>} Success status
   */
  static async markAsRead(id) {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Mark all notifications as read for user
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async markAllAsRead(userId) {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get unread count for user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  static async getUnreadCount(userId) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return rows[0].count;
  }

  /**
   * Delete notification
   * @param {number} id - Notification ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM notifications WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * Delete old read notifications (cleanup)
   * @param {number} days - Delete notifications older than X days
   * @returns {Promise<number>} Number of deleted notifications
   */
  static async deleteOld(days = 30) {
    const [result] = await pool.query(
      'DELETE FROM notifications WHERE is_read = TRUE AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    return result.affectedRows;
  }
}

module.exports = Notification;
