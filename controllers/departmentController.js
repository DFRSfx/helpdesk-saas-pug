/**
 * Department Controller
 * Handles department management operations
 */

const Department = require('../models/Department');
const User = require('../models/User');
const Audit = require('../models/Audit');
const { validationResult } = require('express-validator');

class DepartmentController {
  /**
   * Show all departments
   * GET /departments
   */
  static async index(req, res) {
    try {
      const departments = await Department.findAll(false);

      res.render('departments/index', {
        title: 'Departments',
        departments,
        error: req.flash('error'),
        success: req.flash('success'),
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error fetching departments:', error);
      req.flash('error', 'Error loading departments');
      res.redirect('/dashboard');
    }
  }

  /**
   * Show department details
   * GET /departments/:id
   * @param {number} id - Department ID
   */
  static async show(req, res) {
    try {
      const departmentId = req.params.id;
      const department = await Department.findById(departmentId);

      if (!department) {
        req.flash('error', 'Department not found');
        return res.redirect('/departments');
      }

      // Get department statistics
      const stats = await Department.getStatistics(departmentId);

      // Get agents in department
      const agents = await Department.getAgents(departmentId);

      res.render('departments/view', {
        title: department.name,
        department,
        stats,
        agents,
        error: req.flash('error'),
        success: req.flash('success'),
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error fetching department:', error);
      req.flash('error', 'Error loading department');
      res.redirect('/departments');
    }
  }

  /**
   * Show create department form
   * GET /departments/create
   */
  static async showCreate(req, res) {
    try {
      // Get all agents for manager selection
      const agents = await User.findAll({ role: 'agent', status: 'active' });

      res.render('departments/create', {
        title: 'Create Department',
        agents,
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
      res.redirect('/departments');
    }
  }

  /**
   * Handle department creation
   * POST /departments/create
   * @body {string} name - Department name
   * @body {string} description - Department description
   * @body {string} slug - Department slug (URL-friendly name)
   * @body {string} email - Department email
   * @body {number} manager_id - Manager user ID
   * @body {boolean} auto_assign - Enable auto-assignment
   */
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/departments/create');
      }

      const { name, description, slug, email, manager_id, auto_assign } = req.body;

      // Check if slug already exists
      const existing = await Department.findBySlug(slug);
      if (existing) {
        req.flash('error', 'A department with this slug already exists');
        return res.redirect('/departments/create');
      }

      // Create department
      const department = await Department.create({
        name,
        description,
        slug,
        email,
        manager_id: manager_id || null,
        auto_assign: auto_assign === 'on'
      });

      // Log creation
      await Audit.create({
        user_id: req.session.userId,
        action: 'created',
        entity_type: 'department',
        entity_id: department.id,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        description: `Department created: ${name}`
      });

      req.flash('success', 'Department created successfully');
      res.redirect('/departments');

    } catch (error) {
      console.error('Error creating department:', error);
      req.flash('error', 'Error creating department');
      res.redirect('/departments/create');
    }
  }

  /**
   * Show edit department form
   * GET /departments/:id/edit
   * @param {number} id - Department ID
   */
  static async showEdit(req, res) {
    try {
      const departmentId = req.params.id;
      const department = await Department.findById(departmentId);

      if (!department) {
        req.flash('error', 'Department not found');
        return res.redirect('/departments');
      }

      // Get all agents for manager selection
      const agents = await User.findAll({ role: 'agent', status: 'active' });

      res.render('departments/edit', {
        title: `Edit ${department.name}`,
        department,
        agents,
        error: req.flash('error'),
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error showing edit form:', error);
      req.flash('error', 'Error loading department');
      res.redirect('/departments');
    }
  }

  /**
   * Handle department update
   * POST /departments/:id/edit
   * @param {number} id - Department ID
   * @body {string} name - Department name
   * @body {string} description - Department description
   * @body {string} email - Department email
   * @body {number} manager_id - Manager user ID
   * @body {boolean} auto_assign - Enable auto-assignment
   * @body {boolean} is_active - Department active status
   */
  static async update(req, res) {
    try {
      const departmentId = req.params.id;
      const { name, description, email, manager_id, auto_assign, is_active } = req.body;

      const department = await Department.findById(departmentId);
      if (!department) {
        req.flash('error', 'Department not found');
        return res.redirect('/departments');
      }

      // Update department
      await Department.update(departmentId, {
        name,
        description,
        email,
        manager_id: manager_id || null,
        auto_assign: auto_assign === 'on',
        is_active: is_active === 'on'
      });

      // Log update
      await Audit.create({
        user_id: req.session.userId,
        action: 'updated',
        entity_type: 'department',
        entity_id: departmentId,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        description: `Department updated: ${name}`
      });

      req.flash('success', 'Department updated successfully');
      res.redirect(`/departments/${departmentId}`);

    } catch (error) {
      console.error('Error updating department:', error);
      req.flash('error', 'Error updating department');
      res.redirect(`/departments/${req.params.id}/edit`);
    }
  }

  /**
   * Delete department (soft delete)
   * POST /departments/:id/delete
   * @param {number} id - Department ID
   */
  static async delete(req, res) {
    try {
      const departmentId = req.params.id;

      await Department.delete(departmentId);

      // Log deletion
      await Audit.create({
        user_id: req.session.userId,
        action: 'deleted',
        entity_type: 'department',
        entity_id: departmentId,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        description: 'Department deactivated'
      });

      req.flash('success', 'Department deactivated successfully');
      res.redirect('/departments');

    } catch (error) {
      console.error('Error deleting department:', error);
      req.flash('error', 'Error deleting department');
      res.redirect('/departments');
    }
  }
}

module.exports = DepartmentController;
