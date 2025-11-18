/**
 * SupportDesk Pro - Customer Support Ticketing System
 * Main Application Entry Point
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Database
const { testConnection } = require('./config/database');

// Middleware
const { attachUser, setTemplateVariables } = require('./middlewares/authMiddleware');
const { notFound, errorHandler, apiErrorHandler } = require('./middlewares/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const ticketRoutes = require('./routes/tickets');
const departmentRoutes = require('./routes/departments');
const userRoutes = require('./routes/users');
const auditRoutes = require('./routes/audit');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Security Middleware
// ============================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development, configure properly in production
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/auth', limiter); // Apply to auth routes

// ============================================
// View Engine Setup
// ============================================

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// ============================================
// Middleware Setup
// ============================================

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  name: process.env.SESSION_NAME || 'zendesk_session',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'lax'
  }
}));

// Flash messages
app.use(flash());

// Custom middleware
app.use(attachUser);
app.use(setTemplateVariables);

// ============================================
// Routes
// ============================================

// Home route
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.redirect('/auth/login');
});

// Mount routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/tickets', ticketRoutes);
app.use('/departments', departmentRoutes);
app.use('/users', userRoutes);
app.use('/audit', auditRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// Error Handling
// ============================================

// API error handler (must be before general error handlers)
app.use(apiErrorHandler);

// 404 handler
app.use(notFound);

// General error handler
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║        🎫  SupportDesk Pro  🎫                ║
║     Customer Support Ticketing System        ║
║                                               ║
╚═══════════════════════════════════════════════╝

Server running on: http://localhost:${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
Database: Connected ✓

Press CTRL+C to stop
      `);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process in production
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
