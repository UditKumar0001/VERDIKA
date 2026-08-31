import crypto from 'crypto';
import { db } from '../config/db.js';

/**
 * User Model
 * Represents system users (underwriters, risk officers, finance company admins, merchants).
 */
export class User {
  constructor({ id, company_id = null, name, email, passwordHash, role, createdAt }) {
    this.id = id;
    this.company_id = company_id;
    this.name = name || 'User';
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = role || 'underwriter';
    this.createdAt = createdAt || new Date().toISOString();
  }

  /**
   * Returns a sanitized user object without sensitive credentials.
   */
  sanitize() {
    return {
      id: this.id,
      company_id: this.company_id,
      name: this.name,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt
    };
  }

  static fromRow(row) {
    if (!row) return null;
    return new User({
      id: row.id,
      company_id: row.company_id || null,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      createdAt: row.created_at
    });
  }

  static async findByEmail(email) {
    if (!email) return null;
    const row = await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    return User.fromRow(row);
  }

  static async findById(id) {
    if (!id) return null;
    const row = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    return User.fromRow(row);
  }

  static async create({ name, email, passwordHash, role = 'underwriter', company_id = null }) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await db.run(
      `INSERT INTO users (id, company_id, name, email, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, company_id, name || 'User', email.trim().toLowerCase(), passwordHash, role, createdAt]
    );
    return new User({ id, company_id, name, email: email.trim().toLowerCase(), passwordHash, role, createdAt });
  }

  static async findAll() {
    const rows = await db.all('SELECT id, company_id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    return rows.map((r) => User.fromRow(r));
  }

  static async findByCompany(company_id) {
    if (!company_id) return [];
    const rows = await db.all(
      'SELECT id, company_id, name, email, role, created_at FROM users WHERE company_id = ? ORDER BY created_at ASC',
      [company_id]
    );
    return rows.map((r) => User.fromRow(r));
  }
}
