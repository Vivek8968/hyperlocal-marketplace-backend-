const { verifyToken } = require('../utils/jwt');
const userService = require('../services/user.service');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Missing or invalid token.'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = verifyToken(token);

    const user = await userService.findUserById(decoded.sub);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = decoded;
    req.user.role = user.user_type;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed: ' + error.message
    });
  }
};

exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};
