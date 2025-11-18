/**
 * Ticket Model
 * Handles all ticket-related database operations
 */

const { pool } = require('../config/database');

class Ticket {
  /**
   * Create new ticket
   * @param {Object} ticketData - Ticket data
   * @returns {Promise<Object>} Created ticket with ID
   */
  static async create(ticketData) {
    const {
      subject,
      description,
      priority_id,
      customer_user_id,
      department_id,
      category,
      created_by_user_id
    } = ticketData;

    // Get default priority if not specified (medium = 3)
    const defaultPriorityId = priority_id || 3;
    
    // Get default status (open = 1)
    const defaultStatusId = 1;

    const [result] = await pool.query(
      `INSERT INTO tickets 
       (subject, description, status_id, priority_id, customer_user_id, department_id, category, created_by_user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subject,
        description,
        defaultStatusId,
        defaultPriorityId,
        customer_user_id,
        department_id,
        category,
        created_by_user_id || customer_user_id
      ]
    );

    // Auto-assign ticket if department has auto-assign enabled
    if (department_id) {
      try {
        await pool.query('CALL sp_auto_assign_ticket(?)', [result.insertId]);
      } catch (error) {
        console.warn('Auto-assign failed (non-critical):', error.message);
      }
    }

    return await this.findById(result.insertId);
  }

  /**
   * Find ticket by ID with all related data
   * @param {number} id - Ticket ID
   * @returns {Promise<Object|null>} Ticket object or null
   */
  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT 
        t.*,
        ts.code as status_code,
        ts.label as status_label,
        tp.code as priority_code,
        tp.label as priority_label,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email as customer_email,
        c.avatar as customer_avatar,
        CONCAT(a.first_name, ' ', a.last_name) as agent_name,
        a.email as agent_email,
        d.name as department_name,
        d.slug as department_slug
       FROM tickets t
       LEFT JOIN ticket_status ts ON t.status_id = ts.id
       LEFT JOIN ticket_priority tp ON t.priority_id = tp.id
       LEFT JOIN users c ON t.customer_user_id = c.id
       LEFT JOIN users a ON t.assigned_agent_user_id = a.id
       LEFT JOIN departments d ON t.department_id = d.id
       WHERE t.id = ? AND t.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Find ticket by ticket number
   * @param {string} ticketNumber - Ticket number
   * @returns {Promise<Object|null>} Ticket object or null
   */
  static async findByTicketNumber(ticketNumber) {
    const [rows] = await pool.query(
      `SELECT 
        t.*,
        ts.code as status_code,
        ts.label as status_label,
        tp.code as priority_code,
        tp.label as priority_label,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email as customer_email,
        CONCAT(a.first_name, ' ', a.last_name) as agent_name,
        d.name as department_name
       FROM tickets t
       LEFT JOIN ticket_status ts ON t.status_id = ts.id
       LEFT JOIN ticket_priority tp ON t.priority_id = tp.id
       LEFT JOIN users c ON t.customer_user_id = c.id
       LEFT JOIN users a ON t.assigned_agent_user_id = a.id
       LEFT JOIN departments d ON t.department_id = d.id
       WHERE t.ticket_number = ? AND t.deleted_at IS NULL`,
      [ticketNumber]
    );
    return rows[0] || null;
  }

  /**
   * Get all tickets with filters and pagination
   * @param {Object} filters - Filter criteria
   * @param {number} limit - Results limit
   * @param {number} offset - Results offset
   * @returns {Promise<Object>} Tickets and total count
   */
  static async findAll(filters = {}, limit = 20, offset = 0) {
    let query = `
      SELECT 
        t.*,
        ts.code as status_code,
        ts.label as status_label,
        tp.code as priority_code,
        tp.label as priority_label,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        CONCAT(a.first_name, ' ', a.last_name) as agent_name,
        d.name as department_name
      FROM tickets t
      LEFT JOIN ticket_status ts ON t.status_id = ts.id
      LEFT JOIN ticket_priority tp ON t.priority_id = tp.id
      LEFT JOIN users c ON t.customer_user_id = c.id
      LEFT JOIN users a ON t.assigned_agent_user_id = a.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.deleted_at IS NULL
    `;
    const params = [];
    
    // Apply filters
    if (filters.status_code) {
      query += ' AND ts.code = ?';
      params.push(filters.status_code);
    }
    
    if (filters.priority_code) {
      query += ' AND tp.code = ?';
      params.push(filters.priority_code);
    }
    
    if (filters.customer_user_id) {
      query += ' AND t.customer_user_id = ?';
      params.push(filters.customer_user_id);
    }
    
    if (filters.assigned_agent_user_id) {
      query += ' AND t.assigned_agent_user_id = ?';
      params.push(filters.assigned_agent_user_id);
    }
    
    if (filters.department_id) {
      query += ' AND t.department_id = ?';
      params.push(filters.department_id);
    }
    
    if (filters.category) {
      query += ' AND t.category = ?';
      params.push(filters.category);
    }
    
    if (filters.search) {
      query += ' AND (t.ticket_number LIKE ? OR t.subject LIKE ? OR t.description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Count total for pagination
    const countQuery = query.replace('SELECT t.*', 'SELECT COUNT(*) as total');
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;
    
    // Add sorting and pagination
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await pool.query(query, params);
    
    return { tickets: rows, total, limit, offset };
  }

  /**
   * Update ticket
   * @param {number} id - Ticket ID
   * @param {Object} ticketData - Updated ticket data
   * @param {number} userId - User making the update (for audit log)
   * @returns {Promise<boolean>} Success status
   */
  static async update(id, ticketData, userId = null) {
    const fields = [];
    const values = [];
    
    // Build dynamic update query
    Object.keys(ticketData).forEach(key => {
      if (key !== 'id' && ticketData[key] !== undefined) {
        if (key === 'tags' && ticketData[key]) {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(ticketData[key]));
        } else {
          fields.push(`${key} = ?`);
          values.push(ticketData[key]);
        }
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const [result] = await pool.query(
      `UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    // Calculate resolution time if status changed to resolved
    if (ticketData.status === 'resolved') {
      await pool.query('CALL sp_calculate_resolution_time(?)', [id]);
    }
    
    return result.affectedRows > 0;
  }

  /**
   * Assign ticket to agent
   * @param {number} ticketId - Ticket ID
   * @param {number} agentId - Agent ID
   * @param {number} userId - User making the assignment
   * @returns {Promise<boolean>} Success status
   */
  static async assign(ticketId, agentId, userId) {
    const [result] = await pool.query(
      'UPDATE tickets SET assigned_agent_id = ?, status = ? WHERE id = ?',
      [agentId, 'in_progress', ticketId]
    );
    
    // Log assignment in audit log
    if (result.affectedRows > 0) {
      await pool.query(
        `INSERT INTO audit_log (ticket_id, user_id, action, entity_type, entity_id, new_value, description)
         VALUES (?, ?, 'assigned', 'ticket', ?, ?, 'Ticket assigned to agent')`,
        [ticketId, userId, ticketId, agentId]
      );
    }
    
    return result.affectedRows > 0;
  }

  /**
   * Update ticket status
   * @param {number} id - Ticket ID
   * @param {string} status - New status
   * @param {number} userId - User making the change
   * @returns {Promise<boolean>} Success status
   */
  static async updateStatus(id, status, userId) {
    const validStatuses = ['open', 'in_progress', 'waiting', 'escalated', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    const updateData = { status };
    if (status === 'closed') {
      updateData.closed_by = userId;
    }
    
    return await this.update(id, updateData, userId);
  }

  /**
   * Get ticket messages
   * @param {number} ticketId - Ticket ID
   * @param {boolean} includeInternal - Include internal notes
   * @returns {Promise<Array>} Array of messages
   */
  static async getMessages(ticketId, includeInternal = true) {
    let query = `
      SELECT 
        tm.*,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email,
        u.role as user_role,
        u.avatar as user_avatar
      FROM ticket_messages tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.ticket_id = ?
    `;
    
    if (!includeInternal) {
      query += ' AND tm.is_internal = FALSE';
    }
    
    query += ' ORDER BY tm.created_at ASC';
    
    const [rows] = await pool.query(query, [ticketId]);
    return rows;
  }

  /**
   * Add message to ticket
   * @param {number} ticketId - Ticket ID
   * @param {number} userId - User ID
   * @param {string} message - Message content
   * @param {boolean} isInternal - Is internal note
   * @returns {Promise<Object>} Created message
   */
  static async addMessage(ticketId, userId, message, isInternal = false) {
    const [result] = await pool.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, message, is_internal) 
       VALUES (?, ?, ?, ?)`,
      [ticketId, userId, message, isInternal]
    );
    
    // Update ticket's first_response_at if this is the first agent response
    const ticket = await this.findById(ticketId);
    if (!ticket.first_response_at) {
      const [user] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
      if (user[0].role === 'agent' || user[0].role === 'admin') {
        await pool.query(
          'UPDATE tickets SET first_response_at = NOW() WHERE id = ?',
          [ticketId]
        );
      }
    }
    
    return { id: result.insertId, ticket_id: ticketId, user_id: userId, message, is_internal: isInternal };
  }

  /**
   * Get ticket attachments
   * @param {number} ticketId - Ticket ID
   * @returns {Promise<Array>} Array of attachments
   */
  static async getAttachments(ticketId) {
    const [rows] = await pool.query(
      `SELECT 
        ta.*,
        CONCAT(u.first_name, ' ', u.last_name) as uploaded_by_name
       FROM ticket_attachments ta
       JOIN users u ON ta.uploaded_by = u.id
       WHERE ta.ticket_id = ?
       ORDER BY ta.created_at DESC`,
      [ticketId]
    );
    return rows;
  }

  /**
   * Add attachment to ticket
   * @param {Object} attachmentData - Attachment data
   * @returns {Promise<Object>} Created attachment
   */
  static async addAttachment(attachmentData) {
    const { ticket_id, message_id, uploaded_by, file_name, file_path, file_size, file_type, mime_type } = attachmentData;
    
    const [result] = await pool.query(
      `INSERT INTO ticket_attachments (ticket_id, message_id, uploaded_by, file_name, file_path, file_size, file_type, mime_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ticket_id, message_id, uploaded_by, file_name, file_path, file_size, file_type, mime_type]
    );
    
    return { id: result.insertId, ...attachmentData };
  }

