const userService = require('../services/auth.service');
const shopService = require('../services/shop.service');
const productService = require('../services/product.service');
const catalogService = require('../services/catalog.service');
const { validationResult } = require('express-validator');

// Get system statistics
exports.getSystemStats = async (req, res, next) => {
  try {
    // User statistics
    const totalUsers = await userService.countUsers();
    const totalCustomers = await userService.countUsersByType('customer');
    const totalShopkeepers = await userService.countUsersByType('shopkeeper');
    const totalAdmins = await userService.countUsersByType('admin');

    // Shop statistics
    const totalShops = await shopService.countShops();
    const approvedShops = await shopService.countShopsByStatus('approved');
    const pendingShops = await shopService.countShopsByStatus('pending');
    const rejectedShops = await shopService.countShopsByStatus('rejected');

    // Product statistics
    const totalProducts = await productService.countProducts();
    const totalCategories = await catalogService.countCategories();

    // Weekly statistics (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const newUsers = await userService.countUsersCreatedAfter(oneWeekAgo);
    const newShops = await shopService.countShopsCreatedAfter(oneWeekAgo);
    const newProducts = await productService.countProductsCreatedAfter(oneWeekAgo);

    // Daily breakdown for the last 7 days
    const days = [];
    const labels = [];
    const usersData = [];
    const shopsData = [];
    const productsData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      days.push({
        start: startOfDay,
        end: endOfDay,
        label: date.toLocaleDateString('en-US', { weekday: 'short' })
      });
      
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      
      const dailyUsers = await userService.countUsersCreatedBetween(startOfDay, endOfDay);
      const dailyShops = await shopService.countShopsCreatedBetween(startOfDay, endOfDay);
      const dailyProducts = await productService.countProductsCreatedBetween(startOfDay, endOfDay);
      
      usersData.push(dailyUsers);
      shopsData.push(dailyShops);
      productsData.push(dailyProducts);
    }

    res.json({
      userStats: {
        totalUsers,
        totalCustomers,
        totalShopkeepers,
        totalAdmins
      },
      shopStats: {
        totalShops,
        approvedShops,
        pendingShops,
        rejectedShops
      },
      productStats: {
        totalProducts,
        totalCategories
      },
      weeklyStats: {
        total: newUsers + newShops + newProducts,
        newUsers,
        newShops,
        newProducts,
        labels,
        newUsers: usersData,
        newShops: shopsData,
        newProducts: productsData
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, userType, search, sortBy, sortOrder } = req.query;
    
    const filters = {};
    if (userType) filters.userType = userType;
    if (search) filters.search = search;
    
    const sort = {};
    if (sortBy) sort.field = sortBy;
    if (sortOrder) sort.order = sortOrder;

    const users = await userService.getUsers(page, limit, filters, sort);
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// Get user by ID (admin only)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Update user status (admin only)
exports.updateUserStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { isActive } = req.body;
    const userId = req.params.id;

    // Prevent self-deactivation
    if (userId === req.user.id && isActive === false) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    const updatedUser = await userService.updateUserStatus(userId, isActive);
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

// Get all shops (admin only)
exports.getAllShops = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search, sortBy, sortOrder } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (search) filters.search = search;
    
    const sort = {};
    if (sortBy) sort.field = sortBy;
    if (sortOrder) sort.order = sortOrder;

    const shops = await shopService.getShops(page, limit, filters, sort);
    res.json(shops);
  } catch (error) {
    next(error);
  }
};

// Update shop approval status (admin only)
exports.updateShopApprovalStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, reason } = req.body;
    const shopId = req.params.id;

    const updatedShop = await shopService.updateShopStatus(shopId, status, reason);
    
    if (!updatedShop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    res.json(updatedShop);
  } catch (error) {
    next(error);
  }
};

// Get recent activity (admin only)
exports.getRecentActivity = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    // This would be a separate logging system in a real app
    // For this example, we'll return mock data
    const recentActivity = [
      {
        id: 1,
        type: 'user_created',
        description: 'New user registered',
        user: 'John Doe',
        timestamp: new Date(Date.now() - 3600000)
      },
      {
        id: 2,
        type: 'shop_created',
        description: 'New shop created',
        user: 'Jane Smith',
        timestamp: new Date(Date.now() - 7200000)
      },
      {
        id: 3,
        type: 'product_added',
        description: 'New product added',
        user: 'Tech Store',
        timestamp: new Date(Date.now() - 10800000)
      },
      {
        id: 4,
        type: 'shop_approved',
        description: 'Shop approved',
        user: 'Admin User',
        timestamp: new Date(Date.now() - 14400000)
      },
      {
        id: 5,
        type: 'user_login',
        description: 'User logged in',
        user: 'John Doe',
        timestamp: new Date(Date.now() - 18000000)
      }
    ];
    
    res.json(recentActivity.slice(0, limit));
  } catch (error) {
    next(error);
  }
};

