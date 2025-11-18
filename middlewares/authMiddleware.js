/**
 * Authentication and Authorization Middleware
 * Handles session validation and role-based access control
 */

/**
 * Check if user is authenticated
 * Redirects to login if not authenticated
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Save return URL for redirect after login
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to access this page');
  res.redirect('/auth/login');
};

/**
 * Check if user is not authenticated (for login/register pages)
 * Redirects to dashboard if already logged in
 */
const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
};

/**
 * Check if user is an admin
 * Returns 403 if not admin
 */
const isAdmin = (req, res, next) => {
  if (req.session && req.session.userRole === 'admin') {
    return next();
  }
  req.flash('error', 'You do not have permission to access this page');
  res.redirect('/dashboard');
};

/**
 * Check if user is an agent or admin
 * Returns 403 if customer
 */
const isAgentOrAdmin = (req, res, next) => {
  if (req.session && (req.session.userRole === 'agent' || req.session.userRole === 'admin')) {
    return next();
  }
  req.flash('error', 'You do not have permission to access this page');
  res.redirect('/dashboard');
};

/**
 * Check if user is a customer
 */
const isCustomer = (req, res, next) => {
  if (req.session && req.session.userRole === 'customer') {
    return next();
  }
  req.flash('error', 'This page is only accessible to customers');
  res.redirect('/dashboard');
};

/**
 * Check if user has any of the specified roles
 * @param {Array} roles - Array of allowed roles
 * @returns {Function} Express middleware
 */
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (req.session && roles.includes(req.session.userRole)) {
      return next();
    }
    req.flash('error', 'You do not have permission to access this page');
    res.redirect('/dashboard');
  };
};

/**
 * Attach user data to all requests
 * Makes user info available in all routes and views
 */
const attachUser = (req, res, next) => {
  if (req.session && req.session.userId) {
    res.locals.currentUser = {
      id: req.session.userId,
      email: req.session.userEmail,
      name: req.session.userName,
      role: req.session.userRole
    };
    res.locals.isAuthenticated = true;
  } else {
    res.locals.currentUser = null;
    res.locals.isAuthenticated = false;
  }
  next();
};

/**
 * Set common template variables
 */
const setTemplateVariables = (req, res, next) => {
  res.locals.appName = process.env.APP_NAME || 'SupportDesk Pro';
  res.locals.appUrl = process.env.APP_URL || 'http://localhost:3000';
  res.locals.currentPath = req.path;
  res.locals.query = req.query;
  
  // Make flash messages available
  res.locals.successMessage = req.flash('success');
  res.locals.errorMessage = req.flash('error');
  res.locals.infoMessage = req.flash('info');
  res.locals.warningMessage = req.flash('warning');
  
  next();
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  isAdmin,
  isAgentOrAdmin,
  isCustomer,
  hasRole,
  attachUser,
  setTemplateVariables
};
