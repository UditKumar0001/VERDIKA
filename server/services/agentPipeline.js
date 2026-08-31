import { DataAgent } from '../agents/DataAgent.js';
import { DocumentVerificationAgent } from '../agents/DocumentVerificationAgent.js';
import { RiskAgent } from '../agents/RiskAgent.js';
import { AdversarialAgent } from '../agents/AdversarialAgent.js';
import { DecisionRouter } from '../agents/DecisionRouter.js';
import { ExplainerAgent } from '../agents/ExplainerAgent.js';
import { parseBankStatementTransactions, SYNTHETIC_BASELINE_TRANSACTIONS } from './bankStatementParser.js';
import { logger } from '../utils/logger.js';

/**
 * AgentPipeline Service
 * Coordinates and sequences multi-agent orchestration for underwriting application lifecycle.
 */
export class AgentPipeline {
  constructor() {
    this.dataAgent = new DataAgent();
    this.docVerificationAgent = new DocumentVerificationAgent();
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
    logger.info(`Starting underwriting pipeline for applicant: ${applicationData.applicantName || applicationData.business_name || 'Unknown'}`);

    // 0. Extract Real Transactions from Bank Statement (if available) with safe fallback
    const parsedStatement = await parseBankStatementTransactions(applicationData.documents?.bank_statement || applicationData);
    
    if (parsedStatement && parsedStatement.dataSourceFlag === 'REAL_STATEMENT' && Array.isArray(parsedStatement.transactions) && parsedStatement.transactions.length > 0) {
      applicationData.transaction_history = parsedStatement.transactions;
      applicationData.data_source = 'Real Bank Statement';
      applicationData.data_source_flag = 'REAL_STATEMENT';
      applicationData.extraction_notes = parsedStatement.extractionNotes;
    } else {
      if (!Array.isArray(applicationData.transaction_history) || applicationData.transaction_history.length === 0) {
        applicationData.transaction_history = SYNTHETIC_BASELINE_TRANSACTIONS;
      }
      applicationData.data_source = 'Synthetic/Sample Data';
      applicationData.data_source_flag = 'SYNTHETIC_FALLBACK';
      applicationData.extraction_notes = parsedStatement.extractionNotes || 'Using synthetic dataset for underwriting evaluation';
    }

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
      (out) => `Data enriched and verified for ${applicationData.applicantName || applicationData.business_name || 'Applicant'} (${applicationData.data_source})`
    );

    // 2. Document & KYC Verification Agent
    const docEval = await runAgentStep(
      this.docVerificationAgent,
      applicationData,
      (out) => `Document & KYC verification: ${out.status} - ${out.summary}`
    );

    // 3. Risk Assessment
    const riskEval = await runAgentStep(
      this.riskAgent,
      enriched,
      (out) => `Risk assessed with score ${out.riskScore ?? 'N/A'} (Confidence: ${Math.round((out.confidence || 0.85) * 100)}%)`
    );

    // Integrate Document Verification Reason Codes into risk reason codes list
    if (docEval && Array.isArray(docEval.reasonCodes)) {
      if (!Array.isArray(riskEval.reasonCodes)) {
        riskEval.reasonCodes = [];
      }
      riskEval.reasonCodes = [...riskEval.reasonCodes, ...docEval.reasonCodes];
    }

    // Lower confidence if document verification is incomplete or invalid
    if (docEval && docEval.status !== 'Verified') {
      riskEval.confidence = Number(Math.min(riskEval.confidence || 0.85, 0.70).toFixed(2));
    }

    // 4. Adversarial Stress Testing
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

    // 5. Decision Routing (incorporating Document Verification Agent output)
    const decision = await runAgentStep(
      this.decisionRouter,
      { risk: riskEval, adv: stressTest, doc: docEval, enriched, riskEval, stressTest },
      (out) => `Decision routed as ${out.decision || 'MANUAL_REVIEW'} - ${out.routingReason || out.routeReason || 'Policy evaluation completed'}`
    );

    // 6. Explainability & Adverse Action Analysis
    const explanation = await runAgentStep(
      this.explainerAgent,
      { risk: riskEval, adv: stressTest, doc: docEval, decision: decision.decision, features: enriched },
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
      doc_result: docEval,
      risk_result: riskEval,
      adversarial_result: stressTest,
      decision: decision.decision || null,
      routing_reason: decision.routingReason || decision.routeReason || null,
      applicant_message: explanation.applicantMessage || null,
      underwriter_summary: explanation.underwriterSummary || null,
      data_source: applicationData.data_source || 'Synthetic/Sample Data',
      data_source_flag: applicationData.data_source_flag || 'SYNTHETIC_FALLBACK',
      extraction_notes: applicationData.extraction_notes || '',
      transaction_history: applicationData.transaction_history,
      auditLogs
    };
    return result;
  }
}

export const agentPipeline = new AgentPipeline();
