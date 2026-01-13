/**
 * SLA Model
 * Handles SLA policies, calculations, and tracking
 */

const db = require('../config/database');

class SLA {
  /**
   * Get all SLA policies
   * @returns {Promise<Array>} - Array of SLA policies
   */
  static async getAllPolicies() {
    const [rows] = await db.query(
      'SELECT * FROM sla_policies ORDER BY FIELD(priority, "Critical", "High", "Medium", "Low")'
    );
    return rows;
  }

  /**
   * Get SLA policy by ID
   * @param {number} policyId - Policy ID
   * @returns {Promise<Object|null>} - Policy or null
   */
  static async getPolicyById(policyId) {
    const [rows] = await db.query(
      'SELECT * FROM sla_policies WHERE id = ?',
      [policyId]
    );
    return rows[0] || null;
  }

  /**
   * Get SLA policy by priority
   * @param {string} priority - Ticket priority (Low, Medium, High, Critical)
   * @returns {Promise<Object|null>} - Policy or null
   */
  static async getPolicyByPriority(priority) {
    const [rows] = await db.query(
      'SELECT * FROM sla_policies WHERE priority = ? AND is_active = 1',
      [priority]
    );
    return rows[0] || null;
  }

  /**
   * Create new SLA policy
   * @param {Object} policyData - Policy data
   * @returns {Promise<number>} - Policy ID
   */
  static async createPolicy(policyData) {
    const {
      name,
      priority,
      response_time_hours,
      resolution_time_hours,
      is_active = 1
    } = policyData;

    const [result] = await db.query(
      `INSERT INTO sla_policies (name, priority, response_time_hours, resolution_time_hours, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [name, priority, response_time_hours, resolution_time_hours, is_active]
    );

    return result.insertId;
  }

  /**
   * Update SLA policy
   * @param {number} policyId - Policy ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  static async updatePolicy(policyId, updates) {
    const allowedFields = ['name', 'response_time_hours', 'resolution_time_hours', 'is_active'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;

    values.push(policyId);
    await db.query(
      `UPDATE sla_policies SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
  }

  /**
   * Calculate SLA due dates for a ticket
   * @param {number} ticketId - Ticket ID
   * @param {string} priority - Ticket priority
   * @returns {Promise<{response_due: Date, resolution_due: Date}>}
   */
  static async calculateSLADates(ticketId, priority) {
    // Get ticket creation time
    const [tickets] = await db.query(
      'SELECT created_at FROM tickets WHERE id = ?',
      [ticketId]
    );

    if (!tickets || tickets.length === 0) {
      throw new Error('Ticket not found');
    }

    const createdAt = tickets[0].created_at;

    // Get SLA policy for this priority
    const policy = await SLA.getPolicyByPriority(priority);
    if (!policy) {
      throw new Error(`SLA policy not found for priority: ${priority}`);
    }

    // Calculate due dates
    const responseDue = new Date(createdAt);
    responseDue.setHours(responseDue.getHours() + policy.response_time_hours);

    const resolutionDue = new Date(createdAt);
    resolutionDue.setHours(resolutionDue.getHours() + policy.resolution_time_hours);

    return {
      sla_policy_id: policy.id,
      response_due: responseDue,
      resolution_due: resolutionDue
    };
  }

  /**
   * Set SLA tracking for a ticket
   * @param {number} ticketId - Ticket ID
   * @param {string} priority - Ticket priority
   * @returns {Promise<void>}
   */
  static async initializeSLA(ticketId, priority) {
    try {
      const slaDates = await SLA.calculateSLADates(ticketId, priority);

      await db.query(
        `UPDATE tickets
         SET sla_policy_id = ?, sla_response_due = ?, sla_resolution_due = ?
         WHERE id = ?`,
        [slaDates.sla_policy_id, slaDates.response_due, slaDates.resolution_due, ticketId]
      );
    } catch (error) {
      console.error('Error initializing SLA:', error);
      // Don't throw - SLA is optional
    }
  }

  /**
   * Mark first response on ticket
   * @param {number} ticketId - Ticket ID
   * @returns {Promise<void>}
   */
  static async recordFirstResponse(ticketId) {
    const [tickets] = await db.query(
      'SELECT sla_response_due FROM tickets WHERE id = ?',
      [ticketId]
    );

    if (!tickets || tickets.length === 0) return;

    const now = new Date();
    const responseBreached = tickets[0].sla_response_due && now > tickets[0].sla_response_due;

    await db.query(
      `UPDATE tickets
       SET sla_first_response_at = NOW(), sla_response_breached = ?
       WHERE id = ? AND sla_first_response_at IS NULL`,
      [responseBreached ? 1 : 0, ticketId]
    );
  }

  /**
   * Check and update SLA breach status for a ticket
   * @param {number} ticketId - Ticket ID
   * @returns {Promise<{response_breached: boolean, resolution_breached: boolean}>}
   */
  static async checkBreaches(ticketId) {
    const [tickets] = await db.query(
      `SELECT
        sla_response_due,
        sla_resolution_due,
        sla_response_breached,
        sla_resolution_breached,
        status
       FROM tickets
       WHERE id = ?`,
      [ticketId]
    );

    if (!tickets || tickets.length === 0) {
      throw new Error('Ticket not found');
    }

    const ticket = tickets[0];
    const now = new Date();

    let responseBreached = ticket.sla_response_breached;
    let resolutionBreached = ticket.sla_resolution_breached;

    // Check response breach
    if (!responseBreached && ticket.sla_response_due && now > ticket.sla_response_due) {
      responseBreached = true;
    }

    // Check resolution breach (only for open tickets)
    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      if (!resolutionBreached && ticket.sla_resolution_due && now > ticket.sla_resolution_due) {
        resolutionBreached = true;
      }
    } else {
      // Resolution is not breached if ticket is resolved/closed
      resolutionBreached = false;
    }

    // Update database if status changed
    if (responseBreached !== ticket.sla_response_breached ||
        resolutionBreached !== ticket.sla_resolution_breached) {
      await db.query(
        `UPDATE tickets
         SET sla_response_breached = ?, sla_resolution_breached = ?
         WHERE id = ?`,
        [responseBreached ? 1 : 0, resolutionBreached ? 1 : 0, ticketId]
      );
    }

    return {
      response_breached: !!responseBreached,
      resolution_breached: !!resolutionBreached
    };
  }

