const pool = require('../config/database');

class Product {
  // Create a new product
  static async create({ shopId, title, price, description, stock, imageUrl, catalogId }) {
    const query = `
      INSERT INTO products (shop_id, title, price, description, stock, image_url, catalog_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, shop_id, title, price, description, stock, image_url, catalog_id, created_at
    `;
    
    const values = [shopId, title, price, description, stock || 0, imageUrl, catalogId];
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  // Find product by ID
  static async findById(id) {
    const query = `
      SELECT p.id, p.shop_id, p.title, p.price, p.description, p.stock, p.image_url, 
      p.catalog_id, p.created_at, p.updated_at,
      s.name as shop_name, s.address as shop_address,
      c.name as catalog_name, c.brand as catalog_brand, c.specs as catalog_specs
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      LEFT JOIN electronics_catalog c ON p.catalog_id = c.id
      WHERE p.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
  
  // Find products by shop ID
  static async findByShopId(shopId, page = 1, limit = 10, sort = {}) {
    const offset = (page - 1) * limit;
    
    // Build ORDER BY clause
    let orderClause = ' ORDER BY p.created_at DESC';
    
    if (sort.field) {
      const direction = sort.order === 'asc' ? 'ASC' : 'DESC';
      const allowedFields = ['title', 'price', 'stock', 'created_at'];
      
      if (allowedFields.includes(sort.field)) {
        orderClause = ` ORDER BY p.${sort.field} ${direction}`;
      }
    }
    
    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      WHERE p.shop_id = $1
    `;
    
    const countResult = await pool.query(countQuery, [shopId]);
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated results
    const query = `
      SELECT p.id, p.shop_id, p.title, p.price, p.description, p.stock, p.image_url, 
      p.catalog_id, p.created_at, p.updated_at,
      c.name as catalog_name, c.brand as catalog_brand
      FROM products p
      LEFT JOIN electronics_catalog c ON p.catalog_id = c.id
      WHERE p.shop_id = $1
      ${orderClause}
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [shopId, limit, offset]);
    
    return {
      products: result.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  // Update product
  static async update(id, productData) {
    const { title, price, description, stock, imageUrl } = productData;
    
    // Build dynamic query
    let updates = [];
    let values = [];
    let counter = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${counter}`);
      values.push(title);
      counter++;
    }
    
    if (price !== undefined) {
      updates.push(`price = $${counter}`);
      values.push(price);
      counter++;
    }
    
    if (description !== undefined) {
      updates.push(`description = $${counter}`);
      values.push(description);
      counter++;
    }
    
    if (stock !== undefined) {
      updates.push(`stock = $${counter}`);
      values.push(stock);
      counter++;
    }
    
    if (imageUrl !== undefined) {
      updates.push(`image_url = $${counter}`);
      values.push(imageUrl);
      counter++;
    }
    
    updates.push(`updated_at = NOW()`);
    
    // If no updates, return null
    if (updates.length === 1) {
      return null;
    }
    
    const query = `
      UPDATE products
      SET ${updates.join(', ')}
      WHERE id = $${counter}
      RETURNING id, shop_id, title, price, description, stock, image_url, catalog_id, created_at, updated_at
    `;
    
    values.push(id);
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }
  
  // Delete product
  static async delete(id) {
    const query = `
      DELETE FROM products
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
  
  // Search and filter products
  static async search(page = 1, limit = 10, filters = {}, sort = {}) {
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereClause = '';
    let values = [];
    let counter = 1;
    
    if (filters.search) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `(p.title ILIKE $${counter} OR p.description ILIKE $${counter})`;
      values.push(`%${filters.search}%`);
      counter++;
    }
    
    if (filters.category) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `c.category = $${counter}`;
      values.push(filters.category);
      counter++;
    }
    
    if (filters.shopId) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `p.shop_id = $${counter}`;
      values.push(filters.shopId);
      counter++;
    }
    
    if (filters.priceMin !== undefined) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `p.price >= $${counter}`;
      values.push(filters.priceMin);
      counter++;
    }
    
    if (filters.priceMax !== undefined) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `p.price <= $${counter}`;
      values.push(filters.priceMax);
      counter++;
    }
    
    // Build ORDER BY clause
    let orderClause = ' ORDER BY p.created_at DESC';
    
    if (sort.field) {
      const direction = sort.order === 'asc' ? 'ASC' : 'DESC';
      const allowedFields = ['title', 'price', 'created_at'];
      
      if (allowedFields.includes(sort.field)) {
        orderClause = ` ORDER BY p.${sort.field} ${direction}`;
      }
    }
    
    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN electronics_catalog c ON p.catalog_id = c.id
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated results
    const query = `
      SELECT p.id, p.shop_id, p.title, p.price, p.description, p.stock, p.image_url, 
      p.catalog_id, p.created_at, p.updated_at,
      s.name as shop_name, s.address as shop_address,
      c.name as catalog_name, c.brand as catalog_brand, c.category as catalog_category
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      LEFT JOIN electronics_catalog c ON p.catalog_id = c.id
      ${whereClause}
      ${orderClause}
      LIMIT $${counter} OFFSET $${counter+1}
    `;
    
    values.push(limit, offset);
    const result = await pool.query(query, values);
    
    return {
      products: result.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = Product;

