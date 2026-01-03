const User = require('../models/User');

// Show login page - redirect to landing since auth is now modal-based
exports.showLogin = (req, res) => {
  res.redirect('/');
};

// Handle login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const isJsonRequest = req.headers['content-type'] === 'application/json';

    const user = await User.findByEmail(email);

    if (!user) {
      if (isJsonRequest) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    const isValid = await User.verifyPassword(password, user.password_hash);

    if (!isValid) {
      if (isJsonRequest) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    // Set session
    req.session.userId = user.id;
    req.session.userRole = user.role;

    if (isJsonRequest) {
      return res.json({ success: true, redirect: '/dashboard' });
    }

    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect('/dashboard');
  } catch (error) {
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ error: 'An error occurred. Please try again.' });
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

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      if (isJsonRequest) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      req.flash('error', 'Email already registered');
      return res.redirect('/auth/register');
    }

    // Create new user (defaults to customer role)
    const userId = await User.create({ name, email, password, role: 'customer' });

    // Auto-login
    req.session.userId = userId;
    req.session.userRole = 'customer';

    if (isJsonRequest) {
      return res.json({ success: true, redirect: '/dashboard' });
    }

    req.flash('success', 'Registration successful! Welcome!');
    res.redirect('/dashboard');
  } catch (error) {
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
    next(error);
  }
};

// Handle logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
};
