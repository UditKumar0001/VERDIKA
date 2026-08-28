/**
 * Application Model
 * Represents underwriting/loan applications subjected to multi-agent risk assessment.
 */
export class Application {
  constructor({
    id,
    applicantName,
    businessType,
    requestedAmount,
    creditScore,
    annualRevenue,
    riskScore,
    status,
    decisionDetails,
    createdAt
  }) {
    this.id = id;
    this.applicantName = applicantName;
    this.businessType = businessType;
    this.requestedAmount = requestedAmount;
    this.creditScore = creditScore;
    this.annualRevenue = annualRevenue;
    this.riskScore = riskScore || null;
    this.status = status || 'PENDING'; // PENDING, APPROVED, REJECTED, MANUAL_REVIEW
    this.decisionDetails = decisionDetails || {};
    this.createdAt = createdAt || new Date();
  }

  // Placeholder methods for future DB integration
  static async findById(id) {
    return null;
  }

  static async findAll(filters = {}) {
    return [];
  }

  static async create(data) {
    return new Application({ id: 'app-mock-id', ...data });
  }

  static async updateStatus(id, status, decisionDetails) {
    return null;
  }
}
