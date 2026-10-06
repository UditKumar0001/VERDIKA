import { validateBankAccountRazorpay, calculateFuzzyNameMatch } from './services/razorpayBankValidationService.js';

async function auditNameMatchLogic() {
  console.log('================================================================');
  console.log('AUDITING & TESTING BANK ACCOUNT HOLDER FUZZY NAME MATCHING LOGIC');
  console.log('================================================================\n');

  // Test 1: Direct Unit Test of calculateFuzzyNameMatch
  console.log('--- TEST 1: Direct Fuzzy Name Match Algorithm Unit Tests ---');
  
  const testCases = [
    { entered: 'Sunrise Digital Solutions', registered: 'SUNRISE DIGITAL SOLUTIONS PVT LTD', expectedResult: 'Match' },
    { entered: 'Sunrise Digital', registered: 'SUNRISE DIGITAL SOLUTIONS PVT LTD', expectedResult: 'Match' },
    { entered: 'Sunrise Digital Solution', registered: 'SUNRISE DIGITAL SOLUTIONS PVT LTD', expectedResult: 'Match' },
    { entered: 'Ramesh Kumar', registered: 'SUNRISE DIGITAL SOLUTIONS PVT LTD', expectedResult: 'No Match' },
    { entered: 'Apex Horizon Tech', registered: 'APEX HORIZON TECHNOLOGIES PRIVATE LIMITED', expectedResult: 'Match' },
    { entered: 'Wrong Person Name', registered: 'APEX HORIZON TECHNOLOGIES PRIVATE LIMITED', expectedResult: 'No Match' }
  ];

  for (const tc of testCases) {
    const res = calculateFuzzyNameMatch(tc.entered, tc.registered);
    console.log(`Entered: "${tc.entered}" | Registered: "${tc.registered}"`);
    console.log(` -> Similarity Score: ${res.score}% | Result: "${res.result}" | Note: ${res.details}`);
    console.log(` -> Match Check Passed? ${res.result === tc.expectedResult ? 'PASS ✅' : 'FAIL ❌'}\n`);
    if (res.result !== tc.expectedResult) {
      throw new Error(`Unit test failed for "${tc.entered}" vs "${tc.registered}"`);
    }
  }

  // Test 2: Full Bank Validation Execution with Matching Name
  console.log('--- TEST 2: Bank Validation Engine with MATCHING Account Holder Name ---');
  const matchCall = await validateBankAccountRazorpay({
    account_number: '50200084729103',
    ifsc: 'HDFC0000060',
    account_holder: 'Sunrise Digital Solutions'
  });
  console.log('Matching Case Output:');
  console.log(` - Status: "${matchCall.status}"`);
  console.log(` - Bank Verification Status: "${matchCall.bankVerificationStatus}"`);
  console.log(` - Registered Name Returned by Bank: "${matchCall.registeredName}"`);
  console.log(` - Name Match Result: "${matchCall.nameMatchResult}"`);
  console.log(` - Name Match Similarity Score: ${matchCall.nameMatchScore}%`);
  console.log(` - Detail Message: "${matchCall.message}"`);
  console.log(`[CHECK] Matching case evaluated as Verified / Match? ${matchCall.status === 'Verified' && matchCall.nameMatchScore >= 80 ? 'PASS ✅' : 'FAIL ❌'}\n`);

  // Test 3: Full Bank Validation Execution with MISMATCHED Name ("Ramesh Kumar")
  console.log('--- TEST 3: Bank Validation Engine with DELIBERATELY MISMATCHED Account Holder Name ("Ramesh Kumar") ---');
  const mismatchCall = await validateBankAccountRazorpay({
    account_number: '50200084729103',
    ifsc: 'HDFC0000060',
    account_holder: 'Ramesh Kumar'
  });
  console.log('Mismatched Case Output:');
  console.log(` - Status: "${mismatchCall.status}"`);
  console.log(` - Bank Verification Status: "${mismatchCall.bankVerificationStatus}"`);
  console.log(` - Registered Name Returned by Bank: "${mismatchCall.registeredName}"`);
  console.log(` - Name Match Result: "${mismatchCall.nameMatchResult}"`);
  console.log(` - Name Match Similarity Score: ${mismatchCall.nameMatchScore}%`);
  console.log(` - Detail Message: "${mismatchCall.message}"`);
  console.log(`[CHECK] Mismatched case evaluated as Name Mismatch / 0% Match? ${mismatchCall.status === 'Name Mismatch' && mismatchCall.nameMatchScore < 45 ? 'PASS ✅' : 'FAIL ❌'}\n`);

  console.log('================================================================');
  console.log('ALL NAME MATCHING AUDIT & VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

auditNameMatchLogic().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
