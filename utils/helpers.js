/**
 * Utility Helper Functions
 * Common utility functions used throughout the application
 */

/**
 * Generate a random string for tokens
 * @param {number} length - Length of string to generate
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format datetime to readable string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted datetime
 */
const formatDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calculate time ago from date
 * @param {Date|string} date - Date to calculate from
 * @returns {string} Time ago string
 */
const timeAgo = (date) => {
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now - d) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return 'Just now';
};

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated string
 */
const truncate = (str, length = 100) => {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

/**
 * Slugify string (make URL-friendly)
 * @param {string} str - String to slugify
 * @returns {string} Slugified string
 */
const slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Calculate resolution time in minutes
 * @param {Date|string} createdAt - Ticket creation date
 * @param {Date|string} resolvedAt - Ticket resolution date
 * @returns {number} Minutes to resolution
 */
const calculateResolutionTime = (createdAt, resolvedAt) => {
  const created = new Date(createdAt);
  const resolved = new Date(resolvedAt);
  return Math.floor((resolved - created) / 60000); // Convert to minutes
};

/**
 * Format file size to human-readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
const sanitizeHtml = (html) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    "/": '&#x2F;',
  };
  const reg = /[&<>"'/]/ig;
  return html.replace(reg, (match) => (map[match]));
};

/**
 * Get status color class for badges
 * @param {string} status - Ticket status
 * @returns {string} Tailwind CSS classes
 */
const getStatusColor = (status) => {
  const colors = {
    'open': 'bg-orange-100 text-orange-800',
    'in_progress': 'bg-blue-100 text-blue-800',
    'waiting': 'bg-yellow-100 text-yellow-800',
    'escalated': 'bg-red-100 text-red-800',
    'resolved': 'bg-green-100 text-green-800',
    'closed': 'bg-gray-100 text-gray-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Get priority color class for badges
 * @param {string} priority - Ticket priority
 * @returns {string} Tailwind CSS classes
 */
const getPriorityColor = (priority) => {
  const colors = {
    'critical': 'bg-red-100 text-red-800',
    'high': 'bg-orange-100 text-orange-800',
    'medium': 'bg-yellow-100 text-yellow-800',
    'low': 'bg-green-100 text-green-800'
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

/**
 * Parse JSON safely
 * @param {string} str - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed JSON or default value
 */
const safeJsonParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Generate ticket number
 * @param {number} id - Ticket ID
 * @returns {string} Formatted ticket number
 */
const generateTicketNumber = (id) => {
  const year = new Date().getFullYear();
  const paddedId = String(id).padStart(6, '0');
  return `TKT-${year}-${paddedId}`;
};

/**
 * Check if user has permission
 * @param {string} userRole - User's role
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {boolean} Has permission
 */
const hasPermission = (userRole, allowedRoles) => {
  return allowedRoles.includes(userRole);
};

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip;
};

module.exports = {
  generateRandomString,
  formatDate,
  formatDateTime,
  timeAgo,
  truncate,
  slugify,
  calculateResolutionTime,
  formatFileSize,
  isValidEmail,
  sanitizeHtml,
  getStatusColor,
  getPriorityColor,
  safeJsonParse,
  generateTicketNumber,
  hasPermission,
  getClientIp
};
