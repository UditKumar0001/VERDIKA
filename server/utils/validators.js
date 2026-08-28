/**
 * Input Validation Utility
 * Contains validation helpers for user inputs, loan applications, and agent payloads.
 */

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const validateApplicationInput = (data) => {
  // Placeholder application validator
  const errors = [];
  if (!data.applicantName) errors.push('Applicant name is required');
  if (!data.requestedAmount || isNaN(data.requestedAmount)) errors.push('Valid requested amount is required');
  return {
    isValid: errors.length === 0,
    errors
  };
};
