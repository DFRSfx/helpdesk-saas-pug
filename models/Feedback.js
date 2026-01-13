/**
 * Feedback Model
 * Handles ticket feedback and satisfaction ratings
 */

const db = require('../config/database');

class Feedback {
  /**
   * Create feedback for a ticket
   * @param {Object} feedbackData - Feedback data
   * @returns {Promise<number>} - Feedback ID
   */
  static async create(feedbackData) {
    const { ticket_id, rating, feedback_text } = feedbackData;

    if (!ticket_id || !rating) {
      throw new Error('Missing required fields: ticket_id, rating');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const [result] = await db.query(
      `INSERT INTO ticket_feedback (ticket_id, rating, feedback_text)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = ?, feedback_text = ?, updated_at = NOW()`,
      [ticket_id, rating, feedback_text || null, rating, feedback_text || null]
    );

    // Mark ticket as having feedback
    await db.query(
      'UPDATE tickets SET has_feedback = 1 WHERE id = ?',
      [ticket_id]
    );

    return result.insertId;
  }

  /**
   * Get feedback for a ticket
   * @param {number} ticketId - Ticket ID
   * @returns {Promise<Object|null>} - Feedback or null
   */
  static async getByTicket(ticketId) {
    const [rows] = await db.query(
      'SELECT * FROM ticket_feedback WHERE ticket_id = ?',
      [ticketId]
    );

    return rows[0] || null;
  }

  /**
   * Get feedback by ID
   * @param {number} feedbackId - Feedback ID
   * @returns {Promise<Object|null>} - Feedback or null
   */
  static async findById(feedbackId) {
    const [rows] = await db.query(
      `SELECT
        tf.*,
        t.title as ticket_title,
        t.id as ticket_id,
        c.name as customer_name,
        c.email as customer_email
       FROM ticket_feedback tf
       LEFT JOIN tickets t ON tf.ticket_id = t.id
       LEFT JOIN users c ON t.customer_id = c.id
       WHERE tf.id = ?`,
      [feedbackId]
    );

    return rows[0] || null;
  }

  /**
   * Get all feedback with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of feedback records
   */
  static async getAll(filters = {}) {
    let query = `
      SELECT
        tf.*,
        t.title as ticket_title,
        c.name as customer_name,
        d.name as department_name
      FROM ticket_feedback tf
      LEFT JOIN tickets t ON tf.ticket_id = t.id
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.rating) {
      query += ' AND tf.rating = ?';
      params.push(filters.rating);
    }

    if (filters.department_id) {
      query += ' AND t.department_id = ?';
      params.push(filters.department_id);
    }

    if (filters.min_rating) {
      query += ' AND tf.rating >= ?';
      params.push(filters.min_rating);
    }

    if (filters.has_text) {
      query += ' AND tf.feedback_text IS NOT NULL AND tf.feedback_text != ""';
    }

    query += ' ORDER BY tf.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Get feedback statistics
   * @param {Object} filters - Filter options (department_id, period_days)
   * @returns {Promise<Object>} - Feedback statistics
   */
  static async getStatistics(filters = {}) {
    let query = `
      SELECT
        COUNT(*) as total_feedback,
        AVG(rating) as avg_rating,
        MIN(rating) as min_rating,
        MAX(rating) as max_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1,
        SUM(CASE WHEN feedback_text IS NOT NULL AND feedback_text != "" THEN 1 ELSE 0 END) as with_comments
      FROM ticket_feedback tf
      WHERE 1=1
    `;

    const params = [];

    if (filters.department_id) {
      query += `
        AND tf.ticket_id IN (
          SELECT id FROM tickets WHERE department_id = ?
        )
      `;
      params.push(filters.department_id);
    }

    if (filters.period_days) {
      query += ' AND tf.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(filters.period_days);
    }

    const [result] = await db.query(query, params);
    const stats = result[0] || {};

    // Calculate satisfaction rate
    const total = stats.total_feedback || 0;
    const satisfied = (stats.rating_5 || 0) + (stats.rating_4 || 0);

    return {
      total_feedback: total,
      avg_rating: stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(2) : 0,
      min_rating: stats.min_rating || 0,
      max_rating: stats.max_rating || 0,
      rating_breakdown: {
        five_stars: stats.rating_5 || 0,
        four_stars: stats.rating_4 || 0,
        three_stars: stats.rating_3 || 0,
        two_stars: stats.rating_2 || 0,
        one_star: stats.rating_1 || 0
      },
      with_comments: stats.with_comments || 0,
      satisfaction_rate: total > 0 ? ((satisfied / total) * 100).toFixed(2) : 0
    };
  }

  /**
   * Request feedback for a ticket
   * @param {number} ticketId - Ticket ID
   * @returns {Promise<void>}
   */
  static async requestFeedback(ticketId) {
    await db.query(
      'UPDATE tickets SET feedback_requested_at = NOW() WHERE id = ?',
      [ticketId]
    );
  }

  /**
   * Get tickets pending feedback
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} - Tickets pending feedback
   */
  static async getPendingFeedback(limit = 10) {
    const [rows] = await db.query(
      `SELECT
        t.id,
        t.title,
        t.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        t.feedback_requested_at,
        DATEDIFF(NOW(), t.feedback_requested_at) as days_requested
       FROM tickets t
       LEFT JOIN users c ON t.customer_id = c.id
       WHERE t.status IN ('resolved', 'closed')
         AND t.has_feedback = 0
         AND t.feedback_requested_at IS NOT NULL
       ORDER BY t.feedback_requested_at ASC
       LIMIT ?`,
      [limit]
    );

    return rows;
  }

  /**
   * Get average rating per agent
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Agent ratings
   */
  static async getAgentRatings(filters = {}) {
    let query = `
      SELECT
        a.id,
        a.name,
        COUNT(tf.id) as total_feedback,
        AVG(tf.rating) as avg_rating,
        SUM(CASE WHEN tf.rating >= 4 THEN 1 ELSE 0 END) as positive_feedback
      FROM users a
      LEFT JOIN tickets t ON t.agent_id = a.id
      LEFT JOIN ticket_feedback tf ON t.id = tf.ticket_id
      WHERE a.role = 'agent'
    `;

    const params = [];

    if (filters.period_days) {
      query += ' AND tf.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(filters.period_days);
    }

    query += `
      GROUP BY a.id, a.name
      HAVING COUNT(tf.id) > 0
      ORDER BY avg_rating DESC
    `;

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Delete feedback (admin only)
   * @param {number} feedbackId - Feedback ID
   * @returns {Promise<void>}
   */
  static async delete(feedbackId) {
    const [feedback] = await db.query(
      'SELECT ticket_id FROM ticket_feedback WHERE id = ?',
      [feedbackId]
    );

    if (!feedback || feedback.length === 0) {
      throw new Error('Feedback not found');
    }

    await db.query('DELETE FROM ticket_feedback WHERE id = ?', [feedbackId]);

    // Check if ticket has other feedback
    const [other] = await db.query(
      'SELECT COUNT(*) as count FROM ticket_feedback WHERE ticket_id = ?',
      [feedback[0].ticket_id]
    );

    if (other[0].count === 0) {
      await db.query(
        'UPDATE tickets SET has_feedback = 0 WHERE id = ?',
        [feedback[0].ticket_id]
      );
    }
  }
}

module.exports = Feedback;
