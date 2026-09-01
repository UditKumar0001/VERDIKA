import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { Application } from './models/Application.js';
import { User } from './models/User.js';
import { Company } from './models/Company.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

function makeToken(user, companyId = null) {
  return jwt.sign(
    {
      id: user.id,
      company_id: companyId || user.company_id || null,
      companyId: companyId || user.company_id || null,
      email: user.email,
      name: user.name,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
}

async function request(path, method = 'GET', body = null, token = null) {
  const url = `http://localhost:${config.port}/api${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Cookie'] = `token=${token}`;
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, body: data };
}

async function runIsolationTest() {
  await connectDB();
  console.log('================================================================');
  console.log('TESTING ROLE-BASED APPLICATION ISOLATION & DASHBOARD SCOPING');
  console.log('================================================================');

  const pwHash = await bcrypt.hash('Secret123!', 10);
  const ts = Date.now();

  // 1. Create Merchant A
  const merchantA = await User.create({
    name: 'Merchant A (Sharma Electronics)',
    email: `merchant_a_${ts}@test.com`,
    passwordHash: pwHash,
    role: 'merchant',
    company_id: null
  });
  const tokenA = makeToken(merchantA);
  console.log(`[SETUP] Merchant A created: ${merchantA.email} (ID: ${merchantA.id})`);

  // 2. Create Merchant B
  const merchantB = await User.create({
    name: 'Merchant B (Verma Textiles)',
    email: `merchant_b_${ts}@test.com`,
    passwordHash: pwHash,
    role: 'merchant',
    company_id: null
  });
  const tokenB = makeToken(merchantB);
  console.log(`[SETUP] Merchant B created: ${merchantB.email} (ID: ${merchantB.id})`);

  // 3. Create Finance Company & Underwriter
  const company = await Company.create({
    name: `Apex Capital_${ts}`,
    email: `apex_${ts}@capital.com`
  });
  const underwriter = await User.create({
    name: 'Lead Underwriter Marcus',
    email: `underwriter_${ts}@apexcapital.com`,
    passwordHash: pwHash,
    role: 'underwriter',
    company_id: company.id
  });
  const tokenUnderwriter = makeToken(underwriter, company.id);
  console.log(`[SETUP] Underwriter created: ${underwriter.email} (Company: ${company.name})`);

  // 4. Merchant A submits Application 1
  const appA1Res = await request('/underwriting/apply', 'POST', {
    business_name: 'Sharma Electronics Pvt Ltd',
    business_category: 'electronics',
    loan_amount: 500000,
    loan_tenure_months: 12,
    company_slug: company.slug
  }, tokenA);
  const appA1Id = appA1Res.body?.applicationId;
  console.log(`[STEP 1] Merchant A submitted Application 1 -> ID: ${appA1Id}, Status: ${appA1Res.status}`);

  // 5. Merchant A submits Application 2
  const appA2Res = await request('/underwriting/apply', 'POST', {
    business_name: 'Sharma Retail Store',
    business_category: 'retail',
    loan_amount: 300000,
    loan_tenure_months: 6,
    company_slug: company.slug
  }, tokenA);
  const appA2Id = appA2Res.body?.applicationId;
  console.log(`[STEP 2] Merchant A submitted Application 2 -> ID: ${appA2Id}, Status: ${appA2Res.status}`);

  // 6. Merchant B submits Application 1
  const appB1Res = await request('/underwriting/apply', 'POST', {
    business_name: 'Verma Handlooms LLP',
    business_category: 'apparel',
    loan_amount: 750000,
    loan_tenure_months: 18,
    company_slug: company.slug
  }, tokenB);
  const appB1Id = appB1Res.body?.applicationId;
  console.log(`[STEP 3] Merchant B submitted Application 1 -> ID: ${appB1Id}, Status: ${appB1Res.status}`);

  // 7. Verify GET /api/underwriting/my-applications as Merchant A
  console.log('\n----------------------------------------------------------------');
  console.log('TEST 1: Calling GET /my-applications as Merchant A');
  const myAppsARes = await request('/underwriting/my-applications', 'GET', null, tokenA);
  const myAppsA = myAppsARes.body?.applications || [];
  console.log(`Merchant A received ${myAppsA.length} application(s). IDs:`, myAppsA.map(a => a.id));

  const hasA1 = myAppsA.some(a => a.id === appA1Id);
  const hasA2 = myAppsA.some(a => a.id === appA2Id);
  const hasB1InA = myAppsA.some(a => a.id === appB1Id);

  if (hasA1 && hasA2 && !hasB1InA && myAppsA.length === 2) {
    console.log('✅ TEST 1 PASSED: Merchant A sees exactly and only their 2 applications!');
  } else {
    console.error('❌ TEST 1 FAILED: Isolation violation detected for Merchant A!');
    process.exit(1);
  }

  // 8. Verify GET /api/underwriting/my-applications as Merchant B
  console.log('\n----------------------------------------------------------------');
  console.log('TEST 2: Calling GET /my-applications as Merchant B');
  const myAppsBRes = await request('/underwriting/my-applications', 'GET', null, tokenB);
  const myAppsB = myAppsBRes.body?.applications || [];
  console.log(`Merchant B received ${myAppsB.length} application(s). IDs:`, myAppsB.map(a => a.id));

  const hasB1 = myAppsB.some(a => a.id === appB1Id);
  const hasA1InB = myAppsB.some(a => a.id === appA1Id);
  const hasA2InB = myAppsB.some(a => a.id === appA2Id);

  if (hasB1 && !hasA1InB && !hasA2InB && myAppsB.length === 1) {
    console.log('✅ TEST 2 PASSED: Merchant B sees exactly and only their 1 application (Zero of Merchant A)!');
  } else {
    console.error('❌ TEST 2 FAILED: Isolation violation detected for Merchant B!');
    process.exit(1);
  }

  // 9. Verify GET /api/underwriting/applications as Merchant A (Dashboard Queue endpoint fallback)
  console.log('\n----------------------------------------------------------------');
  console.log('TEST 3: Calling GET /applications as Merchant A (Endpoint Role Protection)');
  const appsARes = await request('/underwriting/applications', 'GET', null, tokenA);
  const appsA = appsARes.body?.applications || [];
  console.log(`Merchant A received ${appsA.length} application(s) from /applications endpoint. IDs:`, appsA.map(a => a.id));

  const hasBInAllA = appsA.some(a => a.id === appB1Id);
  if (!hasBInAllA && appsA.length === 2) {
    console.log('✅ TEST 3 PASSED: /applications automatically scopes to user_id for Merchant role!');
  } else {
    console.error('❌ TEST 3 FAILED: /applications returned unisolated records to Merchant A!');
    process.exit(1);
  }

  // 10. Verify Cross-Tenant Tampering Block: Merchant A attempting to view Merchant B's detail record
  console.log('\n----------------------------------------------------------------');
  console.log(`TEST 4: Merchant A attempting to view Merchant B's application (${appB1Id})`);
  const viewOtherRes = await request(`/underwriting/applications/${appB1Id}`, 'GET', null, tokenA);
  console.log(`Response Status: ${viewOtherRes.status}, Error: "${viewOtherRes.body?.error}"`);

  if (viewOtherRes.status === 403) {
    console.log('✅ TEST 4 PASSED: 403 Forbidden correctly returned when attempting to access another merchant record!');
  } else {
    console.error(`❌ TEST 4 FAILED: Expected 403 Forbidden but got ${viewOtherRes.status}!`);
    process.exit(1);
  }

  // 11. Verify Underwriter sees company queue
  console.log('\n----------------------------------------------------------------');
  console.log('TEST 5: Underwriter calling GET /applications');
  const underwriterAppsRes = await request('/underwriting/applications', 'GET', null, tokenUnderwriter);
  const underwriterApps = underwriterAppsRes.body?.applications || [];
  console.log(`Underwriter received ${underwriterApps.length} application(s) for Company queue.`);

  if (underwriterApps.length >= 3) {
    console.log('✅ TEST 5 PASSED: Underwriter can view and manage their company review queue!');
  } else {
    console.error('❌ TEST 5 FAILED: Underwriter queue empty!');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('ALL MERCHANT APPLICATION ISOLATION TESTS PASSED 100%!');
  console.log('================================================================');
}

runIsolationTest().catch(err => {
  console.error('[TEST ERROR]:', err);
  process.exit(1);
});
