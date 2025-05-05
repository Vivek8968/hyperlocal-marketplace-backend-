const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalog.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');
const validation = require('../middlewares/validation.middleware');

// Create a new catalog item (admin only)
router.post('/', 
  authMiddleware,
  authMiddleware.requireAdmin,
  uploadMiddleware.uploadSingle('image'),
  validation.createCatalogItemValidation,
  catalogController.createCatalogItem
);

// Get all catalog items with filters and pagination
router.get('/', catalogController.getAllCatalogItems);

// Get catalog item by ID
router.get('/:id', catalogController.getCatalogItemById);

// Update catalog item (admin only)
router.put('/:id', 
  authMiddleware,
  authMiddleware.requireAdmin,
  uploadMiddleware.uploadSingle('image'),
  validation.updateCatalogItemValidation,
  catalogController.updateCatalogItem
);

// Delete catalog item (admin only)
router.delete('/:id', 
  authMiddleware,
  authMiddleware.requireAdmin,
  catalogController.deleteCatalogItem
);

// Get catalog items by category
router.get('/category/:category', catalogController.getCatalogItemsByCategory);

// Get all categories
router.get('/metadata/categories', catalogController.
