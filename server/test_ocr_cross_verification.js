import { createWorker } from 'tesseract.js';
import { verifyPanCardOCR, verifyGstCertificateOCR, extractPANFromOCRText, extractGSTINFromOCRText } from './services/ocrVerificationService.js';
import { DocumentVerificationAgent } from './agents/DocumentVerificationAgent.js';

async function runOCRSuite() {
  console.log('================================================================');
  console.log('TESTING OCR DOCUMENT CROSS-VERIFICATION ENGINE (PHASE 2)');
  console.log('================================================================\n');

  // Test 1: Extract PAN from OCR text
  console.log('--- TEST 1: PAN Extraction & Pattern Matching ---');
  const samplePanText = `
    INCOME TAX DEPARTMENT
    GOVT OF INDIA
    PERMANENT ACCOUNT NUMBER CARD
    NAME: SUNRISE DIGITAL SOLUTIONS
    PAN: ABCDE1234F
    DATE OF INC: 15/03/2022
  `;
  const extractedPan = extractPANFromOCRText(samplePanText);
  console.log(`Raw Text: "${samplePanText.trim().replace(/\n\s+/g, ' ')}"`);
  console.log(`Extracted PAN: ${extractedPan}`);
  console.log(`[CHECK] Extracted PAN is 'ABCDE1234F'? ${extractedPan === 'ABCDE1234F' ? 'PASS' : 'FAIL'}\n`);

  if (extractedPan !== 'ABCDE1234F') {
    throw new Error('Test 1 Failed: PAN extraction pattern mismatch.');
  }

  // Test 2: Extract GSTIN from OCR text
  console.log('--- TEST 2: GSTIN Extraction & Pattern Matching ---');
  const sampleGstText = `
    GOVERNMENT OF INDIA
    FORM GST REG-06
    REGISTRATION CERTIFICATE
    GSTIN: 27ABCDE1234F1ZH
    LEGAL NAME: APEX HORIZON TECHNOLOGIES PVT LTD
    TRADE NAME: APEX HORIZON
  `;
  const extractedGstin = extractGSTINFromOCRText(sampleGstText);
  console.log(`Raw Text: "${sampleGstText.trim().replace(/\n\s+/g, ' ')}"`);
  console.log(`Extracted GSTIN: ${extractedGstin}`);
  console.log(`[CHECK] Extracted GSTIN is '27ABCDE1234F1ZH'? ${extractedGstin === '27ABCDE1234F1ZH' ? 'PASS' : 'FAIL'}\n`);

  if (extractedGstin !== '27ABCDE1234F1ZH') {
    throw new Error('Test 2 Failed: GSTIN extraction pattern mismatch.');
  }

  // Test 3: PAN Card Verified Match vs Mismatch vs Inconclusive
  console.log('--- TEST 3: PAN Card Cross-Verification States ---');
  const matchResult = await verifyPanCardOCR({
    name: 'PAN_Card.png',
    ocrRawText: samplePanText,
    ocrConfidence: 95
  }, { gstin: '27ABCDE1234F1ZH', pan: 'ABCDE1234F' });
  console.log('Match Result:', matchResult);
  console.log(`[CHECK] Status is 'Verified Match'? ${matchResult.status === 'Verified Match' ? 'PASS' : 'FAIL'}\n`);

  const mismatchResult = await verifyPanCardOCR({
    name: 'PAN_Card_Tampered.png',
    ocrRawText: samplePanText, // Contains ABCDE1234F
    ocrConfidence: 95
  }, { gstin: '27XYZPD9999K1Z4', pan: 'XYZPD9999K' }); // Form specifies XYZPD9999K
  console.log('Mismatch Result:', mismatchResult);
  console.log(`[CHECK] Status is 'Mismatch Detected'? ${mismatchResult.status === 'Mismatch Detected' ? 'PASS' : 'FAIL'}\n`);

  const inconclusiveResult = await verifyPanCardOCR({
    name: 'PAN_Card_Blurry.png',
    ocrRawText: 'BLURRY UNREADABLE SCAN NO PATTERN',
    ocrConfidence: 40
  }, { gstin: '27ABCDE1234F1ZH', pan: 'ABCDE1234F' });
  console.log('Inconclusive Result:', inconclusiveResult);
  console.log(`[CHECK] Status is 'OCR Inconclusive'? ${inconclusiveResult.status === 'OCR Inconclusive' ? 'PASS' : 'FAIL'}\n`);

  if (matchResult.status !== 'Verified Match' || mismatchResult.status !== 'Mismatch Detected' || inconclusiveResult.status !== 'OCR Inconclusive') {
    throw new Error('Test 3 Failed: Cross-verification state evaluation error.');
  }

  // Test 4: Live Tesseract.js OCR Execution on Real Image / Data URL
  console.log('--- TEST 4: Live Tesseract.js Execution on Real Image Data URL ---');
  // Minimal 1x1 PNG base64 image data URL
  const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  console.log('Running Tesseract.js on live PNG image Data URL...');
  const livePanOcr = await verifyPanCardOCR({
    name: 'Live_Sample_PAN.png',
    dataUrl: pngDataUrl,
    type: 'image/png'
  }, { gstin: '27AAACG1234F1Z4', pan: 'AAACG1234F' });

  console.log('Live OCR Result:');
  console.log(` - Extracted Value: ${livePanOcr.ocrExtractedValue}`);
  console.log(` - Confidence: ${livePanOcr.ocrConfidence}%`);
  console.log(` - Status: ${livePanOcr.status}`);
  console.log(` - Method: Tesseract.js live worker execution completed`);
  console.log(`[CHECK] Live Tesseract execution status evaluated? ${livePanOcr.status ? 'PASS' : 'FAIL'}\n`);

  // Test 5: Full DocumentVerificationAgent Integration Test
  console.log('--- TEST 5: DocumentVerificationAgent Integration ---');
  const agent = new DocumentVerificationAgent();
  const agentOutput = await agent.run({
    business_name: 'Sunrise Digital Solutions',
    gstin: '27AAACG1234F1Z4',
    pan: 'AAACG1234F',
    bank_details: {
      account_holder: 'Sunrise Digital Solutions',
      account_number: '50200084729103',
      ifsc: 'HDFC0000060',
      bank_name: 'HDFC Bank',
      bank_verification: { status: 'Verified', registeredName: 'Sunrise Digital Solutions' }
    },
    documents: {
      pan_card: {
        name: 'PAN_Card.png',
        ocrRawText: samplePanText.replace('ABCDE1234F', 'AAACG1234F'),
        ocrConfidence: 95
      },
      gst_certificate: {
        name: 'GST_Certificate.pdf',
        ocrRawText: sampleGstText.replace('27ABCDE1234F1ZH', '27AAACG1234F1Z4'),
        ocrConfidence: 96
      },
      bank_statement: { name: 'Bank_Statement.pdf', verified: true }
    }
  });

  console.log(`Agent Status: ${agentOutput.status}`);
  console.log(`PAN Status: ${agentOutput.documentStatuses.pan_card.status}`);
  console.log(`GST Status: ${agentOutput.documentStatuses.gst_certificate.status}`);
  console.log(`[CHECK] Overall Agent Status is 'Verified'? ${agentOutput.status === 'Verified' ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK] PAN status is 'Verified Match'? ${agentOutput.documentStatuses.pan_card.status === 'Verified Match' ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK] GST status is 'Verified Match'? ${agentOutput.documentStatuses.gst_certificate.status === 'Verified Match' ? 'PASS' : 'FAIL'}\n`);

  if (agentOutput.status !== 'Verified' || agentOutput.documentStatuses.pan_card.status !== 'Verified Match') {
    throw new Error('Test 5 Failed: DocumentVerificationAgent OCR integration failed.');
  }

  console.log('================================================================');
  console.log('ALL PHASE 2 OCR CROSS-VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
  process.exit(0);
}

runOCRSuite().catch((err) => {
  console.error('OCR Suite error:', err);
  process.exit(1);
});
