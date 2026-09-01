import crypto from 'crypto';
import { db } from '../config/db.js';

/**
 * CompanyInvite Model
 * Manages secure, time-limited team invitation tokens for underwriters and risk officers.
 */
export class CompanyInvite {
  constructor({
    id,
    company_id,
    email,
    role = 'underwriter',
    token,
    invited_by,
    status = 'pending',
    expires_at,
    created_at
  }) {
    this.id = id;
    this.company_id = company_id;
    this.email = email;
    this.role = role;
    this.token = token;
    this.invited_by = invited_by;
    this.status = status;
    this.expires_at = expires_at;
    this.created_at = created_at || new Date().toISOString();
  }

  static fromRow(row) {
    if (!row) return null;
    return new CompanyInvite({
      id: row.id,
      company_id: row.company_id,
      email: row.email,
      role: row.role,
      token: row.token,
      invited_by: row.invited_by,
      status: row.status,
      expires_at: row.expires_at,
      created_at: row.created_at
    });
  }

  static async create({ company_id, email, role = 'underwriter', invited_by, hoursValid = 72 }) {
    const id = 'INV-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + hoursValid * 60 * 60 * 1000).toISOString();
    const createdAt = now.toISOString();

    await db.run(
      `INSERT INTO company_invites (id, company_id, email, role, token, invited_by, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, company_id, email.trim().toLowerCase(), role, token, invited_by, expiresAt, createdAt]
    );

    return new CompanyInvite({
      id,
      company_id,
      email: email.trim().toLowerCase(),
      role,
      token,
      invited_by,
      status: 'pending',
      expires_at: expiresAt,
      created_at: createdAt
    });
  }

  static async findByToken(token) {
    if (!token) return null;
    const row = await db.get('SELECT * FROM company_invites WHERE token = ?', [token.trim()]);
    return CompanyInvite.fromRow(row);
  }

  static async findByCompany(company_id) {
    if (!company_id) return [];
    const rows = await db.all(
      'SELECT * FROM company_invites WHERE company_id = ? ORDER BY created_at DESC',
      [company_id]
    );
    return rows.map((r) => CompanyInvite.fromRow(r));
  }

  static async findSuperAdminInvites() {
    const rows = await db.all(
      `SELECT * FROM company_invites WHERE role = 'super_admin' ORDER BY created_at DESC`
    );
    return rows.map((r) => CompanyInvite.fromRow(r));
  }

  static async markAccepted(id) {
    await db.run('UPDATE company_invites SET status = ? WHERE id = ?', ['accepted', id]);
    const row = await db.get('SELECT * FROM company_invites WHERE id = ?', [id]);
    return CompanyInvite.fromRow(row);
  }

  static async revoke(id, company_id) {
    if (company_id) {
      await db.run('UPDATE company_invites SET status = ? WHERE id = ? AND company_id = ?', ['revoked', id, company_id]);
    } else {
      await db.run('UPDATE company_invites SET status = ? WHERE id = ?', ['revoked', id]);
    }
    const row = await db.get('SELECT * FROM company_invites WHERE id = ?', [id]);
    return CompanyInvite.fromRow(row);
  }

  static async revokeSuperAdminInvite(id) {
    await db.run(`UPDATE company_invites SET status = 'revoked' WHERE id = ? AND role = 'super_admin'`, [id]);
    const row = await db.get('SELECT * FROM company_invites WHERE id = ?', [id]);
    return CompanyInvite.fromRow(row);
  }

  isExpired() {
    return new Date(this.expires_at).getTime() < Date.now();
  }

  isValid() {
    return this.status === 'pending' && !this.isExpired();
  }
}
