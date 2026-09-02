import crypto from 'crypto';
import { db } from '../config/db.js';
import { logger } from '../utils/logger.js';

/**
 * Server boot timestamp for correlation diagnostics
 */
export const SERVER_BOOT_TIME = new Date().toISOString();

console.log(`\n======================================================`);
console.log(`🚀 [SERVER BOOT] ${SERVER_BOOT_TIME} - Persistent SQLite OTP Store active`);
console.log(`======================================================\n`);

/**
 * Persistent OTP Model backed by SQLite
 * Survives Node process restarts, server crashes, and Render free-tier cold starts.
 */
export class Otp {
  /**
   * Generates and stores a new OTP for a user
   */
  static async create({ userId, email, otpCode, expiresMinutes = 5 }) {
    const id = crypto.randomUUID();
    const cleanOtp = String(otpCode).trim();
    const now = Date.now();
    const expiresAt = now + expiresMinutes * 60 * 1000;

    // Insert new OTP record into persistent table
    await db.run(
      `INSERT INTO otps (id, user_id, email, otp_code, expires_at, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, userId, email.trim().toLowerCase(), cleanOtp, expiresAt]
    );

    // Clean up expired OTP records older than 15 minutes
    try {
      await db.run(`DELETE FROM otps WHERE expires_at < ?`, [now - 15 * 60 * 1000]);
    } catch (cleanErr) {
      // Non-blocking cleanup
    }

    return { id, userId, email, otp: cleanOtp, expiresAt, createdAt: new Date().toISOString() };
  }

  /**
   * Retrieves all active, unexpired OTPs for a user within the 5-minute sliding window
   */
  static async getActiveOtps(userId) {
    const now = Date.now();
    const rows = await db.all(
      `SELECT * FROM otps WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC`,
      [userId, now]
    );
    return rows || [];
  }

  /**
   * Retrieves the latest OTP record for a user to enforce cooldowns
   */
  static async getLatestOtp(userId) {
    const row = await db.get(
      `SELECT * FROM otps WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return row || null;
  }

  /**
   * Verifies an input OTP against persistent records and consumes all OTPs for that user upon match
   */
  static async verifyAndConsume({ userId, inputOtp }) {
    const now = Date.now();
    const cleanInput = String(inputOtp || '').trim().replace(/\D/g, '');

    const activeRecords = await this.getActiveOtps(userId);

    const matchedRecord = activeRecords.find((r) => String(r.otp_code).trim() === cleanInput);

    if (matchedRecord) {
      // Invalidate / consume all OTPs for this user
      await db.run(`DELETE FROM otps WHERE user_id = ?`, [userId]);
      return {
        valid: true,
        matchedRecord,
        activeCount: activeRecords.length
      };
    }

    return {
      valid: false,
      activeRecords,
      activeCount: activeRecords.length
    };
  }
}
