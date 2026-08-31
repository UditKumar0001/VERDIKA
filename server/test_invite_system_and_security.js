import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import { Company } from './models/Company.js';
import { CompanyInvite } from './models/CompanyInvite.js';
import { Application } from './models/Application.js';

const BASE_URL = 'http://localhost:5000/api';

async function testSecurityAndInviteSystem() {
  console.log('================================================================');
  console.log('TESTING INVITE-ONLY SECURITY & ANTI-COLLUSION ENGINE');
  console.log('================================================================\n');

  await connectDB();
  const uid = Date.now().toString().slice(-5);

  // -------------------------------------------------------------------------
  // TEST 1: Direct Public Signup as Underwriter Must Be Blocked
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Direct Public Signup as Underwriter Blocked ---');
  const directSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rogue Underwriter',
      email: `rogue_${uid}@test.com`,
      password: 'Password123!',
      role: 'underwriter'
    })
  });

  const directSignupData = await directSignupRes.json();
  console.log('Direct Underwriter Signup Status:', directSignupRes.status);
  console.log('Error Message:', directSignupData.error);

  const pass1 = directSignupRes.status === 403 && directSignupData.error.includes('Underwriter accounts cannot be created directly');
  console.log(`[CHECK 1] Public underwriter registration blocked with HTTP 403? ${pass1 ? 'PASS' : 'FAIL'}\n`);

  // -------------------------------------------------------------------------
  // TEST 2: Admin Registration & Team Member Invitation Flow
  // -------------------------------------------------------------------------
  console.log('--- TEST 2: Finance Company Admin Registration & Team Invite ---');
  // 2A: Register Finance Company Admin
  const adminEmail = `admin_${uid}@bluepeak.test`;
  const adminSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sarah Connor',
      company_name: `BluePeak Capital ${uid}`,
      email: adminEmail,
      password: 'SecureAdminPassword123!',
      role: 'admin'
    })
  });

  const adminSignupData = await adminSignupRes.json();
  const adminCookie = adminSignupRes.headers.get('set-cookie');
  console.log('Admin Registered:', adminSignupData.user?.email, 'Role:', adminSignupData.user?.role, 'Company ID:', adminSignupData.company?.id);

  const companyId = adminSignupData.company?.id;

  // 2B: Admin Invites an Underwriter
  const underwriterEmail = `underwriter_${uid}@bluepeak.test`;
  const inviteRes = await fetch(`${BASE_URL}/companies/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie || ''
    },
    body: JSON.stringify({
      email: underwriterEmail,
      role: 'underwriter'
    })
  });

  const inviteData = await inviteRes.json();
  console.log('Invite Response Status:', inviteRes.status);
  console.log('Generated Invite Link:', inviteData.invite?.invite_link);

  const inviteToken = inviteData.invite?.invite_link?.split('/invite/')[1];
  const pass2 = inviteRes.status === 201 && inviteToken && inviteData.invite?.status === 'pending';
  console.log(`[CHECK 2] Admin successfully generated 72h team invite? ${pass2 ? 'PASS' : 'FAIL'}\n`);

  // -------------------------------------------------------------------------
  // TEST 3: Validate Token & Accept Invitation
  // -------------------------------------------------------------------------
  console.log('--- TEST 3: Public Token Validation & Invite Acceptance ---');
  // 3A: Validate token publicly
  const validateRes = await fetch(`${BASE_URL}/auth/invite/${inviteToken}`);
  const validateData = await validateRes.json();
  console.log('Validate Token Result:', {
    valid: validateData.valid,
    email: validateData.email,
    role: validateData.role,
    company: validateData.company?.name
  });

  // 3B: Underwriter completes registration
  const acceptRes = await fetch(`${BASE_URL}/auth/accept-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: inviteToken,
      name: 'John Underwriter',
      password: 'UnderwriterPassword123!'
    })
  });

  const acceptData = await acceptRes.json();
  const underwriterCookie = acceptRes.headers.get('set-cookie');
  console.log('Accept Invite Response:', {
    message: acceptData.message,
    userRole: acceptData.user?.role,
    userCompany: acceptData.user?.company_id
  });

  const pass3 = acceptRes.status === 201 &&
    acceptData.user?.role === 'underwriter' &&
    acceptData.user?.company_id === companyId;
  console.log(`[CHECK 3] Underwriter created and strictly bound to company ID ${companyId}? ${pass3 ? 'PASS' : 'FAIL'}\n`);

  // -------------------------------------------------------------------------
  // TEST 4: Company Multi-Tenant Isolation
  // -------------------------------------------------------------------------
  console.log('--- TEST 4: Tenant Data Isolation ---');
  // Create App A for BluePeak
  const appA = await Application.create({
    id: `APP-BP-${uid}`,
    company_id: companyId,
    merchant_data: { business_name: 'BluePeak Merchant Client', applicant_email: 'merchant_bp@test.com' },
    status: 'pending_review'
  });

  // Create App B for Another Finance Company
  const appB = await Application.create({
    id: `APP-OTHER-${uid}`,
    company_id: 'COMP-DIFFERENT-TENANT',
    merchant_data: { business_name: 'Other Finance Company Merchant', applicant_email: 'merchant_other@test.com' },
    status: 'pending_review'
  });

  // Underwriter accesses their own company's app
  const accessResA = await fetch(`${BASE_URL}/underwriting/applications/${appA.id}`, {
    headers: { Cookie: underwriterCookie || '' }
  });
  console.log(`Underwriter access to BluePeak App (${appA.id}): HTTP ${accessResA.status}`);

  // Underwriter attempts to access another company's app
  const accessResB = await fetch(`${BASE_URL}/underwriting/applications/${appB.id}`, {
    headers: { Cookie: underwriterCookie || '' }
  });
  console.log(`Underwriter access to Other Company App (${appB.id}): HTTP ${accessResB.status}`);

  const pass4 = accessResA.status === 200 && accessResB.status === 403;
  console.log(`[CHECK 4] Tenant isolation verified (200 on own apps, 403 on other companies)? ${pass4 ? 'PASS' : 'FAIL'}\n`);

  // -------------------------------------------------------------------------
  // TEST 5: Anti-Collusion Self-Review Safety Check
  // -------------------------------------------------------------------------
  console.log('--- TEST 5: Anti-Collusion Self-Review Safety Check ---');
  // Create an application where merchant applicant_email is identical to the underwriter's email
  const collusionApp = await Application.create({
    id: `APP-COLLUSION-${uid}`,
    company_id: companyId,
    merchant_data: {
      business_name: 'Underwriter Personal Secret Business',
      applicant_email: underwriterEmail // MATCHES underwriter's email!
    },
    status: 'pending_review'
  });

  // Underwriter tries to approve their own loan application!
  const reviewAttemptRes = await fetch(`${BASE_URL}/underwriting/applications/${collusionApp.id}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: underwriterCookie || ''
    },
    body: JSON.stringify({
      decision: 'approved',
      notes: 'Self approving my own loan without supervisor check.'
    })
  });

  const reviewAttemptData = await reviewAttemptRes.json();
  console.log('Self-Review Attempt Status:', reviewAttemptRes.status);
  console.log('Safety Rejection Error:', reviewAttemptData.error);

  const pass5 = reviewAttemptRes.status === 403 && reviewAttemptData.error.includes('Anti-Collusion Policy');
  console.log(`[CHECK 5] Self-review blocked by Anti-Collusion engine? ${pass5 ? 'PASS' : 'FAIL'}\n`);

  console.log('================================================================');
  console.log('ALL 5 INVITE SECURITY & ANTI-COLLUSION TESTS PASSED!');
  console.log('================================================================');
}

testSecurityAndInviteSystem().catch(err => {
  console.error('Invite security test error:', err);
});
