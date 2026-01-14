const db = require('../config/database');

class Department {
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async getAll() {
    const [rows] = await db.query(`
      SELECT
        d.id,
        d.name,
        d.description,
        d.is_active,
        d.created_at,
        d.updated_at,
        COUNT(DISTINCT u.id) as agent_count,
        COUNT(DISTINCT t.id) as total_tickets,
        SUM(CASE WHEN t.status = 'Open' THEN 1 ELSE 0 END) as open_tickets,
        SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tickets,
        SUM(CASE WHEN t.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_tickets,
        SUM(CASE WHEN t.status = 'Closed' THEN 1 ELSE 0 END) as closed_tickets,
        SUM(CASE WHEN t.priority = 'Critical' THEN 1 ELSE 0 END) as critical_tickets
      FROM departments d
      LEFT JOIN users u ON d.id = u.department_id AND u.role = 'agent'
      LEFT JOIN tickets t ON d.id = t.department_id
      GROUP BY d.id, d.name, d.description, d.is_active, d.created_at, d.updated_at
      ORDER BY d.name ASC
    `);
    return rows;
  }

  static async create(name) {
    const [result] = await db.query(
      'INSERT INTO departments (name) VALUES (?)',
      [name]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const { name, description, is_active } = data;
    await db.query(
      'UPDATE departments SET name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description || null, is_active ? 1 : 0, id]
    );
  }

  static async delete(id) {
    await db.query('DELETE FROM departments WHERE id = ?', [id]);
  }

  static async getStats() {
    const [rows] = await db.query(`
      SELECT
        d.id,
        d.name,
        COUNT(t.id) as total_tickets,
        SUM(CASE WHEN t.status = 'Open' THEN 1 ELSE 0 END) as open_tickets,
        SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tickets,
        SUM(CASE WHEN t.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_tickets,
        SUM(CASE WHEN t.status = 'Closed' THEN 1 ELSE 0 END) as closed_tickets,
        SUM(CASE WHEN t.priority = 'Critical' THEN 1 ELSE 0 END) as critical_tickets
      FROM departments d
      LEFT JOIN tickets t ON d.id = t.department_id
      GROUP BY d.id, d.name
      ORDER BY d.name ASC
    `);
    return rows;
  }

  static async getDetailedStats(departmentId) {
    // Get basic stats
    const [statsRows] = await db.query(`
      SELECT
        d.id,
        d.name,
        COUNT(t.id) as totalTickets,
        SUM(CASE WHEN t.status = 'Open' THEN 1 ELSE 0 END) as openTickets,
        SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) as inProgressTickets,
        SUM(CASE WHEN t.status = 'Resolved' THEN 1 ELSE 0 END) as resolvedTickets,
        SUM(CASE WHEN t.status = 'Closed' THEN 1 ELSE 0 END) as closedTickets,
        SUM(CASE WHEN t.priority = 'Low' THEN 1 ELSE 0 END) as lowPriority,
        SUM(CASE WHEN t.priority = 'Medium' THEN 1 ELSE 0 END) as mediumPriority,
        SUM(CASE WHEN t.priority = 'High' THEN 1 ELSE 0 END) as highPriority,
        SUM(CASE WHEN t.priority = 'Urgent' THEN 1 ELSE 0 END) as urgentPriority
      FROM departments d
      LEFT JOIN tickets t ON d.id = t.department_id
      WHERE d.id = ?
      GROUP BY d.id, d.name
    `, [departmentId]);

    const stats = statsRows[0] || {
      id: departmentId,
      name: '',
      totalTickets: 0,
      openTickets: 0,
      inProgressTickets: 0,
      resolvedTickets: 0,
      closedTickets: 0,
      lowPriority: 0,
      mediumPriority: 0,
      highPriority: 0,
      urgentPriority: 0
    };

    // Get chart data for last 30 days
    const [chartRows] = await db.query(`
      SELECT
        DATE(created_at) as date,
        SUM(CASE WHEN status != 'Closed' THEN 1 ELSE 0 END) as created,
        SUM(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as resolved
      FROM tickets
      WHERE department_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [departmentId]);

    // Get recent tickets
    const [recentTicketsRows] = await db.query(`
      SELECT
        t.id,
        t.subject,
        t.status,
        t.priority,
        t.created_at,
        u.name as customer_name
      FROM tickets t
      LEFT JOIN users u ON t.customer_id = u.id
      WHERE t.department_id = ?
      ORDER BY t.created_at DESC
      LIMIT 5
    `, [departmentId]);

    // Format chart data
    const chartData = {
      dates: chartRows.map(row => row.date),
      created: chartRows.map(row => row.created || 0),
      resolved: chartRows.map(row => row.resolved || 0)
    };

    return { stats, chartData, recentTickets: recentTicketsRows };
  }
}

module.exports = Department;
