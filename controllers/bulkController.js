/**
 * Bulk Operations Controller
 * Handles bulk ticket operations (assign, status change, delete, etc.)
 */

const db = require('../config/database');
const Ticket = require('../models/Ticket');
const Audit = require('../models/Audit');

/**
 * POST /api/bulk/assign-agent
 * Bulk assign tickets to an agent
 */
exports.apiAssignAgent = async (req, res, next) => {
  try {
    if (req.session.user.role === 'customer') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { ticket_ids, agent_id } = req.body;

    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ticket_ids' });
    }

    if (!agent_id) {
      return res.status(400).json({ error: 'agent_id is required' });
    }

    // Verify agent exists
    const [agents] = await db.query('SELECT id FROM users WHERE id = ? AND role = "agent"', [agent_id]);
    if (!agents || agents.length === 0) {
      return res.status(400).json({ error: 'Invalid agent' });
    }

    // Update tickets
    const placeholders = ticket_ids.map(() => '?').join(',');
    const [result] = await db.query(
      `UPDATE tickets SET assigned_to = ?, updated_at = NOW() WHERE id IN (${placeholders})`,
      [agent_id, ...ticket_ids]
    );

    // Log audit for each ticket
    for (const ticketId of ticket_ids) {
      await Audit.log(req.session.userId, 'ticket_assigned', {
        ticket_id: ticketId,
        agent_id
      });
    }

    res.json({
      success: true,
      affected: result.affectedRows,
      message: `${result.affectedRows} ticket(s) assigned to agent`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/bulk/change-status
 * Bulk change ticket status
 */
exports.apiChangeStatus = async (req, res, next) => {
  try {
    if (req.session.user.role === 'customer') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { ticket_ids, status } = req.body;
    const validStatuses = ['Open', 'In Progress', 'Waiting', 'Escalated', 'Resolved', 'Closed'];

    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ticket_ids' });
    }

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Update tickets
    const placeholders = ticket_ids.map(() => '?').join(',');
    const [result] = await db.query(
      `UPDATE tickets SET status = ?, updated_at = NOW() WHERE id IN (${placeholders})`,
      [status, ...ticket_ids]
    );

    // Log audit for each ticket
    for (const ticketId of ticket_ids) {
      await Audit.log(req.session.userId, 'status_changed', {
        ticket_id: ticketId,
        old_value: 'Multiple',
        new_value: status
      });
    }

    res.json({
      success: true,
      affected: result.affectedRows,
      message: `${result.affectedRows} ticket(s) status changed to ${status}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/bulk/change-priority
 * Bulk change ticket priority
 */
exports.apiChangePriority = async (req, res, next) => {
  try {
    if (req.session.user.role === 'customer') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { ticket_ids, priority } = req.body;
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];

    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ticket_ids' });
    }

    if (!priority || !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    // Update tickets
    const placeholders = ticket_ids.map(() => '?').join(',');
    const [result] = await db.query(
      `UPDATE tickets SET priority = ?, updated_at = NOW() WHERE id IN (${placeholders})`,
      [priority, ...ticket_ids]
    );

    // Log audit for each ticket
    for (const ticketId of ticket_ids) {
      await Audit.log(req.session.userId, 'priority_changed', {
        ticket_id: ticketId,
        new_value: priority
      });
    }

    res.json({
      success: true,
      affected: result.affectedRows,
      message: `${result.affectedRows} ticket(s) priority changed to ${priority}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/bulk/delete
 * Bulk delete tickets (soft delete)
 */
exports.apiDelete = async (req, res, next) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { ticket_ids } = req.body;

    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ticket_ids' });
    }

    // Soft delete - mark as deleted
    const placeholders = ticket_ids.map(() => '?').join(',');
    const [result] = await db.query(
      `UPDATE tickets SET is_deleted = 1, deleted_at = NOW() WHERE id IN (${placeholders})`,
      ticket_ids
    );

    // Log audit for each ticket
    for (const ticketId of ticket_ids) {
      await Audit.log(req.session.userId, 'ticket_deleted', {
        ticket_id: ticketId
      });
    }

    res.json({
      success: true,
      affected: result.affectedRows,
      message: `${result.affectedRows} ticket(s) deleted`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/bulk/export
 * Export selected tickets to CSV
 */
exports.apiExport = async (req, res, next) => {
  try {
    const { ticket_ids, format = 'csv' } = req.body;

    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ticket_ids' });
    }

    // Get ticket data
    const placeholders = ticket_ids.map(() => '?').join(',');
    const [tickets] = await db.query(
      `SELECT
        t.*,
        c.name as customer_name,
        a.name as agent_name,
        d.name as department_name
       FROM tickets t
       LEFT JOIN users c ON t.customer_id = c.id
       LEFT JOIN users a ON t.assigned_to = a.id
       LEFT JOIN departments d ON t.department_id = d.id
       WHERE t.id IN (${placeholders})`,
      ticket_ids
    );

    if (format === 'csv') {
      // Generate CSV
      const headers = ['ID', 'Title', 'Status', 'Priority', 'Customer', 'Agent', 'Department', 'Created', 'Updated'];
      const rows = tickets.map(t => [
        t.id,
        `"${t.title}"`,
        t.status,
        t.priority,
        t.customer_name || '-',
        t.agent_name || '-',
        t.department_name || '-',
        t.created_at,
        t.updated_at
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="tickets-export-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.status(400).json({ error: 'Unsupported format' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bulk/actions
 * Get available bulk actions
 */
exports.apiGetActions = (req, res) => {
  const actions = [
    {
      id: 'assign_agent',
      name: 'Assign Agent',
      description: 'Assign selected tickets to an agent',
      icon: 'user-plus'
    },
    {
      id: 'change_status',
      name: 'Change Status',
      description: 'Change status of selected tickets',
      icon: 'arrow-right',
      options: ['Open', 'In Progress', 'Waiting', 'Escalated', 'Resolved', 'Closed']
    },
    {
      id: 'change_priority',
      name: 'Change Priority',
      description: 'Change priority of selected tickets',
      icon: 'arrow-up',
      options: ['Low', 'Medium', 'High', 'Critical']
    },
    {
      id: 'export',
      name: 'Export',
      description: 'Export selected tickets',
      icon: 'download'
    }
  ];

  // Only show delete for admins
  if (req.session.user.role === 'admin') {
    actions.push({
      id: 'delete',
      name: 'Delete',
      description: 'Delete selected tickets (soft delete)',
      icon: 'trash',
      confirm: true
    });
  }

  res.json(actions);
};
