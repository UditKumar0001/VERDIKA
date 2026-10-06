import { connectDB } from './config/db.js';
import {
  validateBankAccountRazorpay,
  calculateFuzzyNameMatch,
  checkValidationStatus,
  handleRazorpayWebhook
} from './services/razorpayBankValidationService.js';
import { agentPipeline } from './services/agentPipeline.js';
import { Application } from './models/Application.js';

async function testRazorpayBankValidation() {
  console.log('================================================================');
  console.log('TESTING RAZORPAY FUND ACCOUNT VALIDATION & FUZZY NAME MATCH');
  console.log('================================================================\n');

  await connectDB();

  // Test 1: Fuzzy Name Matching Unit Tests
  console.log('--- TEST 1: Fuzzy Name Matching Algorithm ---');
  const match1 = calculateFuzzyNameMatch(
    'Sunrise Digital Solutions Pvt Ltd',
    'SUNRISE DIGITAL SOLUTIONS PRIVATE LIMITED'
  );
  console.log('1.1 Normalized Match Test:', match1);
  const pass1_1 = match1.result === 'Match' && match1.score >= 80;
  console.log(`[CHECK 1.1] "Pvt Ltd" vs "PRIVATE LIMITED" correctly identified as Match? ${pass1_1 ? 'PASS' : 'FAIL'}`);

  const match2 = calculateFuzzyNameMatch(
    'Sunrise Digital Solution Pvt Ltd',
    'Sunrise Digital Solutions Pvt Ltd'
  );
  console.log('1.2 Typo/Plural Match Test:', match2);
  const pass1_2 = match2.result === 'Match' && match2.score >= 90;
  console.log(`[CHECK 1.2] Single-letter typo identified as Match? ${pass1_2 ? 'PASS' : 'FAIL'}`);

  const match3 = calculateFuzzyNameMatch(
    'Sunrise Digital',
    'Sunrise Digital Commercial Ventures Ltd'
  );
  console.log('1.3 Partial Match Test:', match3);
  const pass1_3 = match3.result === 'Partial Match' && match3.score >= 45 && match3.score < 80;
  console.log(`[CHECK 1.3] Substantial difference identified as Partial Match? ${pass1_3 ? 'PASS' : 'FAIL'}`);

  const match4 = calculateFuzzyNameMatch(
    'Sunrise Digital Solutions',
    'Unrelated Third Party Traders Pvt Ltd'
  );
  console.log('1.4 No Match Test:', match4);
  const pass1_4 = match4.result === 'No Match' && match4.score < 45;
  console.log(`[CHECK 1.4] Complete mismatch identified as No Match? ${pass1_4 ? 'PASS' : 'FAIL'}\n`);

  if (!pass1_1 || !pass1_2 || !pass1_3 || !pass1_4) {
    throw new Error('Test 1 Failed: Fuzzy name matching algorithm error.');
  }

  // Test 2: Real Active Test Account Validation via Razorpay FAV
  console.log('--- TEST 2: Active Account Validation (Real Razorpay API Contact/FA Creation) ---');
  const validRes = await validateBankAccountRazorpay({
    account_number: '50200084729103',
    ifsc: 'HDFC0000060',
    account_holder: 'Sunrise Digital Solutions Pvt Ltd'
  });
  console.log('Active Account Result:', {
    status: validRes.status,
    nameMatchResult: validRes.nameMatchResult,
    nameMatchScore: validRes.nameMatchScore,
    registeredName: validRes.registeredName,
    contactId: validRes.contactId,
    fundAccountId: validRes.fundAccountId,
    referenceId: validRes.referenceId
  });

  const pass2 =
    validRes.status === 'Verified' &&
    validRes.nameMatchResult === 'Match' &&
    validRes.accountStatus === 'active' &&
    Boolean(validRes.contactId && validRes.fundAccountId);
  console.log(`[CHECK 2] Created real Razorpay Contact/FA and returned Verified Match? ${pass2 ? 'PASS' : 'FAIL'}\n`);
  if (!pass2) throw new Error('Test 2 Failed: Active account validation failed.');

  // Test 3: Partial Match Account
  console.log('--- TEST 3: Partial Match Bank Account (Minor Variation) ---');
  const partialRes = await validateBankAccountRazorpay({
    account_number: '7878787878787878',
    ifsc: 'HDFC0000060',
    account_holder: 'Sunrise Digital Commercial'
  });
  console.log('Partial Match Result:', {
    status: partialRes.status,
    nameMatchResult: partialRes.nameMatchResult,
    nameMatchScore: partialRes.nameMatchScore,
    registeredName: partialRes.registeredName
  });
  const pass3 = partialRes.nameMatchResult === 'Partial Match';
  console.log(`[CHECK 3] Correctly flagged as Partial Match? ${pass3 ? 'PASS' : 'FAIL'}\n`);
  if (!pass3) throw new Error('Test 3 Failed: Partial match check failed.');

  // Test 4: Name Mismatch (No Match) Account
  console.log('--- TEST 4: Name Mismatch Account (No Match) ---');
  const mismatchRes = await validateBankAccountRazorpay({
    account_number: '7878787878787878',
    ifsc: 'HDFC0000060',
    account_holder: 'Apex Enterprise Pvt Ltd'
  });
  console.log('Mismatch Account Result:', {
    status: mismatchRes.status,
    nameMatchResult: mismatchRes.nameMatchResult,
    nameMatchScore: mismatchRes.nameMatchScore,
    registeredName: mismatchRes.registeredName
  });
  const pass4 = mismatchRes.status === 'Name Mismatch' && mismatchRes.nameMatchResult === 'No Match';
  console.log(`[CHECK 4] Returned Name Mismatch with No Match classification? ${pass4 ? 'PASS' : 'FAIL'}\n`);
  if (!pass4) throw new Error('Test 4 Failed: Name mismatch check failed.');

  // Test 5: Pipeline Underwriting Policy: "No Match" routes to human scrutiny, NOT auto-rejected
  console.log('--- TEST 5: Pipeline Decision with Name Mismatch (Scrutiny Routing) ---');
  const mismatchPipelineResult = await agentPipeline.execute({
    business_name: 'Apex Enterprise Pvt Ltd',
    business_category: 'electronics',
    gstin: '27AAACG1234F1Z4',
    business_age_months: 36,
    bank_details: {
      account_holder: 'Apex Enterprise Pvt Ltd',
      account_number: '888888888888',
      ifsc: 'HDFC0000060',
      bank_name: 'HDFC Bank',
      bankVerificationStatus: mismatchRes.status,
      bank_verification: mismatchRes
    },
    documents: {
      gst_certificate: { name: 'GST.pdf', size: 1200000, type: 'application/pdf', verified: true },
      pan_card: { name: 'PAN.png', size: 850000, width: 1000, height: 600, type: 'image/png', verified: true },
      bank_statement: { name: 'Stmt.pdf', size: 3000000, type: 'application/pdf', pageCount: 6, verified: true }
    },
    transaction_history: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2026, 0, 1 + i * 7).toISOString().split('T')[0],
      transaction_count: 85 + i,
      gross_revenue: 400000 + i * 5000,
      avg_order_value: 5000,
      refund_count: 0,
      refund_amount: 0,
      chargeback_count: 0,
      upi_pct: 0.6,
      card_pct: 0.3,
      netbanking_pct: 0.1
    }))
  });

  console.log('Pipeline Decision for Name Mismatch:', mismatchPipelineResult.decision);
  console.log('Routing Reason:', mismatchPipelineResult.routing_reason);
  const pass5 =
    mismatchPipelineResult.decision === 'route_to_human' &&
    mismatchPipelineResult.decision !== 'auto_reject';
  console.log(`[CHECK 5] Routed to human for extra scrutiny (NOT auto-rejected)? ${pass5 ? 'PASS' : 'FAIL'}\n`);
  if (!pass5) throw new Error('Test 5 Failed: Name mismatch was improperly routed or auto-rejected.');

  // Test 6: Asynchronous Pending Validation & Polling Mechanism
  console.log('--- TEST 6: Asynchronous Validation & Polling Mechanism ---');
  const pendingRes = await validateBankAccountRazorpay({
    account_number: '777777777777',
    ifsc: 'HDFC0000060',
    account_holder: 'Aura Logistics Pvt Ltd'
  });

  console.log('Initial Async Validation Result:', {
    status: pendingRes.status,
    nameMatchResult: pendingRes.nameMatchResult,
    validationId: pendingRes.validationId
  });

  const pass6_1 = pendingRes.status === 'Pending' && pendingRes.nameMatchResult === 'Pending';
  console.log(`[CHECK 6.1] Initial status is Pending? ${pass6_1 ? 'PASS' : 'FAIL'}`);

  // Test Polling check
  console.log('Waiting for asynchronous bank callback simulation...');
  await new Promise((resolve) => setTimeout(resolve, 4200));

  const pollRes = await checkValidationStatus(pendingRes.validationId);
  console.log('Polled Status Result after simulated delay:', {
    status: pollRes.status,
    nameMatchResult: pollRes.nameMatchResult,
    nameMatchScore: pollRes.nameMatchScore,
    registeredName: pollRes.registeredName
  });

  const pass6_2 = pollRes.status === 'Verified' && pollRes.nameMatchResult === 'Match';
  console.log(`[CHECK 6.2] Polling successfully resolved Pending -> Verified? ${pass6_2 ? 'PASS' : 'FAIL'}\n`);
  if (!pass6_1 || !pass6_2) throw new Error('Test 6 Failed: Asynchronous polling mechanism failed.');

  // Test 7: Razorpay Webhook Callback Simulation
  console.log('--- TEST 7: Razorpay Webhook Callback Simulation ---');
  // Create test application in DB to test webhook association
  const testApp = await Application.create({
    merchant_data: {
      business_name: 'Webhook Merchant Corp',
      applicant_email: 'webhook@test.com',
      bank_details: {
        account_holder: 'Webhook Merchant Corp',
        account_number: '50200084729103',
        ifsc: 'HDFC0000060',
        bank_verification: {
          status: 'Pending',
          nameMatchResult: 'Pending',
          validationId: 'fav_webhook_test_123',
          fundAccountId: 'fa_webhook_test_123'
        }
      }
    },
    status: 'pending_review'
  });

  const mockWebhookPayload = {
    entity: 'event',
    event: 'fund_account.validation.completed',
    payload: {
      fund_account_validation: {
        entity: {
          id: 'fav_webhook_test_123',
          fund_account_id: 'fa_webhook_test_123',
          status: 'completed',
          results: {
            account_status: 'active',
            registered_name: 'WEBHOOK MERCHANT CORP'
          }
        }
      }
    }
  };

  const webhookResult = await handleRazorpayWebhook(mockWebhookPayload, null);
  console.log('Webhook Handler Result:', webhookResult);

  // Fetch updated application from DB
  const updatedApp = await Application.findById(testApp.id);
  const updatedVerification = updatedApp.merchant_data?.bank_details?.bank_verification || {};
  console.log('Updated Application Bank Verification after Webhook:', {
    status: updatedVerification.status,
    nameMatchResult: updatedVerification.nameMatchResult,
    nameMatchScore: updatedVerification.nameMatchScore,
    registeredName: updatedVerification.registeredName
  });

  const pass7 =
    webhookResult.handled &&
    updatedVerification.status === 'Verified' &&
    updatedVerification.nameMatchResult === 'Match';
  console.log(`[CHECK 7] Webhook processed and updated DB application with Match result? ${pass7 ? 'PASS' : 'FAIL'}\n`);
  if (!pass7) throw new Error('Test 7 Failed: Webhook handler did not update application correctly.');

  console.log('================================================================');
  console.log('ALL RAZORPAY FUND ACCOUNT VALIDATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
  process.exit(0);
}

testRazorpayBankValidation().catch((err) => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
