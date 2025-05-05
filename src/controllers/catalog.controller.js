const catalogService = require('../services/catalog.service');
const s3Service = require('../services/s3.service');
const { validationResult } = require('express-validator');

// Create a new catalog item (admin only)
exports.createCatalogItem = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, brand, category, specs } = req.body;
    let imageUrl = null;

    // If image file is uploaded
    if (req.file) {
      imageUrl = await s3Service.uploadFile(req.file, 'catalog');
    }

    const catalogItem = await catalogService.createCatalogItem({
      name,
      brand,
      category,
      specs: specs ? JSON.parse(specs) : {},
      imageUrl
    });

    res.status(201).json(catalogItem);
  } catch (error) {
    next(error);
  }
};

// Get all catalog items
exports.getAllCatalogItems = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, category, brand, sortBy, sortOrder } = req.query;
    
    const filters = {};
    if (search) filters.search = search;
    if (category) filters.category = category;
    if (brand) filters.brand = brand;
    
    const sort = {};
    if (sortBy) sort.field = sortBy;
    if (sortOrder) sort.order = sortOrder;

    const catalogItems = await catalogService.getCatalogItems(page, limit, filters, sort);
    res.json(catalogItems);
  } catch (error) {
    next(error);
  }
};

// Get a single catalog item by ID
exports.getCatalogItemById = async (req, res, next) => {
  try {
    const catalogItem = await catalogService.getCatalogItemById(req.params.id);
    
    if (!catalogItem) {
      return res.status(404).json({ message: 'Catalog item not found' });
    }
    
    res.json(catalogItem);
  } catch (error) {
    next(error);
  }
};

// Update a catalog item (admin only)
exports.updateCatalogItem = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, brand, category, specs } = req.body;
    const catalogItemId = req.params.id;
    let imageUrl = null;

    // Check if catalog item exists
    const existingCatalogItem = await catalogService.getCatalogItemById(catalogItemId);
    
    if (!existingCatalogItem) {
      return res.status(404).json({ message: 'Catalog item not found' });
    }

    // If image file is uploaded, update it
    if (req.file) {
      // Delete old image if exists
      if (existingCatalogItem.imageUrl) {
        await s3Service.deleteFile(existingCatalogItem.imageUrl);
      }
      imageUrl = await s3Service.uploadFile(req.file, 'catalog');
    }

    const updateData = {
      name,
      brand,
      category,
      specs: specs ? JSON.parse(specs) : existingCatalogItem.specs,
      imageUrl: imageUrl || existingCatalogItem.imageUrl
    };

    const updatedCatalogItem = await catalogService.updateCatalogItem(catalogItemId, updateData);
    res.json(updatedCatalogItem);
  } catch (error) {
    next(error);
  }
};

// Delete a catalog item (admin only)
exports.deleteCatalogItem = async (req, res, next) => {
  try {
    const catalogItemId = req.params.id;
    
    // Check if catalog item exists
    const existingCatalogItem = await catalogService.getCatalogItemById(catalogItemId);
    
    if (!existingCatalogItem) {
      return res.status(404).json({ message: 'Catalog item not found' });
    }

    // Delete image from S3 if exists
    if (existingCatalogItem.imageUrl) {
      await s3Service.deleteFile(existingCatalogItem.imageUrl);
    }

    await catalogService.deleteCatalogItem(catalogItemId);
    res.status(200).json({ message: 'Catalog item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get catalog items by category
exports.getCatalogItemsByCategory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sortBy, sortOrder } = req.query;
    const category = req.params.category;
    
    const sort = {};
    if (sortBy) sort.field = sortBy;
    if (sortOrder) sort.order = sortOrder;

    const catalogItems = await catalogService.getCatalogItemsByCategory(category, page, limit, sort);
    res.json(catalogItems);
  } catch (error) {
    next(error);
  }
};

