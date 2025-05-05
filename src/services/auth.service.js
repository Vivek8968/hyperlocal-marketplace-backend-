const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model');
const { generateOTP, sendOTP } = require('../utils/otp');
const { JWT_SECRET, GOOGLE_CLIENT_ID } = process.env;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

class AuthService {
  /**
   * Generate JWT token for a user
   * @param {Object} user - User document from database
   * @returns {String} JWT token
   */
  generateToken(user) {
    return jwt.sign(
      { 
        id: user._id, 
        phone: user.phone,
        email: user.email,
        role: user.role,
        userType: user.userType
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
  }

  /**
   * Send OTP to user's phone number
   * @param {String} phoneNumber - User's phone number
   * @returns {Object} - Contains verification ID for future verification
   */
  async sendOtp(phoneNumber) {
    try {
      // Check if phone number is already registered
      const existingUser = await User.findOne({ phone: phoneNumber });
      
      // Generate a random 6-digit OTP
      const otp = generateOTP();
      
      // In production, send OTP via SMS
      await sendOTP(phoneNumber, otp);
      
      // Store OTP with phone number (usually in Redis with expiry)
      const verificationId = await this.storeOTPForVerification(phoneNumber, otp);
      
      return {
        success: true,
        verificationId,
        isNewUser: !existingUser,
      };
    } catch (error) {
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  /**
   * Verify OTP and authenticate user
   * @param {String} verificationId - ID received from sendOtp call
   * @param {String} otp - OTP entered by user
   * @returns {Object} - Contains user data and auth token
   */
  async verifyOtp(verificationId, otp) {
    try {
      // Retrieve the stored OTP information
      const otpInfo = await this.retrieveOTPInfo(verificationId);
      
      if (!otpInfo) {
        throw new Error('Verification failed: Invalid or expired verification ID');
      }
      
      const { phoneNumber, storedOtp } = otpInfo;
      
      // Verify OTP
      if (otp !== storedOtp) {
        throw new Error('Verification failed: Invalid OTP');
      }
      
      // Find or create user
      let user = await User.findOne({ phone: phoneNumber });
      
      if (!user) {
        user = await User.create({
          phone: phoneNumber,
          role: 'user',
          userType: 'customer', // Default new users to customer
          isActive: true,
          createdAt: new Date()
        });
      }
      
      // Generate token
      const token = this.generateToken(user);
      
      return {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          userType: user.userType,
          role: user.role
        }
      };
    } catch (error) {
      throw new Error(`OTP verification failed: ${error.message}`);
    }
  }

  /**
   * Authenticate with Google ID token
   * @param {String} idToken - Google ID token
   * @returns {Object} - Contains user data and auth token
   */
  async signInWithGoogle(idToken) {
    try {
      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      const { email, name, picture } = payload;
      
      // Find or create user
      let user = await User.findOne({ email });
      
      if (!user) {
        user = await User.create({
          email,
          name,
          profilePicture: picture,
          role: 'user',
          userType: 'customer', // Default new users to customer
          isActive: true,
          createdAt: new Date()
        });
      }
      
      // Generate token
      const token = this.generateToken(user);
      
      return {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          userType: user.userType,
          role: user.role,
          profilePicture: user.profilePicture
        }
      };
    } catch (error) {
      throw new Error(`Google authentication failed: ${error.message}`);
    }
  }

  /**
   * Store OTP for later verification
   * @param {String} phoneNumber - User's phone number
   * @param {String} otp - Generated OTP
   * @returns {String} - Verification ID
   */
  async storeOTPForVerification(phoneNumber, otp) {
    // In a real implementation, this would store in Redis or another fast database
    // with an expiration time (typically 10 minutes)
    
    // For simplicity, we'll generate a verification ID based on the phone number
    const verificationId = Buffer.from(`${phoneNumber}_${Date.now()}`).toString('base64');
    
    // Store the OTP mapped to this verification ID with expiry
    // Redis example: await redisClient.setex(verificationId, 600, JSON.stringify({ phoneNumber, otp }));
    
    // For now, we'll use a mock implementation
    global.otpStore = global.otpStore || new Map();
    global.otpStore.set(verificationId, { phoneNumber, storedOtp: otp });
    
    // Set expiry by scheduling deletion after 10 minutes
    setTimeout(() => {
      global.otpStore.delete(verificationId);
    }, 10 * 60 * 1000);
    
    return verificationId;
  }

  /**
   * Retrieve stored OTP information for verification
   * @param {String} verificationId - Verification ID
   * @returns {Object} - Contains phone number and OTP
   */
  async retrieveOTPInfo(verificationId) {
    // In a real implementation, this would retrieve from Redis or another database
    // Redis example: const data = await redisClient.get(verificationId);
    
    // For now, we'll use a mock implementation
    global.otpStore = global.otpStore || new Map();
    const otpInfo = global.otpStore.get(verificationId);
    
    if (!otpInfo) {
      return null;
    }
    
    return otpInfo;
  }

  /**
   * Change user type between customer and shopkeeper
   * @param {String} userId - User ID
   * @param {String} newUserType - New user type ('customer' or 'shopkeeper')
   * @returns {Object} - Updated user data
   */
  async changeUserType(userId, newUserType) {
    if (newUserType !== 'customer' && newUserType !== 'shopkeeper') {
      throw new Error('Invalid user type. Must be "customer" or "shopkeeper"');
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { userType: newUserType },
      { new: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      id: user._id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      userType: user.userType,
      role: user.role
    };
  }
}

module.exports = new AuthService();
