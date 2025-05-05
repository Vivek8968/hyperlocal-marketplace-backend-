const { body, param, query } = require('express-validator');

// User validation
exports.registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('userType').isIn(['customer', 'shopkeeper']).withMessage('Invalid user type'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

exports.loginValidation = [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim().notEmpty().withMessage('Phone number is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

exports.otpValidation = [
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('otp').trim().isLength({ min: 4, max: 6 }).withMessage('Valid OTP is required')
];

// Shop validation
exports.createShopValidation = [
  body('name').trim().notEmpty().withMessage('Shop name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('whatsapp').trim().notEmpty().withMessage('WhatsApp number is required'),
  body('location.lat').isFloat().withMessage('Latitude is required'),
  body('location.lng').isFloat().withMessage('Longitude is required')
];

exports.updateShopValidation = [
  body('name').optional().trim().notEmpty().withMessage('Shop name cannot be empty'),
  body('address').optional().trim().notEmpty().withMessage('Address cannot be empty'),
  body('whatsapp').optional().trim().notEmpty().withMessage('WhatsApp number cannot be empty'),
  body('location.lat').optional().isFloat().withMessage('Latitude must be a valid number'),
  body('location.lng').optional().isFloat().withMessage('Longitude must be a valid number')
];

// Product validation
exports.createProductValidation = [
  body('shopId').isNumeric().withMessage('Shop ID is required'),
  body('title').trim().notEmpty().withMessage('Product title is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('description').optional().trim()
];

exports.updateProductValidation = [
  body('title').optional().trim().notEmpty().withMessage('Product title cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('description').optional().trim()
];

// Catalog validation
exports.createCatalogItemValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('brand').trim().notEmpty().withMessage('Brand is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('specs').optional().custom(value => {
    try {
      const parsed = JSON.parse(value);
      return true;
    } catch (error) {
      throw new Error('Specs must be a valid JSON string');
    }
  })
];

exports.updateCatalogItemValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('brand').optional().trim().notEmpty().withMessage('Brand cannot be empty'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('specs').optional().custom(value => {
    try {
      const parsed = JSON.parse(value);
      return true;
    } catch (error) {
      throw new Error('Specs must be a valid JSON string');
    }
  })
];

// Admin validation
exports.updateUserStatusValidation = [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
];

exports.updateShopApprovalValidation = [
  body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
  body('reason').optional().trim()
];

// Location validation
exports.nearbyShopsValidation = [
  query('lat').isFloat().withMessage('Latitude is required'),
  query('lng').isFloat().withMessage('Longitude is required'),
  query('radius').optional().isFloat({ min: 0 }).withMessage('Radius must be a positive number'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

