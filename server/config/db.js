import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure canonical database file location in workspace data directory
const defaultDbPath = path.resolve(__dirname, '../../data/verdika.sqlite');
const dbPath =
  !config.sqlitePath ||
  config.sqlitePath === './verdika.sqlite' ||
  config.sqlitePath === './data/verdika.sqlite' ||
  config.sqlitePath === '../data/verdika.sqlite'
    ? defaultDbPath
    : path.resolve(config.sqlitePath);

let dbInstance = null;

/**
 * Async Promisified Database Interface
 */
export const db = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      if (!dbInstance) return reject(new Error('Database not initialized. Call connectDB() first.'));
      dbInstance.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      if (!dbInstance) return reject(new Error('Database not initialized. Call connectDB() first.'));
      dbInstance.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },

  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      if (!dbInstance) return reject(new Error('Database not initialized. Call connectDB() first.'));
      dbInstance.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  },

  exec: (sql) => {
    return new Promise((resolve, reject) => {
      if (!dbInstance) return reject(new Error('Database not initialized. Call connectDB() first.'));
      dbInstance.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

/**
 * Initialize Schema & Run Migrations
 */
const initSchema = async () => {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      default_interest_rate REAL NOT NULL DEFAULT 14.0,
      deactivated_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'underwriter',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      user_id TEXT,
      merchant_data TEXT,
      features TEXT,
      risk_result TEXT,
      adversarial_result TEXT,
      decision TEXT,
      routing_reason TEXT,
      applicant_message TEXT,
      underwriter_summary TEXT,
      status TEXT NOT NULL DEFAULT 'pending_review',
      reviewer_id TEXT,
      reviewer_decision TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'system',
      input_snapshot TEXT DEFAULT '{}',
      output_snapshot TEXT DEFAULT '{}',
      confidence_score REAL DEFAULT 0,
      execution_time_ms REAL DEFAULT 0,
      summary TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      subject TEXT NOT NULL,
      decision TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent',
      content_html TEXT,
      error TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS company_invites (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'underwriter',
      token TEXT UNIQUE NOT NULL,
      invited_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await db.exec(schemaSql);

  // Run Column Migrations for SQLite
  try {
    const compColumns = await db.all(`PRAGMA table_info(companies)`);
    if (!compColumns.some((c) => c.name === 'status')) {
      await db.exec(`ALTER TABLE companies ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
    }
    if (!compColumns.some((c) => c.name === 'deactivated_at')) {
      await db.exec(`ALTER TABLE companies ADD COLUMN deactivated_at DATETIME`);
    }
    if (!compColumns.some((c) => c.name === 'default_interest_rate')) {
      await db.exec(`ALTER TABLE companies ADD COLUMN default_interest_rate REAL NOT NULL DEFAULT 14.0`);
    }
  } catch (err) {
    logger.warn('[DB Migration] companies status/deactivated_at/default_interest_rate check:', err.message);
  }

  try {
    const userColumns = await db.all(`PRAGMA table_info(users)`);
    if (!userColumns.some((c) => c.name === 'company_id')) {
      await db.exec(`ALTER TABLE users ADD COLUMN company_id TEXT`);
    }
  } catch (err) {
    logger.warn('[DB Migration] users.company_id check:', err.message);
  }

  try {
    const appColumns = await db.all(`PRAGMA table_info(applications)`);
    if (!appColumns.some((c) => c.name === 'company_id')) {
      await db.exec(`ALTER TABLE applications ADD COLUMN company_id TEXT`);
    }
  } catch (err) {
    logger.warn('[DB Migration] applications.company_id check:', err.message);
  }
};

/**
 * Seed Default System Data (Users & Initial Applications)
 */
const seedDefaultData = async () => {
  try {
    // 0. Seed Platform Super Admin Account (Global Platform Owner)
    const superAdminEmail = 'udit47656@gmail.com';
    const superAdminPasswordPlain = '47656*ShahUdit';
    const existingSuperAdmin = await db.get('SELECT id FROM users WHERE email = ?', [superAdminEmail]);
    const superAdminHash = await bcrypt.hash(superAdminPasswordPlain, 10);

    if (!existingSuperAdmin) {
      const superAdminId = crypto.randomUUID();
      await db.run(
        `INSERT INTO users (id, company_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`,
        [superAdminId, null, 'Platform Super Admin', superAdminEmail, superAdminHash, 'super_admin']
      );
      logger.info(`[DB Seed] Seeded platform Super Admin account (${superAdminEmail})`);
    } else {
      await db.run(
        `UPDATE users SET password_hash = ?, role = 'super_admin', company_id = NULL WHERE email = ?`,
        [superAdminHash, superAdminEmail]
      );
      logger.info(`[DB Seed] Updated platform Super Admin credentials (${superAdminEmail})`);
    }

    // 1. Seed Default Finance Company: Verdika Capital
    let defaultCompany = await db.get('SELECT * FROM companies WHERE slug = ?', ['verdika-capital']);
    if (!defaultCompany) {
      const companyId = crypto.randomUUID();
      await db.run(
        `INSERT INTO companies (id, name, slug, email, status) VALUES (?, ?, ?, ?, 'active')`,
        [companyId, 'Verdika Capital', 'verdika-capital', 'udit54638@gmail.com']
      );
      defaultCompany = { id: companyId, name: 'Verdika Capital', slug: 'verdika-capital' };
      logger.info('[DB Seed] Seeded default finance company (Verdika Capital, slug: verdika-capital)');
    }

    // 2. Seed Demo Underwriter
    const existingUnderwriter = await db.get('SELECT id FROM users WHERE email = ?', ['underwriter@verdika.internal']);
    if (!existingUnderwriter) {
      const passwordHash = await bcrypt.hash('Verdika123!', 10);
      const underwriterId = crypto.randomUUID();
      await db.run(
        `INSERT INTO users (id, company_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`,
        [underwriterId, defaultCompany.id, 'Chief Underwriter', 'underwriter@verdika.internal', passwordHash, 'underwriter']
      );
      logger.info('[DB Seed] Seeded default underwriter account (underwriter@verdika.internal)');
    } else {
      // Ensure existing underwriter has default company_id
      await db.run(`UPDATE users SET company_id = ? WHERE email = ? AND company_id IS NULL`, [defaultCompany.id, 'underwriter@verdika.internal']);
    }

    // Backfill NULL application company_ids with defaultCompany.id
    await db.run(`UPDATE applications SET company_id = ? WHERE company_id IS NULL`, [defaultCompany.id]);

    // 3. Seed Admin User: udit54638@gmail.com
    const existingAdmin = await db.get('SELECT id FROM users WHERE email = ?', ['udit54638@gmail.com']);
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('129760@gmailUdit', 10);
      const adminId = crypto.randomUUID();
      await db.run(
        `INSERT INTO users (id, company_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`,
        [adminId, defaultCompany.id, 'System Administrator', 'udit54638@gmail.com', passwordHash, 'admin']
      );
      logger.info('[DB Seed] Seeded default admin account (udit54638@gmail.com)');
    } else {
      const passwordHash = await bcrypt.hash('129760@gmailUdit', 10);
      await db.run(
        `UPDATE users SET password_hash = ?, role = 'admin', company_id = COALESCE(company_id, ?) WHERE email = ?`,
        [passwordHash, defaultCompany.id, 'udit54638@gmail.com']
      );
    }

    // 4. Seed Demo Merchant User
    const existingMerchant = await db.get('SELECT id FROM users WHERE email = ?', ['merchant@verdika.internal']);
    if (!existingMerchant) {
      const passwordHash = await bcrypt.hash('Merchant123!', 10);
      const merchantId = crypto.randomUUID();
      await db.run(
        `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
        [merchantId, 'Apex Merchant (Demo)', 'merchant@verdika.internal', passwordHash, 'merchant']
      );
      logger.info('[DB Seed] Seeded default merchant account (merchant@verdika.internal)');
    }

    // 3. Seed Sample Applications if empty
    // Sample application seeding removed – schema now matches current spec.
  } catch (err) {
    logger.error('[DB Seed] Error during data seeding:', err);
  }
};

/**
 * Connect and initialize SQLite database
 */
export const connectDB = async () => {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    dbInstance = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        logger.error(`[DB] Failed to connect to SQLite at ${dbPath}:`, err);
        return reject(err);
      }
      logger.info(`[DB] SQLite database connected successfully at ${dbPath}`);
      try {
        await initSchema();
        await seedDefaultData();
        resolve(dbInstance);
      } catch (schemaErr) {
        logger.error('[DB] Error initializing schema or seeds:', schemaErr);
        reject(schemaErr);
      }
    });
  });
};
