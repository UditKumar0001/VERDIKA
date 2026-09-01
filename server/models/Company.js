import crypto from 'crypto';
import { db } from '../config/db.js';

/**
 * Company Model
 * Represents a tenant / finance company / NBFC on the Verdika multi-tenant platform.
 */
export class Company {
  constructor({ id, name, slug, email, status = 'active', deactivated_at = null, created_at }) {
    this.id = id;
    this.name = name || 'Finance Company';
    this.slug = slug;
    this.email = email || null;
    this.status = status || 'active';
    this.deactivated_at = deactivated_at || null;
    this.created_at = created_at || new Date().toISOString();
  }

  isActive() {
    return this.status === 'active';
  }

  static fromRow(row) {
    if (!row) return null;
    return new Company({
      id: row.id,
      name: row.name,
      slug: row.slug,
      email: row.email,
      status: row.status || 'active',
      deactivated_at: row.deactivated_at || null,
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

  static async create({ name, email, slug, status = 'active' }) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const uniqueSlug = slug || await Company.generateSlug(name);

    await db.run(
      `INSERT INTO companies (id, name, slug, email, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), uniqueSlug, email ? email.trim().toLowerCase() : null, status, createdAt]
    );

    return new Company({ id, name: name.trim(), slug: uniqueSlug, email, status, created_at: createdAt });
  }

  static async setStatus(id, status) {
    const deactivated_at = status === 'removed' ? new Date().toISOString() : null;
    await db.run(
      `UPDATE companies SET status = ?, deactivated_at = ? WHERE id = ?`,
      [status, deactivated_at, id]
    );
    return await Company.findById(id);
  }

  static async findAll({ activeOnly = false } = {}) {
    let sql = 'SELECT * FROM companies';
    if (activeOnly) {
      sql += " WHERE status = 'active' OR status IS NULL";
    }
    sql += ' ORDER BY created_at DESC';
    const rows = await db.all(sql);
    return rows.map((r) => Company.fromRow(r));
  }

  /**
   * Retrieves all companies enriched with admin info, team counts, and application volumes.
   */
  static async findAllWithStats() {
    const companies = await db.all('SELECT * FROM companies ORDER BY created_at DESC');
    const users = await db.all('SELECT id, company_id, name, email, role FROM users');
    const applications = await db.all('SELECT id, company_id FROM applications');

    return companies.map((c) => {
      const companyUsers = users.filter((u) => u.company_id === c.id);
      const adminUser = companyUsers.find((u) => u.role === 'admin') || companyUsers[0] || null;
      const underwritersCount = companyUsers.filter((u) => u.role === 'underwriter').length;
      const appCount = applications.filter((a) => a.company_id === c.id).length;

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        email: c.email || adminUser?.email || 'N/A',
        status: c.status || 'active',
        deactivated_at: c.deactivated_at || null,
        created_at: c.created_at,
        admin_name: adminUser?.name || 'Company Administrator',
        admin_email: adminUser?.email || c.email || 'N/A',
        underwriters_count: underwritersCount,
        total_applications: appCount,
        total_members: companyUsers.length
      };
    });
  }
}
