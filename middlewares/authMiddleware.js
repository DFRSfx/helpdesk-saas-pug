const User = require('../models/User');

// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Please log in to access this page');
  res.redirect('/auth/login');
};

// Check if user has specific role
const hasRole = (...roles) => {
  return async (req, res, next) => {
    if (!req.session || !req.session.userId) {
      req.flash('error', 'Please log in to access this page');
      return res.redirect('/auth/login');
    }

    try {
      const user = await User.findById(req.session.userId);
      if (!user || !roles.includes(user.role)) {
        req.flash('error', 'You do not have permission to access this page');
        return res.redirect('/dashboard');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Redirect if already authenticated
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = {
  isAuthenticated,
  hasRole,
  redirectIfAuthenticated
};
