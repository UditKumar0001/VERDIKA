import crypto from 'crypto';
import { db } from '../config/db.js';

/**
 * AuditLog Model
 * Records immutable traces of agent reasoning, prompt evaluations, and underwriting decisions.
 */
export class AuditLog {
  constructor({
    id,
    applicationId,
    agentName,
    actor = 'system',
    inputSnapshot,
    outputSnapshot,
    confidenceScore,
    executionTimeMs,
    summary,
    createdAt
  }) {
    this.id = id;
    this.applicationId = applicationId;
    this.agentName = agentName;
    this.actor = actor;
    this.inputSnapshot = typeof inputSnapshot === 'string' ? JSON.parse(inputSnapshot || '{}') : (inputSnapshot || {});
    this.outputSnapshot = typeof outputSnapshot === 'string' ? JSON.parse(outputSnapshot || '{}') : (outputSnapshot || {});
    this.confidenceScore = confidenceScore || 0;
    this.executionTimeMs = executionTimeMs || 0;
    this.summary = summary || '';
    this.createdAt = createdAt || new Date().toISOString();
  }

  static fromRow(row) {
    if (!row) return null;
    let parsedInput = {};
    let parsedOutput = {};
    try {
      parsedInput = JSON.parse(row.input_snapshot || '{}');
    } catch {
      parsedInput = {};
    }
    try {
      parsedOutput = JSON.parse(row.output_snapshot || '{}');
    } catch {
      parsedOutput = {};
    }

    return new AuditLog({
      id: row.id,
      applicationId: row.application_id,
      agentName: row.agent_name,
      actor: row.actor,
      inputSnapshot: parsedInput,
      outputSnapshot: parsedOutput,
      confidenceScore: row.confidence_score,
      executionTimeMs: row.execution_time_ms,
      summary: row.summary,
      createdAt: row.created_at
    });
  }

  static async findByApplicationId(applicationId) {
    if (!applicationId) return [];
    const rows = await db.all(
      'SELECT * FROM audit_logs WHERE application_id = ? ORDER BY created_at ASC',
      [applicationId]
    );
    return rows.map((r) => AuditLog.fromRow(r));
  }

  static async create(logData) {
    const id = logData.id || crypto.randomUUID();
    const createdAt = logData.createdAt || new Date().toISOString();
    const inputStr = typeof logData.inputSnapshot === 'object' ? JSON.stringify(logData.inputSnapshot) : (logData.inputSnapshot || '{}');
    const outputStr = typeof logData.outputSnapshot === 'object' ? JSON.stringify(logData.outputSnapshot) : (logData.outputSnapshot || '{}');

    await db.run(
      `INSERT INTO audit_logs (id, application_id, agent_name, actor, input_snapshot, output_snapshot, confidence_score, execution_time_ms, summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        logData.applicationId,
        logData.agentName,
        logData.actor || 'system',
        inputStr,
        outputStr,
        logData.confidenceScore || 0,
        logData.executionTimeMs || 0,
        logData.summary || '',
        createdAt
      ]
    );

    return new AuditLog({
      id,
      applicationId: logData.applicationId,
      agentName: logData.agentName,
      inputSnapshot: logData.inputSnapshot,
      outputSnapshot: logData.outputSnapshot,
      confidenceScore: logData.confidenceScore,
      executionTimeMs: logData.executionTimeMs,
      summary: logData.summary,
      createdAt
    });
  }
}
