const db = require('../config/database');

class Ticket {
  static async findById(id) {
    const [rows] = await db.query(`
      SELECT
        t.*,
        c.name as customer_name,
        c.email as customer_email,
        a.name as agent_name,
        a.email as agent_email,
        d.name as department_name
      FROM tickets t
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN users a ON t.agent_id = a.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.id = ?
    `, [id]);
    return rows[0];
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT
        t.*,
        c.name as customer_name,
        a.name as agent_name,
        d.name as department_name
      FROM tickets t
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN users a ON t.agent_id = a.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.customer_id) {
      query += ' AND t.customer_id = ?';
      params.push(filters.customer_id);
    }

    if (filters.agent_id) {
      query += ' AND t.agent_id = ?';
      params.push(filters.agent_id);
    }

    if (filters.department_id) {
      query += ' AND t.department_id = ?';
      params.push(filters.department_id);
    }

    if (filters.status) {
      query += ' AND t.status = ?';
      params.push(filters.status);
    }

    if (filters.priority) {
      query += ' AND t.priority = ?';
      params.push(filters.priority);
    }

    if (filters.search) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ? OR t.id = ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, filters.search);
    }

    query += ' ORDER BY t.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM tickets WHERE 1=1';
    const params = [];

    if (filters.customer_id) {
      query += ' AND customer_id = ?';
      params.push(filters.customer_id);
    }

    if (filters.agent_id) {
      query += ' AND agent_id = ?';
      params.push(filters.agent_id);
    }

    if (filters.department_id) {
      query += ' AND department_id = ?';
      params.push(filters.department_id);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }

    if (filters.search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR id = ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, filters.search);
    }

    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  static async create(ticketData) {
    const { customer_id, department_id, priority, status, title, description, agent_id } = ticketData;

    const [result] = await db.query(
      'INSERT INTO tickets (customer_id, agent_id, department_id, priority, status, title, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customer_id, agent_id || null, department_id, priority, status, title, description]
    );

    return result.insertId;
  }

  static async update(id, ticketData) {
    const { agent_id, department_id, priority, status, title, description } = ticketData;

    await db.query(
      'UPDATE tickets SET agent_id = ?, department_id = ?, priority = ?, status = ?, title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [agent_id, department_id, priority, status, title, description, id]
    );
  }

  static async updateStatus(id, status) {
    await db.query(
      'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
  }

  static async assignAgent(ticketId, agentId) {
    await db.query(
      'UPDATE tickets SET agent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [agentId, ticketId]
    );
  }

  static async delete(id) {
    await db.query('DELETE FROM tickets WHERE id = ?', [id]);
  }

  static async getTicketsNeedingEscalation() {
    const escalationHours = process.env.ESCALATION_HOURS || 24;
    const criticalHours = process.env.CRITICAL_PRIORITY_ESCALATION_HOURS || 2;
    const highHours = process.env.HIGH_PRIORITY_ESCALATION_HOURS || 6;

    const [rows] = await db.query(`
      SELECT * FROM tickets
      WHERE status = 'Open'
      AND (
        (priority = 'Critical' AND TIMESTAMPDIFF(HOUR, created_at, NOW()) >= ?)
        OR (priority = 'High' AND TIMESTAMPDIFF(HOUR, created_at, NOW()) >= ?)
        OR (TIMESTAMPDIFF(HOUR, created_at, NOW()) >= ?)
      )
    `, [criticalHours, highHours, escalationHours]);

    return rows;
  }

  static async getMessages(ticketId, isInternal = false) {
    let query = `
      SELECT
        tm.*,
        u.name as user_name,
        u.role as user_role
      FROM ticket_messages tm
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE tm.ticket_id = ? AND tm.is_deleted = 0
    `;

    if (!isInternal) {
      query += ' AND tm.is_internal = FALSE';
    }

    query += ' ORDER BY tm.created_at ASC';

    const [rows] = await db.query(query, [ticketId]);
    return rows;
  }

  static async addMessage(messageData) {
    const { ticket_id, user_id, message, is_internal = false } = messageData;

    const [result] = await db.query(
      'INSERT INTO ticket_messages (ticket_id, user_id, message, is_internal) VALUES (?, ?, ?, ?)',
      [ticket_id, user_id, message, is_internal]
    );

    return result.insertId;
  }

  /**
   * Edit a message (within 15 minutes of creation)
   * @param {number} messageId - Message ID
   * @param {string} newMessage - New message text
   * @param {number} userId - User ID (for permission check)
   * @returns {Promise<boolean>} - Success status
   */
  static async editMessage(messageId, newMessage, userId) {
    // Get message details
    const [messages] = await db.query(
      'SELECT user_id, created_at FROM ticket_messages WHERE id = ?',
      [messageId]
    );

    if (!messages || messages.length === 0) {
      throw new Error('Message not found');
    }

    const message = messages[0];

    // Check permission (only sender can edit)
    if (message.user_id !== userId) {
      throw new Error('Permission denied - only sender can edit');
    }

    // Check time limit (15 minutes)
    const createdTime = new Date(message.created_at);
    const now = new Date();
    const minutesPassed = (now - createdTime) / (1000 * 60);

    if (minutesPassed > 15) {
      throw new Error('Cannot edit message older than 15 minutes');
    }

    // Update message
    await db.query(
      'UPDATE ticket_messages SET message = ?, is_edited = 1, edited_at = NOW() WHERE id = ?',
      [newMessage, messageId]
    );

    return true;
  }

  /**
   * Delete a message (soft delete)
   * @param {number} messageId - Message ID
   * @param {number} userId - User ID (for permission check)
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteMessage(messageId, userId) {
    // Get message details
    const [messages] = await db.query(
      'SELECT user_id FROM ticket_messages WHERE id = ?',
      [messageId]
    );

    if (!messages || messages.length === 0) {
      throw new Error('Message not found');
    }

    const message = messages[0];

    // Check permission (only sender can delete)
    if (message.user_id !== userId) {
      throw new Error('Permission denied - only sender can delete');
    }

    // Soft delete
    await db.query(
      'UPDATE ticket_messages SET is_deleted = 1, deleted_at = NOW() WHERE id = ?',
      [messageId]
    );

    return true;
  }

  /**
   * Get message by ID with all details
   * @param {number} messageId - Message ID
   * @returns {Promise<Object|null>} - Message or null
   */
  static async getMessageById(messageId) {
    const [rows] = await db.query(
      `SELECT
        tm.*,
        u.name as user_name,
        u.role as user_role,
        u.email as user_email
       FROM ticket_messages tm
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.id = ?`,
      [messageId]
    );

    return rows[0] || null;
  }

  static async getAttachments(ticketId) {
    const [rows] = await db.query(`
      SELECT
        ta.*,
        u.name as uploaded_by_name
      FROM ticket_attachments ta
      LEFT JOIN users u ON ta.uploaded_by = u.id
      WHERE ta.ticket_id = ?
      ORDER BY ta.created_at DESC
    `, [ticketId]);

    return rows;
  }

  static async addAttachment(attachmentData) {
    const { ticket_id, file_path, uploaded_by } = attachmentData;

    const [result] = await db.query(
      'INSERT INTO ticket_attachments (ticket_id, file_path, uploaded_by) VALUES (?, ?, ?)',
      [ticket_id, file_path, uploaded_by]
    );

    return result.insertId;
  }

  static async getStats() {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Waiting' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status = 'Escalated' THEN 1 ELSE 0 END) as escalated,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN priority = 'Medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN priority = 'Low' THEN 1 ELSE 0 END) as low
      FROM tickets
    `);

    return rows[0];
  }
}

module.exports = Ticket;
