const Department = require('../models/Department');
const User = require('../models/User');
const Audit = require('../models/Audit');

// List all departments
exports.index = async (req, res, next) => {
  try {
    const departments = await Department.getAll();

    res.render('departments/index', {
      title: 'Departments',
      departments
    });
  } catch (error) {
    next(error);
  }
};

// Show create department form (admin only)
exports.showCreate = (req, res) => {
  res.render('departments/create', {
    title: 'Create Department'
  });
};

// Handle create department (admin only)
exports.create = async (req, res, next) => {
  try {
    const { name } = req.body;
    const deptId = await Department.create(name);

    // Log audit trail
    await Audit.log({
      user_id: req.session.userId,
      entity_type: 'department',
      entity_id: deptId,
      action: `Department Created`,
      old_value: null,
      new_value: `Name: ${name}`
    });

    req.flash('success', 'Department created successfully');
    res.redirect('/departments');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'Department name already exists');
      return res.redirect('/departments/create');
    }
    next(error);
  }
};

// Show edit department form (admin only)
exports.showEdit = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      req.flash('error', 'Department not found');
      return res.redirect('/departments');
    }

    // Get all agents
    const agents = await User.getAll({ role: 'agent' });

    // Get agents assigned to this department
    const assignedAgents = await User.getAgentsByDepartment(req.params.id);

    // Get department stats
    const allStats = await Department.getStats();
    const stats = allStats.find(s => s.id === parseInt(req.params.id));

    res.render('departments/edit', {
      title: 'Edit Department',
      department,
      agents,
      assignedAgents,
      stats
    });
  } catch (error) {
    next(error);
  }
};

// Handle update department (admin only)
exports.update = async (req, res, next) => {
  try {
    const { name, description, is_active, agent_ids } = req.body;
    
    // Get old department data for audit logging
    const oldDept = await Department.findById(req.params.id);
    if (!oldDept) {
      req.flash('error', 'Department not found');
      return res.redirect('/departments');
    }

    // Update department basic info
    await Department.update(req.params.id, { name, description, is_active: is_active === 'true' });

    // Update agent assignments
    // First, clear all agents from this department
    const db = require('../config/database');
    await db.query(
      'UPDATE users SET department_id = NULL WHERE department_id = ?',
      [req.params.id]
    );

    // Then assign selected agents to this department
    if (agent_ids && agent_ids.length > 0) {
      const agentIdsArray = Array.isArray(agent_ids) ? agent_ids : [agent_ids];
      await db.query(
        'UPDATE users SET department_id = ? WHERE id IN (?)',
        [req.params.id, agentIdsArray]
      );
    }

    // Track changes for audit log
    const changes = [];
    const newIsActive = is_active === 'true' ? true : false;
    const oldIsActive = Boolean(oldDept.is_active);

    if (oldDept.name !== name) changes.push(`Name: ${oldDept.name} → ${name}`);
    if ((oldDept.description || '') !== (description || '')) changes.push(`Description: Changed`);
    if (oldIsActive !== newIsActive) changes.push(`Status: ${oldIsActive ? 'Active' : 'Inactive'} → ${newIsActive ? 'Active' : 'Inactive'}`);
    changes.push(`Agents: Assigned`);

    // Log audit trail if there were changes
    if (changes.length > 0) {
      await Audit.log({
        user_id: req.session.userId,
        entity_type: 'department',
        entity_id: req.params.id,
        action: `Department Updated`,
        old_value: `Name: ${oldDept.name}, Active: ${oldDept.is_active ? 'Yes' : 'No'}`,
        new_value: changes.join(' | ')
      });
    }

    req.flash('success', 'Department updated successfully');
    res.redirect('/departments');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'Department name already exists');
      return res.redirect(`/departments/${req.params.id}/edit`);
    }
    next(error);
  }
};

// Delete department (admin only)
exports.delete = async (req, res, next) => {
  try {
    // Get department before deleting to log details
    const department = await Department.findById(req.params.id);
    if (!department) {
      req.flash('error', 'Department not found');
      return res.redirect('/departments');
    }

    await Department.delete(req.params.id);

    // Log audit trail
    await Audit.log({
      user_id: req.session.userId,
      entity_type: 'department',
      entity_id: req.params.id,
      action: `Department Deleted`,
      old_value: `Name: ${department.name}`,
      new_value: 'Department Permanently Deleted'
    });

    req.flash('success', 'Department deleted successfully');
    res.redirect('/departments');
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      req.flash('error', 'Cannot delete department with existing tickets');
      return res.redirect('/departments');
    }
    next(error);
  }
};

// Show department stats (all departments)
exports.stats = async (req, res, next) => {
  try {
    const stats = await Department.getStats();

    res.render('departments/stats', {
      title: 'Department Statistics',
      stats
    });
  } catch (error) {
    next(error);
  }
};

// Show individual department stats
exports.departmentStats = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      req.flash('error', 'Department not found');
      return res.redirect('/departments');
    }

    const { stats, chartData } = await Department.getDetailedStats(req.params.id);

    res.render('departments/stats', {
      title: `${department.name} - Statistics`,
      stats,
      chartData,
      department
    });
  } catch (error) {
    next(error);
  }
};
