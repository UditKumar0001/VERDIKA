/**
 * Company API Client
 * Wraps fetch calls to company endpoints using httpOnly cookies (credentials: 'include').
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Public lookup of finance company details by slug
 * @param {string} slug 
 * @returns {Promise<Object>} Company details
 */
export async function lookupCompanyBySlug(slug) {
  try {
    const res = await fetch(`${API_BASE_URL}/companies/lookup/${encodeURIComponent(slug)}`, {
      method: 'GET'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid or expired application link.');
    }
    return data;
  } catch (error) {
    throw new Error(error.message || 'Invalid or expired application link.');
  }
}

/**
 * Retrieves logged-in finance company profile & application statistics
 * @returns {Promise<Object>} Company details and stats
 */
export async function getMyCompany() {
  try {
    const res = await fetch(`${API_BASE_URL}/companies/my-company`, {
      method: 'GET',
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to retrieve company profile.');
    }
    return data;
  } catch (error) {
    throw new Error(error.message || 'Failed to retrieve company profile.');
  }
}

/**
 * Submits public merchant application for a specific finance company
 * @param {string} slug - Company slug
 * @param {Object} payload - Application payload
 * @returns {Promise<Object>} Pipeline evaluation result
 */
export async function submitPublicApplication(slug, payload) {
  try {
    const res = await fetch(`${API_BASE_URL}/underwriting/apply-public/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      const errorDetails = data.details && Array.isArray(data.details) && data.details.length > 0
        ? data.details.join(' ')
        : data.error;
      throw new Error(errorDetails || 'Application submission failed.');
    }
    return data;
  } catch (error) {
    throw new Error(error.message || 'Application submission failed.');
  }
}
