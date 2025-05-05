const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure storage
const storage = multer.memoryStorage();

// File filter function to allow only images
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and WEBP files are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware for single file upload
exports.uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          // Multer error
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size exceeds 5MB limit.' });
          }
          return res.status(400).json({ message: err.message });
        }
        // General error
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};

// Middleware for multiple file uploads
exports.uploadMultiple = (fieldName, maxCount) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          // Multer error
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'One or more files exceed 5MB limit.' });
          }
          return res.status(400).json({ message: err.message });
        }
        // General error
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};

