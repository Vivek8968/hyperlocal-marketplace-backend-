// Central error handling middleware
const errorMiddleware = (err, req, res, next) => {
  // Log error for internal monitoring
  console.error('Error:', err);
  
  // Check if this is a known error type
  if (err.name === 'ValidationError') {
    // Handle validation errors (e.g., Mongoose)
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    // Handle authentication errors
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Invalid or missing token'
    });
  }
  
  if (err.name === 'ForbiddenError') {
    // Handle authorization errors
    return res.status(403).json({
      status: 'error',
      message: 'Forbidden: Insufficient permissions'
    });
  }
  
  if (err.name === 'NotFoundError') {
    // Handle not found errors
    return res.status(404).json({
      status: 'error',
      message: err.message || 'Resource not found'
    });
  }
  
  // Custom status code or default to 500
  const statusCode = err.statusCode || 500;
  
  // In production, don't expose stack trace
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
};

module.exports = errorMiddleware;

