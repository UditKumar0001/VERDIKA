import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { connectDB, db } from './config/db.js';
import underwritingRouter from './routes/underwriting.js';
import { agentPipeline } from './services/agentPipeline.js';
import { Application } from './models/Application.js';
import { AuditLog } from './models/AuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runReviewTest() {
  console.log('--- Step 1: Initialize Database & Express Server ---');
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/underwriting', underwritingRouter);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/underwriting`;

  console.log(`Test server active on port ${port}`);

  console.log('\n--- Step 2: Create a Pending "route_to_human" Application ---');
  const merchantsPath = path.resolve(__dirname, '../data/merchants.json');
  const merchantsData = JSON.parse(fs.readFileSync(merchantsPath, 'utf8'));
  const merchantPayload = merchantsData[1]; // Merchant that routes to human review

  const createdApp = await Application.create({
    user_id: 'usr-applicant-100',
    merchant_data: merchantPayload,
    status: 'pending_review'
  });

  console.log(`Created Application ID: ${createdApp.id}`);

  // Run pipeline (generates 5 system audit logs)
  const pipelineResult = await agentPipeline.execute(createdApp.merchant_data);
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

  const evaluation = {
    merchant_data: createdApp.merchant_data,
    features: pipelineResult.features,
    risk_result: pipelineResult.risk_result,
    adversarial_result: pipelineResult.adversarial_result,
    decision: pipelineResult.decision,
    routing_reason: pipelineResult.routing_reason ?? pipelineResult.routingReason ?? null,
    applicant_message: pipelineResult.applicant_message ?? pipelineResult.applicantMessage ?? null,
    underwriter_summary: pipelineResult.underwriter_summary ?? pipelineResult.underwriterSummary ?? null,
    status: 'pending_review'
  };
  await Application.updateEvaluation(createdApp.id, evaluation);

  const initialLogs = await AuditLog.findByApplicationId(createdApp.id);
  console.log(`Initial System Audit Logs count: ${initialLogs.length}`);

  console.log('\n--- Step 3: Submit Review Decision via POST /api/underwriting/applications/:id/review ---');
  const underwriterUserId = 'usr-underwriter-888';
  const underwriterToken = jwt.sign(
    { id: underwriterUserId, email: 'underwriter.lead@verdika.internal', role: 'underwriter' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  const reviewPayload = {
    decision: 'approved',
    notes: 'Verified merchant bank statements and business registration manually. Risk acceptable.'
  };

  const response = await fetch(`${baseUrl}/applications/${createdApp.id}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${underwriterToken}`
    },
    body: JSON.stringify(reviewPayload)
  });

  const responseBody = await response.json();

  console.log(`\nHTTP Response Status: ${response.status}`);
  console.log('\n========================================');
  console.log('1) UPDATED SAVED APPLICATION ROW (from SQLite):');
  console.log('========================================');
  const savedRow = await db.get('SELECT * FROM applications WHERE id = ?', [createdApp.id]);
  console.log(JSON.stringify(savedRow, null, 2));

  console.log('\n========================================');
  console.log('2) FULL AUDIT LOG ENTRIES (Confirmed 6 entries, 6th with human actor):');
  console.log('========================================');
  const fullAuditLogs = await db.all('SELECT * FROM audit_logs WHERE application_id = ? ORDER BY created_at ASC', [createdApp.id]);
  console.log(`Total Audit Log Entries: ${fullAuditLogs.length}`);
  console.log(JSON.stringify(fullAuditLogs, null, 2));

  server.close(() => {
    console.log('\nTest server closed cleanly.');
  });
}

runReviewTest().catch((err) => {
  console.error('Review decision test failed:', err);
  process.exit(1);
});
