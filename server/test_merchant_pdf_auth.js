import jwt from 'jsonwebtoken';
import { config } from './config/env.js';
import { startServer } from './server.js';
import { User } from './models/User.js';
import { Company } from './models/Company.js';
import { Application } from './models/Application.js';

function generateToken(userObj) {
  return jwt.sign(userObj, config.jwtSecret, { expiresIn: '1h' });
}

async function runPdfAuthTest() {
  const server = await startServer();
  const PORT = config.port || 5000;
  const BASE_URL = `http://localhost:${PORT}/api`;
  console.log('================================================================');
  console.log('TESTING MERCHANT PDF AUTHORIZATION & SCOPING (HTTP 403 CHECK)');
  console.log('================================================================\n');

  // 1. Create Test Company
  const company = await Company.create({
    name: 'PDF Auth Test Capital',
    slug: `pdf-auth-company-${Date.now()}`
  });

  // 2. Create Merchant A and Merchant B
  const merchantA = await User.create({
    email: `merchantA_${Date.now()}@example.com`,
    passwordHash: 'hash123',
    role: 'merchant',
    name: 'Merchant Alpha'
  });

  const merchantB = await User.create({
    email: `merchantB_${Date.now()}@example.com`,
    passwordHash: 'hash123',
    role: 'merchant',
    name: 'Merchant Beta'
  });

  const underwriter = await User.create({
    email: `underwriter_${Date.now()}@example.com`,
    passwordHash: 'hash123',
    role: 'underwriter',
    company_id: company.id,
    name: 'Underwriter One'
  });

  const tokenA = generateToken({ id: merchantA.id, email: merchantA.email, role: merchantA.role });
  const tokenB = generateToken({ id: merchantB.id, email: merchantB.email, role: merchantB.role });
  const tokenUnderwriter = generateToken({ id: underwriter.id, email: underwriter.email, role: underwriter.role, company_id: company.id });

  // 3. Create Application owned by Merchant A
  const appA = await Application.create({
    company_id: company.id,
    user_id: merchantA.id,
    merchant_data: {
      business_name: 'Alpha Retailers',
      gstin: '27AAACG1234F1Z4',
      bank_details: { account_holder: 'Alpha Retailers', account_number: '98765432101', bank_name: 'HDFC Bank' },
      documents: { gst_certificate: { name: 'GST.pdf' }, pan_card: { name: 'PAN.png' }, bank_statement: { name: 'Bank.pdf' } }
    },
    status: 'pending_review'
  });

  console.log(`Created Application ID ${appA.id} owned by Merchant A (${merchantA.id})\n`);

  // --- TEST 1: Merchant A accesses own Application PDF ---
  console.log('--- TEST 1: Merchant A requesting GET /applications/:id/pdf for own application ---');
  const res1 = await fetch(`${BASE_URL}/underwriting/applications/${appA.id}/pdf`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const data1 = await res1.json();
  console.log(`HTTP Status: ${res1.status}`);
  console.log(`Response:`, data1);
  console.log(`[CHECK] Authorized (Status 200)? ${res1.status === 200 ? 'PASS ✅' : 'FAIL ❌'}\n`);

  if (res1.status !== 200) {
    throw new Error('Test 1 Failed: Legitimate merchant was denied access to own PDF summary.');
  }

  // --- TEST 2: Merchant B attempts to access Merchant A's Application PDF ---
  console.log('--- TEST 2: Merchant B attempting to access Merchant A\'s PDF summary by guessing/changing ID ---');
  const res2 = await fetch(`${BASE_URL}/underwriting/applications/${appA.id}/pdf`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const data2 = await res2.json();
  console.log(`HTTP Status: ${res2.status}`);
  console.log(`Response:`, data2);
  console.log(`[CHECK] Access Denied with 403 Forbidden? ${res2.status === 403 ? 'PASS ✅' : 'FAIL ❌'}\n`);

  if (res2.status !== 403) {
    throw new Error('Test 2 Failed: Unauthorized merchant accessed another merchant\'s PDF report! Security check failed.');
  }

  // --- TEST 3: Underwriter accesses Application PDF for company ---
  console.log('--- TEST 3: Underwriter accessing Application PDF ---');
  const res3 = await fetch(`${BASE_URL}/underwriting/applications/${appA.id}/pdf`, {
    headers: { 'Authorization': `Bearer ${tokenUnderwriter}` }
  });
  const data3 = await res3.json();
  console.log(`HTTP Status: ${res3.status}`);
  console.log(`Response:`, data3);
  console.log(`[CHECK] Underwriter Authorized (Status 200)? ${res3.status === 200 ? 'PASS ✅' : 'FAIL ❌'}\n`);

  if (res3.status !== 200) {
    throw new Error('Test 3 Failed: Underwriter was denied access to application PDF.');
  }

  console.log('================================================================');
  console.log('ALL MERCHANT PDF AUTHORIZATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
  if (server && server.close) server.close();
  process.exit(0);
}

runPdfAuthTest().catch(err => {
  console.error('PDF Auth test failed:', err);
  process.exit(1);
});
