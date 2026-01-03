const User = require('../models/User');
const Audit = require('../models/Audit');

// List all users (admin only)
exports.index = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const filters = {
      limit,
      offset,
      role: req.query.role,
      search: req.query.search,
      is_active: req.query.status === 'active' ? true : req.query.status === 'inactive' ? false : null
    };

    const users = await User.getAll(filters);
    const total = await User.count(filters);
    const totalPages = Math.ceil(total / limit);

    // Get user statistics
    const totalCustomers = await User.count({ role: 'customer' });
    const totalAgents = await User.count({ role: 'agent' });
    const totalAdmins = await User.count({ role: 'admin' });

    const stats = {
      total: total,
      customers: totalCustomers,
      agents: totalAgents,
      admins: totalAdmins
    };

    // Calculate pagination info
    const pagination = {
      currentPage: page,
      totalPages: totalPages,
      startItem: offset + 1,
      endItem: Math.min(offset + limit, total),
      totalItems: total
    };

    res.render('users/index', {
      title: 'Users',
      users,
      stats,
      pagination,
      search: req.query.search || '',
      role: req.query.role || '',
      status: req.query.status || ''
    });
  } catch (error) {
    next(error);
  }
};

// Show create user form (admin only)
exports.showCreate = async (req, res, next) => {
  try {
    const Department = require('../models/Department');
    const departments = await Department.getAll();

    res.render('users/create', {
      title: 'Create User',
      departments
    });
  } catch (error) {
    next(error);
  }
};

// Handle create user (admin only)
exports.create = async (req, res, next) => {
  try {
    const { name, email, password, role, department_id, is_active } = req.body;

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      req.flash('error', 'Email already exists');
      return res.redirect('/users/create');
    }

    await User.create({ name, email, password, role, department_id, is_active: is_active ? true : false });

    // Get the created user's ID from database
    const newUser = await User.findByEmail(email);

    // Log audit trail
    await Audit.log({
      user_id: req.session.userId,
      entity_type: 'user',
      entity_id: newUser.id,
      action: `User Created`,
      old_value: null,
      new_value: `Name: ${name}, Email: ${email}, Role: ${role}, Active: ${is_active ? 'Yes' : 'No'}`
    });

    req.flash('success', 'User created successfully');
    res.redirect('/users');
  } catch (error) {
    next(error);
  }
};

// Show edit user form (admin only)
exports.showEdit = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/users');
    }

    const Department = require('../models/Department');
    const departments = await Department.getAll();

    res.render('users/edit', {
      title: 'Edit User',
      user,
      departments
    });
  } catch (error) {
    next(error);
  }
};

// Handle update user (admin only)
exports.update = async (req, res, next) => {
  try {
    const { name, email, role, is_active, department_id, new_password, confirm_new_password } = req.body;

    // Get user before updating to track changes
    const oldUser = await User.findById(req.params.id);

    // Validate passwords match if provided
    if (new_password || confirm_new_password) {
      if (new_password !== confirm_new_password) {
        req.flash('error', 'Passwords do not match');
        return res.redirect(`/users/${req.params.id}/edit`);
      }
      if (new_password && new_password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters');
        return res.redirect(`/users/${req.params.id}/edit`);
      }
    }

    await User.update(req.params.id, {
      name,
      email,
      role,
      is_active: is_active ? true : false,
      department_id: department_id || null,
      new_password: new_password || null
    });

    // Track changes for audit log
    const changes = [];
    const newIsActive = is_active ? true : false;
    const oldIsActive = Boolean(oldUser.is_active);

    if (oldUser.name !== name) changes.push(`Name: ${oldUser.name} → ${name}`);
    if (oldUser.email !== email) changes.push(`Email: ${oldUser.email} → ${email}`);
    if (oldUser.role !== role) changes.push(`Role: ${oldUser.role} → ${role}`);
    if (oldIsActive !== newIsActive) changes.push(`Status: ${oldIsActive ? 'Active' : 'Inactive'} → ${newIsActive ? 'Active' : 'Inactive'}`);
    if (oldUser.department_id !== (department_id || null)) changes.push(`Department Changed`);
    if (new_password) changes.push(`Password: Changed`);

    // Log audit trail if there were changes
    if (changes.length > 0) {
      await Audit.log({
        user_id: req.session.userId,
        entity_type: 'user',
        entity_id: req.params.id,
        action: `User Updated`,
        old_value: `Role: ${oldUser.role}, Active: ${oldUser.is_active ? 'Yes' : 'No'}`,
        new_value: changes.join(' | ')
      });
    }

    req.flash('success', 'User updated successfully');
    res.redirect('/users');
  } catch (error) {
    next(error);
  }
};

// Delete user (admin only)
exports.delete = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Prevent deleting self
    if (userId == res.locals.currentUser.id) {
      req.flash('error', 'You cannot delete your own account');
      return res.redirect('/users');
    }

    // Get user before deleting to log details
    const user = await User.findById(userId);

    await User.delete(userId);

    // Log audit trail
    await Audit.log({
      user_id: req.session.userId,
      entity_type: 'user',
      entity_id: userId,
      action: `User Deleted`,
      old_value: `Role: ${user.role}, Email: ${user.email}`,
      new_value: 'User Account Permanently Deleted'
    });

    req.flash('success', 'User deleted successfully');
    res.redirect('/users');
  } catch (error) {
    next(error);
  }
};

// Show user profile
exports.profile = async (req, res, next) => {
  try {
    const user = await User.findById(res.locals.currentUser.id);

    res.render('users/profile', {
      title: 'My Profile',
      user
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    await User.update(res.locals.currentUser.id, { name, email, role: res.locals.currentUser.role });

    req.flash('success', 'Profile updated successfully');
    res.redirect('/users/profile');
  } catch (error) {
    next(error);
  }
};

// Change password
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    if (new_password !== confirm_password) {
      req.flash('error', 'New passwords do not match');
      return res.redirect('/users/profile');
    }

    const user = await User.findByEmail(res.locals.currentUser.email);
    const isValid = await User.verifyPassword(current_password, user.password_hash);

    if (!isValid) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/users/profile');
    }

    await User.updatePassword(res.locals.currentUser.id, new_password);

    req.flash('success', 'Password changed successfully');
    res.redirect('/users/profile');
  } catch (error) {
    next(error);
  }
};

// API endpoint for real-time user filtering (JSON response)
exports.api = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const filters = {
      limit,
      offset,
      role: req.query.role,
      search: req.query.search,
      is_active: req.query.status === 'active' ? true : req.query.status === 'inactive' ? false : null
    };

    const users = await User.getAll(filters);
    const total = await User.count(filters);
    const totalPages = Math.ceil(total / limit);

    // Get user statistics
    const totalCustomers = await User.count({ role: 'customer' });
    const totalAgents = await User.count({ role: 'agent' });
    const totalAdmins = await User.count({ role: 'admin' });

    const stats = {
      total: total,
      customers: totalCustomers,
      agents: totalAgents,
      admins: totalAdmins
    };

    res.json({
      success: true,
      data: {
        users,
        stats,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          total: total,
          limit: limit
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
