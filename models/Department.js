/**
 * Department Model
 * Handles all department-related database operations
 */

const { pool } = require('../config/database');

class Department {
  /**
   * Find department by ID
   * @param {number} id - Department ID
   * @returns {Promise<Object|null>} Department object or null
   */
  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT d.*, 
              CONCAT(u.first_name, ' ', u.last_name) as manager_name,
              u.email as manager_email
       FROM departments d
       LEFT JOIN users u ON d.manager_id = u.id
       WHERE d.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Find department by slug
   * @param {string} slug - Department slug
   * @returns {Promise<Object|null>} Department object or null
   */
  static async findBySlug(slug) {
    const [rows] = await pool.query(
      `SELECT d.*, 
              CONCAT(u.first_name, ' ', u.last_name) as manager_name
       FROM departments d
       LEFT JOIN users u ON d.manager_id = u.id
       WHERE d.slug = ?`,
      [slug]
    );
    return rows[0] || null;
  }

  /**
   * Get all departments
   * @param {boolean} activeOnly - Return only active departments
   * @returns {Promise<Array>} Array of departments
   */
  static async findAll(activeOnly = false) {
    let query = `
      SELECT d.*, 
             CONCAT(u.first_name, ' ', u.last_name) as manager_name,
             (SELECT COUNT(*) FROM users WHERE department_id = d.id AND role = 'agent' AND status = 'active') as agent_count,
             (SELECT COUNT(*) FROM tickets WHERE department_id = d.id AND status NOT IN ('resolved', 'closed')) as open_tickets
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.id
    `;
    
    if (activeOnly) {
      query += ' WHERE d.is_active = TRUE';
    }
    
    query += ' ORDER BY d.name ASC';
    
    const [rows] = await pool.query(query);
    return rows;
  }

  /**
   * Create new department
   * @param {Object} departmentData - Department data
   * @returns {Promise<Object>} Created department with ID
   */
  static async create(departmentData) {
    const { name, description, slug, email, manager_id, auto_assign } = departmentData;
    
    const [result] = await pool.query(
      `INSERT INTO departments (name, description, slug, email, manager_id, auto_assign) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, slug, email, manager_id, auto_assign || false]
    );
    
    return { id: result.insertId, ...departmentData };
  }

  /**
   * Update department
   * @param {number} id - Department ID
   * @param {Object} departmentData - Updated department data
   * @returns {Promise<boolean>} Success status
   */
  static async update(id, departmentData) {
    const fields = [];
    const values = [];
    
    Object.keys(departmentData).forEach(key => {
      if (key !== 'id' && departmentData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(departmentData[key]);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const [result] = await pool.query(
      `UPDATE departments SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Delete department
   * @param {number} id - Department ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    // Set to inactive instead of hard delete to preserve data integrity
    const [result] = await pool.query(
      'UPDATE departments SET is_active = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get department statistics
   * @param {number} id - Department ID
   * @returns {Promise<Object>} Department statistics
   */
  static async getStatistics(id) {
    const [stats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE department_id = ? AND role = 'agent' AND status = 'active') as active_agents,
        (SELECT COUNT(*) FROM tickets WHERE department_id = ?) as total_tickets,
        (SELECT COUNT(*) FROM tickets WHERE department_id = ? AND status = 'open') as open_tickets,
        (SELECT COUNT(*) FROM tickets WHERE department_id = ? AND status = 'in_progress') as in_progress_tickets,
        (SELECT COUNT(*) FROM tickets WHERE department_id = ? AND status = 'resolved') as resolved_tickets,
        (SELECT COUNT(*) FROM tickets WHERE department_id = ? AND status = 'closed') as closed_tickets,
        (SELECT AVG(resolution_time) FROM tickets WHERE department_id = ? AND resolution_time IS NOT NULL) as avg_resolution_time
    `, [id, id, id, id, id, id, id]);
    
    return stats[0];
  }

  /**
   * Get agents in department
   * @param {number} id - Department ID
   * @returns {Promise<Array>} Array of agents
   */
  static async getAgents(id) {
    const [rows] = await pool.query(
      `SELECT 
        u.id, u.email, u.first_name, u.last_name, u.status,
        (SELECT COUNT(*) FROM tickets WHERE assigned_agent_id = u.id AND status NOT IN ('resolved', 'closed')) as active_tickets
       FROM users u
       WHERE u.department_id = ? AND u.role = 'agent'
       ORDER BY u.first_name, u.last_name`,
      [id]
    );
    return rows;
  }
}

module.exports = Department;
