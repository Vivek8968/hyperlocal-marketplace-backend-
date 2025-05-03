const { firebaseAuth } = require('../config/firebase');
const { generateToken } = require('../utils/jwt');
const userService = require('../services/user.service');
const { catchAsync } = require('../utils/error');

exports.register = catchAsync(async (req, res) => {
  const { name, phone, email, userType, firebaseUid } = req.body;

  const existingUser = await userService.findUserByPhone(phone) ||
                       await userService.findUserByEmail(email);

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'User already exists with this phone or email'
    });
  }

  const user = await userService.createUser({
    name,
    phone,
    email,
    user_type: userType,
    firebase_uid: firebaseUid,
    auth_provider: phone ? 'phone' : email.includes('apple') ? 'apple' : 'google'
  });

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        userType: user.user_type
      },
      token
    }
  });
});

exports.loginWithToken = catchAsync(async (req, res) => {
  const { firebaseToken } = req.body;

  const decodedToken = await firebaseAuth.verifyIdToken(firebaseToken);
  const { uid, phone_number, email } = decodedToken;

  let user = await userService.findUserByFirebaseUid(uid);

  if (!user) {
    user = phone_number ?
      await userService.findUserByPhone(phone_number) :
      await userService.findUserByEmail(email);

    if (user) {
      user = await userService.updateUser(user.id, { firebase_uid: uid });
    } else {
      return res.status(404).json({
        success: false,
        message: 'User not registered. Please sign up first.'
      });
    }
  }

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        userType: user.user_type
      },
      token
    }
  });
});

exports.getProfile = catchAsync(async (req, res) => {
  const userId = req.user.sub;

  const user = await userService.findUserById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      userType: user.user_type,
      createdAt: user.created_at
    }
  });
});
