/**
 * User Model
 * Handles all user-related database operations
 */

const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT u.*, d.name as department_name, r.name as role_name 
       FROM users u 
       LEFT JOIN departments d ON u.department_id = d.id 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByEmail(email) {
    const [rows] = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.email = ? AND u.deleted_at IS NULL`,
      [email]
    );
    return rows[0] || null;
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user with ID
   */
  static async create(userData) {
    const { email, password, first_name, last_name, role, phone, department_id } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role, phone, department_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, hashedPassword, first_name, last_name, role || 'customer', phone, department_id]
    );
    
    return { id: result.insertId, ...userData };
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<boolean>} Success status
   */
  static async update(id, userData) {
    const fields = [];
    const values = [];
    
    // Build dynamic update query
    Object.keys(userData).forEach(key => {
      if (key !== 'id' && key !== 'password' && userData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(userData[key]);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const [result] = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Update user password
   * @param {number} id - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Verify password
   * @param {string} plainPassword - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {Promise<boolean>} Match status
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Get all users with optional filters
   * @param {Object} filters - Filter criteria (role, status, department_id)
   * @param {number} limit - Results limit
   * @param {number} offset - Results offset
   * @returns {Promise<Array>} Array of users
   */
  static async findAll(filters = {}, limit = 50, offset = 0) {
    let query = `
      SELECT u.*, d.name as department_name 
      FROM users u 
      LEFT JOIN departments d ON u.department_id = d.id 
      WHERE 1=1
    `;
    const params = [];
    
    if (filters.role) {
      query += ' AND u.role = ?';
      params.push(filters.role);
    }
    
    if (filters.status) {
      query += ' AND u.status = ?';
      params.push(filters.status);
    }
    
    if (filters.department_id) {
      query += ' AND u.department_id = ?';
      params.push(filters.department_id);
    }
    
    if (filters.search) {
      query += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Get agents by department for assignment
   * @param {number} departmentId - Department ID
   * @returns {Promise<Array>} Array of available agents
   */
  static async getAgentsByDepartment(departmentId) {
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, email 
       FROM users 
       WHERE role = 'agent' AND status = 'active' AND department_id = ?`,
      [departmentId]
    );
    return rows;
  }

  /**
   * Update last login timestamp
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async updateLastLogin(id) {
    const [result] = await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Delete user (soft delete by setting status to inactive)
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const [result] = await pool.query(
      'UPDATE users SET status = ? WHERE id = ?',
      ['inactive', id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  static async getStatistics() {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN ur.code = 'customer' THEN 1 ELSE 0 END) as customers,
        SUM(CASE WHEN ur.code = 'agent' THEN 1 ELSE 0 END) as agents,
        SUM(CASE WHEN ur.code = 'admin' THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN us.code = 'active' THEN 1 ELSE 0 END) as active_users
      FROM users u
      LEFT JOIN user_role ur ON u.role_id = ur.id
      LEFT JOIN user_status us ON u.status_id = us.id
      WHERE u.deleted_at IS NULL
    `);
    return stats[0];
  }
}

module.exports = User;
