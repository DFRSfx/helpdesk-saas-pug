/**
 * User Controller
 * Handles user management operations (admin only)
 */

const User = require('../models/User');
const Department = require('../models/Department');
const Audit = require('../models/Audit');
const { validationResult } = require('express-validator');

class UserController {
  /**
   * Show all users with filters
   * GET /users
   * @query {string} role - Filter by role
   * @query {string} status - Filter by status
   * @query {string} search - Search term
   */
  static async index(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 50;
      const offset = (page - 1) * limit;

      const filters = {};
      if (req.query.role) filters.role = req.query.role;
      if (req.query.status) filters.status = req.query.status;
      if (req.query.search) filters.search = req.query.search;

      const users = await User.findAll(filters, limit, offset);
      const departments = await Department.findAll(true);

      res.render('users/index', {
        title: 'User Management',
        users,
        departments,
        filters: req.query,
        error: req.flash('error'),
        success: req.flash('success'),
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      req.flash('error', 'Error loading users');
      res.redirect('/dashboard');
    }
  }

  /**
   * Show user profile
   * GET /users/:id
   * @param {number} id - User ID
   */
  static async show(req, res) {
    try {
      const userId = req.params.id;
      const userData = await User.findById(userId);

      if (!userData) {
        req.flash('error', 'User not found');
        return res.redirect('/users');
      }

      res.render('users/view', {
        title: `${userData.first_name} ${userData.last_name}`,
        userData,
        error: req.flash('error'),
        success: req.flash('success'),
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error fetching user:', error);
      req.flash('error', 'Error loading user');
      res.redirect('/users');
    }
  }

  /**
   * Show create user form
   * GET /users/create
   */
  static async showCreate(req, res) {
    try {
      const departments = await Department.findAll(true);

      res.render('users/create', {
        title: 'Create User',
        departments,
        error: req.flash('error'),
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error showing create form:', error);
      req.flash('error', 'Error loading form');
      res.redirect('/users');
    }
  }

  /**
   * Handle user creation
   * POST /users/create
   * @body {string} email - User email
   * @body {string} password - User password
   * @body {string} first_name - First name
   * @body {string} last_name - Last name
   * @body {string} role - User role (admin, agent, customer)
   * @body {string} phone - Phone number
   * @body {number} department_id - Department ID (for agents)
   */
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/users/create');
      }

      const { email, password, first_name, last_name, role, phone, department_id } = req.body;

      // Check if user already exists
      const existing = await User.findByEmail(email);
      if (existing) {
        req.flash('error', 'A user with this email already exists');
        return res.redirect('/users/create');
      }

      // Create user
      const newUser = await User.create({
        email,
        password,
        first_name,
        last_name,
        role: role || 'customer',
        phone,
        department_id: (role === 'agent' && department_id) ? department_id : null
      });

      // Log creation
      await Audit.create({
        user_id: req.session.userId,
        action: 'created',
        entity_type: 'user',
        entity_id: newUser.id,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        description: `User created: ${email}`
      });

      req.flash('success', 'User created successfully');
      res.redirect('/users');

    } catch (error) {
      console.error('Error creating user:', error);
      req.flash('error', 'Error creating user');
      res.redirect('/users/create');
    }
  }

  /**
   * Show edit user form
   * GET /users/:id/edit
   * @param {number} id - User ID
   */
  static async showEdit(req, res) {
    try {
      const userId = req.params.id;
      const userData = await User.findById(userId);

      if (!userData) {
        req.flash('error', 'User not found');
        return res.redirect('/users');
      }

      const departments = await Department.findAll(true);

      res.render('users/edit', {
        title: `Edit ${userData.first_name} ${userData.last_name}`,
        userData,
        departments,
        error: req.flash('error'),
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error showing edit form:', error);
      req.flash('error', 'Error loading user');
      res.redirect('/users');
    }
  }

  /**
   * Handle user update
   * POST /users/:id/edit
   * @param {number} id - User ID
   * @body {string} first_name - First name
   * @body {string} last_name - Last name
   * @body {string} email - Email
   * @body {string} role - User role
   * @body {string} status - User status
   * @body {string} phone - Phone number
   * @body {number} department_id - Department ID
   */
  static async update(req, res) {
    try {
      const userId = req.params.id;
      const { first_name, last_name, email, role, status, phone, department_id } = req.body;

      const userData = await User.findById(userId);
      if (!userData) {
        req.flash('error', 'User not found');
        return res.redirect('/users');
      }

      // Update user
      await User.update(userId, {
        first_name,
        last_name,
        email,
        role,
        status,
        phone,
        department_id: (role === 'agent' && department_id) ? department_id : null
      });

      // Log update
      await Audit.create({
        user_id: req.session.userId,
        action: 'updated',
        entity_type: 'user',
        entity_id: userId,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        description: `User updated: ${email}`
      });

      req.flash('success', 'User updated successfully');
      res.redirect(`/users/${userId}`);

    } catch (error) {
      console.error('Error updating user:', error);
      req.flash('error', 'Error updating user');
      res.redirect(`/users/${req.params.id}/edit`);
    }
  }

  /**
   * Show change password form
   * GET /users/:id/change-password
   * @param {number} id - User ID
   */
  static async showChangePassword(req, res) {
    try {
      const userId = req.params.id;
      const userData = await User.findById(userId);

      if (!userData) {
        req.flash('error', 'User not found');
        return res.redirect('/users');
      }

      // Users can only change their own password unless they're admin
      if (req.session.userRole !== 'admin' && req.session.userId !== parseInt(userId)) {
        req.flash('error', 'Permission denied');
        return res.redirect('/dashboard');
      }

      res.render('users/change-password', {
        title: 'Change Password',
        userData,
        error: req.flash('error'),
        success: req.flash('success'),
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error showing change password form:', error);
      req.flash('error', 'Error loading form');
      res.redirect('/users');
    }
  }

  /**
   * Handle password change
   * POST /users/:id/change-password
   * @param {number} id - User ID
   * @body {string} current_password - Current password (required for non-admin)
   * @body {string} new_password - New password
   * @body {string} confirm_password - Password confirmation
   */
  static async changePassword(req, res) {
    try {
      const userId = req.params.id;
      const { current_password, new_password, confirm_password } = req.body;

      const userData = await User.findById(userId);
      if (!userData) {
        req.flash('error', 'User not found');
        return res.redirect('/users');
      }

      // Verify current password if not admin changing another user's password
      if (req.session.userRole !== 'admin' || req.session.userId === parseInt(userId)) {
        const isValid = await User.verifyPassword(current_password, userData.password);
        if (!isValid) {
          req.flash('error', 'Current password is incorrect');
          return res.redirect(`/users/${userId}/change-password`);
        }
      }

      // Verify password match
      if (new_password !== confirm_password) {
        req.flash('error', 'New passwords do not match');
        return res.redirect(`/users/${userId}/change-password`);
      }

      // Update password
      await User.updatePassword(userId, new_password);

      // Log password change
      await Audit.create({
        user_id: req.session.userId,
        action: 'password_changed',
        entity_type: 'user',
        entity_id: userId,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        description: 'Password changed'
      });

      req.flash('success', 'Password changed successfully');
      res.redirect(`/users/${userId}`);

    } catch (error) {
      console.error('Error changing password:', error);
      req.flash('error', 'Error changing password');
      res.redirect(`/users/${req.params.id}/change-password`);
    }
  }

  /**
   * Delete user (soft delete)
   * POST /users/:id/delete
   * @param {number} id - User ID
   */
  static async delete(req, res) {
    try {
      const userId = req.params.id;

      // Prevent deleting own account
      if (req.session.userId === parseInt(userId)) {
        req.flash('error', 'You cannot delete your own account');
        return res.redirect('/users');
      }

      await User.delete(userId);

      // Log deletion
      await Audit.create({
        user_id: req.session.userId,
        action: 'deleted',
        entity_type: 'user',
        entity_id: userId,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        description: 'User deactivated'
      });

      req.flash('success', 'User deactivated successfully');
      res.redirect('/users');

    } catch (error) {
      console.error('Error deleting user:', error);
      req.flash('error', 'Error deleting user');
      res.redirect('/users');
    }
  }
}

module.exports = UserController;
