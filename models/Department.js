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
    const [rows] = await db.query(
      'SELECT * FROM departments ORDER BY name ASC'
    );
    return rows;
  }

  static async create(name) {
    const [result] = await db.query(
      'INSERT INTO departments (name) VALUES (?)',
      [name]
    );
    return result.insertId;
  }

  static async update(id, name) {
    await db.query(
      'UPDATE departments SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, id]
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
