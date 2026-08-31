import { agentPipeline } from './services/agentPipeline.js';
import { connectDB } from './config/db.js';

async function runQualityTests() {
  console.log('================================================================');
  console.log('TESTING DOCUMENT QUALITY & RESOLUTION IN MULTI-AGENT PIPELINE');
  console.log('================================================================\n');

  await connectDB();

  const healthyTxHistory = Array.from({ length: 30 }, (_, i) => ({
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

  const validBankDetails = {
    account_holder: 'Aura Logistics Pvt Ltd',
    account_number: '50200084729103',
    masked_account_number: 'XXXXXXXXXX9103',
    ifsc: 'HDFC0000060',
    bank_name: 'HDFC Bank',
    branch: 'Fort, Mumbai'
  };

  // =================================================================
  // TEST 1: ALL DOCUMENTS CLEAR & HIGH QUALITY
  // =================================================================
  console.log('--- TEST 1: Clear Documents (High Resolution & Valid Size) ---');
  const clearApp = {
    business_name: 'Aura Logistics Pvt Ltd',
    business_category: 'electronics',
    gstin: '27AAACG1234F1Z5',
    business_age_months: 36,
    bank_details: validBankDetails,
    documents: {
      gst_certificate: { name: 'Aura_GST_Registration.pdf', size: 1400000, type: 'application/pdf', pageCount: 3, verified: true },
      pan_card: { name: 'Aura_Company_PAN.png', size: 850000, width: 1200, height: 750, type: 'image/png', verified: true },
      bank_statement: { name: 'Aura_HDFC_Statement_6M.pdf', size: 3200000, type: 'application/pdf', pageCount: 8, verified: true }
    },
    transaction_history: healthyTxHistory
  };

  const res1 = await agentPipeline.execute(clearApp);
  console.log(`Decision: ${res1.decision}`);
  console.log('Document Statuses:', res1.doc_result?.documentStatuses);
  console.log(`Document Agent Summary: ${res1.doc_result?.summary}`);
  
  const gstStatus1 = res1.doc_result?.documentStatuses?.gst_certificate?.status;
  const panStatus1 = res1.doc_result?.documentStatuses?.pan_card?.status;
  const stmtStatus1 = res1.doc_result?.documentStatuses?.bank_statement?.status;

  console.log(`[CHECK 1.1] GST status is 'Clear'? ${gstStatus1 === 'Clear' ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK 1.2] PAN status is 'Clear'? ${panStatus1 === 'Clear' ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK 1.3] Bank Statement status is 'Clear'? ${stmtStatus1 === 'Clear' ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK 1.4] Underwriting Decision is 'auto_approve'? ${res1.decision === 'auto_approve' ? 'PASS' : 'FAIL'}\n`);

  if (gstStatus1 !== 'Clear' || panStatus1 !== 'Clear' || stmtStatus1 !== 'Clear' || res1.decision !== 'auto_approve') {
    throw new Error('Test 1 Failed: Clear documents were not marked Clear or approved.');
  }

  // =================================================================
  // TEST 2: LOW RESOLUTION & SUSPICIOUSLY SMALL IMAGE (<20KB / <600px)
  // =================================================================
  console.log('--- TEST 2: Low-Resolution & Tiny Image (Needs Re-upload) ---');
  const lowResApp = {
    business_name: 'Aura Logistics Pvt Ltd',
    business_category: 'electronics',
    gstin: '27AAACG1234F1Z5',
    business_age_months: 36,
    bank_details: validBankDetails,
    documents: {
      gst_certificate: { name: 'Aura_GST.pdf', size: 1400000, type: 'application/pdf', pageCount: 3, verified: true },
      pan_card: { name: 'Aura_PAN_Tiny_Scan.jpg', size: 14000, width: 420, height: 280, type: 'image/jpeg', verified: true }, // <20KB & 420px width!
      bank_statement: { name: 'Aura_Bank_Statement.pdf', size: 3200000, type: 'application/pdf', pageCount: 8, verified: true }
    },
    transaction_history: healthyTxHistory
  };

  const res2 = await agentPipeline.execute(lowResApp);
  console.log(`Decision: ${res2.decision}`);
  console.log('PAN Document Status:', res2.doc_result?.documentStatuses?.pan_card);
  console.log(`Routing Reason: ${res2.routing_reason}`);

  const panStatus2 = res2.doc_result?.documentStatuses?.pan_card?.status;
  const panReason2 = res2.doc_result?.documentStatuses?.pan_card?.reason;

  console.log(`[CHECK 2.1] PAN status is 'Needs Re-upload'? ${panStatus2 === 'Needs Re-upload' ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK 2.2] Identifies low resolution or small size? ${panReason2?.includes('Low Resolution') || panReason2?.includes('small') ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK 2.3] Decision forced to 'route_to_human'? ${res2.decision === 'route_to_human' ? 'PASS' : 'FAIL'}\n`);

  if (panStatus2 !== 'Needs Re-upload' || res2.decision !== 'route_to_human') {
    throw new Error('Test 2 Failed: Low resolution document did not trigger Needs Re-upload or route_to_human.');
  }

  // =================================================================
  // TEST 3: MISSING DOCUMENT
  // =================================================================
  console.log('--- TEST 3: Missing Document (Missing Status) ---');
  const missingDocApp = {
    business_name: 'Aura Logistics Pvt Ltd',
    business_category: 'electronics',
    gstin: '27AAACG1234F1Z5',
    business_age_months: 36,
    bank_details: validBankDetails,
    documents: {
      gst_certificate: { name: 'Aura_GST.pdf', size: 1400000, type: 'application/pdf', pageCount: 3, verified: true },
      pan_card: { name: 'Aura_PAN.png', size: 850000, width: 1000, height: 600, type: 'image/png', verified: true },
      bank_statement: null // Missing!
    },
    transaction_history: healthyTxHistory
  };

  const res3 = await agentPipeline.execute(missingDocApp);
  console.log(`Decision: ${res3.decision}`);
  console.log('Bank Statement Status:', res3.doc_result?.documentStatuses?.bank_statement);

  const stmtStatus3 = res3.doc_result?.documentStatuses?.bank_statement?.status;

  console.log(`[CHECK 3.1] Bank Statement status is 'Missing'? ${stmtStatus3 === 'Missing' ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK 3.2] Decision forced to 'route_to_human'? ${res3.decision === 'route_to_human' ? 'PASS' : 'FAIL'}\n`);

  if (stmtStatus3 !== 'Missing' || res3.decision !== 'route_to_human') {
    throw new Error('Test 3 Failed: Missing document was not marked Missing.');
  }

  console.log('================================================================');
  console.log('ALL DOCUMENT QUALITY TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
  process.exit(0);
}

runQualityTests().catch((err) => {
  console.error('Quality test run error:', err);
  process.exit(1);
});
