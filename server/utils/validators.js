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
  const { name, email, password, role } = data;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters.');
  }

  if (!validateEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }

  if (role && !['underwriter', 'admin', 'risk_officer', 'viewer'].includes(role)) {
    errors.push('Role must be one of: underwriter, admin, risk_officer, viewer.');
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
