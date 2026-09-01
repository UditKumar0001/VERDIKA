import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import { Company } from './models/Company.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

async function test2FAFlow() {
  await connectDB();
  console.log('=====================================================');
  console.log('RUNNING 2FA OTP LOGIN FLOW INTEGRATION TEST');
  console.log('=====================================================');

  const baseUrl = `http://localhost:${config.port}/api`;

  // 1. Setup Test Underwriter User
  const testEmail = `underwriter_2fa_${Date.now()}@test.com`;
  const testPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(testPassword, 10);

  const company = await Company.create({
    name: 'Apex Capital Partners',
    email: testEmail
  });

  const user = await User.create({
    name: 'Sarah Underwriter',
    email: testEmail,
    passwordHash,
    role: 'underwriter',
    company_id: company.id
  });

  console.log(`[TEST SETUP] Created test underwriter: ${user.email} (ID: ${user.id})`);

  // 2. Test Step 1: Submit Credentials
  console.log('\n[STEP 1] Submitting email + password to /api/auth/login...');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });

  const loginData = await loginRes.json();
  console.log(`[STEP 1 RESULT] Status: ${loginRes.status}, require_otp: ${loginData.require_otp}, temp_token exists: ${Boolean(loginData.temp_token)}`);

  if (!loginData.require_otp || !loginData.temp_token) {
    throw new Error('Expected require_otp=true and temp_token in login response');
  }

  const tempToken = loginData.temp_token;

  // 3. Test Invalid OTP Code
  console.log('\n[STEP 2] Testing verification with INCORRECT OTP code (000000)...');
  const invalidOtpRes = await fetch(`${baseUrl}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_token: tempToken, otp: '000000' })
  });

  const invalidOtpData = await invalidOtpRes.json();
  console.log(`[STEP 2 RESULT] Status: ${invalidOtpRes.status}, Error: "${invalidOtpData.error}" (Expected 400 rejection)`);
  if (invalidOtpRes.status !== 400) {
    throw new Error('Expected 400 error for invalid OTP');
  }

  // 4. Test Resend Cooldown
  console.log('\n[STEP 3] Testing Resend Cooldown enforcement immediately (< 30s)...');
  const resendCooldownRes = await fetch(`${baseUrl}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_token: tempToken })
  });

  const resendCooldownData = await resendCooldownRes.json();
  console.log(`[STEP 3 RESULT] Status: ${resendCooldownRes.status}, Error: "${resendCooldownData.error}", Remaining: ${resendCooldownData.remainingSeconds}s (Expected 429 Rate Limit)`);
  if (resendCooldownRes.status !== 429) {
    throw new Error('Expected 429 cooldown error on immediate resend');
  }

  // 5. Trigger login and verify with valid OTP
  console.log('\n[STEP 4] Logging in and verifying with VALID OTP code...');
  const secondLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const secondLoginData = await secondLoginRes.json();
  const secondTempToken = secondLoginData.temp_token;
  const validOtp = secondLoginData.debug_otp;

  console.log(`[STEP 4 OTP] Received valid OTP: ${validOtp} for ${testEmail}`);

  const verifyRes = await fetch(`${baseUrl}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_token: secondTempToken, otp: validOtp })
  });

  const verifyData = await verifyRes.json();
  console.log(`[STEP 4 RESULT] Status: ${verifyRes.status}, Message: "${verifyData.message}", User: ${verifyData.user?.email}, Company: ${verifyData.company?.name}`);

  if (verifyRes.status !== 200 || !verifyData.user) {
    throw new Error('Expected 200 OK and authenticated user object after valid OTP');
  }

  console.log('\n=====================================================');
  console.log('2FA OTP TEST COMPLETED SUCCESSFULLY WITH 100% PASS!');
  console.log('=====================================================');
}

test2FAFlow().catch((err) => {
  console.error('[TEST FAILURE]:', err);
  process.exit(1);
});
