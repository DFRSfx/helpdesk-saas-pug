/**
 * Validation Middleware
 * Express-validator rules for form validation
 */

const { body, param, query } = require('express-validator');

/**
 * Validation rules for user registration
 */
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must be less than 20 characters')
];

/**
 * Validation rules for login
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for ticket creation
 */
const ticketValidation = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 255 })
    .withMessage('Subject must be less than 255 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority value'),
  body('department_id')
    .optional()
    .isInt()
    .withMessage('Invalid department ID'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters')
];

/**
 * Validation rules for ticket message
 */
const messageValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message must be between 1 and 10000 characters')
];

/**
 * Validation rules for department creation
 */
const departmentValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Department name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters'),
  body('slug')
    .trim()
    .notEmpty()
    .withMessage('Slug is required')
    .isSlug()
    .withMessage('Slug must be URL-friendly (lowercase, hyphens allowed)')
    .isLength({ max: 100 })
    .withMessage('Slug must be less than 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('description')
    .optional()
    .trim()
];

/**
 * Validation rules for user creation/update
 */
const userValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'agent', 'customer'])
    .withMessage('Invalid role'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must be less than 20 characters')
];

/**
 * Validation rules for password change
 */
const passwordChangeValidation = [
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirm_password')
    .custom((value, { req }) => value === req.body.new_password)
    .withMessage('Passwords do not match')
];

/**
 * Validation for ID parameters
 */
const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid ID')
];

module.exports = {
  registerValidation,
  loginValidation,
  ticketValidation,
  messageValidation,
  departmentValidation,
  userValidation,
  passwordChangeValidation,
  idValidation
};
