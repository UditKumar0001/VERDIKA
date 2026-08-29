import { BaseAgent } from './BaseAgent.js';

/**
 * ExplainerAgent
 * Generates human-interpretable natural language explanations, adverse action notices,
 * and key factor attributions (e.g. SHAP/LIME-style factor ranking) for regulatory compliance and auditability.
 */
export class ExplainerAgent extends BaseAgent {
  constructor(config = {}) {
    super('ExplainerAgent', config);
  }

  /**
   * Produces explainable summaries, top contributing factors, and adverse notice points.
   * @param {Object} input - Application data, risk scores, decision output, and original features.
   * @returns {Promise<Object>} Natural language explanation, primary contributing factors, and audit log.
   */
  async run(input) {
    const { risk, adv, decision, features } = input;

    // ----- Applicant Message Logic -----
    let applicantMessage = '';
    if (adv && adv.adversarialFlag) {
      // Keep current generic message for adversarial cases
      applicantMessage = 'Your application requires additional manual review.';
    } else {
      switch (decision) {
        case 'auto_approve':
          applicantMessage = 'Your application has been approved.';
          break;
        case 'auto_reject':
          // Construct constructive description using reason codes
          if (risk && Array.isArray(risk.reasonCodes) && risk.reasonCodes.length > 0) {
            const reasons = risk.reasonCodes.map(rc => rc.description).join('; ');
            applicantMessage = `We cannot approve your application due to the following concerns: ${reasons}.`;
          } else {
            applicantMessage = 'We cannot approve your application at this time.';
          }
          break;
        case 'route_to_human':
          // Non‑adversarial human review
          applicantMessage = 'Your application is under review and will be processed shortly.';
          break;
        default:
          applicantMessage = 'Your application status is currently unavailable.';
      }
    }

    // ----- Underwriter Summary -----
    const underwriterSummary = {
      decision: decision || 'unknown',
      riskScore: risk ? risk.riskScore : null,
      confidence: risk ? risk.confidence : null,
      reasonCodes: risk ? risk.reasonCodes : [],
      adversarialFlag: adv ? adv.adversarialFlag : false,
      detectedPatterns: adv && adv.adversarialFlag ? adv.detectedPatterns : []
    };

    // ----- Audit Entry -----
    const auditEntry = {
      timestamp: new Date().toISOString(),
      agentsInvolved: [
        risk ? risk.agent : 'RiskAgent',
        adv ? adv.agent : 'AdversarialAgent',
        'DecisionRouter',
        'ExplainerAgent'
      ],
      // Capture key inputs used for the decision
      inputSummary: features
        ? {
            category: features.category,
            businessAgeMonths: features.businessAgeMonths,
            riskScore: risk ? risk.riskScore : undefined,
            confidence: risk ? risk.confidence : undefined,
            topReasonCodes: risk && Array.isArray(risk.reasonCodes)
              ? risk.reasonCodes.map(rc => rc.code)
              : []
          }
        : {},
      decision: decision || 'unknown'
    };

    return {
      agent: this.name,
      status: 'completed',
      applicantMessage,
      underwriterSummary,
      auditEntry
    };
  }
}
