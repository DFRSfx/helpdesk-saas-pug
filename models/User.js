const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  static async findById(id) {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.department_id, u.created_at, u.updated_at,
              d.id as department_id_obj, d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [id]
    );
    
    if (!rows[0]) return null;
    
    const user = rows[0];
    // Add departments array for agents
    if (user.role === 'agent' && user.department_name) {
      user.departments = [{ id: user.department_id_obj, name: user.department_name }];
    } else {
      user.departments = [];
    }
    
    return user;
  }

  static async findByEmail(email) {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  static async create(userData) {
    const { name, email, password, role = 'customer' } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    return result.insertId;
  }

  static async update(id, userData) {
    const { name, email, role, is_active, new_password, department_id } = userData;
    let query = 'UPDATE users SET name = ?, email = ?, role = ?, is_active = ?, department_id = ?, updated_at = CURRENT_TIMESTAMP';
    const params = [name, email, role, is_active ? 1 : 0, department_id || null];

    if (new_password) {
      const hashedPassword = await bcrypt.hash(new_password, 10);
      query += ', password_hash = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await db.query(query, params);
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async getAll(filters = {}) {
    let query = 'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE 1=1';
    const params = [];

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.is_active !== null && filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.is_active !== null && filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  static async delete(id) {
    await db.query('DELETE FROM users WHERE id = ?', [id]);
  }

  static async getAgentsByDepartment(departmentId) {
    const [rows] = await db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        COUNT(CASE WHEN t.status IN ('Open', 'In Progress', 'Waiting', 'Escalated') THEN 1 END) as assigned_count,
        COUNT(CASE WHEN t.status IN ('Resolved', 'Closed') THEN 1 END) as resolved_count
      FROM users u
      LEFT JOIN tickets t ON u.id = t.agent_id
      WHERE u.role = 'agent' AND u.department_id = ?
      GROUP BY u.id, u.name, u.email
    `, [departmentId]);
    return rows;
  }

  static async getAgentWithLowestWorkload(departmentId) {
    // First, try to find an agent in the specified department
    const [rows] = await db.query(`
      SELECT u.id, u.name, u.email, COUNT(t.id) as ticket_count
      FROM users u
      LEFT JOIN tickets t ON u.id = t.agent_id 
        AND t.status IN ('Open', 'In Progress', 'Waiting', 'Escalated')
      WHERE u.role = 'agent' 
        AND u.is_active = 1
        AND u.department_id = ?
      GROUP BY u.id, u.name, u.email
      ORDER BY ticket_count ASC, u.id ASC
      LIMIT 1
    `, [departmentId]);
    
    if (rows[0]) {
      return rows[0];
    }
    
    // Fallback: get any active agent with lowest workload
    const [fallbackRows] = await db.query(`
      SELECT u.id, u.name, u.email, COUNT(t.id) as ticket_count
      FROM users u
      LEFT JOIN tickets t ON u.id = t.agent_id 
        AND t.status IN ('Open', 'In Progress', 'Waiting', 'Escalated')
      WHERE u.role = 'agent' 
        AND u.is_active = 1
      GROUP BY u.id, u.name, u.email
      ORDER BY ticket_count ASC, u.id ASC
      LIMIT 1
    `);
    
    return fallbackRows[0];
  }
}

module.exports = User;
