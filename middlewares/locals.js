const User = require('../models/User');

// Set local variables for all views
const setLocals = async (req, res, next) => {
  // Flash messages
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  res.locals.warning = req.flash('warning');

  // User session
  res.locals.userId = req.session.userId || null;
  res.locals.currentUser = null;

  // If user is logged in, get user data
  if (req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      res.locals.currentUser = user;
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }

  // Helper functions for views
  res.locals.isAdmin = () => {
    return res.locals.currentUser && res.locals.currentUser.role === 'admin';
  };

  res.locals.isAgent = () => {
    return res.locals.currentUser && res.locals.currentUser.role === 'agent';
  };

  res.locals.isCustomer = () => {
    return res.locals.currentUser && res.locals.currentUser.role === 'customer';
  };

  // Format date helper
  res.locals.formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format relative time
  res.locals.timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';

    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';

    return 'just now';
  };

  next();
};

module.exports = { setLocals };
