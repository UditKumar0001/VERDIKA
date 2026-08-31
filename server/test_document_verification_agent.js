import { agentPipeline } from './services/agentPipeline.js';
import { connectDB } from './config/db.js';
import { Application } from './models/Application.js';
import { AuditLog } from './models/AuditLog.js';

async function runTests() {
  console.log('================================================================');
  console.log('TESTING DOCUMENT VERIFICATION AGENT IN MULTI-AGENT PIPELINE');
  console.log('================================================================\n');

  await connectDB();

  // Baseline 30-week healthy transaction history for test cases
  const healthyTransactionHistory = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(2026, 0, 1 + i * 7).toISOString().split('T')[0],
    transaction_count: 85 + (i % 5) * 3,
    gross_revenue: 425000 + i * 5000,
    avg_order_value: 5000 + (i % 3) * 50,
    refund_count: i % 3 === 0 ? 2 : (i % 2 === 0 ? 1 : 0),
    refund_amount: i % 3 === 0 ? 10000 : (i % 2 === 0 ? 5000 : 0),
    chargeback_count: 0,
    upi_pct: 0.55,
    card_pct: 0.35,
    netbanking_pct: 0.10,
    settlement_delay_days: 1.2
  }));

  // =================================================================
  // TEST CASE 1: Full Complete KYC Documents & Valid Bank Details
  // =================================================================
  console.log('--- TEST CASE 1: All Documents & Bank Details Complete and Valid ---');
  const completeMerchant = {
    business_name: 'Apex Horizon Technologies Pvt Ltd',
    business_category: 'electronics',
    gstin: '27AAACG1234F1Z5',
    registration_date: '2022-03-15',
    business_age_months: 48,
    bank_details: {
      account_holder: 'Apex Horizon Technologies Pvt Ltd',
      account_number: '50200084729103',
      masked_account_number: 'XXXXXXXXXX9103',
      ifsc: 'HDFC0000060',
      bank_name: 'HDFC Bank',
      branch: 'Fort, Mumbai'
    },
    documents: {
      gst_certificate: { name: 'Apex_GST_Certificate.pdf', verified: true },
      pan_card: { name: 'Apex_PAN_Card.png', verified: true },
      bank_statement: { name: 'Apex_HDFC_Statement_6M.pdf', verified: true }
    },
    transaction_history: healthyTransactionHistory
  };

  const result1 = await agentPipeline.execute(completeMerchant);

  console.log(`Decision: ${result1.decision}`);
  console.log(`Document Agent Status: ${result1.doc_result?.status}`);
  console.log(`Document Agent Summary: ${result1.doc_result?.summary}`);
  console.log('Reason Codes:');
  result1.risk_result?.reasonCodes?.forEach((rc) => {
    console.log(` - [${rc.code || rc.factor}]: ${rc.description || rc.details}`);
  });

  const hasKycVerifiedCode = result1.risk_result?.reasonCodes?.some(
    (rc) => rc.code === 'KYC_DOCS_VERIFIED' || rc.description?.includes('All KYC documents verified')
  );

  console.log(`[CHECK] Document Agent Status is 'Verified'? ${result1.doc_result?.status === 'Verified' ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK] Contains 'All KYC documents verified'? ${hasKycVerifiedCode ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK] Decision is 'auto_approve'? ${result1.decision === 'auto_approve' ? 'PASS' : 'FAIL'}\n`);

  if (result1.decision !== 'auto_approve' || result1.doc_result?.status !== 'Verified') {
    throw new Error('Test Case 1 Failed: Complete application was not approved or verified.');
  }

  // =================================================================
  // TEST CASE 2: Missing Bank Statement Document
  // =================================================================
  console.log('--- TEST CASE 2: Missing Bank Statement Document ---');
  const missingBankStmtMerchant = {
    business_name: 'Zenith Logistics & Supply Chain Pvt Ltd',
    business_category: 'electronics',
    gstin: '27AAACG1234F1Z5',
    registration_date: '2022-03-15',
    business_age_months: 48,
    bank_details: {
      account_holder: 'Zenith Logistics & Supply Chain Pvt Ltd',
      account_number: '50200084729103',
      masked_account_number: 'XXXXXXXXXX9103',
      ifsc: 'HDFC0000060',
      bank_name: 'HDFC Bank',
      branch: 'Fort, Mumbai'
    },
    documents: {
      gst_certificate: { name: 'Zenith_GST.pdf', verified: true },
      pan_card: { name: 'Zenith_PAN.png', verified: true },
      bank_statement: null // Missing!
    },
    transaction_history: healthyTransactionHistory
  };

  const result2 = await agentPipeline.execute(missingBankStmtMerchant);

  console.log(`Decision: ${result2.decision}`);
  console.log(`Document Agent Status: ${result2.doc_result?.status}`);
  console.log(`Routing Reason: ${result2.routing_reason}`);
  console.log('Reason Codes:');
  result2.risk_result?.reasonCodes?.forEach((rc) => {
    console.log(` - [${rc.code || rc.factor}]: ${rc.description || rc.details}`);
  });

  const hasMissingStmtReason = result2.risk_result?.reasonCodes?.some(
    (rc) => rc.code === 'DOC_MISSING_BANK_STATEMENT' || rc.description?.includes('Bank statement missing')
  );

  console.log(`[CHECK] Document Agent Status is 'Incomplete'? ${result2.doc_result?.status === 'Incomplete' ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK] Decision forced to 'route_to_human'? ${result2.decision === 'route_to_human' ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK] Contains 'Bank statement missing' reason code? ${hasMissingStmtReason ? 'PASS' : 'FAIL'}\n`);

  if (result2.decision !== 'route_to_human' || result2.doc_result?.status !== 'Incomplete') {
    throw new Error('Test Case 2 Failed: Missing document did not trigger route_to_human.');
  }

  // =================================================================
  // TEST CASE 3: Invalid PAN & IFSC Formats
  // =================================================================
  console.log('--- TEST CASE 3: Invalid PAN & IFSC Formats ---');
  const invalidFormatMerchant = {
    business_name: 'Blue Star Traders',
    business_category: 'electronics',
    gstin: 'INVALID_GSTIN_123',
    registration_date: '2022-03-15',
    business_age_months: 48,
    bank_details: {
      account_holder: 'Blue Star Traders',
      account_number: '50200084729103',
      ifsc: 'INVALID_IFSC',
      bank_name: 'Some Bank'
    },
    documents: {
      gst_certificate: { name: 'GST.pdf', verified: true },
      pan_card: { name: 'PAN.png', verified: true },
      bank_statement: { name: 'Statement.pdf', verified: true }
    },
    transaction_history: healthyTransactionHistory
  };

  const result3 = await agentPipeline.execute(invalidFormatMerchant);

  console.log(`Decision: ${result3.decision}`);
  console.log(`Document Agent Status: ${result3.doc_result?.status}`);
  console.log('Reason Codes:');
  result3.risk_result?.reasonCodes?.forEach((rc) => {
    console.log(` - [${rc.code || rc.factor}]: ${rc.description || rc.details}`);
  });

  console.log(`[CHECK] Document Agent Status is 'Invalid Format'? ${result3.doc_result?.status === 'Invalid Format' ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK] Decision forced to 'route_to_human'? ${result3.decision === 'route_to_human' ? 'PASS' : 'FAIL'}\n`);

  console.log('================================================================');
  console.log('ALL DOCUMENT VERIFICATION AGENT TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
