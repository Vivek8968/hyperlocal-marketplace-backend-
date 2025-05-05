const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validation = require('../middlewares/validation.middleware');

// Register new user
router.post('/register', validation.registerValidation, authController.register);

// Login with email/password
router.post('/login', validation.loginValidation, authController.login);

// Send OTP for phone verification
router.post('/send-otp', authController.sendOtp);

// Verify OTP
router.post('/verify-otp', validation.otpValidation, authController.verifyOtp);

// Login with Google
router.post('/google', authController.googleLogin);

// Login with Apple
router.post('/apple', authController.appleLogin);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Get current user profile
router.get('/me', authMiddleware, authController.getCurrentUser);

// Update user profile
router.put('/me', authMiddleware, authController.updateProfile);

// Change password
router.put('/change-password', authMiddleware, authController.changePassword);

// Forgot password
router.post('/forgot-password', authController.forgotPassword);

// Reset password
router.post('/reset-password', authController.resetPassword);

module.exports = router;

