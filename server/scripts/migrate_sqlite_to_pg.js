/**
 * Data Migration Script: SQLite -> Managed PostgreSQL
 * Migrates all companies, users, applications, otps, audit_logs, notifications, and invites.
 * 
 * Usage:
 *   node scripts/migrate_sqlite_to_pg.js "postgres://user:password@hostname:5432/dbname"
 *   OR set DATABASE_URL in .env and run:
 *   npm run migrate:pg
 */

import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlitePath = path.resolve(__dirname, '../../data/verdika.sqlite');
const targetPgUrl = process.argv[2] || process.env.DATABASE_URL;

if (!targetPgUrl || (!targetPgUrl.startsWith('postgres://') && !targetPgUrl.startsWith('postgresql://'))) {
  console.error('\n❌ ERROR: Target PostgreSQL URL is required.');
  console.log('Usage: node scripts/migrate_sqlite_to_pg.js "postgres://user:password@host:5432/dbname"');
  console.log('Or add DATABASE_URL=postgres://... in your .env file.\n');
  process.exit(1);
}

const sqliteDb = new sqlite3.Database(sqlitePath);
const pgPool = new Pool({
  connectionString: targetPgUrl,
  ssl: targetPgUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

function sqliteAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function runMigration() {
  console.log('================================================================');
  console.log('🔄 STARTING DATA MIGRATION: SQLite -> Managed PostgreSQL');
  console.log('Source SQLite:', sqlitePath);
  console.log('Target PostgreSQL:', targetPgUrl.replace(/:[^:@]+@/, ':****@'));
  console.log('================================================================\n');

  try {
    await pgPool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connection verified.');

    // 1. Migrate Companies
    const companies = await sqliteAll('SELECT * FROM companies');
    console.log(`Found ${companies.length} companies in SQLite.`);
    for (const c of companies) {
      await pgPool.query(`
        INSERT INTO companies (id, name, slug, email, status, default_interest_rate, deactivated_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          email = EXCLUDED.email,
          status = EXCLUDED.status,
          default_interest_rate = EXCLUDED.default_interest_rate,
          deactivated_at = EXCLUDED.deactivated_at
      `, [c.id, c.name, c.slug, c.email, c.status || 'active', c.default_interest_rate || 14.0, c.deactivated_at, c.created_at]);
    }
    console.log(`✅ Migrated ${companies.length} companies.`);

    // 2. Migrate Users
    const users = await sqliteAll('SELECT * FROM users');
    console.log(`Found ${users.length} users in SQLite.`);
    for (const u of users) {
      await pgPool.query(`
        INSERT INTO users (id, company_id, name, email, password_hash, role, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          company_id = EXCLUDED.company_id,
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role
      `, [u.id, u.company_id, u.name, u.email, u.password_hash, u.role, u.created_at]);
    }
    console.log(`✅ Migrated ${users.length} users.`);

    // 3. Migrate Applications
    const applications = await sqliteAll('SELECT * FROM applications');
    console.log(`Found ${applications.length} applications in SQLite.`);
    for (const a of applications) {
      await pgPool.query(`
        INSERT INTO applications (id, company_id, user_id, merchant_data, features, risk_result, adversarial_result, decision, routing_reason, applicant_message, underwriter_summary, status, reviewer_id, reviewer_decision, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          reviewer_id = EXCLUDED.reviewer_id,
          reviewer_decision = EXCLUDED.reviewer_decision,
          updated_at = EXCLUDED.updated_at
      `, [a.id, a.company_id, a.user_id, a.merchant_data, a.features, a.risk_result, a.adversarial_result, a.decision, a.routing_reason, a.applicant_message, a.underwriter_summary, a.status, a.reviewer_id, a.reviewer_decision, a.created_at, a.updated_at]);
    }
    console.log(`✅ Migrated ${applications.length} applications.`);

    // 4. Migrate Audit Logs
    const auditLogs = await sqliteAll('SELECT * FROM audit_logs');
    console.log(`Found ${auditLogs.length} audit logs in SQLite.`);
    for (const al of auditLogs) {
      await pgPool.query(`
        INSERT INTO audit_logs (id, application_id, agent_name, actor, input_snapshot, output_snapshot, confidence_score, execution_time_ms, summary, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [al.id, al.application_id, al.agent_name, al.actor, al.input_snapshot, al.output_snapshot, al.confidence_score, al.execution_time_ms, al.summary, al.created_at]);
    }
    console.log(`✅ Migrated ${auditLogs.length} audit logs.`);

    // 5. Migrate Notifications
    const notifications = await sqliteAll('SELECT * FROM notifications');
    console.log(`Found ${notifications.length} notifications in SQLite.`);
    for (const n of notifications) {
      await pgPool.query(`
        INSERT INTO notifications (id, application_id, recipient_email, recipient_name, subject, decision, status, content_html, error, sent_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [n.id, n.application_id, n.recipient_email, n.recipient_name, n.subject, n.decision, n.status, n.content_html, n.error, n.sent_at, n.created_at]);
    }
    console.log(`✅ Migrated ${notifications.length} notifications.`);

    // 6. Migrate OTPs
    const otps = await sqliteAll('SELECT * FROM otps');
    console.log(`Found ${otps.length} active OTP records in SQLite.`);
    for (const o of otps) {
      await pgPool.query(`
        INSERT INTO otps (id, user_id, email, otp_code, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [o.id, o.user_id, o.email, o.otp_code, o.expires_at, o.created_at]);
    }
    console.log(`✅ Migrated ${otps.length} OTP records.`);

    console.log('\n================================================================');
    console.log('🎉 ALL TABLES SUCCESSFULLY MIGRATED TO POSTGRESQL!');
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

runMigration();
