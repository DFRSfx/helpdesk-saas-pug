/**
 * File Upload Middleware
 * Handles file uploads using Multer with validation
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads/tickets');
const tempDir = path.join(__dirname, '../uploads/temp');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Configure storage for ticket attachments
 */
const ticketStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

/**
 * File filter for allowed file types
 * Configured from environment variables
 */
const fileFilter = (req, file, cb) => {
  // Get allowed types from env or use defaults
  const allowedTypes = process.env.ALLOWED_FILE_TYPES 
    ? process.env.ALLOWED_FILE_TYPES.split(',')
    : [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

/**
 * Multer configuration for ticket attachments
 * Limits: 10MB per file, max 5 files
 */
const uploadTicketAttachments = multer({
  storage: ticketStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Max 5 files per request
  },
  fileFilter: fileFilter
});

/**
 * Multer configuration for avatar uploads
 */
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const avatarDir = path.join(__dirname, '../public/images/avatars');
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.session.userId}-${uniqueSuffix}${ext}`);
  }
});

const avatarFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF) are allowed for avatars'), false);
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB for avatars
  },
  fileFilter: avatarFilter
});

/**
 * Error handling middleware for Multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      req.flash('error', 'File is too large. Maximum size is 10MB.');
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      req.flash('error', 'Too many files. Maximum is 5 files per upload.');
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      req.flash('error', 'Unexpected field in file upload.');
    } else {
      req.flash('error', `Upload error: ${err.message}`);
    }
    return res.redirect('back');
  } else if (err) {
    // Other errors (like file type validation)
    req.flash('error', err.message);
    return res.redirect('back');
  }
  next();
};

/**
 * Utility: Delete uploaded file
 * @param {string} filepath - Path to file to delete
 */
const deleteFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
  return false;
};

/**
 * Utility: Get file size in human-readable format
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

module.exports = {
  uploadTicketAttachments,
  uploadAvatar,
  handleUploadError,
  deleteFile,
  formatFileSize
};
