import { validateGSTIN, calculateGSTINChecksum, GSTIN_REGEX } from './utils/validators.js';

console.log('================================================================');
console.log('TESTING GSTIN FORMAT & MOD-36 CHECKSUM VALIDATOR');
console.log('================================================================\n');

// 1. Test Real / Valid GSTINs
console.log('--- TEST 1: Real Corporate & Institutional GSTINs ---');
const validCases = [
  { gstin: '27AAACT2727Q1ZW', entity: 'Tata Motors Limited (Maharashtra)' },
  { gstin: '27AAACR5055K1Z7', entity: 'Reliance Industries Limited (Unit 1)' },
  { gstin: '27AAACR5055K2Z6', entity: 'Reliance Industries Limited (Unit 2)' },
  { gstin: '27AAACR5055K3Z5', entity: 'Reliance Industries Limited (Unit 3)' },
  { gstin: '27AAACG1234F1Z4', entity: 'Verdika Demo Merchant (Auto-Approve)' },
  { gstin: '27AABCM5678H1Z5', entity: 'Verdika Demo Merchant (Auto-Reject)' },
  { gstin: '27AABCK9012K1ZG', entity: 'Verdika Demo Merchant (Route-To-Human)' }
];

validCases.forEach(({ gstin, entity }) => {
  const res = validateGSTIN(gstin);
  console.log(`[PASS] ${gstin} (${entity}) -> Valid: ${res.valid}`);
  if (!res.valid) {
    throw new Error(`Expected ${gstin} to be valid, got error: ${res.error}`);
  }
});

// 2. Test Checksum Calculation Accuracy
console.log('\n--- TEST 2: Checksum Function Consistency ---');
validCases.forEach(({ gstin }) => {
  const first14 = gstin.slice(0, 14);
  const expectedChar = gstin[14];
  const calculatedChar = calculateGSTINChecksum(first14);
  console.log(`First 14: ${first14} -> Expected: ${expectedChar} | Calculated: ${calculatedChar} [Match: ${expectedChar === calculatedChar}]`);
  if (expectedChar !== calculatedChar) {
    throw new Error(`Checksum mismatch for ${first14}: expected ${expectedChar}, got ${calculatedChar}`);
  }
});

// 3. Test Checksum Failure Detection (Well-formed format, wrong 15th character)
console.log('\n--- TEST 3: Checksum Failure Rejection ---');
const checksumFailCases = [
  '27AAACT2727Q1ZX', // Expected 'W', got 'X'
  '27AAACR5055K1Z8', // Expected '7', got '8'
  '27AAACG1234F1Z5', // Expected '4', got '5'
  '27AABCM5678H1Z1', // Expected '5', got '1'
  '27AABCK9012K1Z8'  // Expected 'G', got '8'
];

checksumFailCases.forEach((gstin) => {
  const res = validateGSTIN(gstin);
  console.log(`GSTIN: ${gstin} -> Error: "${res.error}" (Reason: ${res.reason})`);
  if (res.valid || res.error !== 'GSTIN checksum failed') {
    throw new Error(`Expected ${gstin} to fail with 'GSTIN checksum failed', got valid=${res.valid}, error=${res.error}`);
  }
});

// 4. Test Format & Regex Rejection
console.log('\n--- TEST 4: Format & Regex Pattern Rejection ---');
const formatFailCases = [
  { gstin: '', expected: 'GSTIN is required' },
  { gstin: '27AAACT2727', expected: 'Invalid GSTIN format' }, // Too short
  { gstin: '27AAACT2727Q1ZW999', expected: 'Invalid GSTIN format' }, // Too long
  { gstin: '00AAACT2727Q1ZW', expected: 'Invalid GSTIN format' }, // Invalid state code 00
  { gstin: '2712345678Q1ZW', expected: 'Invalid GSTIN format' }, // Numbers instead of PAN alpha
  { gstin: '27AAACT2727Q1AW', expected: 'Invalid GSTIN format' }, // Character 14 is 'A' instead of 'Z'
  { gstin: '27AAACT2727Q#ZW', expected: 'Invalid GSTIN format' }  // Special char
];

formatFailCases.forEach(({ gstin, expected }) => {
  const res = validateGSTIN(gstin);
  console.log(`Input: "${gstin}" -> Error: "${res.error}"`);
  if (res.valid || res.error !== expected) {
    throw new Error(`Expected input "${gstin}" to fail with "${expected}", got: ${res.error}`);
  }
});

console.log('\n================================================================');
console.log('🎉 ALL GSTIN FORMAT & MOD-36 CHECKSUM TESTS PASSED PERFECTLY!');
console.log('================================================================\n');
