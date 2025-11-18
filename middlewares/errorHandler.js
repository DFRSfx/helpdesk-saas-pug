/**
 * Error Handler Middleware
 * Handles all errors in the application
 */

/**
 * 404 Not Found Handler
 * Catches all unmatched routes
 */
const notFound = (req, res, next) => {
  res.status(404).render('errors/404', {
    title: '404 - Page Not Found',
    url: req.originalUrl,
    user: req.session.userId ? {
      id: req.session.userId,
      role: req.session.userRole,
      name: req.session.userName
    } : null
  });
};

/**
 * Global Error Handler
 * Catches all errors and renders appropriate error page
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  console.error('Error:', err);

  // Set status code
  const statusCode = err.statusCode || err.status || 500;

  // Don't expose error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred. Please try again later.'
    : err.message;

  const stack = process.env.NODE_ENV === 'production' ? null : err.stack;

  // Database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).render('errors/error', {
      title: 'Duplicate Entry',
      message: 'A record with this information already exists.',
      statusCode: 400,
      user: req.session.userId ? {
        id: req.session.userId,
        role: req.session.userRole,
        name: req.session.userName
      } : null
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).render('errors/error', {
      title: 'Invalid Reference',
      message: 'The referenced record does not exist.',
      statusCode: 400,
      user: req.session.userId ? {
        id: req.session.userId,
        role: req.session.userRole,
        name: req.session.userName
      } : null
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).render('errors/error', {
      title: 'Validation Error',
      message: err.message,
      statusCode: 400,
      user: req.session.userId ? {
        id: req.session.userId,
        role: req.session.userRole,
        name: req.session.userName
      } : null
    });
  }

  // Render error page
  res.status(statusCode).render('errors/error', {
    title: `Error ${statusCode}`,
    message,
    stack,
    statusCode,
    user: req.session.userId ? {
      id: req.session.userId,
      role: req.session.userRole,
      name: req.session.userName
    } : null
  });
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * API Error Response
 * Sends JSON error response for API routes
 */
const apiErrorHandler = (err, req, res, next) => {
  // Only handle API routes
  if (!req.path.startsWith('/api/')) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
  apiErrorHandler
};
