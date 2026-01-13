const User = require('../models/User');

// Store failed login attempts (in production, use Redis)
const failedLoginAttempts = new Map();
const FAILED_ATTEMPTS_LIMIT = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// Clear old lockouts periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of failedLoginAttempts.entries()) {
    if (now - data.lastAttempt > LOCKOUT_TIME) {
      failedLoginAttempts.delete(email);
    }
  }
}, 60000); // Check every minute

// Helper: Check if account is locked
const isAccountLocked = (email) => {
  const attempts = failedLoginAttempts.get(email?.toLowerCase());
  if (!attempts) return false;
  
  const isLocked = attempts.count >= FAILED_ATTEMPTS_LIMIT;
  const timePassed = Date.now() - attempts.lastAttempt;
  
  if (isLocked && timePassed < LOCKOUT_TIME) {
    return true;
  }
  
  // Reset if lockout time has passed
  if (timePassed > LOCKOUT_TIME) {
    failedLoginAttempts.delete(email?.toLowerCase());
  }
  
  return false;
};

// Helper: Record failed attempt
const recordFailedAttempt = (email) => {
  const key = email?.toLowerCase();
  const attempts = failedLoginAttempts.get(key) || { count: 0, lastAttempt: Date.now() };
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  failedLoginAttempts.set(key, attempts);
};

// Helper: Clear failed attempts
const clearFailedAttempts = (email) => {
  failedLoginAttempts.delete(email?.toLowerCase());
};

// Show login page - redirect to landing since auth is now modal-based
exports.showLogin = (req, res) => {
  res.redirect('/');
};

// Handle login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const isJsonRequest = req.headers['content-type'] === 'application/json';

    // Check if account is locked
    if (isAccountLocked(email)) {
      const errorMsg = `Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.`;
      if (isJsonRequest) {
        return res.status(429).json({ 
          error: errorMsg,
          locked: true
        });
      }
      req.flash('error', errorMsg);
      return res.redirect('/');
    }

    // Validate input
    if (!email || !password) {
      const errorMsg = 'Email and password are required';
      if (isJsonRequest) {
        return res.status(400).json({ error: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/');
    }

    // Find user
    const user = await User.findByEmail(email);

    if (!user) {
      recordFailedAttempt(email);
      const errorMsg = 'Invalid email or password';
      if (isJsonRequest) {
        return res.status(401).json({ error: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/');
    }

    // Check if account is active
    if (!user.is_active) {
      const errorMsg = 'This account has been deactivated. Please contact support.';
      if (isJsonRequest) {
        return res.status(403).json({ error: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/');
    }

    // Verify password
    const isValid = await User.verifyPassword(password, user.password_hash);

    if (!isValid) {
      recordFailedAttempt(email);
      const errorMsg = 'Invalid email or password';
      if (isJsonRequest) {
        return res.status(401).json({ error: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/');
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(email);

    // Set session
    req.session.userId = user.id;
    req.session.userRole = user.role;

    // Log login activity
    try {
      const Audit = require('../models/Audit');
      await Audit.log({
        user_id: user.id,
        action: 'login',
        new_value: `Logged in from ${req.ip}`
      });
    } catch (auditError) {
      console.error('Failed to log login activity:', auditError);
    }

    if (isJsonRequest) {
      return res.json({ 
        success: true, 
        redirect: '/dashboard',
        message: `Welcome back, ${user.name}!`
      });
    }

    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ error: 'An error occurred during login. Please try again.' });
    }
    next(error);
  }
};

// Show register page - redirect to landing since auth is now modal-based
exports.showRegister = (req, res) => {
  res.redirect('/');
};

// Handle registration
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const isJsonRequest = req.headers['content-type'] === 'application/json';

    // Validate input
    if (!name || !email || !password) {
      const errorMsg = 'Name, email, and password are required';
      if (isJsonRequest) {
        return res.status(400).json({ error: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/');
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const errorMsg = 'Please enter a valid email address';
      if (isJsonRequest) {
        return res.status(400).json({ error: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/');
    }

    // Validate password strength
    if (password.length < 6) {
      const errorMsg = 'Password must be at least 6 characters long';
      if (isJsonRequest) {
        return res.status(400).json({ error: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/');
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      const errorMsg = 'This email is already registered. Please log in instead.';
      if (isJsonRequest) {
        return res.status(409).json({ error: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect('/');
    }

    // Create new user (defaults to customer role)
    const userId = await User.create({ name, email, password, role: 'customer' });

    // Log registration activity
    try {
      const Audit = require('../models/Audit');
      await Audit.log({
        user_id: userId,
        action: 'user_registered',
        new_value: `New customer registered from ${req.ip}`
      });
    } catch (auditError) {
      console.error('Failed to log registration activity:', auditError);
    }

    // Auto-login
    req.session.userId = userId;
    req.session.userRole = 'customer';

    if (isJsonRequest) {
      return res.json({ 
        success: true, 
        redirect: '/dashboard',
        message: 'Welcome! Your account has been created.'
      });
    }

    req.flash('success', 'Registration successful! Welcome!');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ error: 'An error occurred during registration. Please try again.' });
    }
    next(error);
  }
};

// Handle logout
exports.logout = (req, res) => {
  const userId = req.session.userId;

  // Log logout activity
  if (userId) {
    try {
      const Audit = require('../models/Audit');
      Audit.log({
        user_id: userId,
        action: 'logout',
        new_value: `Logged out from ${req.ip}`
      }).catch(err => console.error('Failed to log logout:', err));
    } catch (error) {
      console.error('Error logging logout:', error);
    }
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};
