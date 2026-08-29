import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, db } from './config/db.js';
import { agentPipeline } from './services/agentPipeline.js';
import { Application } from './models/Application.js';
import { AuditLog } from './models/AuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAutoRejectTest() {
  console.log('--- Step 1: Initialize Database ---');
  await connectDB();

  console.log('\n--- Step 2: Prepare High-Risk (Auto-Reject) Merchant Payload ---');
  const merchantsPath = path.resolve(__dirname, '../data/merchants.json');
  const merchantsData = JSON.parse(fs.readFileSync(merchantsPath, 'utf8'));
  
  // Clone base merchant and inject high risk signals
  const highRiskMerchant = JSON.parse(JSON.stringify(merchantsData[0]));
  highRiskMerchant.business_name = 'High Risk Test Merchant';
  highRiskMerchant.business_age_months = 2; // young business

  // Modify transaction history to create extreme refund rates, high volatility, declining order values, settlement delays
  highRiskMerchant.transaction_history = [
    {
      date: "2026-02-01",
      transaction_count: 500,
      gross_revenue: 1000000,
      avg_order_value: 2000,
      refund_count: 350,
      refund_amount: 700000, // 70% refund rate (huge excess vs 10% benchmark)
      chargeback_count: 15,
      upi_pct: 0.9,
      card_pct: 0.05,
      netbanking_pct: 0.05,
      settlement_delay_days: 8.0
    },
    {
      date: "2026-02-15",
      transaction_count: 100,
      gross_revenue: 50000,
      avg_order_value: 500, // sharp drop in AOV (-75%)
      refund_count: 80,
      refund_amount: 40000, // 80% refund rate
      chargeback_count: 10,
      upi_pct: 0.1,
      card_pct: 0.8,
      netbanking_pct: 0.1,
      settlement_delay_days: 15.0 // settlement delay surge
    },
    {
      date: "2026-03-01",
      transaction_count: 20,
      gross_revenue: 5000,
      avg_order_value: 250,
      refund_count: 18,
      refund_amount: 4500,
      chargeback_count: 5,
      upi_pct: 0.5,
      card_pct: 0.2,
      netbanking_pct: 0.3,
      settlement_delay_days: 20.0
    }
  ];

  console.log('\n--- Step 3: Get Underwriter User ID ---');
  const user = await db.get("SELECT id, email, role FROM users WHERE email = 'underwriter@verdika.internal'");

  console.log('\n--- Step 4: Execute Underwriting Pipeline ---');
  const appData = {
    user_id: user.id,
    merchant_data: highRiskMerchant,
    status: 'pending_review'
  };

  const createdApp = await Application.create(appData);
  console.log(`Created initial Application record: ${createdApp.id}`);

  const pipelineResult = await agentPipeline.execute(createdApp.merchant_data);

  // Persist audit logs
  if (pipelineResult.auditLogs && Array.isArray(pipelineResult.auditLogs)) {
    for (const log of pipelineResult.auditLogs) {
      await AuditLog.create({
        applicationId: createdApp.id,
        agentName: log.agentName,
        inputSnapshot: log.inputSnapshot,
        outputSnapshot: log.outputSnapshot,
        confidenceScore: log.confidenceScore,
        executionTimeMs: log.executionTimeMs,
        summary: log.summary,
        actor: 'system'
      });
    }
  }

  // Determine status per spec ('closed' for auto_approve / auto_reject, 'pending_review' for route_to_human)
  const status = (pipelineResult.decision === 'auto_approve' || pipelineResult.decision === 'auto_reject') ? 'closed' : 'pending_review';

  // Update application with pipeline outputs
  const evaluation = {
    merchant_data: createdApp.merchant_data,
    features: pipelineResult.features,
    risk_result: pipelineResult.risk_result,
    adversarial_result: pipelineResult.adversarial_result,
    decision: pipelineResult.decision,
    routing_reason: pipelineResult.routing_reason ?? pipelineResult.routingReason ?? null,
    applicant_message: pipelineResult.applicant_message ?? pipelineResult.applicantMessage ?? null,
    underwriter_summary: pipelineResult.underwriter_summary ?? pipelineResult.underwriterSummary ?? null,
    status
  };
  const updatedApp = await Application.updateEvaluation(createdApp.id, evaluation);

  const apiResponse = {
    applicationId: updatedApp.id,
    decision: updatedApp.decision,
    applicantMessage: updatedApp.applicant_message
  };

  console.log('\n========================================');
  console.log('RAW API RESPONSE:');
  console.log('========================================');
  console.log(JSON.stringify(apiResponse, null, 2));

  console.log('\n========================================');
  console.log('FULL SAVED DATABASE ROW (from SQLite):');
  console.log('========================================');
  const rawRow = await db.get('SELECT * FROM applications WHERE id = ?', [updatedApp.id]);
  console.log(JSON.stringify(rawRow, null, 2));

  process.exit(0);
}

runAutoRejectTest().catch((err) => {
  console.error('Auto Reject Test failed:', err);
  process.exit(1);
});
