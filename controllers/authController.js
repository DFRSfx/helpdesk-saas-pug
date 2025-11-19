const User = require('../models/User');

// Show login page
exports.showLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Login'
  });
};

// Handle login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);

    if (!user) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    const isValid = await User.verifyPassword(password, user.password_hash);

    if (!isValid) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    // Set session
    req.session.userId = user.id;
    req.session.userRole = user.role;

    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect('/dashboard');
  } catch (error) {
    next(error);
  }
};

// Show register page
exports.showRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Register'
  });
};

// Handle registration
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      req.flash('error', 'Email already registered');
      return res.redirect('/auth/register');
    }

    // Create new user (defaults to customer role)
    const userId = await User.create({ name, email, password, role: 'customer' });

    // Auto-login
    req.session.userId = userId;
    req.session.userRole = 'customer';

    req.flash('success', 'Registration successful! Welcome!');
    res.redirect('/dashboard');
  } catch (error) {
    next(error);
  }
};

// Handle logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/auth/login');
  });
};
