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
    const startTime = Date.now();
    logger.info(`Starting underwriting pipeline for applicant: ${applicationData.applicantName || 'Unknown'}`);

    const auditLogs = [];

    // Helper to profile agent execution
    const runAgentStep = async (agent, input, summaryFormatter) => {
      const stepStart = Date.now();
      const output = await agent.run(input);
      const executionTimeMs = Date.now() - stepStart;
      const confidenceScore = output.confidence || output.confidenceScore || 0.85;
      const summary = summaryFormatter ? summaryFormatter(output) : `Completed ${agent.name} evaluation`;

      auditLogs.push({
        agentName: agent.name,
        inputSnapshot: input,
        outputSnapshot: output,
        confidenceScore,
        executionTimeMs,
        summary
      });

      return output;
    };

    // 1. Data Ingestion & Enrichment
    const enriched = await runAgentStep(
      this.dataAgent,
      applicationData,
      (out) => `Data enriched and verified for ${applicationData.applicantName || 'Applicant'}`
    );

    // 2. Risk Assessment
    const riskEval = await runAgentStep(
      this.riskAgent,
      enriched,
      (out) => `Risk assessed with score ${out.riskScore ?? 'N/A'} (Confidence: ${Math.round((out.confidence || 0.85) * 100)}%)`
    );

    // 3. Adversarial Stress Testing
    const stressTest = await runAgentStep(
      this.adversarialAgent,
      { merchant: applicationData, features: enriched, risk: riskEval, riskEval },
      (out) => `Adversarial stress test completed: Robustness score ${out.robustnessScore ?? (out.adversarialFlag ? 50 : 100)}/100`
    );

    // Adjust riskEval.confidence proportionally based on adversarialScore from AdversarialAgent
    if (stressTest && typeof stressTest.adversarialScore === 'number' && stressTest.adversarialScore > 0) {
      const advPenalty = stressTest.adversarialScore * 0.35;
      riskEval.confidence = Number(Math.max(0.50, riskEval.confidence - advPenalty).toFixed(2));
    }

    // 4. Decision Routing
    const decision = await runAgentStep(
      this.decisionRouter,
      { risk: riskEval, adv: stressTest, enriched, riskEval, stressTest },
      (out) => `Decision routed as ${out.decision || 'MANUAL_REVIEW'} - ${out.routingReason || out.routeReason || 'Policy evaluation completed'}`
    );

    // 5. Explainability & Adverse Action Analysis
    const explanation = await runAgentStep(
      this.explainerAgent,
      { risk: riskEval, adv: stressTest, decision: decision.decision, features: enriched },
      (out) => `Generated regulatory explanation: ${out.summary || 'Underwriting explanation drafted'}`
    );

    const totalPipelineLatency = Date.now() - startTime;
    logger.info(`Pipeline execution completed for ${applicationData.applicantName || applicationData.business_name || 'Merchant'} in ${totalPipelineLatency}ms with verdict ${decision.decision || 'PENDING'}`);

    const finalStatus = decision.decision || 'PENDING_REVIEW';
    const finalRiskScore = riskEval.riskScore ?? 75;
    const finalConfidence = decision.confidence ?? 0.88;

    const decisionDetails = {
      recommendation: finalStatus,
      riskLevel: finalRiskScore >= 80 ? 'Low' : finalRiskScore >= 60 ? 'Moderate' : 'High',
      routeReason: decision.routingReason || decision.routeReason || 'Evaluation completed by multi-agent pipeline',
      summary: explanation.summary || '',
      reasons: explanation.keyFactors && explanation.keyFactors.length > 0 ? explanation.keyFactors : [decision.routingReason || decision.routeReason || 'Standard policy review'],
      adverseReasons: explanation.adverseReasons || [],
      stressTestSummary: stressTest.vulnerabilitiesDetected || [],
      pipelineLatencyMs: totalPipelineLatency
    };

    // Construct result matching /apply route expectations
    const result = {
      features: enriched,
      risk_result: riskEval,
      adversarial_result: stressTest,
      decision: decision.decision || null,
      routing_reason: decision.routingReason || decision.routeReason || null,
      applicant_message: explanation.applicantMessage || null,
      underwriter_summary: explanation.underwriterSummary || null,
      auditLogs
    };
    return result;
  }
}

export const agentPipeline = new AgentPipeline();
