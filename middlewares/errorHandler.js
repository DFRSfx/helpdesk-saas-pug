// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Set default values
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Render error page or send JSON for API requests
  if (req.xhr || req.headers.accept?.includes('json')) {
    res.status(status).json({
      error: {
        message: message,
        status: status
      }
    });
  } else {
    res.status(status).render('errors/error', {
      title: 'Error',
      status: status,
      message: message,
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
};

module.exports = errorHandler;
