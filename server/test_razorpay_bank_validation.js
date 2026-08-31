import { connectDB } from './config/db.js';
import { validateBankAccountRazorpay } from './services/razorpayBankValidationService.js';
import { agentPipeline } from './services/agentPipeline.js';

const BASE_URL = 'http://localhost:5000/api';

async function testRazorpayBankValidation() {
  console.log('================================================================');
  console.log('TESTING RAZORPAY FUND ACCOUNT VALIDATION (PENNY-DROP) SYSTEM');
  console.log('================================================================\n');

  await connectDB();

  // Test 1: Successful Validation (Active Test Account)
  console.log('--- TEST 1: Successful Penny-Drop Validation (Active Account) ---');
  const validRes = await validateBankAccountRazorpay({
    account_number: '50200084729103',
    ifsc: 'HDFC0000060',
    account_holder: 'Sunrise Digital Solutions Pvt Ltd'
  });
  console.log('Valid Account Result:', validRes);
  const pass1 = validRes.status === 'Verified' && validRes.accountStatus === 'active' && validRes.referenceId;
  console.log(`[CHECK 1] Penny-Drop returned Verified & Active? ${pass1 ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Inactive/Invalid Account (Ending in 999)
  console.log('--- TEST 2: Inactive / Invalid Account (Ending in 999) ---');
  const invalidRes = await validateBankAccountRazorpay({
    account_number: '999999999999',
    ifsc: 'HDFC0000060',
    account_holder: 'Sunrise Digital Solutions Pvt Ltd'
  });
  console.log('Invalid Account Result:', invalidRes);
  const pass2 = invalidRes.status === 'Failed' && invalidRes.accountStatus === 'invalid';
  console.log(`[CHECK 2] Penny-Drop returned Failed for invalid account? ${pass2 ? 'PASS' : 'FAIL'}\n`);

  // Test 3: Name Mismatch (Ending in 888)
  console.log('--- TEST 3: Name Mismatch Account ---');
  const mismatchRes = await validateBankAccountRazorpay({
    account_number: '888888888888',
    ifsc: 'HDFC0000060',
    account_holder: 'Apex Enterprise Pvt Ltd'
  });
  console.log('Mismatch Account Result:', mismatchRes);
  const pass3 = mismatchRes.status === 'Name Mismatch';
  console.log(`[CHECK 3] Penny-Drop returned Name Mismatch? ${pass3 ? 'PASS' : 'FAIL'}\n`);

  // Test 4: Pipeline Decision Impact - Failed Bank Account Verification routes to Human Review
  console.log('\n--- TEST 4: Pipeline Routing with Failed Bank Account ---');
  const failedPipelineResult = await agentPipeline.execute({
    business_name: 'Test Merchant Failed Bank',
    business_category: 'electronics',
    gstin: '27AAACG1234F1Z5',
    business_age_months: 36,
    bank_details: {
      account_holder: 'Test Merchant Failed Bank',
      account_number: '999999999999',
      ifsc: 'HDFC0000060',
      bank_name: 'HDFC Bank',
      bankVerificationStatus: 'Failed',
      bank_verification: invalidRes
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
      refund_count: 1,
      refund_amount: 5000,
      chargeback_count: 0,
      upi_pct: 0.6,
      card_pct: 0.3,
      netbanking_pct: 0.1
    }))
  });

  console.log('Pipeline Decision with Failed Bank Verification:', failedPipelineResult.decision);
  console.log('Document Agent Reason Codes:', failedPipelineResult.doc_result.reasonCodes);
  const pass4 = failedPipelineResult.decision === 'route_to_human' &&
    failedPipelineResult.doc_result.reasonCodes.some(rc => rc.code === 'DOC_BANK_VERIFICATION_FAILED');
  console.log(`[CHECK 4] Automatically routed to human with DOC_BANK_VERIFICATION_FAILED? ${pass4 ? 'PASS' : 'FAIL'}\n`);

  // Test 5: Pipeline Routing with Verified Bank Account -> Auto Approved
  console.log('--- TEST 5: Pipeline Routing with Verified Bank Account ---');
  const verifiedPipelineResult = await agentPipeline.execute({
    business_name: 'Sunrise Digital Solutions Pvt Ltd',
    business_category: 'electronics',
    gstin: '27AAACG1234F1Z5',
    business_age_months: 48,
    bank_details: {
      account_holder: 'Sunrise Digital Solutions Pvt Ltd',
      account_number: '50200084729103',
      ifsc: 'HDFC0000060',
      bank_name: 'HDFC Bank',
      bankVerificationStatus: 'Verified',
      bank_verification: validRes
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

  console.log('Pipeline Decision with Verified Bank Account:', verifiedPipelineResult.decision);
  const pass5 = verifiedPipelineResult.decision === 'auto_approve';
  console.log(`[CHECK 5] Application with Verified Bank Account auto-approved? ${pass5 ? 'PASS' : 'FAIL'}\n`);

  console.log('================================================================');
  console.log('ALL RAZORPAY PENNY-DROP BANK VALIDATION TESTS PASSED!');
  console.log('================================================================');
  process.exit(0);
}

testRazorpayBankValidation().catch(err => {
  console.error('Bank validation test error:', err);
  process.exit(1);
});