  /**
   * Get SLA metrics for a ticket
   * @param {number} ticketId - Ticket ID
   * @returns {Promise<Object>} - SLA metrics
   */
  static async getTicketSLAMetrics(ticketId) {
    const [tickets] = await db.query(
      `SELECT
        t.id,
        t.sla_policy_id,
        t.sla_response_due,
        t.sla_resolution_due,
        t.sla_first_response_at,
        t.sla_response_breached,
        t.sla_resolution_breached,
        t.created_at,
        t.status,
        p.name as policy_name,
        p.response_time_hours,
        p.resolution_time_hours
       FROM tickets t
       LEFT JOIN sla_policies p ON t.sla_policy_id = p.id
       WHERE t.id = ?`,
      [ticketId]
    );

    if (!tickets || tickets.length === 0) {
      return null;
    }

    const ticket = tickets[0];
    const now = new Date();

    // Calculate remaining time
    let responseTimeRemaining = null;
    if (ticket.sla_response_due) {
      responseTimeRemaining = Math.max(0, ticket.sla_response_due - now);
    }

    let resolutionTimeRemaining = null;
    if (ticket.sla_resolution_due) {
      resolutionTimeRemaining = Math.max(0, ticket.sla_resolution_due - now);
    }

    // Calculate response time (if first response exists)
    let responseTimeUsed = null;
    if (ticket.sla_first_response_at) {
      responseTimeUsed = ticket.sla_first_response_at - ticket.created_at;
    }

    return {
      ticket_id: ticket.id,
      policy_name: ticket.policy_name,
      response_time_hours: ticket.response_time_hours,
      resolution_time_hours: ticket.resolution_time_hours,
      response_due: ticket.sla_response_due,
      resolution_due: ticket.sla_resolution_due,
      first_response_at: ticket.sla_first_response_at,
      response_breached: !!ticket.sla_response_breached,
      resolution_breached: !!ticket.sla_resolution_breached,
      response_time_remaining_ms: responseTimeRemaining,
      resolution_time_remaining_ms: resolutionTimeRemaining,
      response_time_used_ms: responseTimeUsed,
      status: ticket.status
    };
  }

