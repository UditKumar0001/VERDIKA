/**
 * Input Validation Utility
 * Contains validation helpers for user inputs, loan applications, and agent payloads.
 */

export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim().toLowerCase());
};

export const validateSignupInput = (data = {}) => {
  const errors = [];
  const { name, company_name, email, password, role } = data;
  const primaryName = name || company_name;

  if (!primaryName || typeof primaryName !== 'string' || primaryName.trim().length < 2) {
    errors.push('Full name or Company name must be at least 2 characters.');
  }

  if (!validateEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }

  if (role && !['underwriter', 'admin', 'risk_officer', 'viewer', 'merchant', 'finance_company'].includes(role)) {
    errors.push('Role must be one of: merchant, underwriter, admin, risk_officer, viewer, finance_company.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateLoginInput = (data = {}) => {
  const errors = [];
  const { email, password } = data;

  if (!validateEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateApplicationInput = (data = {}) => {
  const errors = [];

  if (!data.applicantName || typeof data.applicantName !== 'string' || data.applicantName.trim().length < 2) {
    errors.push('Applicant business/entity name is required.');
  }

  const requestedAmount = Number(data.requestedAmount);
  if (isNaN(requestedAmount) || requestedAmount <= 0) {
    errors.push('Requested amount must be a positive number.');
  }

  const creditScore = Number(data.creditScore);
  if (isNaN(creditScore) || creditScore < 300 || creditScore > 850) {
    errors.push('Credit score must be a number between 300 and 850.');
  }

  const annualRevenue = Number(data.annualRevenue);
  if (isNaN(annualRevenue) || annualRevenue < 0) {
    errors.push('Annual revenue must be a non-negative number.');
  }

  if (data.debtToIncome !== undefined && data.debtToIncome !== null) {
    const dti = Number(data.debtToIncome);
    if (isNaN(dti) || dti < 0 || dti > 2) {
      errors.push('Debt-to-income ratio must be a decimal between 0.0 and 2.0.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * GSTIN Format & Mod-36 Checksum Validator
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const CODE_POINT_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const calculateGSTINChecksum = (gstin14) => {
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
};

export const validateGSTIN = (rawGstin) => {
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
      reason: `GSTIN must be exactly 15 characters (received ${clean.length})`
    };
  }

  // 2. Standard Regex pattern enforcement
  if (!GSTIN_REGEX.test(clean)) {
    return {
      valid: false,
      error: 'Invalid GSTIN format',
      reason: 'GSTIN pattern does not match standard 15-character specification'
    };
  }

  // 3. State Code Check (01-38, 97, 99)
  const stateCode = parseInt(clean.slice(0, 2), 10);
  if (isNaN(stateCode) || stateCode < 1 || (stateCode > 38 && stateCode !== 97 && stateCode !== 99)) {
    return {
      valid: false,
      error: 'Invalid GSTIN format',
      reason: `State code '${clean.slice(0, 2)}' is outside valid jurisdiction codes (01-38, 97)`
    };
  }

  // 4. Mod-36 Checksum Verification
  const expectedChecksum = calculateGSTINChecksum(clean.slice(0, 14));
  const actualChecksum = clean[14];

  if (!expectedChecksum || actualChecksum !== expectedChecksum) {
    return {
      valid: false,
      error: 'GSTIN checksum failed',
      reason: `Checksum digit mismatch (expected '${expectedChecksum}', got '${actualChecksum}')`,
      expectedChecksum,
      actualChecksum
    };
  }

  return {
    valid: true,
    gstin: clean,
    stateCode: clean.slice(0, 2),
    pan: clean.slice(2, 12),
    entityCode: clean[12],
    checksum: actualChecksum
  };
};
