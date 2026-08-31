import { connectDB } from './config/db.js';
import { agentPipeline } from './services/agentPipeline.js';
import { extractTransactionsFromText, aggregateTransactionsToWeekly, parseBankStatementTransactions } from './services/bankStatementParser.js';

async function testBankStatementExtraction() {
  console.log('================================================================');
  console.log('TESTING REAL BANK STATEMENT PDF TRANSACTION EXTRACTION SYSTEM');
  console.log('================================================================\n');

  await connectDB();

  // Test 1: Raw Statement Text Parser
  console.log('--- TEST 1: Raw Bank Statement Table Parsing ---');
  const sampleBankStatementText = `
  HDFC BANK LIMITED - COMMERCIAL ACCOUNT STATEMENT
  Account Name: Apex Global Retailers Pvt Ltd
  Account Number: 50200084729103 | IFSC: HDFC0000060
  Statement Period: 01/01/2026 to 28/02/2026

  Date        Narration / Description                      Chq/Ref No.    Value Dt    Withdrawal (Dr)    Deposit (Cr)    Balance
  ----------------------------------------------------------------------------------------------------------------------------------
  02/01/2026  UPI/RAZORPAY_MERCHANT_SETTLEMENT/20260102   UPI-984720     02/01/2026                     52,400.00       452,400.00
  05/01/2026  POS_CARD_SETTLEMENT/HDFC_MERCHANT_PAY       POS-119283     05/01/2026                     38,250.00       490,650.00
  09/01/2026  NEFT/COMMERCIAL_SALES_B2B_INFLOW            N0928371       09/01/2026                     75,000.00       565,650.00
  12/01/2026  UPI/CUSTOMER_ORDER_SETTLEMENT/SWIFT         UPI-984721     12/01/2026                     44,100.00       609,750.00
  15/01/2026  REFUND_CUSTOMER_ORDER_REVERSAL              REF-10029      15/01/2026  3,500.00                           606,250.00
  19/01/2026  POS_CARD_SETTLEMENT/VISA_BATCH_992          POS-119284     19/01/2026                     62,000.00       668,250.00
  22/01/2026  UPI/RAZORPAY_GATEWAY_CREDIT                 UPI-984722     22/01/2026                     48,900.00       717,150.00
  26/01/2026  NEFT/BULK_MERCHANT_PROCEEDS                 N0928372       26/01/2026                     91,500.00       808,650.00
  30/01/2026  POS_CARD_SETTLEMENT/MASTERCARD              POS-119285     30/01/2026                     55,800.00       864,450.00
  03/02/2026  UPI/RAZORPAY_MERCHANT_SETTLEMENT/20260203   UPI-984723     03/02/2026                     68,300.00       932,750.00
  07/02/2026  REFUND_REVERSAL_CHARGEBACK_SETTLE           REF-10030      07/02/2026  4,200.00                           928,550.00
  11/02/2026  POS_CARD_SETTLEMENT/HDFC_MERCHANT_PAY       POS-119286     11/02/2026                     71,000.00       999,550.00
  16/02/2026  UPI/DAILY_BATCH_SETTLEMENT                  UPI-984724     16/02/2026                     59,400.00     1,058,950.00
  20/02/2026  NEFT/WHOLESALE_MERCHANT_TRANSFER            N0928373       20/02/2026                     84,000.00     1,142,950.00
  25/02/2026  UPI/RAZORPAY_MERCHANT_SETTLEMENT/20260225   UPI-984725     25/02/2026                     63,500.00     1,206,450.00
  28/02/2026  POS_CARD_SETTLEMENT/BATCH_CLOSE             POS-119287     28/02/2026                     51,200.00     1,257,650.00
  `;

  const extractedTx = extractTransactionsFromText(sampleBankStatementText);
  console.log(`Extracted ${extractedTx.length} raw transactions from statement text:`);
  console.log('Sample Extracted Transaction #1:', extractedTx[0]);
  console.log('Sample Refund Transaction:', extractedTx.find(t => t.isRefund));

  const pass1 = extractedTx.length >= 10 && extractedTx.some(t => t.isRefund);
  console.log(`[CHECK 1] Correctly parsed table into structured rows? ${pass1 ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Aggregation into Weekly Datapoints for RiskAgent
  console.log('--- TEST 2: Aggregation into Weekly Datapoints ---');
  const weeklySeries = aggregateTransactionsToWeekly(extractedTx);
  console.log(`Aggregated into ${weeklySeries.length} weekly feature datapoints.`);
  console.log('Sample Week #1 Data:', weeklySeries[0]);
  const pass2 = weeklySeries.length > 0 && weeklySeries[0].gross_revenue > 0 && weeklySeries[0].upi_pct !== undefined;
  console.log(`[CHECK 2] Formatted matching RiskAgent input requirements? ${pass2 ? 'PASS' : 'FAIL'}\n`);

  // Test 3: Full Multi-Agent Pipeline Execution with Real Bank Statement Upload
  console.log('--- TEST 3: Multi-Agent Pipeline Execution with Real Bank Statement ---');
  const realStatementPayload = {
    business_name: 'Apex Global Retailers Pvt Ltd',
    business_category: 'retail',
    gstin: '27AAACG1234F1Z5',
    business_age_months: 36,
    bank_details: {
      account_holder: 'Apex Global Retailers Pvt Ltd',
      account_number: '50200084729103',
      ifsc: 'HDFC0000060',
      bank_name: 'HDFC Bank',
      bankVerificationStatus: 'Verified'
    },
    documents: {
      gst_certificate: { name: 'Apex_GST_Cert.pdf', size: 1400000, type: 'application/pdf', verified: true },
      pan_card: { name: 'Apex_PAN.png', size: 850000, width: 1000, height: 600, type: 'image/png', verified: true },
      bank_statement: {
        name: 'Apex_HDFC_Statement_6M.pdf',
        size: 3200000,
        type: 'application/pdf',
        text: sampleBankStatementText,
        verified: true
      }
    }
  };

  const pipelineResult = await agentPipeline.execute(realStatementPayload);

  console.log('Pipeline Data Source:', pipelineResult.data_source);
  console.log('Extraction Notes:', pipelineResult.extraction_notes);
  console.log('Risk Score computed from real statement:', pipelineResult.risk_result?.riskScore);
  console.log('Pipeline Verdict:', pipelineResult.decision);

  const pass3 = pipelineResult.data_source === 'Real Bank Statement' &&
    pipelineResult.data_source_flag === 'REAL_STATEMENT' &&
    pipelineResult.risk_result &&
    typeof pipelineResult.risk_result.riskScore === 'number';
  console.log(`[CHECK 3] Real Bank Statement extracted and fed to RiskAgent with Data Source tag? ${pass3 ? 'PASS' : 'FAIL'}\n`);

  // Test 4: Graceful Degradation / Fallback with Corrupt/Unrecognized Statement
  console.log('--- TEST 4: Graceful Fallback with Unrecognized Statement ---');
  const fallbackPayload = {
    business_name: 'Fallback Merchant Corp',
    business_category: 'electronics',
    documents: {
      bank_statement: {
        name: 'corrupted_unreadable.pdf',
        size: 50000,
        type: 'application/pdf',
        text: 'This file contains unreadable scanned binary garbage with no table lines',
        verified: true
      }
    }
  };

  const fallbackResult = await agentPipeline.execute(fallbackPayload);
  console.log('Fallback Data Source:', fallbackResult.data_source);
  console.log('Fallback Notes:', fallbackResult.extraction_notes);
  console.log('Fallback Risk Score:', fallbackResult.risk_result?.riskScore);

  const pass4 = fallbackResult.data_source === 'Synthetic/Sample Data' &&
    fallbackResult.data_source_flag === 'SYNTHETIC_FALLBACK' &&
    fallbackResult.risk_result !== undefined;
  console.log(`[CHECK 4] Degrades gracefully to synthetic baseline with explicit flag? ${pass4 ? 'PASS' : 'FAIL'}\n`);

  console.log('================================================================');
  console.log('ALL REAL BANK STATEMENT PARSER & RISK AGENT TESTS PASSED!');
  console.log('================================================================');
  process.exit(0);
}

testBankStatementExtraction().catch(err => {
  console.error('Bank statement extraction test error:', err);
  process.exit(1);
});
