import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { config } from './config/env.js';
import { connectDB, db } from './config/db.js';
import underwritingRouter from './routes/underwriting.js';
import { Application } from './models/Application.js';
import { AuditLog } from './models/AuditLog.js';

async function runReviewerEndpointTest() {
  console.log('--- Step 1: Connect to Database ---');
  await connectDB();

  // Create Express App to test real HTTP request pipeline
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/underwriting', underwritingRouter);

  // Setup test server on an ephemeral port
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/underwriting`;

  console.log(`Test server running on port ${port}`);

  // Create JWT tokens for Merchant and Underwriter
  const merchantToken = jwt.sign(
    { id: 'usr-merchant-1', email: 'merchant@example.com', role: 'merchant' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  const underwriterToken = jwt.sign(
    { id: 'usr-underwriter-1', email: 'underwriter@verdika.internal', role: 'underwriter' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  console.log('\n--- Step 2: Ensure at least one test application and audit log exists ---');
  const existingApp = await db.get('SELECT id FROM applications LIMIT 1');
  let appId = existingApp ? existingApp.id : null;

  if (!appId) {
    const created = await Application.create({
      user_id: 'usr-merchant-1',
      merchant_data: { business_name: 'Test Reviewer Merchant' },
      status: 'pending_review'
    });
    appId = created.id;
    await Application.updateEvaluation(appId, {
      merchant_data: { business_name: 'Test Reviewer Merchant' },
      features: { category: 'apparel' },
      risk_result: { riskScore: 0.25 },
      adversarial_result: { adversarialFlag: false },
      decision: 'route_to_human',
      routing_reason: 'Requires manual underwriter verification',
      applicant_message: 'Your application is under review.',
      underwriter_summary: { decision: 'route_to_human', riskScore: 0.25 }
    });
    await AuditLog.create({
      applicationId: appId,
      agentName: 'RiskAgent',
      actor: 'system',
      summary: 'Risk assessed score 0.25'
    });
  }

  console.log(`Using Application ID: ${appId}`);

  // --- Test 1: Merchant Access (Forbidden 403 Expected) ---
  console.log('\n========================================');
  console.log('TEST 1: Regular "merchant" role user access (403 Forbidden Expected)');
  console.log('========================================');

  const merchantResList = await fetch(`${baseUrl}/applications`, {
    headers: { Authorization: `Bearer ${merchantToken}` }
  });
  const merchantDataList = await merchantResList.json();
  console.log(`GET /api/underwriting/applications [merchant] -> Status: ${merchantResList.status}`);
  console.log('Response Body:', JSON.stringify(merchantDataList, null, 2));

  const merchantResDetail = await fetch(`${baseUrl}/applications/${appId}`, {
    headers: { Authorization: `Bearer ${merchantToken}` }
  });
  const merchantDataDetail = await merchantResDetail.json();
  console.log(`GET /api/underwriting/applications/${appId} [merchant] -> Status: ${merchantResDetail.status}`);
  console.log('Response Body:', JSON.stringify(merchantDataDetail, null, 2));

  // --- Test 2: Underwriter Access (Success 200 Expected) ---
  console.log('\n========================================');
  console.log('TEST 2: "underwriter" role user access (200 OK & Full Data Expected)');
  console.log('========================================');

  const underwriterResList = await fetch(`${baseUrl}/applications`, {
    headers: { Authorization: `Bearer ${underwriterToken}` }
  });
  const underwriterDataList = await underwriterResList.json();
  console.log(`GET /api/underwriting/applications [underwriter] -> Status: ${underwriterResList.status}`);
  console.log(`Found ${underwriterDataList.total} application(s). First item summary:`);
  console.log(JSON.stringify(underwriterDataList.applications[0], null, 2));

  const underwriterResDetail = await fetch(`${baseUrl}/applications/${appId}`, {
    headers: { Authorization: `Bearer ${underwriterToken}` }
  });
  const underwriterDataDetail = await underwriterResDetail.json();
  console.log(`\nGET /api/underwriting/applications/${appId} [underwriter] -> Status: ${underwriterResDetail.status}`);
  console.log('Full Application & Audit Logs detail:');
  console.log(JSON.stringify(underwriterDataDetail, null, 2));

  server.close(() => {
    console.log('\nTest server closed gracefully.');
  });
}

runReviewerEndpointTest().catch((err) => {
  console.error('Reviewer Endpoint Test failed:', err);
  process.exit(1);
});
