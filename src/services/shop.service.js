const Shop = require('../models/shop.model');
const Product = require('../models/product.model');
const LocationService = require('./location.service');
const S3Service = require('./s3.service');
const { validateShopData } = require('../utils/validators');

class ShopService {
  /**
   * Create a new shop
   * @param {Object} shopData - Shop details
   * @param {String} ownerId - ID of shop owner
   * @returns {Object} - Created shop
   */
  async createShop(shopData, ownerId) {
    try {
      // Validate shop data
      const { valid, errors } = validateShopData(shopData);
      if (!valid) {
        throw new Error(`Invalid shop data: ${JSON.stringify(errors)}`);
      }
      
      // Check if user already has a shop
      const existingShop = await Shop.findOne({ owner: ownerId });
      if (existingShop) {
        throw new Error('User already has a registered shop');
      }
      
      // Process and upload shop banner if provided
      let bannerUrl = null;
      if (shopData.bannerImage) {
        bannerUrl = await S3Service.uploadImage(
          shopData.bannerImage,
          `shops/${ownerId}/banner`
        );
      }
      
      // Create new shop
      const shop = new Shop({
        name: shopData.name,
        description: shopData.description,
        address: shopData.address,
        location: {
          type: 'Point',
          coordinates: [shopData.longitude, shopData.latitude]
        },
        category: shopData.category,
        contactPhone: shopData.contactPhone,
        whatsappNumber: shopData.whatsappNumber || shopData.contactPhone,
        bannerImage: bannerUrl,
        owner: ownerId,
        status: 'pending', // All shops require approval before appearing in search
        operatingHours: shopData.operatingHours || {},
        createdAt: new Date()
      });
      
      await shop.save();
      return shop;
    } catch (error) {
      throw new Error(`Failed to create shop: ${error.message}`);
    }
  }

  /**
   * Update shop details
   * @param {String} shopId - ID of shop to update
   * @param {Object} updateData - Updated shop details
   * @param {String} ownerId - ID of shop owner
   * @returns {Object} - Updated shop
   */
  async updateShop(shopId, updateData, ownerId) {
    try {
      // Find shop and verify ownership
      const shop = await Shop.findById(shopId);
      
      if (!shop) {
        throw new Error('Shop not found');
      }
      
      if (shop.owner.toString() !== ownerId) {
        throw new Error('Unauthorized: You do not own this shop');
      }
      
      // Process and upload new banner if provided
      if (updateData.bannerImage && updateData.bannerImage !== shop.bannerImage) {
        updateData.bannerImage = await S3Service.uploadImage(
          updateData.bannerImage,
          `shops/${ownerId}/banner`
        );
      }
      
      // Update location coordinates if address changed
      if (updateData.address && 
          (updateData.address !== shop.address || 
           updateData.latitude !== shop.location.coordinates[1] || 
           updateData.longitude !== shop.location.coordinates[0])) {
        updateData.location = {
          type: 'Point',
          coordinates: [updateData.longitude, updateData.latitude]
        };
      }
      
      // Set status back to pending if key details changed (requires re-approval)
      const criticalFieldsChanged = 
        updateData.name !== shop.name ||
        updateData.category !== shop.category ||
        updateData.address !== shop.address;
        
      if (criticalFieldsChanged && shop.status === 'approved') {
        updateData.status = 'pending';
      }
      
      // Update shop
      const updatedShop = await Shop.findByIdAndUpdate(
        shopId,
        { $set: updateData },
        { new: true }
      );
      
      return updatedShop;
    } catch (error) {
      throw new Error(`Failed to update shop: ${error.message}`);
    }
  }

  /**
   * Get shop by ID
   * @param {String} shopId - ID of shop
   * @returns {Object} - Shop details
   */
  async getShopById(shopId) {
    try {
      const shop = await Shop.findById(shopId).populate('owner', 'name phone email');
      
      if (!shop) {
        throw new Error('Shop not found');
      }
      
      return shop;
    } catch (error) {
      throw new Error(`Failed to get shop: ${error.message}`);
    }
  }

  /**
   * Get shop by owner ID
   * @param {String} ownerId - ID of shop owner
   * @returns {Object} - Shop details
   */
  async getShopByOwner(ownerId) {
    try {
      const shop = await Shop.findOne({ owner: ownerId });
      return shop;  // Might be null if owner has no shop
    } catch (error) {
      throw new Error(`Failed to get shop by owner: ${error.message}`);
    }
  }

