import crypto from 'crypto';
import { db } from '../config/db.js';

/**
 * Notification Model
 * Persists email notifications sent to merchants upon application evaluation or reviewer final decisions.
 */
export class Notification {
  constructor({
    id,
    application_id,
    recipient_email,
    recipient_name = null,
    subject,
    decision,
    status = 'sent',
    content_html = null,
    error = null,
    sent_at,
    created_at
  }) {
    this.id = id;
    this.application_id = application_id;
    this.recipient_email = recipient_email;
    this.recipient_name = recipient_name;
    this.subject = subject;
    this.decision = decision;
    this.status = status;
    this.content_html = content_html;
    this.error = error;
    this.sent_at = sent_at || new Date().toISOString();
    this.created_at = created_at || new Date().toISOString();
  }

  static fromRow(row) {
    if (!row) return null;
    return new Notification({
      id: row.id,
      application_id: row.application_id,
      recipient_email: row.recipient_email,
      recipient_name: row.recipient_name,
      subject: row.subject,
      decision: row.decision,
      status: row.status,
      content_html: row.content_html,
      error: row.error,
      sent_at: row.sent_at,
      created_at: row.created_at
    });
  }

  static async create(data) {
    const now = new Date().toISOString();
    const id = data.id || 'NOTIF-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    await db.run(
      `INSERT INTO notifications (
        id, application_id, recipient_email, recipient_name, subject,
        decision, status, content_html, error, sent_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.application_id,
        data.recipient_email,
        data.recipient_name || null,
        data.subject,
        data.decision,
        data.status || 'sent',
        data.content_html || null,
        data.error || null,
        now,
        now
      ]
    );
    return new Notification({ ...data, id, sent_at: now, created_at: now });
  }

  static async findByApplicationId(applicationId) {
    if (!applicationId) return [];
    const rows = await db.all('SELECT * FROM notifications WHERE application_id = ? ORDER BY sent_at DESC', [applicationId]);
    return rows.map(r => Notification.fromRow(r));
  }

  static async findAll(limit = 50) {
    const rows = await db.all('SELECT * FROM notifications ORDER BY sent_at DESC LIMIT ?', [limit]);
    return rows.map(r => Notification.fromRow(r));
  }
}
