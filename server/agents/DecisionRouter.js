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
    const { risk, adv } = input;
    const response = {
      agent: this.name,
      status: 'completed',
      decision: 'route_to_human',
      routingReason: ''
    };
    // If adversarial patterns detected, always route to human
    if (adv && adv.adversarialFlag) {
      response.routingReason = `Adversarial patterns detected: ${adv.detectedPatterns.map(p => p.pattern).join(', ')}`;
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
