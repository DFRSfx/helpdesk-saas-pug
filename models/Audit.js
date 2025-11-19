const db = require('../config/database');

class Audit {
  static async log(auditData) {
    const { ticket_id, user_id, action, old_value, new_value } = auditData;

    const [result] = await db.query(
      'INSERT INTO audit_log (ticket_id, user_id, action, old_value, new_value) VALUES (?, ?, ?, ?, ?)',
      [ticket_id, user_id || null, action, old_value || null, new_value || null]
    );

    return result.insertId;
  }

  static async getByTicket(ticketId) {
    const [rows] = await db.query(`
      SELECT
        al.*,
        u.name as user_name,
        u.role as user_role
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.ticket_id = ?
      ORDER BY al.created_at DESC
    `, [ticketId]);

    return rows;
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT
        al.*,
        u.name as user_name,
        u.role as user_role,
        t.title as ticket_title
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN tickets t ON al.ticket_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.ticket_id) {
      query += ' AND al.ticket_id = ?';
      params.push(filters.ticket_id);
    }

    if (filters.user_id) {
      query += ' AND al.user_id = ?';
      params.push(filters.user_id);
    }

    if (filters.action) {
      query += ' AND al.action LIKE ?';
      params.push(`%${filters.action}%`);
    }

    if (filters.start_date) {
      query += ' AND al.created_at >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND al.created_at <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY al.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM audit_log WHERE 1=1';
    const params = [];

    if (filters.ticket_id) {
      query += ' AND ticket_id = ?';
      params.push(filters.ticket_id);
    }

    if (filters.user_id) {
      query += ' AND user_id = ?';
      params.push(filters.user_id);
    }

    if (filters.action) {
      query += ' AND action LIKE ?';
      params.push(`%${filters.action}%`);
    }

    if (filters.start_date) {
      query += ' AND created_at >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND created_at <= ?';
      params.push(filters.end_date);
    }

    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  static async getRecentActivity(limit = 20) {
    const [rows] = await db.query(`
      SELECT
        al.*,
        u.name as user_name,
        t.title as ticket_title
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN tickets t ON al.ticket_id = t.id
      ORDER BY al.created_at DESC
      LIMIT ?
    `, [limit]);

    return rows;
  }
}

module.exports = Audit;
