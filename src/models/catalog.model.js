const pool = require('../config/database');

class Catalog {
  // Create a new catalog item
  static async create({ name, brand, category, specs, imageUrl }) {
    const query = `
      INSERT INTO electronics_catalog (name, brand, category, specs, image_url, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, name, brand, category, specs, image_url, created_at
    `;
    
    const values = [name, brand, category, specs || {}, imageUrl];
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  // Find catalog item by ID
  static async findById(id) {
    const query = `
      SELECT id, name, brand, category, specs, image_url, created_at, updated_at
      FROM electronics_catalog
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
  
  // Find catalog items by category
  static async findByCategory(category, page = 1, limit = 10, sort = {}) {
    const offset = (page - 1) * limit;
    
    // Build ORDER BY clause
    let orderClause = ' ORDER BY created_at DESC';
    
    if (sort.field) {
      const direction = sort.order === 'asc' ? 'ASC' : 'DESC';
      const allowedFields = ['name', 'brand', 'created_at'];
      
      if (allowedFields.includes(sort.field)) {
        orderClause = ` ORDER BY ${sort.field} ${direction}`;
      }
    }
    
    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM electronics_catalog
      WHERE category = $1
    `;
    
    const countResult = await pool.query(countQuery, [category]);
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated results
    const query = `
      SELECT id, name, brand, category, specs, image_url, created_at, updated_at
      FROM electronics_catalog
      WHERE category = $1
      ${orderClause}
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [category, limit, offset]);
    
    return {
      items: result.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  // Update catalog item
  static async update(id, itemData) {
    const { name, brand, category, specs, imageUrl } = itemData;
    
    // Build dynamic query
    let updates = [];
    let values = [];
    let counter = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${counter}`);
      values.push(name);
      counter++;
    }
    
    if (brand !== undefined) {
      updates.push(`brand = $${counter}`);
      values.push(brand);
      counter++;
    }
    
    if (category !== undefined) {
      updates.push(`category = $${counter}`);
      values.push(category);
      counter++;
    }
    
    if (specs !== undefined) {
      updates.push(`specs = $${counter}`);
      values.push(specs);
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
      UPDATE electronics_catalog
      SET ${updates.join(', ')}
      WHERE id = $${counter}
      RETURNING id, name, brand, category, specs, image_url, created_at, updated_at
    `;
    
    values.push(id);
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }
  
  // Delete catalog item
  static async delete(id) {
    const query = `
      DELETE FROM electronics_catalog
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
  
  // Search and filter catalog items
  static async search(page = 1, limit = 10, filters = {}, sort = {}) {
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereClause = '';
    let values = [];
    let counter = 1;
    
    if (filters.search) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `(name ILIKE $${counter} OR brand ILIKE $${counter})`;
      values.push(`%${filters.search}%`);
      counter++;
    }
    
    if (filters.category) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `category = $${counter}`;
      values.push(filters.category);
      counter++;
    }
    
    if (filters.brand) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `brand = $${counter}`;
      values.push(filters.brand);
      counter++;
    }
    
    // Build ORDER BY clause
    let orderClause = ' ORDER BY created_at DESC';
    
    if (sort.field) {
      const direction = sort.order === 'asc' ? 'ASC' : 'DESC';
      const allowedFields = ['name', 'brand', 'category', 'created_at'];
      
      if (allowedFields.includes(sort.field)) {
        orderClause = ` ORDER BY ${sort.field} ${direction}`;
      }
    }
    
    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM electronics_catalog
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated results
    const query = `
      SELECT id, name, brand, category, specs, image_url, created_at, updated_at
      FROM electronics_catalog
      ${whereClause}
      ${orderClause}
      LIMIT $${counter} OFFSET $${counter+1}
    `;
    
    values.push(limit, offset);
    const result = await pool.query(query, values);
    
    return {
      items: result.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  // Get distinct categories
  static async getCategories() {
    const query = `
      SELECT DISTINCT category
      FROM electronics_catalog
      ORDER BY category
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => row.category);
  }
  
  // Get distinct brands
  static async getBrands() {
    const query = `
      SELECT DISTINCT brand
      FROM electronics_catalog
      ORDER BY brand
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => row.brand);
  }
}

module.exports = Catalog;

