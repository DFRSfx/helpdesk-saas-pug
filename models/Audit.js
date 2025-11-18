/**
 * Audit Model
 * Handles audit log operations
 */

const { pool } = require('../config/database');

class Audit {
  /**
   * Create audit log entry
   * @param {Object} auditData - Audit data
   * @returns {Promise<Object>} Created audit entry
   */
  static async create(auditData) {
    const {
      ticket_id,
      user_id,
      action,
      entity_type,
      entity_id,
      old_value,
      new_value,
      ip_address,
      user_agent,
      description
    } = auditData;

    const [result] = await pool.query(
      `INSERT INTO audit_log 
       (ticket_id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_value ? JSON.stringify(old_value) : null,
        new_value ? JSON.stringify(new_value) : null,
        ip_address,
        user_agent,
        description
      ]
    );

    return { id: result.insertId, ...auditData };
  }

  /**
   * Get audit logs for a ticket
   * @param {number} ticketId - Ticket ID
   * @param {number} limit - Results limit
   * @returns {Promise<Array>} Array of audit log entries
   */
  static async getByTicket(ticketId, limit = 50) {
    const [rows] = await pool.query(
      `SELECT 
        a.*,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email,
        u.role as user_role
       FROM audit_log a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.ticket_id = ?
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [ticketId, limit]
    );
    return rows;
  }

  /**
   * Get audit logs for a user
   * @param {number} userId - User ID
   * @param {number} limit - Results limit
   * @returns {Promise<Array>} Array of audit log entries
   */
  static async getByUser(userId, limit = 100) {
    const [rows] = await pool.query(
      `SELECT 
        a.*,
        t.ticket_number,
        t.subject as ticket_subject
       FROM audit_log a
       LEFT JOIN tickets t ON a.ticket_id = t.id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    return rows;
  }

  /**
   * Get all audit logs with filters
   * @param {Object} filters - Filter criteria
   * @param {number} limit - Results limit
   * @param {number} offset - Results offset
   * @returns {Promise<Object>} Audit logs and total count
   */
  static async findAll(filters = {}, limit = 50, offset = 0) {
    let query = `
      SELECT 
        a.*,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email,
        t.ticket_number,
        t.subject as ticket_subject
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN tickets t ON a.ticket_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.ticket_id) {
      query += ' AND a.ticket_id = ?';
      params.push(filters.ticket_id);
    }

    if (filters.user_id) {
      query += ' AND a.user_id = ?';
      params.push(filters.user_id);
    }

    if (filters.action) {
      query += ' AND a.action = ?';
      params.push(filters.action);
    }

    if (filters.entity_type) {
      query += ' AND a.entity_type = ?';
      params.push(filters.entity_type);
    }

    if (filters.date_from) {
      query += ' AND a.created_at >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND a.created_at <= ?';
      params.push(filters.date_to);
    }

    // Count total
    const countQuery = query.replace('SELECT a.*', 'SELECT COUNT(*) as total');
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    // Add sorting and pagination
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);

    return { logs: rows, total, limit, offset };
  }

  /**
   * Get audit statistics
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Audit statistics
   */
  static async getStatistics(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT ticket_id) as unique_tickets,
        SUM(CASE WHEN action = 'created' THEN 1 ELSE 0 END) as created_count,
        SUM(CASE WHEN action = 'updated' THEN 1 ELSE 0 END) as updated_count,
        SUM(CASE WHEN action = 'status_changed' THEN 1 ELSE 0 END) as status_changed_count,
        SUM(CASE WHEN action = 'assigned' THEN 1 ELSE 0 END) as assigned_count
      FROM audit_log
      WHERE 1=1
    `;
    const params = [];

    if (filters.date_from) {
      query += ' AND created_at >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND created_at <= ?';
      params.push(filters.date_to);
    }

    const [stats] = await pool.query(query, params);
    return stats[0];
  }

  /**
   * Get recent activity
   * @param {number} limit - Number of recent entries
   * @returns {Promise<Array>} Recent audit entries
   */
  static async getRecentActivity(limit = 20) {
    const [rows] = await pool.query(
      `SELECT 
        a.*,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.avatar as user_avatar,
        t.ticket_number,
        t.subject as ticket_subject
       FROM audit_log a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN tickets t ON a.ticket_id = t.id
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }
}

module.exports = Audit;
