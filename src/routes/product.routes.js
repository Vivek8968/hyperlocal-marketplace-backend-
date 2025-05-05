const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');
const validation = require('../middlewares/validation.middleware');
const shopController = require('../controllers/shop.controller');

// Create a new product
router.post('/', 
  authMiddleware,
  shopController.requireShopkeeper,
  uploadMiddleware.uploadSingle('image'),
  validation.createProductValidation,
  productController.createProduct
);

// Get all products with filters and pagination
router.get('/', productController.getAllProducts);

// Get product by ID
router.get('/:id', productController.getProductById);

// Update product (shop owner only)
router.put('/:id', 
  authMiddleware,
  uploadMiddleware.uploadSingle('image'),
  validation.updateProductValidation,
  productController.updateProduct
);

// Delete product (shop owner or admin only)
router.delete('/:id', 
  authMiddleware,
  productController.deleteProduct
);

// Get products by shop ID
router.get('/shop/:shopId', productController.getProductsByShopId);

module.exports = router;

