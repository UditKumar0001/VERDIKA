/**
 * GSTIN Format & Mod-36 Checksum Validator
 * 
 * Enforces official Indian GSTIN structure:
 *  - 2-digit state code (01 - 38, 97)
 *  - 10-character PAN (5 alpha, 4 numeric, 1 alpha)
 *  - 1 entity code (1-9 or A-Z)
 *  - 1 default character 'Z'
 *  - 1 checksum character (Mod-36 algorithm)
 */

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const CODE_POINT_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const GSTIN_STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction'
};

/**
 * Calculates the official 15th checksum character using Mod-36 algorithm.
 * @param {string} gstin14 - First 14 characters of the GSTIN
 * @returns {string} 15th checksum character (0-9 or A-Z)
 */
export function calculateGSTINChecksum(gstin14) {
  if (!gstin14 || gstin14.length < 14) return null;
  const clean = gstin14.slice(0, 14).toUpperCase();
  const mod = 36;
  let total = 0;
  let factor = 1;

  for (let i = 0; i < 14; i++) {
    const char = clean[i];
    const codePoint = CODE_POINT_CHARS.indexOf(char);
    if (codePoint === -1) return null;

    let digit = codePoint * factor;
    digit = Math.floor(digit / mod) + (digit % mod);
    total += digit;

    factor = factor === 1 ? 2 : 1;
  }

  const remainder = total % mod;
  const checkCode = (mod - remainder) % mod;
  return CODE_POINT_CHARS[checkCode];
}

/**
 * Validates GSTIN format and Mod-36 checksum.
 * @param {string} rawGstin - Input GSTIN to validate
 * @returns {{ valid: boolean, error?: string, details?: object }}
 */
export function validateGSTIN(rawGstin) {
  if (!rawGstin || typeof rawGstin !== 'string') {
    return {
      valid: false,
      error: 'GSTIN is required'
    };
  }

  const clean = rawGstin.trim().toUpperCase();

  // 1. Length check
  if (clean.length !== 15) {
    return {
      valid: false,
      error: 'Invalid GSTIN format',
      reason: `GSTIN must be exactly 15 characters (currently ${clean.length})`
    };
  }

  // 2. Standard Regex pattern enforcement
  if (!GSTIN_REGEX.test(clean)) {
    return {
      valid: false,
      error: 'Invalid GSTIN format',
      reason: 'Does not match standard 15-character GSTIN structure (2-digit state + 10-char PAN + 1 entity + Z + checksum)'
    };
  }

  // 3. State Code Validation
  const stateCode = clean.slice(0, 2);
  const stateName = GSTIN_STATE_CODES[stateCode];
  if (!stateName) {
    return {
      valid: false,
      error: 'Invalid GSTIN format',
      reason: `Invalid state code '${stateCode}'. Valid codes range between 01 and 38.`
    };
  }

  // 4. Mod-36 Checksum Verification
  const expectedChecksum = calculateGSTINChecksum(clean.slice(0, 14));
  const actualChecksum = clean[14];

  if (!expectedChecksum || actualChecksum !== expectedChecksum) {
    return {
      valid: false,
      error: 'GSTIN checksum failed',
      reason: `Checksum character mismatch (expected '${expectedChecksum}', got '${actualChecksum}')`,
      expectedChecksum,
      actualChecksum
    };
  }

  return {
    valid: true,
    gstin: clean,
    stateCode,
    stateName,
    pan: clean.slice(2, 12),
    entityCode: clean[12],
    checksum: actualChecksum
  };
}
