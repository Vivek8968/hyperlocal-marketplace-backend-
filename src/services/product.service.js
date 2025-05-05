const Product = require('../models/product.model');
const CatalogItem = require('../models/catalog.model');
const S3Service = require('./s3.service');
const { validateProductData } = require('../utils/validators');

class ProductService {
  /**
   * Create a new product
   * @param {Object} productData - Product details
   * @param {String} shopId - ID of the shop
   * @returns {Object} - Created product
   */
  async createProduct(productData, shopId) {
    try {
      // Validate product data
      const { valid, errors } = validateProductData(productData);
      if (!valid) {
        throw new Error(`Invalid product data: ${JSON.stringify(errors)}`);
      }
      
      // Process and upload product images
      const imageUrls = [];
      if (productData.images && productData.images.length > 0) {
        for (let i = 0; i < productData.images.length; i++) {
          const imageUrl = await S3Service.uploadImage(
            productData.images[i],
            `shops/${shopId}/products/${Date.now()}_${i}`
          );
          imageUrls.push(imageUrl);
        }
      }
      
      // Create new product
      const product = new Product({
        name: productData.name,
        description: productData.description,
        price: productData.price,
        discountPrice: productData.discountPrice,
        category: productData.category,
        shop: shopId,
        stock: productData.stock || 0,
        images: imageUrls,
        specifications: productData.specifications || {},
        variants: productData.variants || [],
        isActive: true,
        createdAt: new Date()
      });
      
      await product.save();
      return product;
    } catch (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  /**
   * Update product details
   * @param {String} productId - ID of product to update
   * @param {Object} updateData - Updated product details
   * @param {String} shopId - ID of the shop
   * @returns {Object} - Updated product
   */
  async updateProduct(productId, updateData, shopId) {
    try {
      // Find product and verify shop ownership
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      if (product.shop.toString() !== shopId) {
        throw new Error('Unauthorized: This product does not belong to your shop');
      }
      
      // Process and upload new images if provided
      if (updateData.images && updateData.images.length > 0) {
        const newImageUrls = [];
        for (let i = 0; i < updateData.images.length; i++) {
          // Check if this is an existing image URL or a new image
          if (updateData.images[i].startsWith('http')) {
            newImageUrls.push(updateData.images[i]);
          } else {
            const imageUrl = await S3Service.uploadImage(
              updateData.images[i],
              `shops/${shopId}/products/${Date.now()}_${i}`
            );
            newImageUrls.push(imageUrl);
          }
        }
        updateData.images = newImageUrls;
      }
      
      // Update product
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { new: true }
      );
      
      return updatedProduct;
    } catch (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  /**
   * Get product by ID
   * @param {String} productId - ID of product
   * @returns {Object} - Product details
   */
  async getProductById(productId) {
    try {
      const product = await Product.findById(productId).populate('shop', 'name address location contactPhone whatsappNumber');
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      return product;
    } catch (error) {
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }

  /**
   * Get products by shop ID
   * @param {String} shopId - ID of shop
   * @returns {Array} - Array of products
   */
  async getShopProducts(shopId) {
    try {
      return await Product.find({ 
        shop: shopId,
        isActive: true
      }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get shop products: ${error.message}`);
    }
  }

  /**
   * Search products
   * @param {String} query - Search query
   * @param {String} category - Optional product category filter
   * @param {Number} minPrice - Optional minimum price filter
   * @param {Number} maxPrice - Optional maximum price filter
   * @returns {Array} - Array of matching products
   */
  async searchProducts(query, category = null, minPrice = null, maxPrice = null) {
    try {
      // Build search query
      const searchQuery = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ],
        isActive: true
      };
      
      // Add category filter if provided
      if (category) {
        searchQuery.category = category;
      }
      
      // Add price range filter if provided
      if (minPrice !== null || maxPrice !== null) {
        searchQuery.price = {};
        if (minPrice !== null) {
          searchQuery.price.$gte = minPrice;
        }
        if (maxPrice !== null) {
          searchQuery.price.$lte = maxPrice;
        }
      }
      
      // Find products matching criteria
      const products = await Product.find(searchQuery)
        .populate('shop', 'name address location')
        .sort({ createdAt: -1 });
      
      return products;
    } catch (error) {
      throw new Error(`Failed to search products: ${error.message}`);
    }
  }

  /**
   * Get catalog items
   * @param {String} category - Optional catalog category filter
   * @returns {Array} - Array of catalog items
   */
  async getCatalogItems(category = null) {
    try {
      // Build query
      const query = {};
      
      // Add category filter if provided
      if (category) {
        query.category = category;
      }
      
      // Get catalog items
      return await CatalogItem.find(query).sort({ name: 1 });
    } catch (error) {
      throw new Error(`Failed to get catalog items: ${error.message}`);
    }
  }

  /**
   * Create product from catalog item
   * @param {String} catalogItemId - ID of catalog item
   * @param {Object} customData - Custom product data
   * @param {String} shopId - ID of the shop
   * @returns {Object} - Created product
   */
  async createFromCatalog(catalogItemId, customData, shopId) {
    try {
      // Get catalog item
      const catalogItem = await CatalogItem.findById(catalogItemId);
      
      if (!catalogItem) {
        throw new Error('Catalog item not found');
      }
      
      // Merge catalog item data with custom data
      const productData = {
        name: catalogItem.name,
        description: catalogItem.description,
        category: catalogItem.category,
        specifications: catalogItem.specifications,
        ...customData
      };
      
      // Create product
      return await this.createProduct(productData, shopId);
    } catch (error) {
      throw new Error(`Failed to create product from catalog: ${error.message}`);
    }
  }

  /**
   * Delete product
   * @param {String} productId - ID of product to delete
   * @param {String} shopId - ID of the shop
   * @returns {Boolean} - Success status
   */
  async deleteProduct(productId, shopId) {
    try {
      // Find product and verify shop ownership
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      if (product.shop.toString() !== shopId) {
        throw new Error('Unauthorized: This product does not belong to your shop');
      }
      
      // Delete product
      await Product.findByIdAndDelete(productId);
      
      return true;
    } catch (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  /**
   * Toggle product active status
   * @param {String} productId - ID of product
   * @param {String} shopId - ID of the shop
   * @returns {Object} - Updated product
   */
  async toggleProductStatus(productId, shopId) {
    try {
      // Find product and verify shop ownership
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      if (product.shop.toString() !== shopId) {
        throw new Error('Unauthorized: This product does not belong to your shop');
      }
      
      // Toggle active status
      product.isActive = !product.isActive;
      await product.save();
      
      return product;
    } catch (error) {
      throw new Error(`Failed to toggle product status: ${error.message}`);
    }
  }

  /**
   * Update product stock
   * @param {String} productId - ID of product
   * @param {Number} stockChange - Amount to change stock by
   * @param {String} shopId - ID of the shop
   * @returns {Object} - Updated product
   */
  async updateStock(productI
