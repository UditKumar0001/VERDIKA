import { connectDB } from './config/db.js';

const BASE_URL = 'http://localhost:5000/api';

async function runMultiTenantTest() {
  console.log('================================================================');
  console.log('TESTING MULTI-TENANT ISOLATION & PUBLIC APPLICATION GATEWAY');
  console.log('================================================================\n');

  await connectDB();

  const timestamp = Date.now();

  // -------------------------------------------------------------
  // STEP 1: Register Finance Company A
  // -------------------------------------------------------------
  console.log('--- Step 1: Register Finance Company A ---');
  const compASignupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name: `Test Finance A ${timestamp}`,
      email: `admin.a.${timestamp}@financea.com`,
      password: 'Password123!',
      role: 'finance_company'
    })
  });
  const compAData = await compASignupRes.json();
  const cookiesA = compASignupRes.headers.get('set-cookie');
  console.log('Company A Registered:', compAData.company);
  const slugA = compAData.company.slug;

  if (!slugA) throw new Error('Failed to generate slug for Company A');

  // -------------------------------------------------------------
  // STEP 2: Register Finance Company B
  // -------------------------------------------------------------
  console.log('\n--- Step 2: Register Finance Company B ---');
  const compBSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name: `Test Finance B ${timestamp}`,
      email: `admin.b.${timestamp}@financeb.com`,
      password: 'Password123!',
      role: 'finance_company'
    })
  });
  const compBData = await compBSignupRes.json();
  const cookiesB = compBSignupRes.headers.get('set-cookie');
  console.log('Company B Registered:', compBData.company);
  const slugB = compBData.company.slug;

  if (!slugB) throw new Error('Failed to generate slug for Company B');

  // -------------------------------------------------------------
  // STEP 3: Public Company Slug Lookup
  // -------------------------------------------------------------
  console.log('\n--- Step 3: Public Company Slug Lookup ---');
  const lookupRes = await fetch(`${BASE_URL}/companies/lookup/${slugA}`);
  const lookupData = await lookupRes.json();
  console.log(`Lookup for ${slugA}:`, lookupData.company.name);

  // Invalid slug lookup
  const invalidLookup = await fetch(`${BASE_URL}/companies/lookup/non-existent-company-999`);
  console.log(`Lookup for invalid slug (Status: ${invalidLookup.status})`);
  if (invalidLookup.status !== 404) throw new Error('Expected 404 for non-existent company slug');

  // -------------------------------------------------------------
  // STEP 4: Submit Merchant Application via Company A's Public Link
  // -------------------------------------------------------------
  console.log('\n--- Step 4: Submit Merchant Application through Company A Link ---');
  const merchantPayload = {
    business_name: `Apex Retailers ${timestamp}`,
    business_category: 'retail',
    gstin: '27AAACG1234F1Z5',
    business_age_months: 24,
    bank_details: {
      account_holder: `Apex Retailers ${timestamp}`,
      account_number: '50200084729103',
      ifsc: 'HDFC0000060',
      bank_name: 'HDFC Bank',
      branch: 'Fort, Mumbai'
    },
    documents: {
      gst_certificate: { name: 'GST.pdf', size: 1200000, type: 'application/pdf', verified: true },
      pan_card: { name: 'PAN.png', size: 850000, width: 1000, height: 600, type: 'image/png', verified: true },
      bank_statement: { name: 'Stmt.pdf', size: 3000000, type: 'application/pdf', pageCount: 6, verified: true }
    },
    transaction_history: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2026, 0, 1 + i * 7).toISOString().split('T')[0],
      transaction_count: 80 + i,
      gross_revenue: 350000 + i * 4000,
      avg_order_value: 4500,
      refund_count: 1,
      refund_amount: 4500,
      chargeback_count: 0,
      upi_pct: 0.6,
      card_pct: 0.3,
      netbanking_pct: 0.1,
      settlement_delay_days: 1.0
    }))
  };

  const applyRes = await fetch(`${BASE_URL}/underwriting/apply-public/${slugA}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(merchantPayload)
  });
  const applyData = await applyRes.json();
  const createdAppId = applyData.applicationId;
  console.log(`Application Created for Company A! Application ID: ${createdAppId}, Decision: ${applyData.decision}`);

  // -------------------------------------------------------------
  // STEP 5: Verify Data Isolation - Log in as Company B
  // -------------------------------------------------------------
  console.log('\n--- Step 5: Verify Company B Cannot See Company A Applications ---');
  const queueResB = await fetch(`${BASE_URL}/underwriting/applications?status=ALL`, {
    method: 'GET',
    headers: {
      'Cookie': cookiesB
    }
  });
  const queueDataB = await queueResB.json();
  console.log(`Company B Application Queue Count: ${queueDataB.total}`);
  const hasAppInB = (queueDataB.applications || []).some(a => a.id === createdAppId);
  console.log(`[CHECK 5.1] Company B queue does NOT contain Company A's application? ${!hasAppInB ? 'PASS' : 'FAIL'}`);

  if (hasAppInB) {
    throw new Error('DATA LEAK ERROR: Company B can see Company A application in queue!');
  }

  // Verify Company B cannot access Company A application directly by ID
  const directAccessResB = await fetch(`${BASE_URL}/underwriting/applications/${createdAppId}`, {
    method: 'GET',
    headers: { 'Cookie': cookiesB }
  });
  console.log(`[CHECK 5.2] Direct access attempt by Company B rejected with 403? (Status: ${directAccessResB.status}) ${directAccessResB.status === 403 ? 'PASS' : 'FAIL'}`);

  if (directAccessResB.status !== 403) {
    throw new Error('SECURITY VULNERABILITY: Company B could access Company A application directly!');
  }

  // -------------------------------------------------------------
  // STEP 6: Verify Company A CAN See Its Own Application
  // -------------------------------------------------------------
  console.log('\n--- Step 6: Verify Company A CAN See Its Own Application ---');
  const queueResA = await fetch(`${BASE_URL}/underwriting/applications?status=ALL`, {
    method: 'GET',
    headers: { 'Cookie': cookiesA }
  });
  const queueDataA = await queueResA.json();
  console.log(`Company A Application Queue Count: ${queueDataA.total}`);
  const hasAppInA = (queueDataA.applications || []).some(a => a.id === createdAppId);
  console.log(`[CHECK 6.1] Company A queue DOES contain the submitted application? ${hasAppInA ? 'PASS' : 'FAIL'}`);

  if (!hasAppInA) {
    throw new Error('ERROR: Company A cannot see its own submitted application!');
  }

  // Verify Company A can fetch application details
  const directAccessResA = await fetch(`${BASE_URL}/underwriting/applications/${createdAppId}`, {
    method: 'GET',
    headers: { 'Cookie': cookiesA }
  });
  const appDetailsA = await directAccessResA.json();
  console.log(`[CHECK 6.2] Direct access by Company A succeeds with 200? (Status: ${directAccessResA.status}, Business: ${appDetailsA.application?.merchant_data?.business_name}) ${directAccessResA.status === 200 ? 'PASS' : 'FAIL'}`);

  // Check Company Settings / Stats Endpoint
  const myCompanyRes = await fetch(`${BASE_URL}/companies/my-company`, {
    method: 'GET',
    headers: { 'Cookie': cookiesA }
  });
  const myCompanyData = await myCompanyRes.json();
  console.log('\nCompany A Stats & Link Summary:', myCompanyData);

  console.log('\n================================================================');
  console.log('ALL MULTI-TENANT ISOLATION TESTS PASSED WITH ZERO DATA LEAKAGE!');
  console.log('================================================================');
  process.exit(0);
}

runMultiTenantTest().catch(err => {
  console.error('Multi-tenant test error:', err);
  process.exit(1);
});
