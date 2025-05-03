const shopService = require('../services/shop.service');
const { catchAsync } = require('../utils/error');

exports.createShop = catchAsync(async (req, res) => {
  const { name, address, whatsapp, latitude, longitude } = req.body;
  const ownerId = req.user.sub;
  const bannerImage = req.file ? req.file.buffer : null;

  if (!name || !address || !latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: name, address, latitude, longitude'
    });
  }

  const shop = await shopService.createShop(
    {
      owner_id: ownerId,
      name,
      address,
      whatsapp,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    },
    bannerImage
  );

  res.status(201).json({
    success: true,
    message: 'Shop created successfully',
    data: shop
  });
});

exports.getNearbyShops = catchAsync(async (req, res) => {
  const { latitude, longitude, radius = 5, limit = 20 } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: 'Missing required query parameters: latitude, longitude'
    });
  }

  const shops = await shopService.findNearbyShops(
    parseFloat(latitude),
    parseFloat(longitude),
    parseFloat(radius),
    parseInt(limit)
  );

  res.status(200).json({
    success: true,
    count: shops.length,
    data: shops
  });
});

exports.getShopById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const shop = await shopService.findShopById(id);

  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Shop not found'
    });
  }

  res.status(200).json({
    success: true,
    data: shop
  });
});

exports.getMyShops = catchAsync(async (req, res) => {
  const ownerId = req.user.sub;

  const shops = await shopService.findShopsByOwnerId(ownerId);

  res.status(200).json({
    success: true,
    count: shops.length,
    data: shops
  });
});

exports.updateShop = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, address, whatsapp, latitude, longitude } = req.body;
  const ownerId = req.user.sub;
  const bannerImage = req.file ? req.file.buffer : null;

  const shop = await shopService.findShopById(id);

  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Shop not found'
    });
  }

  if (shop.owner_id !== ownerId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this shop'
    });
  }

  const updatedShop = await shopService.updateShop(
    id,
    {
      name,
      address,
      whatsapp,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined
    },
    bannerImage
  );

  res.status(200).json({
    success: true,
    message: 'Shop updated successfully',
    data: updatedShop
  });
});
