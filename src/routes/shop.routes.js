const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shop.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');
const validation = require('../middlewares/validation.middleware');

// Create a new shop (shopkeeper only)
router.post('/', 
  authMiddleware,
  shopController.requireShopkeeper,
  uploadMiddleware.uploadSingle('banner'),
  validation.createShopValidation,
  shopController.createShop
);

// Get all shops with filters and pagination
router.get('/', shopController.getAllShops);

// Get shops nearby
router.get('/nearby', 
  validation.nearbyShopsValidation,
  shopController.getNearbyShops
);

// Get shop by ID
router.get('/:id', shopController.getShopById);

// Update shop (owner only)
router.put('/:id', 
  authMiddleware,
  shopController.requireShopOwner,
  uploadMiddleware.uploadSingle('banner'),
  validation.updateShopValidation,
  shopController.updateShop
);

// Delete shop (owner or admin only)
router.delete('/:id', 
  authMiddleware,
  shopController.requireShopOwnerOrAdmin,
  shopController.deleteShop
);

// Get shop products
router.get('/:shopId/products', shopController.getShopProducts);

// Get current user's shop
router.get('/my/shop', 
  authMiddleware,
  shopController.requireShopkeeper,
  shopController.getCurrentUserShop
);

module.exports = router;

