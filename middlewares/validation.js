const { body, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(err => err.msg);
    req.flash('error', messages.join(', '));
    return res.redirect('back');
  }
  next();
};

// User validation rules
const userValidation = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
  ],
  login: [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  create: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('role').isIn(['admin', 'agent', 'customer']).withMessage('Invalid role'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ]
};

// Ticket validation rules
const ticketValidation = {
  create: [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('department_id').isInt().withMessage('Department is required'),
    body('priority').isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid priority')
  ],
  update: [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('department_id').isInt().withMessage('Department is required'),
    body('priority').isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid priority'),
    body('status').isIn(['Open', 'In Progress', 'Waiting', 'Escalated', 'Resolved', 'Closed']).withMessage('Invalid status')
  ]
};

// Department validation rules
const departmentValidation = {
  create: [
    body('name').trim().notEmpty().withMessage('Department name is required')
  ]
};

module.exports = {
  validate,
  userValidation,
  ticketValidation,
  departmentValidation
};
