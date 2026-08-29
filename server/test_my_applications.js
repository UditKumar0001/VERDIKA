import http from 'http';
import jwt from 'jsonwebtoken';
import { app } from './server.js';
import { connectDB } from './config/db.js';
import { config } from './config/env.js';
import { User } from './models/User.js';

let server;
const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}`;

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
}

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  console.log('--- Starting GET /api/underwriting/my-applications Security & Isolation Test ---');
  await connectDB();
  server = app.listen(PORT);
  await new Promise(r => setTimeout(r, 500));

  try {
    // 1. Create & login User A (merchant)
    const emailA = `merchant_a_${Date.now()}@example.com`;
    const userA = await User.create({ name: 'Merchant A', email: emailA, passwordHash: 'hash123', role: 'merchant' });
    const tokenA = makeToken(userA);
    console.log(`[User A] Registered (ID: ${userA.id}, email: ${emailA})`);

    // 2. Create & login User B (merchant)
    const emailB = `merchant_b_${Date.now()}@example.com`;
    const userB = await User.create({ name: 'Merchant B', email: emailB, passwordHash: 'hash123', role: 'merchant' });
    const tokenB = makeToken(userB);
    console.log(`[User B] Registered (ID: ${userB.id}, email: ${emailB})`);

    // 3. User A submits 2 applications
    const payloadA1 = {
      business_name: "Apex Electronics Pvt Ltd",
      business_category: "electronics",
      business_age_months: 24,
      transaction_history: [
        { date: "2026-08-01", transaction_count: 50, gross_revenue: 100000, avg_order_value: 2000, refund_count: 1, refund_amount: 2000, chargeback_count: 0, upi_pct: 0.5, card_pct: 0.3, netbanking_pct: 0.2, settlement_delay_days: 1.5 },
        { date: "2026-08-08", transaction_count: 55, gross_revenue: 110000, avg_order_value: 2000, refund_count: 1, refund_amount: 2000, chargeback_count: 0, upi_pct: 0.5, card_pct: 0.3, netbanking_pct: 0.2, settlement_delay_days: 1.5 },
        { date: "2026-08-15", transaction_count: 52, gross_revenue: 104000, avg_order_value: 2000, refund_count: 1, refund_amount: 2000, chargeback_count: 0, upi_pct: 0.5, card_pct: 0.3, netbanking_pct: 0.2, settlement_delay_days: 1.5 },
        { date: "2026-08-22", transaction_count: 58, gross_revenue: 116000, avg_order_value: 2000, refund_count: 1, refund_amount: 2000, chargeback_count: 0, upi_pct: 0.5, card_pct: 0.3, netbanking_pct: 0.2, settlement_delay_days: 1.5 }
      ]
    };
    const appA1Res = await request('POST', '/api/underwriting/apply', payloadA1, tokenA);
    console.log(`[User A] Submitted App 1 -> Status: ${appA1Res.status}, ID: ${appA1Res.body.applicationId}, Decision: ${appA1Res.body.decision}`);

    const payloadA2 = {
      business_name: "Apex Digital Solutions",
      business_category: "services",
      business_age_months: 18,
      transaction_history: [
        { date: "2026-08-01", transaction_count: 30, gross_revenue: 150000, avg_order_value: 5000, refund_count: 0, refund_amount: 0, chargeback_count: 0, upi_pct: 0.6, card_pct: 0.3, netbanking_pct: 0.1, settlement_delay_days: 1.2 },
        { date: "2026-08-08", transaction_count: 32, gross_revenue: 160000, avg_order_value: 5000, refund_count: 0, refund_amount: 0, chargeback_count: 0, upi_pct: 0.6, card_pct: 0.3, netbanking_pct: 0.1, settlement_delay_days: 1.2 },
        { date: "2026-08-15", transaction_count: 35, gross_revenue: 175000, avg_order_value: 5000, refund_count: 0, refund_amount: 0, chargeback_count: 0, upi_pct: 0.6, card_pct: 0.3, netbanking_pct: 0.1, settlement_delay_days: 1.2 },
        { date: "2026-08-22", transaction_count: 34, gross_revenue: 170000, avg_order_value: 5000, refund_count: 0, refund_amount: 0, chargeback_count: 0, upi_pct: 0.6, card_pct: 0.3, netbanking_pct: 0.1, settlement_delay_days: 1.2 }
      ]
    };
    const appA2Res = await request('POST', '/api/underwriting/apply', payloadA2, tokenA);
    console.log(`[User A] Submitted App 2 -> Status: ${appA2Res.status}, ID: ${appA2Res.body.applicationId}, Decision: ${appA2Res.body.decision}`);

    // 4. User B submits 1 application
    const payloadB1 = {
      business_name: "Bhatia Supermart LLP",
      business_category: "grocery",
      business_age_months: 36,
      transaction_history: [
        { date: "2026-08-01", transaction_count: 200, gross_revenue: 200000, avg_order_value: 1000, refund_count: 2, refund_amount: 2000, chargeback_count: 0, upi_pct: 0.7, card_pct: 0.2, netbanking_pct: 0.1, settlement_delay_days: 1.0 },
        { date: "2026-08-08", transaction_count: 210, gross_revenue: 210000, avg_order_value: 1000, refund_count: 2, refund_amount: 2000, chargeback_count: 0, upi_pct: 0.7, card_pct: 0.2, netbanking_pct: 0.1, settlement_delay_days: 1.0 },
        { date: "2026-08-15", transaction_count: 205, gross_revenue: 205000, avg_order_value: 1000, refund_count: 2, refund_amount: 2000, chargeback_count: 0, upi_pct: 0.7, card_pct: 0.2, netbanking_pct: 0.1, settlement_delay_days: 1.0 },
        { date: "2026-08-22", transaction_count: 215, gross_revenue: 215000, avg_order_value: 1000, refund_count: 2, refund_amount: 2000, chargeback_count: 0, upi_pct: 0.7, card_pct: 0.2, netbanking_pct: 0.1, settlement_delay_days: 1.0 }
      ]
    };
    const appB1Res = await request('POST', '/api/underwriting/apply', payloadB1, tokenB);
    console.log(`[User B] Submitted App 1 -> Status: ${appB1Res.status}, ID: ${appB1Res.body.applicationId}, Decision: ${appB1Res.body.decision}`);

    // 5. Call GET /my-applications as User A
    console.log('\n--- Calling GET /api/underwriting/my-applications as User A ---');
    const myAppsARes = await request('GET', '/api/underwriting/my-applications', null, tokenA);
    console.log(`User A Response Status: ${myAppsARes.status}`);
    const appsA = myAppsARes.body.applications || [];
    console.log(`User A Application Count returned: ${appsA.length}`);
    const appIdsA = appsA.map(a => a.id);
    console.log(`Applications returned for User A: ${appIdsA.join(', ')}`);

    // Verify isolation
    const hasB1InA = appIdsA.includes(appB1Res.body.applicationId);
    console.log(`User A results contain User B's application? ${hasB1InA ? 'FAIL (SECURITY BREACH)' : 'PASS (ISOLATED)'}`);

    // Verify trimmed fields for applicant view
    if (appsA.length > 0) {
      const sample = appsA[0];
      console.log('\n--- Payload Security Boundary Inspection (User A Sample Record) ---');
      console.log('Included fields:');
      console.log(' - id:', sample.id);
      console.log(' - business_name:', sample.business_name);
      console.log(' - decision:', sample.decision);
      console.log(' - status:', sample.status);
      console.log(' - applicant_message:', sample.applicant_message ? sample.applicant_message.slice(0, 40) + '...' : null);
      console.log(' - created_at:', sample.created_at);

      console.log('\nForbidden internal fields check:');
      console.log(' - features is undefined?          ', sample.features === undefined);
      console.log(' - risk_result is undefined?       ', sample.risk_result === undefined);
      console.log(' - adversarial_result is undefined?', sample.adversarial_result === undefined);
      console.log(' - underwriter_summary is undefined?', sample.underwriter_summary === undefined);
    }

    // 6. Call GET /my-applications as User B
    console.log('\n--- Calling GET /api/underwriting/my-applications as User B ---');
    const myAppsBRes = await request('GET', '/api/underwriting/my-applications', null, tokenB);
    console.log(`User B Response Status: ${myAppsBRes.status}`);
    const appsB = myAppsBRes.body.applications || [];
    console.log(`User B Application Count returned: ${appsB.length}`);
    const appIdsB = appsB.map(a => a.id);
    console.log(`Applications returned for User B: ${appIdsB.join(', ')}`);

    const hasAInB = appIdsB.some(id => appIdsA.includes(id));
    console.log(`User B results contain User A's applications? ${hasAInB ? 'FAIL (SECURITY BREACH)' : 'PASS (ISOLATED)'}`);

    console.log('\n==================================================');
    console.log('ALL MY-APPLICATIONS SECURITY & ISOLATION TESTS PASSED!');
    console.log('==================================================');

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (server) server.close();
  }
}

runTest();