  /**
   * Get ticket statistics for dashboard
   * @param {Object} filters - Optional filters (agent_id, department_id, date_range)
   * @returns {Promise<Object>} Ticket statistics
   */
  static async getStatistics(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN ts.code = 'open' THEN 1 ELSE 0 END) as open_tickets,
        SUM(CASE WHEN ts.code = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tickets,
        SUM(CASE WHEN ts.code = 'waiting' THEN 1 ELSE 0 END) as waiting_tickets,
        SUM(CASE WHEN ts.code = 'escalated' THEN 1 ELSE 0 END) as escalated_tickets,
        SUM(CASE WHEN ts.code = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets,
        SUM(CASE WHEN ts.code = 'closed' THEN 1 ELSE 0 END) as closed_tickets,
        SUM(CASE WHEN tp.code = 'critical' THEN 1 ELSE 0 END) as critical_tickets,
        SUM(CASE WHEN tp.code = 'high' THEN 1 ELSE 0 END) as high_tickets,
        SUM(CASE WHEN tp.code = 'medium' THEN 1 ELSE 0 END) as medium_tickets,
        SUM(CASE WHEN tp.code = 'low' THEN 1 ELSE 0 END) as low_tickets,
        AVG(resolution_time_minutes) as avg_resolution_time
      FROM tickets t
      LEFT JOIN ticket_status ts ON t.status_id = ts.id
      LEFT JOIN ticket_priority tp ON t.priority_id = tp.id
      WHERE t.deleted_at IS NULL
    `;
    const params = [];
    
    if (filters.assigned_agent_id) {
      query += ' AND t.assigned_agent_user_id = ?';
      params.push(filters.assigned_agent_id);
    }
    
    if (filters.department_id) {
      query += ' AND t.department_id = ?';
      params.push(filters.department_id);
    }
    
    if (filters.date_from) {
      query += ' AND t.created_at >= ?';
      params.push(filters.date_from);
    }
    
    if (filters.date_to) {
      query += ' AND t.created_at <= ?';
      params.push(filters.date_to);
    }
    
    const [stats] = await pool.query(query, params);
    return stats[0];
  }

  /**
   * Delete ticket (cascade will delete related records)
   * @param {number} id - Ticket ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM tickets WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Ticket;
