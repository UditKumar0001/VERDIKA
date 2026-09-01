import { BaseAgent } from './BaseAgent.js';

/**
 * DecisionRouter
 * Synthesizes outputs from RiskAgent and AdversarialAgent against underwriting policies
 * to determine the final routing verdict: APPROVE, REJECT, or ESCALATE to human underwriter.
 */
export class DecisionRouter extends BaseAgent {
  constructor(config = {}) {
    super('DecisionRouter', config);
  }

  /**
   * Routes the application based on confidence thresholds, policy constraints, and adversarial flags.
   * @param {Object} input - Comprehensive evaluation results from previous agents.
   * @returns {Promise<Object>} Final routing decision (APPROVED, REJECTED, MANUAL_REVIEW) with decision rationale.
   */
  async run(input) {
    const { risk, adv, doc } = input;
    const response = {
      agent: this.name,
      status: 'completed',
      decision: 'route_to_human',
      routingReason: ''
    };

    // 1. If adversarial patterns detected, always route to human
    if (adv && adv.adversarialFlag) {
      response.routingReason = `Adversarial patterns detected: ${adv.detectedPatterns.map(p => p.pattern).join(', ')}`;
      return response;
    }

    // 2. If KYC / Document verification is Incomplete, Needs Review, or Invalid Format, route to human
    if (doc && doc.status && doc.status !== 'Verified') {
      response.decision = 'route_to_human';
      response.routingReason = doc.status === 'Needs Review'
        ? 'KYC document quality issues detected — requires re-upload or manual review'
        : doc.status === 'Incomplete'
        ? 'Incomplete KYC documentation — flagged for manual review'
        : 'KYC format validation errors require manual verification';
      return response;
    }

    // 3. If requested loan amount is unusually high (> 3x average monthly revenue), route to human
    const enriched = input.enriched || {};
    if (enriched.loanToRevenueRatio && enriched.loanToRevenueRatio > 3.0) {
      response.decision = 'route_to_human';
      response.routingReason = `Requested loan amount is ${enriched.loanToRevenueRatio}x monthly revenue (threshold 3.0x) — requires underwriter scrutiny`;
      return response;
    }

    const confidence = risk && typeof risk.confidence === 'number' ? risk.confidence : 0;
    const riskScore = risk && typeof risk.riskScore === 'number' ? risk.riskScore : 0;

    if (confidence > 0.75 && riskScore < 0.15) {
      response.decision = 'auto_approve';
      response.routingReason = 'High confidence and low risk score';
    } else if (confidence > 0.75 && riskScore > 0.6) {
      response.decision = 'auto_reject';
      response.routingReason = 'High confidence and high risk score';
    } else {
      response.routingReason = 'Confidence low or risk score ambiguous';
    }
    return response;
  }
}
