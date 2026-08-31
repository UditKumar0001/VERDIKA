import crypto from 'crypto';
import { db } from '../config/db.js';

/**
 * Company Model
 * Represents a tenant / finance company / NBFC on the Verdika multi-tenant platform.
 */
export class Company {
  constructor({ id, name, slug, email, created_at }) {
    this.id = id;
    this.name = name || 'Finance Company';
    this.slug = slug;
    this.email = email || null;
    this.created_at = created_at || new Date().toISOString();
  }

  static fromRow(row) {
    if (!row) return null;
    return new Company({
      id: row.id,
      name: row.name,
      slug: row.slug,
      email: row.email,
      created_at: row.created_at
    });
  }

  /**
   * Generates a unique, URL-safe slug from the company name.
   * e.g. "HDFC Finance" -> "hdfc-finance", if exists -> "hdfc-finance-2"
   * @param {string} companyName - Input company name
   * @returns {Promise<string>} Unique slug
   */
  static async generateSlug(companyName) {
    const baseSlug = String(companyName || 'finance-company')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'finance-company';

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await db.get('SELECT id FROM companies WHERE slug = ?', [slug]);
      if (!existing) {
        return slug;
      }
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }

  static async findById(id) {
    if (!id) return null;
    const row = await db.get('SELECT * FROM companies WHERE id = ?', [id]);
    return Company.fromRow(row);
  }

  static async findBySlug(slug) {
    if (!slug) return null;
    const cleanSlug = String(slug).trim().toLowerCase();
    const row = await db.get('SELECT * FROM companies WHERE LOWER(slug) = LOWER(?)', [cleanSlug]);
    return Company.fromRow(row);
  }

  static async create({ name, email, slug }) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const uniqueSlug = slug || await Company.generateSlug(name);

    await db.run(
      `INSERT INTO companies (id, name, slug, email, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name.trim(), uniqueSlug, email ? email.trim().toLowerCase() : null, createdAt]
    );

    return new Company({ id, name: name.trim(), slug: uniqueSlug, email, created_at: createdAt });
  }

  static async findAll() {
    const rows = await db.all('SELECT * FROM companies ORDER BY name ASC');
    return rows.map((r) => Company.fromRow(r));
  }
}
