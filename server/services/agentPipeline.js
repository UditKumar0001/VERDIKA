import { DataAgent } from '../agents/DataAgent.js';
import { RiskAgent } from '../agents/RiskAgent.js';
import { AdversarialAgent } from '../agents/AdversarialAgent.js';
import { DecisionRouter } from '../agents/DecisionRouter.js';
import { ExplainerAgent } from '../agents/ExplainerAgent.js';
import { logger } from '../utils/logger.js';

/**
 * AgentPipeline Service
 * Coordinates and sequences multi-agent orchestration for underwriting application lifecycle.
 */
export class AgentPipeline {
  constructor() {
    this.dataAgent = new DataAgent();
    this.riskAgent = new RiskAgent();
    this.adversarialAgent = new AdversarialAgent();
    this.decisionRouter = new DecisionRouter();
    this.explainerAgent = new ExplainerAgent();
  }

  /**
   * Executes full underwriting evaluation pipeline on an incoming application.
   * @param {Object} applicationData - The raw loan application data.
   * @returns {Promise<Object>} Aggregated underwriting verdict and audit record.
   */
  async execute(applicationData) {
    logger.info(`Starting underwriting pipeline for applicant: ${applicationData.applicantName || 'Unknown'}`);

    // Placeholder execution flow
    const enriched = await this.dataAgent.run(applicationData);
    const riskEval = await this.riskAgent.run(enriched);
    const stressTest = await this.adversarialAgent.run({ enriched, riskEval });
    const decision = await this.decisionRouter.run({ enriched, riskEval, stressTest });
    const explanation = await this.explainerAgent.run({ enriched, riskEval, decision });

    return {
      applicationId: applicationData.id,
      decision,
      riskEval,
      stressTest,
      explanation,
      completedAt: new Date()
    };
  }
}

export const agentPipeline = new AgentPipeline();
