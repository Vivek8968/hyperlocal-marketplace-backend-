const { Pool } = require('pg');
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Create a new user
  static async create({ name, email, phone, password, userType, authProvider, firebaseUid }) {
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    
    const query = `
      INSERT INTO users (name, email, phone, password, user_type, auth_provider, firebase_uid, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, name, email, phone, user_type, auth_provider, created_at
    `;
    
    const values = [name, email, phone, hashedPassword, userType, authProvider, firebaseUid];
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  // Find user by ID
  static async findById(id) {
    const query = `
      SELECT id, name, email, phone, user_type, auth_provider, created_at, updated_at, is_active
      FROM users
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
  
  // Find user by email
  static async findByEmail(email) {
    const query = `
      SELECT id, name, email, phone, password, user_type, auth_provider, firebase_uid, created_at, updated_at, is_active
      FROM users
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }
  
  // Find user by phone
  static async findByPhone(phone) {
    const query = `
      SELECT id, name, email, phone, password, user_type, auth_provider, firebase_uid, created_at, updated_at, is_active
      FROM users
      WHERE phone = $1
    `;
    
    const result = await pool.query(query, [phone]);
    return result.rows[0] || null;
  }
  
  // Find user by Firebase UID
  static async findByFirebaseUid(firebaseUid) {
    const query = `
      SELECT id, name, email, phone, password, user_type, auth_provider, firebase_uid, created_at, updated_at, is_active
      FROM users
      WHERE firebase_uid = $1
    `;
    
    const result = await pool.query(query, [firebaseUid]);
    return result.rows[0] || null;
  }
  
  // Update user
  static async update(id, userData) {
    const { name, email, phone, password, isActive } = userData;
    
    // Build dynamic query
    let updates = [];
    let values = [];
    let counter = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${counter}`);
      values.push(name);
      counter++;
    }
