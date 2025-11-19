const User = require('../models/User');

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
      search: req.query.search
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

    res.render('users/index', {
      title: 'Users',
      users,
      stats,
      currentPage: page,
      totalPages,
      filters: req.query
    });
  } catch (error) {
    next(error);
  }
};

// Show create user form (admin only)
exports.showCreate = (req, res) => {
  res.render('users/create', {
    title: 'Create User'
  });
};

// Handle create user (admin only)
exports.create = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      req.flash('error', 'Email already exists');
      return res.redirect('/users/create');
    }

    await User.create({ name, email, password, role });

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

    res.render('users/edit', {
      title: 'Edit User',
      user
    });
  } catch (error) {
    next(error);
  }
};

// Handle update user (admin only)
exports.update = async (req, res, next) => {
  try {
    const { name, email, role } = req.body;
    await User.update(req.params.id, { name, email, role });

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

    await User.delete(userId);

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
