const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const shopController = require('../controllers/shop.controller');
const productController = require('../controllers/product.controller');
const userController = require('../controllers/user.controller');

// Admin authentication middleware - applies to all admin routes
router.use(authenticateToken, authorizeAdmin);

// Admin dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = {
      totalUsers: await userController.countUsers(),
      totalShops: await shopController.countShops(),
      totalProducts: await productController.countProducts(),
      pendingApprovals: await shopController.countPendingShops()
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Shop management routes
router.get('/shops', shopController.getAllShops);
router.get('/shops/pending', shopController.getPendingShops);
router.put('/shops/:id/approve', shopController.approveShop);
router.put('/shops/:id/reject', shopController.rejectShop);
router.delete('/shops/:id', shopController.deleteShop);

// Product management routes
router.get('/products', productController.getAllProducts);
router.delete('/products/:id', productController.deleteProduct);
router.put('/products/:id/feature', productController.featureProduct);

// User management routes
router.get('/users', userController.getAllUsers);
router.put('/users/:id/block', userController.blockUser);
router.put('/users/:id/unblock', userController.unblockUser);
router.delete('/users/:id', userController.deleteUser);

// Catalog management
router.post('/catalog', productController.addCatalogItem);
router.put('/catalog/:id', productController.updateCatalogItem);
router.delete('/catalog/:id', productController.deleteCatalogItem);

module.exports = router;
