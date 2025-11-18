/**
 * Authentication Controller
 * Handles user registration, login, logout, and password management
 */

const User = require('../models/User');
const Audit = require('../models/Audit');
const { validationResult } = require('express-validator');

class AuthController {
  /**
   * Show login page
   * GET /auth/login
   */
  static showLogin(req, res) {
    if (req.session.userId) {
      return res.redirect('/dashboard');
    }
    res.render('auth/login', {
      title: 'Login',
      error: req.flash('error'),
      success: req.flash('success')
    });
  }

  /**
   * Handle login
   * POST /auth/login
   * @body {string} email - User email
   * @body {string} password - User password
   */
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/auth/login');
      }

      const { email, password, remember } = req.body;

      console.log('🔐 Login attempt:', email);

      // Find user by email
      const user = await User.findByEmail(email);
      console.log('User found:', user ? `Yes (id: ${user.id}, role: ${user.role_name})` : 'No');
      
      if (!user) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/auth/login');
      }

      // Check if user is active
      console.log('User status:', user.status);
      if (user.status !== 'active') {
        req.flash('error', 'Your account is not active. Please contact support.');
        return res.redirect('/auth/login');
      }

      // Verify password
      console.log('Password hash exists:', !!user.password_hash);
      console.log('Password hash length:', user.password_hash ? user.password_hash.length : 0);
      
      const isValidPassword = await User.verifyPassword(password, user.password_hash);
      console.log('Password valid:', isValidPassword);
      
      if (!isValidPassword) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/auth/login');
      }

      console.log('✓ Password verified for user:', user.email);

      // Update last login
      await User.updateLastLogin(user.id);

      // Create session
      req.session.userId = user.id;
      req.session.userRole = user.role_name; // Use role_name from JOIN
      req.session.userEmail = user.email;
      req.session.userName = `${user.first_name} ${user.last_name}`;

      console.log('✓ Session created:', { userId: user.id, role: user.role_name });

      // Set cookie expiry if remember me is checked
      if (remember) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      // Log login event
      try {
        await Audit.create({
          user_id: user.id,
          action: 'login',
          entity_type: 'user',
          entity_id: user.id,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          description: 'User logged in'
        });
        console.log('✓ Audit log created');
      } catch (auditError) {
        console.error('⚠ Audit log failed (non-critical):', auditError.message);
      }

      // Redirect based on role
      const redirectUrl = req.session.returnTo || '/dashboard';
      delete req.session.returnTo;
      
      req.flash('success', `Welcome back, ${user.first_name}!`);
      
      console.log('✓ Redirecting to:', redirectUrl);
      
      // Save session before redirect to ensure it's persisted
      req.session.save((err) => {
        if (err) {
          console.error('✗ Session save error:', err);
        } else {
          console.log('✓ Session saved successfully');
        }
        res.redirect(redirectUrl);
      });

    } catch (error) {
      console.error('Login error:', error);
      req.flash('error', 'An error occurred during login. Please try again.');
      res.redirect('/auth/login');
    }
  }

  /**
   * Show registration page
   * GET /auth/register
   */
  static showRegister(req, res) {
    if (req.session.userId) {
      return res.redirect('/dashboard');
    }
    res.render('auth/register', {
      title: 'Register',
      error: req.flash('error'),
      success: req.flash('success')
    });
  }

  /**
   * Handle registration
   * POST /auth/register
   * @body {string} email - User email
   * @body {string} password - User password
   * @body {string} first_name - First name
   * @body {string} last_name - Last name
   * @body {string} phone - Phone number (optional)
   */
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/auth/register');
      }

      const { email, password, first_name, last_name, phone } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        req.flash('error', 'An account with this email already exists');
        return res.redirect('/auth/register');
      }

      // Create new customer user
      const newUser = await User.create({
        email,
        password,
        first_name,
        last_name,
        phone,
        role: 'customer'
      });

      // Log registration event
      await Audit.create({
        user_id: newUser.id,
        action: 'registered',
        entity_type: 'user',
        entity_id: newUser.id,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        description: 'New user registered'
      });

      req.flash('success', 'Registration successful! Please log in.');
      res.redirect('/auth/login');

    } catch (error) {
      console.error('Registration error:', error);
      req.flash('error', 'An error occurred during registration. Please try again.');
      res.redirect('/auth/register');
    }
  }

  /**
   * Handle logout
   * GET /auth/logout
   */
  static async logout(req, res) {
    try {
      const userId = req.session.userId;

      // Log logout event
      if (userId) {
        await Audit.create({
          user_id: userId,
          action: 'logout',
          entity_type: 'user',
          entity_id: userId,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          description: 'User logged out'
        });
      }

      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error('Logout error:', err);
        }
        res.redirect('/auth/login');
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.redirect('/');
    }
  }

  /**
   * Show forgot password page
   * GET /auth/forgot-password
   */
  static showForgotPassword(req, res) {
    res.render('auth/forgot-password', {
      title: 'Forgot Password',
      error: req.flash('error'),
      success: req.flash('success')
    });
  }

  /**
   * Handle forgot password request
   * POST /auth/forgot-password
   * @body {string} email - User email
   * TODO: Implement email sending with reset token
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        req.flash('success', 'If an account exists with this email, you will receive password reset instructions.');
        return res.redirect('/auth/forgot-password');
      }

      // TODO: Generate reset token and send email
      // For now, just show success message
      req.flash('success', 'Password reset instructions have been sent to your email.');
      res.redirect('/auth/login');

    } catch (error) {
      console.error('Forgot password error:', error);
      req.flash('error', 'An error occurred. Please try again.');
      res.redirect('/auth/forgot-password');
    }
  }

  /**
   * Show reset password page
   * GET /auth/reset-password/:token
   * @param {string} token - Reset token
   */
  static showResetPassword(req, res) {
    const { token } = req.params;
    
    // TODO: Validate token
    res.render('auth/reset-password', {
      title: 'Reset Password',
      token,
      error: req.flash('error'),
      success: req.flash('success')
    });
  }

  /**
   * Handle password reset
   * POST /auth/reset-password
   * @body {string} token - Reset token
   * @body {string} password - New password
   * TODO: Implement token validation and password reset
   */
  static async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      // TODO: Validate token and update password
      req.flash('success', 'Your password has been reset. Please log in.');
      res.redirect('/auth/login');

    } catch (error) {
      console.error('Reset password error:', error);
      req.flash('error', 'An error occurred. Please try again.');
      res.redirect('/auth/forgot-password');
    }
  }
}

module.exports = AuthController;
