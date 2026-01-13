const { body, validationResult } = require('express-validator');

// Validation middleware with better error handling
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const isJsonRequest = req.headers['content-type'] === 'application/json';

    if (isJsonRequest) {
      // Return structured errors for AJAX requests
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }

    // Traditional form submission - flash and redirect
    const messages = errors.array().map(err => err.msg);
    req.flash('error', messages.join(', '));
    return res.redirect('back');
  }
  next();
};

// User validation rules with enhanced error messages
const userValidation = {
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
      .isLength({ max: 150 }).withMessage('Name must not exceed 150 characters')
      .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('email')
      .trim()
      .isEmail().withMessage('Please enter a valid email address')
      .isLength({ max: 255 }).withMessage('Email must not exceed 255 characters'),
    
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .isLength({ max: 128 }).withMessage('Password must not exceed 128 characters'),
    
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],
  
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 1 }).withMessage('Password cannot be empty')
  ],
  
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
      .isLength({ max: 150 }).withMessage('Name must not exceed 150 characters'),
    
    body('email')
      .trim()
      .isEmail().withMessage('Valid email is required'),
    
    body('role')
      .isIn(['admin', 'agent', 'customer']).withMessage('Invalid role selected'),
    
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ]
};

// Ticket validation rules
const ticketValidation = {
  create: [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ min: 5 }).withMessage('Title must be at least 5 characters')
      .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters'),
    
    body('description')
      .trim()
      .notEmpty().withMessage('Description is required')
      .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    
    body('department_id')
      .notEmpty().withMessage('Department is required')
      .isInt({ min: 1 }).withMessage('Please select a valid department'),
    
    body('priority')
      .isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Please select a valid priority level')
  ],
  
  update: [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ min: 5 }).withMessage('Title must be at least 5 characters')
      .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters'),
    
    body('description')
      .trim()
      .notEmpty().withMessage('Description is required')
      .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    
    body('department_id')
      .notEmpty().withMessage('Department is required')
      .isInt({ min: 1 }).withMessage('Please select a valid department'),
    
    body('priority')
      .isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid priority selected'),
    
    body('status')
      .isIn(['Open', 'In Progress', 'Waiting', 'Escalated', 'Resolved', 'Closed']).withMessage('Invalid status selected')
  ]
};

// Department validation rules
const departmentValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Department name is required')
      .isLength({ min: 2 }).withMessage('Department name must be at least 2 characters')
      .isLength({ max: 150 }).withMessage('Department name must not exceed 150 characters')
  ]
};

module.exports = {
  validate,
  userValidation,
  ticketValidation,
  departmentValidation
};
