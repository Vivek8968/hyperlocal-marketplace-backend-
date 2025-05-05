const pool = require('../config/database');

class Shop {
  // Create a new shop
  static async create({ ownerId, name, bannerUrl, address, whatsapp, location }) {
    const query = `
      INSERT INTO shops (owner_id, name, banner_url, address, whatsapp, location, created_at, updated_at, is_approved)
      VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), NOW(), NOW(), false)
      RETURNING id, owner_id, name, banner_url, address, whatsapp, 
      ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude, 
      created_at, is_approved
    `;
    
    const values = [ownerId, name, bannerUrl, address, whatsapp, location.lng, location.lat];
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  // Find shop by ID
  static async findById(id) {
    const query = `
      SELECT s.id, s.owner_id, s.name, s.banner_url, s.address, s.whatsapp, 
      ST_X(s.location::geometry) as longitude, ST_Y(s.location::geometry) as latitude, 
      s.created_at, s.updated_at, s.is_approved, s.status, s.approval_reason,
      u.name as owner_name, u.email as owner_email, u.phone as owner_phone
      FROM shops s
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE s.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
  
  // Find shop by owner ID
  static async findByOwnerId(ownerId) {
    const query = `
      SELECT id, owner_id, name, banner_url, address, whatsapp, 
      ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude, 
      created_at, updated_at, is_approved, status, approval_reason
      FROM shops
      WHERE owner_id = $1
    `;
    
    const result = await pool.query(query, [ownerId]);
    return result.rows;
  }
  
  // Update shop
  static async update(id, shopData) {
    const { name, bannerUrl, address, whatsapp, location } = shopData;
    
    // Build dynamic query
    let updates = [];
    let values = [];
    let counter = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${counter}`);
      values.push(name);
      counter++;
    }
    
    if (bannerUrl !== undefined) {
      updates.push(`banner_url = $${counter}`);
      values.push(bannerUrl);
      counter++;
    }
    
    if (address !== undefined) {
      updates.push(`address = $${counter}`);
      values.push(address);
      counter++;
    }
    
    if (whatsapp !== undefined) {
      updates.push(`whatsapp = $${counter}`);
      values.push(whatsapp);
      counter++;
    }
    
    if (location !== undefined) {
      updates.push(`location = ST_SetSRID(ST_MakePoint($${counter}, $${counter+1}), 4326)`);
      values.push(location.lng, location.lat);
      counter += 2;
    }
    
    updates.push(`updated_at = NOW()`);
    
    // If no updates, return null
    if (updates.length === 1) {
      return null;
    }
    
    const query = `
      UPDATE shops
      SET ${updates.join(', ')}
      WHERE id = $${counter}
      RETURNING id, owner_id, name, banner_url, address, whatsapp, 
      ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude, 
      created_at, updated_at, is_approved, status, approval_reason
    `;
    
    values.push(id);
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }
  
  // Update shop approval status
  static async updateApprovalStatus(id, isApproved, status, reason) {
    const query = `
      UPDATE shops
      SET is_approved = $1, status = $2, approval_reason = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING id, owner_id, name, banner_url, address, whatsapp, 
      ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude, 
      created_at, updated_at, is_approved, status, approval_reason
    `;
    
    const result = await pool.query(query, [isApproved, status, reason, id]);
    return result.rows[0] || null;
  }
  
  // Delete shop
  static async delete(id) {
    const query = `
      DELETE FROM shops
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
  
  // Find nearby shops
  static async findNearby(lat, lng, radius = 5000, limit = 10) {
    const query = `
      SELECT s.id, s.owner_id, s.name, s.banner_url, s.address, s.whatsapp, 
      ST_X(s.location::geometry) as longitude, ST_Y(s.location::geometry) as latitude,
      ST_Distance(
        s.location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) as distance,
      s.created_at, s.is_approved, s.status,
      u.name as owner_name
      FROM shops s
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE s.is_approved = true AND s.status = 'approved'
      AND ST_DWithin(
        s.location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ORDER BY distance
      LIMIT $4
    `;
    
    const values = [lng, lat, radius, limit];
    const result = await pool.query(query, values);
    return result.rows;
  }
  
  // List shops with pagination and filters
  static async list(page = 1, limit = 10, filters = {}, sort = {}) {
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereClause = '';
    let values = [];
    let counter = 1;
    
    if (filters.search) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `(s.name ILIKE $${counter} OR s.address ILIKE $${counter})`;
      values.push(`%${filters.search}%`);
      counter++;
    }
    
    if (filters.status) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `s.status = $${counter}`;
      values.push(filters.status);
      counter++;
    }
    
    if (filters.isApproved !== undefined) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `s.is_approved = $${counter}`;
      values.push(filters.isApproved);
      counter++;
    }
    
    // Build ORDER BY clause
    let orderClause = ' ORDER BY s.created_at DESC';
    
    if (sort.field) {
      const direction = sort.order === 'asc' ? 'ASC' : 'DESC';
      const allowedFields = ['name', 'created_at', 'is_approved', 'status'];
      
      if (allowedFields.includes(sort.field)) {
        orderClause = ` ORDER BY s.${sort.field} ${direction}`;
      }
    }
    
    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM shops s
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated results
    const query = `
      SELECT s.id, s.owner_id, s.name, s.banner_url, s.address, s.whatsapp, 
      ST_X(s.location::geometry) as longitude, ST_Y(s.location::geometry) as latitude, 
      s.created_at, s.updated_at, s.is_approved, s.status, s.approval_reason,
      u.name as owner_name, u.email as owner_email, u.phone as owner_phone
      FROM shops s
      LEFT JOIN users u ON s.owner_id = u.id
      ${whereClause}
      ${orderClause}
      LIMIT $${counter} OFFSET $${counter+1}
    `;
    
    values.push(limit, offset);
    const result = await pool.query(query, values);
    
    return {
      shops: result.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = Shop;

