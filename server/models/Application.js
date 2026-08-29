import crypto from 'crypto';
import { db } from '../config/db.js';

/**
 * Application Model
 * Stores the full pipeline results for a merchant application.
 * Fields:
 *  - id (PK)
 *  - user_id (FK to Users)
 *  - merchant_data (JSON blob)
 *  - features (JSON blob)
 *  - risk_result (JSON blob)
 *  - adversarial_result (JSON blob)
 *  - decision (string)
 *  - routing_reason (string)
 *  - applicant_message (text)
 *  - underwriter_summary (JSON blob)
 *  - status (string: "pending_review" | "closed")
 *  - reviewer_id (FK nullable)
 *  - reviewer_decision (nullable string)
 *  - created_at, updated_at (timestamps)
 */
export class Application {
  constructor({
    id,
    user_id,
    merchant_data,
    features,
    risk_result,
    adversarial_result,
    decision,
    routing_reason,
    applicant_message,
    underwriter_summary,
    status = 'pending_review',
    reviewer_id = null,
    reviewer_decision = null,
    reviewer_name = null,
    created_at,
    updated_at
  }) {
    this.id = id;
    this.user_id = user_id;
    this.merchant_data = merchant_data ? JSON.parse(JSON.stringify(merchant_data)) : null;
    this.features = features ? JSON.parse(JSON.stringify(features)) : null;
    this.risk_result = risk_result ? JSON.parse(JSON.stringify(risk_result)) : null;
    this.adversarial_result = adversarial_result ? JSON.parse(JSON.stringify(adversarial_result)) : null;
    this.decision = decision;
    this.routing_reason = routing_reason;
    this.applicant_message = applicant_message;
    this.underwriter_summary = underwriter_summary ? JSON.parse(JSON.stringify(underwriter_summary)) : null;
    this.status = status;
    this.reviewer_id = reviewer_id;
    this.reviewer_decision = reviewer_decision;
    this.reviewer_name = reviewer_name;
    this.created_at = created_at || new Date().toISOString();
    this.updated_at = updated_at || new Date().toISOString();
  }

  static fromRow(row) {
    if (!row) return null;
    let parsed;
    const parseJSON = (v) => {
      try { return JSON.parse(v); } catch { return null; }
    };
    return new Application({
      id: row.id,
      user_id: row.user_id,
      merchant_data: parseJSON(row.merchant_data),
      features: parseJSON(row.features),
      risk_result: parseJSON(row.risk_result),
      adversarial_result: parseJSON(row.adversarial_result),
      decision: row.decision,
      routing_reason: row.routing_reason,
      applicant_message: row.applicant_message,
      underwriter_summary: parseJSON(row.underwriter_summary),
      status: row.status,
      reviewer_id: row.reviewer_id,
      reviewer_decision: row.reviewer_decision,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }

  static async findById(id) {
    if (!id) return null;
    const row = await db.get('SELECT * FROM applications WHERE id = ?', [id]);
    return Application.fromRow(row);
  }

   static async create(data) {
   const now = new Date().toISOString();
   const id = data.id || 'APP-' + crypto.randomUUID().slice(0, 8).toUpperCase();
   await db.run(
     `INSERT INTO applications (
       id, user_id, merchant_data, features, risk_result, adversarial_result,
       decision, routing_reason, applicant_message, underwriter_summary,
       status, reviewer_id, reviewer_decision, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
     [
       id,
       data.user_id,
       JSON.stringify(data.merchant_data || {}),
       JSON.stringify(data.features || {}),
       JSON.stringify(data.risk_result || {}),
       JSON.stringify(data.adversarial_result || {}),
       data.decision,
       data.routing_reason,
       data.applicant_message,
       JSON.stringify(data.underwriter_summary || {}),
       data.status || 'pending_review',
       data.reviewer_id || null,
       data.reviewer_decision || null,
       now,
       now
     ]
   );
   return new Application({ ...data, id, created_at: now, updated_at: now });
 }


  static async findAll(filters = {}) {
    let query = 'SELECT * FROM applications';
    const params = [];
    const conditions = [];
    if (filters.user_id || filters.userId) {
      conditions.push('user_id = ?');
      params.push(filters.user_id || filters.userId);
    }
    if (filters.status && filters.status !== 'ALL') {
      conditions.push('LOWER(status) = LOWER(?)');
      params.push(filters.status);
    }
    if (filters.search) {
      conditions.push('(id LIKE ? OR applicant_message LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';
    const rows = await db.all(query, params);
    return rows.map(r => Application.fromRow(r));
  }

  static async updateStatus(id, status, reviewer_id = null, reviewer_decision = null) {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE applications SET status = ?, reviewer_id = ?, reviewer_decision = ?, updated_at = ? WHERE id = ?`,
      [status, reviewer_id, reviewer_decision, now, id]
    );
    return Application.findById(id);
  }

  static async updateEvaluation(id, evaluation) {
    const now = new Date().toISOString();
    const status = evaluation.status || ((evaluation.decision === 'auto_approve' || evaluation.decision === 'auto_reject') ? 'closed' : 'pending_review');
    await db.run(
      `UPDATE applications SET
        merchant_data = ?, features = ?, risk_result = ?, adversarial_result = ?,
        decision = ?, routing_reason = ?, applicant_message = ?, underwriter_summary = ?,
        status = ?, updated_at = ?
       WHERE id = ?`,
      [
        JSON.stringify(evaluation.merchant_data || {}),
        JSON.stringify(evaluation.features || {}),
        JSON.stringify(evaluation.risk_result || {}),
        JSON.stringify(evaluation.adversarial_result || {}),
        evaluation.decision,
        evaluation.routing_reason,
        evaluation.applicant_message,
        JSON.stringify(evaluation.underwriter_summary || {}),
        status,
        now,
        id
      ]
    );
    return Application.findById(id);
  }
}
