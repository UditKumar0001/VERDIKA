import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyPanCardOCR, verifyGstCertificateOCR, performDocOCR } from './services/ocrVerificationService.js';
import { DocumentVerificationAgent } from './agents/DocumentVerificationAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a valid minimal PDF buffer containing UNRELATED document content (e.g., an Utility Bill / Bank Statement)
function createUnrelatedPdfBuffer() {
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 260 >>
stream
BT
/F1 12 Tf
50 700 Td
(ELECTRICITY UTILITY BILL - MAHARASHTRA STATE ELECTRICITY BOARD) Tj
0 -20 Td
(BILL NUMBER: MSEB-2026-981247) Tj
0 -20 Td
(CONSUMER NAME: RAJESH SHARMA) Tj
0 -20 Td
(BILL AMOUNT DUE: INR 4,250.00) Tj
0 -20 Td
(DUE DATE: 15/10/2026) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000235 00000 n 
0000000303 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
615
%%EOF`;
  return Buffer.from(pdfString, 'utf-8');
}

// Create a valid PDF buffer containing a DIFFERENT/MISMATCHED PAN Card
function createMismatchedPanPdfBuffer() {
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 280 >>
stream
BT
/F1 12 Tf
50 700 Td
(INCOME TAX DEPARTMENT - GOVT OF INDIA) Tj
0 -20 Td
(PERMANENT ACCOUNT NUMBER CARD) Tj
0 -20 Td
(NAME: UNRELATED MERCHANT PRIVATE LIMITED) Tj
0 -20 Td
(PAN NUMBER: WRONG9999Z) Tj
0 -20 Td
(DATE OF INCORPORATION: 10/10/2015) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000235 00000 n 
0000000303 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
635
%%EOF`;
  return Buffer.from(pdfString, 'utf-8');
}

async function runMismatchTest() {
  console.log('================================================================');
  console.log('TESTING OCR FAKE / MISMATCHED DOCUMENT GATING WORKFLOW');
  console.log('================================================================\n');

  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 1. Write unrelated PDF file to disk (simulating Multer upload of a random Electricity Bill as PAN card)
  const unrelatedPdfPath = path.join(uploadsDir, 'unrelated_bill_as_pan.pdf');
  fs.writeFileSync(unrelatedPdfPath, createUnrelatedPdfBuffer());

  // 2. Write mismatched PAN PDF file to disk (simulating Multer upload of a PAN card belonging to a different entity WRONG9999Z)
  const mismatchedPanPdfPath = path.join(uploadsDir, 'different_pan_as_pan.pdf');
  fs.writeFileSync(mismatchedPanPdfPath, createMismatchedPanPdfBuffer());

  const formData = {
    business_name: 'Sunrise Digital Solutions',
    gstin: '27AAACG1234F1Z4',
    pan: 'AAACG1234F' // Expected PAN is AAACG1234F
  };

  console.log('--- TEST CASE A: Uploading an Unrelated PDF (Electricity Bill) as PAN Card ---');
  const unrelatedDocObj = {
    name: 'unrelated_bill_as_pan.pdf',
    path: unrelatedPdfPath,
    type: 'application/pdf'
  };

  const ocrResA = await performDocOCR(unrelatedDocObj, 'pan_card', formData);
  console.log('\n[OCR Extracted Content for Test A]:');
  console.log(` - Extracted Raw Text:\n"${ocrResA.text}"`);
  console.log(` - OCR Confidence Score: ${ocrResA.confidence}%`);
  console.log(` - Extraction Method: ${ocrResA.method}`);

  const verResA = await verifyPanCardOCR(unrelatedDocObj, formData);
  console.log('\n[Cross-Verification Result for Test A]:');
  console.log(` - Status Badge: "${verResA.status}"`);
  console.log(` - OCR Extracted Value: "${verResA.ocrExtractedValue}"`);
  console.log(` - Match Result Note: "${verResA.matchResult}"`);
  console.log(` - Is Verified Match? ${verResA.verifiedMatch}`);
  console.log(`[CHECK] Test A correctly returned 'OCR Inconclusive'? ${verResA.status === 'OCR Inconclusive' ? 'PASS ✅' : 'FAIL ❌'}\n`);


  console.log('--- TEST CASE B: Uploading a Mismatched PAN Card PDF (WRONG9999Z instead of AAACG1234F) ---');
  const mismatchedDocObj = {
    name: 'different_pan_as_pan.pdf',
    path: mismatchedPanPdfPath,
    type: 'application/pdf'
  };

  const ocrResB = await performDocOCR(mismatchedDocObj, 'pan_card', formData);
  console.log('\n[OCR Extracted Content for Test B]:');
  console.log(` - Extracted Raw Text:\n"${ocrResB.text}"`);
  console.log(` - OCR Confidence Score: ${ocrResB.confidence}%`);
  console.log(` - Extraction Method: ${ocrResB.method}`);

  const verResB = await verifyPanCardOCR(mismatchedDocObj, formData);
  console.log('\n[Cross-Verification Result for Test B]:');
  console.log(` - Status Badge: "${verResB.status}"`);
  console.log(` - OCR Extracted Value: "${verResB.ocrExtractedValue}"`);
  console.log(` - Match Result Note: "${verResB.matchResult}"`);
  console.log(` - Is Mismatch Detected? ${verResB.mismatchDetected}`);
  console.log(`[CHECK] Test B correctly returned 'Mismatch Detected'? ${verResB.status === 'Mismatch Detected' ? 'PASS ✅' : 'FAIL ❌'}\n`);

  console.log('--- TEST CASE C: Running DocumentVerificationAgent with Mismatched Documents ---');
  const agent = new DocumentVerificationAgent();
  const agentResult = await agent.run({
    ...formData,
    bank_details: {
      account_holder: 'Sunrise Digital Solutions',
      account_number: '50200084729103',
      ifsc: 'HDFC0000060',
      bank_name: 'HDFC Bank',
      bank_verification: { status: 'Verified' }
    },
    documents: {
      pan_card: mismatchedDocObj,
      gst_certificate: null,
      bank_statement: { name: 'Bank_Statement.pdf', verified: true }
    }
  });

  console.log('\n[DocumentVerificationAgent Output]:');
  console.log(` - Overall Agent Status: "${agentResult.status}"`);
  console.log(` - PAN Document Status: "${agentResult.documentStatuses?.pan_card?.status}"`);
  console.log(` - Reason Codes:`, agentResult.reasonCodes.map(r => r.code));
  console.log(`[CHECK] Agent flagged PAN mismatch? ${agentResult.documentStatuses?.pan_card?.status === 'Mismatch Detected' ? 'PASS ✅' : 'FAIL ❌'}\n`);

  console.log('================================================================');
  console.log('ALL FAKE / MISMATCHED DOCUMENT OCR GATING TESTS COMPLETED!');
  console.log('================================================================');
}

runMismatchTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
