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
}

module.exports = Department;
