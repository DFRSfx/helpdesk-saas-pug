require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const dashboardRoutes = require('./routes/dashboard');
const auditRoutes = require('./routes/audit');
const apiRoutes = require('./routes/api');

// Import middleware
const errorHandler = require('./middlewares/errorHandler');
const { setLocals } = require('./middlewares/locals');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Make io accessible to our routes
app.set('io', io);

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Flash messages
app.use(flash());

// Set local variables for views
app.use(setLocals);

// Prevent caching of dynamic content and redirects
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/tickets', ticketRoutes);
app.use('/users', userRoutes);
app.use('/departments', departmentRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/audit', auditRoutes);
app.use('/api', apiRoutes);

// Root - Landing Page
app.get('/', (req, res) => {
  // Show landing page for all users
  res.render('landing/index', {
    title: 'Zolentra - Professional Helpdesk Platform'
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    // Connection closed
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: 'Page Not Found'
  });
});

app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
