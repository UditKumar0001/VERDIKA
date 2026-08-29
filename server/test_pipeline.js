import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { config } from './config/env.js';
import { connectDB, db } from './config/db.js';
import { agentPipeline } from './services/agentPipeline.js';
import { Application } from './models/Application.js';
import { AuditLog } from './models/AuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  console.log('--- Step 1: Initialize Database ---');
  await connectDB();

  console.log('\n--- Step 2: Load Sample Merchant Payload ---');
  const merchantsPath = path.resolve(__dirname, '../data/merchants.json');
  const merchantsData = JSON.parse(fs.readFileSync(merchantsPath, 'utf8'));
  const sampleMerchant = merchantsData[0];
  console.log(`Loaded merchant: "${sampleMerchant.business_name}" (${sampleMerchant.merchant_id})`);

  console.log('\n--- Step 3: Get Underwriter User ID ---');
  const user = await db.get("SELECT id, email, role FROM users WHERE email = 'underwriter@verdika.internal'");
  if (!user) {
    throw new Error('Default underwriter user not found');
  }
  console.log('Using User:', user);

  console.log('\n--- Step 4: Execute Underwriting Pipeline ---');
  // Simulate what POST /api/underwriting/apply does
  const appData = {
    user_id: user.id,
    merchant_data: sampleMerchant,
    status: 'pending_review'
  };

  const createdApp = await Application.create(appData);
  console.log(`Created initial Application with ID: ${createdApp.id}`);

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

  // Determine status per spec
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

  console.log('\n========================================');
  console.log('AUDIT LOG ENTRIES COUNT FOR THIS APPLICATION:');
  console.log('========================================');
  const logs = await db.all('SELECT id, agent_name, actor, confidence_score, execution_time_ms, summary, created_at FROM audit_logs WHERE application_id = ?', [updatedApp.id]);
  console.log(JSON.stringify(logs, null, 2));

  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