  /**
   * Find nearby shops
   * @param {Number} latitude - User's latitude
   * @param {Number} longitude - User's longitude
   * @param {Number} maxDistance - Maximum distance in meters
   * @param {String} category - Optional shop category filter
   * @returns {Array} - Array of nearby shops with distance
   */
  async findNearbyShops(latitude, longitude, maxDistance = 5000, category = null) {
    try {
      // Build query with geospatial filter
      const query = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: maxDistance
          }
        },
        status: 'approved'  // Only show approved shops
      };
      
      // Add category filter if provided
      if (category) {
        query.category = category;
      }
      
      // Find shops matching criteria
      const shops = await Shop.find(query).populate('owner', 'name');
      
      // Calculate and add distance to each shop
      const shopsWithDistance = shops.map(shop => {
        const distance = LocationService.calculateDistance(
          latitude, 
          longitude,
          shop.location.coordinates[1],
          shop.location.coordinates[0]
        );
        
        return {
          ...shop.toObject(),
          distance: {
            meters: Math.round(distance),
            kilometers: (distance / 1000).toFixed(1)
          }
        };
      });
      
      return shopsWithDistance;
    } catch (error) {
      throw new Error(`Failed to find nearby shops: ${error.message}`);
    }
  }

  /**
   * Search shops by name or category
   * @param {String} query - Search query
   * @param {Number} latitude - User's latitude (optional)
   * @param {Number} longitude - User's longitude (optional)
   * @returns {Array} - Array of matching shops
   */
  async searchShops(query, latitude = null, longitude = null) {
    try {
      // Build text search query
      const searchQuery = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } }
        ],
        status: 'approved'  // Only show approved shops
      };
      
      // Find shops matching criteria
      let shops = await Shop.find(searchQuery);
      
      // Add distance if location provided
      if (latitude && longitude) {
        shops = shops.map(shop => {
          const distance = LocationService.calculateDistance(
            latitude, 
            longitude,
            shop.location.coordinates[1],
            shop.location.coordinates[0]
          );
          
          return {
            ...shop.toObject(),
            distance: {
              meters: Math.round(distance),
              kilometers: (distance / 1000).toFixed(1)
            }
          };
        });
        
        // Sort by distance
        shops.sort((a, b) => a.distance.meters - b.distance.meters);
      }
      
      return shops;
    } catch (error) {
      throw new Error(`Failed to search shops: ${error.message}`);
    }
  }

  /**
   * Get all shops (for admin)
   * @returns {Array} - Array of all shops
   */
  async getAllShops() {
    try {
      return await Shop.find().populate('owner', 'name phone email');
    } catch (error) {
      throw new Error(`Failed to get all shops: ${error.message}`);
    }
  }

  /**
   * Get pending shops (for admin approval)
   * @returns {Array} - Array of pending shops
   */
  async getPendingShops() {
    try {
      return await Shop.find({ status: 'pending' }).populate('owner', 'name phone email');
    } catch (error) {
      throw new Error(`Failed to get pending shops: ${error.message}`);
    }
  }

  /**
   * Approve shop
   * @param {String} shopId - ID of shop to approve
   * @returns {Object} - Approved shop
   */
  async approveShop(shopId) {
    try {
      const shop = await Shop.findByIdAndUpdate(
        shopId,
        { status: 'approved' },
        { new: true }
      );
      
      if (!shop) {
        throw new Error('Shop not found');
      }
      
      return shop;
    } catch (error) {
      throw new Error(`Failed to approve shop: ${error.message}`);
    }
  }

  /**
   * Reject shop
   * @param {String} shopId - ID of shop to reject
   * @param {String} reason - Reason for rejection
   * @returns {Object} - Rejected shop
   */
  async rejectShop(shopId, reason) {
    try {
      const shop = await Shop.findByIdAndUpdate(
        shopId,
        { 
          status: 'rejected',
          rejectionReason: reason 
        },
        { new: true }
      );
      
      if (!shop) {
        throw new Error('Shop not found');
      }
      
      return shop;
    } catch (error) {
      throw new Error(`Failed to reject shop: ${error.message}`);
    }
  }

  /**
   * Delete shop
   * @param {String} shopId - ID of shop to delete
   * @returns {Boolean} - Success status
   */
  async deleteShop(shopId) {
    try {
      // Delete all products associated with shop
      await Product.deleteMany({ shop: shopId });
      
      // Delete shop
      const result = await Shop.findByIdAndDelete(shopId);
      
      if (!result) {
        throw new Error('Shop not found');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Failed to delete shop: ${error.message}`);
    }
  }

  /**
   * Count total shops (for admin dashboard)
   * @returns {Number} - Count of shops
   */
  async countShops() {
    try {
      return await Shop.countDocuments();
    } catch (error) {
      throw new Error(`Failed to count shops: ${error.message}`);
    }
  }

  /**
   * Count pending shops (for admin dashboard)
   * @returns {Number} - Count of pending shops
   */
  async countPendingShops() {
    try {
      return await Shop.countDocuments({ status: 'pending' });
    } catch (error) {
      throw new Error(`Failed to count pending shops: ${error.message}`);
    }
  }
}

module.exports = new ShopService();
