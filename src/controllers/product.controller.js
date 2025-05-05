const productService = require('../services/product.service');
const s3Service = require('../services/s3.service');
const { validationResult } = require('express-validator');

// Create a new product
exports.createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shopId, title, price, description, stock, catalogId } = req.body;
    let imageUrl = null;

    // If image file is uploaded
    if (req.file) {
      imageUrl = await s3Service.uploadFile(req.file, 'products');
    }

    const product = await productService.createProduct({
      shopId,
      title,
      price,
      description,
      stock,
      imageUrl,
      catalogId: catalogId || null
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

// Get all products
exports.getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, category, shopId, priceMin, priceMax, sortBy, sortOrder } = req.query;
    
    const filters = {};
    if (search) filters.search = search;
    if (category) filters.category = category;
    if (shopId) filters.shopId = shopId;
    if (priceMin) filters.priceMin = priceMin;
    if (priceMax) filters.priceMax = priceMax;
    
    const sort = {};
    if (sortBy) sort.field = sortBy;
    if (sortOrder) sort.order = sortOrder;

    const products = await productService.getProducts(page, limit, filters, sort);
    res.json(products);
  } catch (error) {
    next(error);
  }
};

// Get a single product by ID
exports.getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    next(error);
  }
};

// Update a product
exports.updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, price, description, stock } = req.body;
    const productId = req.params.id;
    let imageUrl = null;

    // Check if product exists and belongs to the shop owner
    const existingProduct = await productService.getProductById(productId);
    
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // If shop owner doesn't match
    if (req.user.userType === 'shopkeeper' && existingProduct.shopId !== req.shop.id) {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    // If image file is uploaded, update it
    if (req.file) {
      // Delete old image if exists
      if (existingProduct.imageUrl) {
        await s3Service.deleteFile(existingProduct.imageUrl);
      }
      imageUrl = await s3Service.uploadFile(req.file, 'products');
    }

    const updateData = {
      title,
      price,
      description,
      stock,
      imageUrl: imageUrl || existingProduct.imageUrl
    };

    const updatedProduct = await productService.updateProduct(productId, updateData);
    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
};

// Delete a product
exports.deleteProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    
    // Check if product exists and belongs to the shop owner
    const existingProduct = await productService.getProductById(productId);
    
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // If shop owner doesn't match
    if (req.user.userType === 'shopkeeper' && existingProduct.shopId !== req.shop.id) {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    // Delete image from S3 if exists
    if (existingProduct.imageUrl) {
      await s3Service.deleteFile(existingProduct.imageUrl);
    }

    await productService.deleteProduct(productId);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get products by shop ID
exports.getProductsByShopId = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sortBy, sortOrder } = req.query;
    const shopId = req.params.shopId;
    
    const sort = {};
    if (sortBy) sort.field = sortBy;
    if (sortOrder) sort.order = sortOrder;

    const products = await productService.getProductsByShopId(shopId, page, limit, sort);
    res.json(products);
  } catch (error) {
    next(error);
  }
};

