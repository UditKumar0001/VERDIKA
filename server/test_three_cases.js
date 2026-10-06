import { validateBankAccountRazorpay } from './services/razorpayBankValidationService.js';
import dotenv from 'dotenv';

dotenv.config();

async function runThreeCasesTest() {
  console.log('========================================================================');
  console.log('RAZORPAY FUND ACCOUNT VALIDATION - REAL API VERIFICATION TEST');
  console.log('========================================================================\n');

  // Case (a): Valid Razorpay test account with matching name
  console.log('------------------------------------------------------------------------');
  console.log('CASE (a): Valid Razorpay Test Account with Matching Name');
  console.log('Input: account_number = "7878787878787878", ifsc = "HDFC0000060", account_holder = "Sunrise Digital Solutions Pvt Ltd"');
  console.log('------------------------------------------------------------------------');
  const resA = await validateBankAccountRazorpay({
    account_number: '7878787878787878',
    ifsc: 'HDFC0000060',
    account_holder: 'Sunrise Digital Solutions Pvt Ltd'
  });
  console.log('\n[RESULT CASE A]:');
  console.log(JSON.stringify({
    status: resA.status,
    bankVerificationStatus: resA.bankVerificationStatus,
    nameMatchResult: resA.nameMatchResult,
    nameMatchScore: resA.nameMatchScore,
    registeredName: resA.registeredName,
    contactId: resA.contactId,
    fundAccountId: resA.fundAccountId,
    message: resA.message,
    environment: resA.environment
  }, null, 2));
  console.log('\n[RAW RAZORPAY API REQUEST / RESPONSE - CASE A]:');
  console.log(JSON.stringify(resA.rawResponse, null, 2));


  // Case (b): Same account number with deliberately wrong name
  console.log('\n\n------------------------------------------------------------------------');
  console.log('CASE (b): Valid Razorpay Test Account with Deliberately Wrong Name');
  console.log('Input: account_number = "7878787878787878", ifsc = "HDFC0000060", account_holder = "Completely Wrong Fake Name LLC"');
  console.log('------------------------------------------------------------------------');
  const resB = await validateBankAccountRazorpay({
    account_number: '7878787878787878',
    ifsc: 'HDFC0000060',
    account_holder: 'Completely Wrong Fake Name LLC'
  });
  console.log('\n[RESULT CASE B]:');
  console.log(JSON.stringify({
    status: resB.status,
    bankVerificationStatus: resB.bankVerificationStatus,
    nameMatchResult: resB.nameMatchResult,
    nameMatchScore: resB.nameMatchScore,
    registeredName: resB.registeredName,
    contactId: resB.contactId,
    fundAccountId: resB.fundAccountId,
    message: resB.message,
    environment: resB.environment
  }, null, 2));
  console.log('\n[RAW RAZORPAY API REQUEST / RESPONSE - CASE B]:');
  console.log(JSON.stringify(resB.rawResponse, null, 2));


  // Case (c): Completely fake / random account number
  console.log('\n\n------------------------------------------------------------------------');
  console.log('CASE (c): Completely Fake / Random Account Number');
  console.log('Input: account_number = "98765432109876", ifsc = "HDFC0000060", account_holder = "Sunrise Digital Solutions Pvt Ltd"');
  console.log('------------------------------------------------------------------------');
  const resC = await validateBankAccountRazorpay({
    account_number: '98765432109876',
    ifsc: 'HDFC0000060',
    account_holder: 'Sunrise Digital Solutions Pvt Ltd'
  });
  console.log('\n[RESULT CASE C]:');
  console.log(JSON.stringify({
    status: resC.status,
    bankVerificationStatus: resC.bankVerificationStatus,
    nameMatchResult: resC.nameMatchResult,
    nameMatchScore: resC.nameMatchScore,
    registeredName: resC.registeredName,
    contactId: resC.contactId,
    fundAccountId: resC.fundAccountId,
    message: resC.message,
    environment: resC.environment
  }, null, 2));
  console.log('\n[RAW RAZORPAY API REQUEST / RESPONSE - CASE C]:');
  console.log(JSON.stringify(resC.rawResponse, null, 2));

  console.log('\n\n========================================================================');
  console.log('SUMMARY EVALUATION:');
  console.log(`Case (a) status is 'Verified' with score >= 80%? ${resA.status === 'Verified' && resA.nameMatchScore >= 80 ? 'YES (PASS)' : 'NO (FAIL)'}`);
  console.log(`Case (b) DOES NOT show 'Verified' or '100% Match'? ${resB.status !== 'Verified' && resB.nameMatchScore < 80 ? 'YES (PASS)' : 'NO (FAIL)'}`);
  console.log(`Case (c) DOES NOT show 'Verified' or '100% Match'? ${resC.status !== 'Verified' && resC.nameMatchScore < 80 ? 'YES (PASS)' : 'NO (FAIL)'}`);
  console.log('========================================================================\n');
}

runThreeCasesTest().catch(console.error);