  /**
   * Get SLA dashboard statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - SLA statistics
   */
  static async getDashboardStats(filters = {}) {
    const { department_id = null } = filters;

    let query = `
      SELECT
        COUNT(*) as total_tickets,
        SUM(CASE WHEN sla_response_breached = 1 THEN 1 ELSE 0 END) as response_breached,
        SUM(CASE WHEN sla_resolution_breached = 1 THEN 1 ELSE 0 END) as resolution_breached,
        SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved_tickets,
        AVG(CASE WHEN sla_first_response_at IS NOT NULL
                 THEN TIMESTAMPDIFF(SECOND, created_at, sla_first_response_at)
                 ELSE NULL END) as avg_response_time_seconds
      FROM tickets
      WHERE 1=1
    `;

    const params = [];

    if (department_id) {
      query += ' AND department_id = ?';
      params.push(department_id);
    }

    const [rows] = await db.query(query, params);

    const stats = rows[0] || {};
    const totalTickets = stats.total_tickets || 0;

    return {
      total_tickets: totalTickets,
      response_breached: stats.response_breached || 0,
      resolution_breached: stats.resolution_breached || 0,
      resolved_tickets: stats.resolved_tickets || 0,
      response_breach_rate: totalTickets > 0 ? ((stats.response_breached || 0) / totalTickets * 100).toFixed(2) : 0,
      resolution_breach_rate: totalTickets > 0 ? ((stats.resolution_breached || 0) / totalTickets * 100).toFixed(2) : 0,
      avg_response_time_seconds: stats.avg_response_time_seconds ? Math.round(stats.avg_response_time_seconds) : 0
    };
  }

  /**
   * Get tickets at risk (close to breach)
   * @param {number} hoursWarning - Warning threshold in hours
   * @returns {Promise<Array>} - Tickets at risk
   */
  static async getTicketsAtRisk(hoursWarning = 2) {
    const warningTime = new Date();
    warningTime.setHours(warningTime.getHours() + hoursWarning);

    const [rows] = await db.query(
      `SELECT
        t.id,
        t.title,
        t.priority,
        t.created_at,
        t.sla_response_due,
        t.sla_resolution_due,
        t.sla_first_response_at,
        t.status,
        u.name as agent_name,
        d.name as department_name,
        (CASE
          WHEN t.sla_response_due IS NOT NULL AND t.sla_response_due < ? AND t.sla_first_response_at IS NULL
          THEN 1 ELSE 0
        END) as response_at_risk,
        (CASE
          WHEN t.sla_resolution_due IS NOT NULL AND t.sla_resolution_due < ? AND t.status NOT IN ('resolved', 'closed')
          THEN 1 ELSE 0
        END) as resolution_at_risk
       FROM tickets t
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN departments d ON t.department_id = d.id
       WHERE (t.sla_response_due < ? OR t.sla_resolution_due < ?)
         AND t.status NOT IN ('resolved', 'closed')
       ORDER BY CASE
         WHEN t.priority = 'Critical' THEN 1
         WHEN t.priority = 'High' THEN 2
         WHEN t.priority = 'Medium' THEN 3
         ELSE 4
       END,
       CASE WHEN t.sla_response_due < t.sla_resolution_due THEN t.sla_response_due ELSE t.sla_resolution_due END
      `,
      [warningTime, warningTime, warningTime, warningTime]
    );

    return rows;
  }

  /**
   * Get SLA compliance report
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Compliance data per department/agent
   */
  static async getComplianceReport(filters = {}) {
    const { group_by = 'department', period_days = 30 } = filters;

    let groupField = 'd.id, d.name';
    let groupWhere = '';

    if (group_by === 'agent') {
      groupField = 'u.id, u.name';
      groupWhere = 'AND t.assigned_to IS NOT NULL';
    }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - period_days);

    const [rows] = await db.query(
      `SELECT
        ${groupField},
        COUNT(*) as total_tickets,
        SUM(CASE WHEN sla_response_breached = 1 THEN 1 ELSE 0 END) as response_breached,
        SUM(CASE WHEN sla_resolution_breached = 1 THEN 1 ELSE 0 END) as resolution_breached,
        SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved,
        AVG(CASE WHEN sla_first_response_at IS NOT NULL
                 THEN TIMESTAMPDIFF(HOUR, created_at, sla_first_response_at)
                 ELSE NULL END) as avg_response_time_hours
       FROM tickets t
       ${group_by === 'agent' ? 'LEFT JOIN users u ON t.assigned_to = u.id' : 'LEFT JOIN departments d ON t.department_id = d.id'}
       WHERE t.created_at >= ? ${groupWhere}
       GROUP BY ${groupField}
       ORDER BY response_breached DESC
      `,
      [periodStart]
    );

    return rows.map(row => ({
      ...row,
      response_compliance_rate: row.total_tickets > 0
        ? (((row.total_tickets - (row.response_breached || 0)) / row.total_tickets) * 100).toFixed(2)
        : 100,
      resolution_compliance_rate: row.total_tickets > 0
        ? (((row.total_tickets - (row.resolution_breached || 0)) / row.total_tickets) * 100).toFixed(2)
        : 100
    }));
  }
}

module.exports = SLA;
