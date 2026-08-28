/**
 * AuditLog Model
 * Records immutable traces of agent reasoning, prompt evaluations, and underwriting decisions.
 */
export class AuditLog {
  constructor({
    id,
    applicationId,
    agentName,
    inputSnapshot,
    outputSnapshot,
    confidenceScore,
    executionTimeMs,
    timestamp
  }) {
    this.id = id;
    this.applicationId = applicationId;
    this.agentName = agentName;
    this.inputSnapshot = inputSnapshot || {};
    this.outputSnapshot = outputSnapshot || {};
    this.confidenceScore = confidenceScore || 0;
    this.executionTimeMs = executionTimeMs || 0;
    this.timestamp = timestamp || new Date();
  }

  // Placeholder methods for future DB integration
  static async findByApplicationId(applicationId) {
    return [];
  }

  static async create(logData) {
    return new AuditLog({ id: 'audit-mock-id', ...logData });
  }
}
