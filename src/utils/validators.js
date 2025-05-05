/**
 * Validator utilities for data validation
 */

/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean} - Whether email is valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {String} phone - Phone number to validate
 * @returns {Boolean} - Whether phone number is valid
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate URL format
 * @param {String} url - URL to validate
 * @returns {Boolean} - Whether URL is valid
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Validate password strength
 * @param {String} password - Password to validate
 * @returns {Object} - Validation result with strength score
 */
const validatePassword = (password) => {
  const result = {
    valid: false,
    score: 0,
    errors: []
  };

  if (!password || password.length < 8) {
    result.errors.push('Password must be at least 8 characters long');
    return result;
  }

  // Check for uppercase letters
  if (/[A-Z]/.test(password)) {
    result.score += 1;
  } else {
    result.errors.push('Password should contain at least one uppercase letter');
  }

  // Check for lowercase letters
  if (/[a-z]/.test(password)) {
    result.score += 1;
  } else {
    result.errors.push('Password should contain at least one lowercase letter');
  }

  // Check for numbers
  if (/[0-9]/.test(password)) {
    result.score += 1;
  } else {
    result.errors.push('Password should contain at least one number');
  }

  // Check for special characters
  if (/[^A-Za-z0-9]/.test(password)) {
    result.score += 1;
  } else {
    result.errors.push('Password should contain at least one special character');
  }

  result.valid = result.score >= 3 && password.length >= 8;
  return result;
};

/**
 * Validate user data
 * @param {Object} userData - User data to validate
 * @returns {Object} - Validation result
 */
const validateUserData = (userData) => {
  const errors = {};
  
  // Validate name if provided
  if (userData.name !== undefined) {
    if (typeof userData.name !== 'string' || userData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }
  }
  
  // Validate email if provided
  if (userData.email !== undefined) {
    if (!isValidEmail(userData.email)) {
      errors.email = 'Invalid email format';
    }
  }
  
  // Validate phone if provided
  if (userData.phone !== undefined) {
    if (!isValidPhone(userData.phone)) {
      errors.phone = 'Invalid phone number format';
    }
  }
  
  // Validate user type if provided
  if (userData.userType !== undefined) {
    if (!['customer', 'shopkeeper'].includes(userData.userType)) {
      errors.userType = 'User type must be either "customer" or "shopkeeper"';
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate shop data
 * @param {Object} shopData - Shop data to validate
 * @returns {Object} - Validation result
 */
const validateShopData = (shopData) => {
  const errors = {};
  
  // Validate required fields
  if (!shopData.name || typeof shopData.name !== 'string' || shopData.name.trim().length < 3) {
    errors.name = 'Shop name must be at least 3 characters long';
  }
  
  if (!shopData.address || typeof shopData.address !== 'string' || shopData.address.trim().length < 5) {
    errors.address = 'Shop address must be at least 5 characters long';
  }
  
  if (!shopData.contactPhone || !isValidPhone(shopData.contactPhone)) {
    errors.contactPhone = 'Valid contact phone number is required';
  }
  
  if (!shopData.category || typeof shopData.category !== 'string') {
    errors.category = 'Shop category is required';
  }
  
  // Validate coordinates
  if (shopData.latitude === undefined || shopData.longitude === undefined ||
      isNaN(Number(shopData.latitude)) || isNaN(Number(shopData.longitude))) {
    errors.location = 'Valid shop coordinates are required';
  }
  
  // Validate optional fields
  if (shopData.description && (typeof shopData.description !== 'string' || shopData.description.length > 500)) {
    errors.description = 'Shop description must be a string less than 500 characters';
  }
  
  if (shopData.whatsappNumber && !isValidPhone(shopData.whatsappNumber)) {
    errors.whatsappNumber = 'Invalid WhatsApp number format';
  }
  
  if (shopData.operatingHours && typeof shopData.operatingHours !== 'object') {
    errors.operatingHours = 'Operating hours must be an object';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate product data
 * @param {Object} productData - Product data to validate
 * @returns {Object} - Validation result
 */
const validateProductData = (productData) => {
  const errors = {};
  
  // Validate required fields
  if (!productData.name || typeof productData.name !== 'string' || productData.name.trim().length < 3) {
    errors.name = 'Product name must be at least 3 characters long';
  }
  
  if (!productData.price || isNaN(Number(productData.price)) || Number(productData.price) <= 0) {
    errors.price = 'Valid product price is required';
  }
  
  if (!productData.category || typeof productData.category !== 'string') {
    errors.category = 'Product category is required';
  }
  
  // Validate optional fields
  if (productData.description && (typeof productData.description !== 'string')) {
    errors.description = 'Product description must be a string';
  }
  
  if (productData.discountPrice !== undefined) {
    if (isNaN(Number(productData.discountPrice)) || Number(productData.discountPrice) < 0) {
      errors.discountPrice = 'Discount price must be a valid number';
    } else if (Number(productData.discountPrice) >= Number(productData.price)) {
      errors.discountPrice = 'Discount price must be less than regular price';
    }
  }
  
  if (productData.stock !== undefined) {
    if (isNaN(Number(productData.stock)) || Number(productData.stock) < 0) {
      errors.stock = 'Stock must be a valid non-negative number';
    }
  }
  
  if (productData.specifications && typeof productData.specifications !== 'object') {
    errors.specifications = 'Specifications must be an object';
  }
  
  if (productData.variants) {
    if (!Array.isArray(productData.variants)) {
      errors.variants = 'Variants must be an array';
    } else {
      const variantErrors = [];
      productData.variants.forEach((variant, index) => {
        if (!variant.name || !variant.options || !Array.isArray(variant.options)) {
          variantErrors.push(`Variant at index ${index} is invalid`);
        }
      });
      if (variantErrors.length > 0) {
        errors.variants = variantErrors;
      }
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidUrl,
  validatePassword,
  validateUserData,
  validateShopData,
  validateProductData
};

