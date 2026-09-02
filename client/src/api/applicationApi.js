/**
 * Application & Underwriting API Client
 * Connects to the backend underwriting pipeline, application store, and admin metrics.
 */

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL.replace(/\/$/, '')}/api`;

export const fetchApplications = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'ALL') {
    params.append('status', filters.status);
  }
  if (filters.search) {
    params.append('search', filters.search);
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/underwriting/applications${query}`, {
    method: 'GET',
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch applications');
  }
  return data.applications || [];
};

export const fetchMyApplications = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'ALL') {
    params.append('status', filters.status);
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/underwriting/my-applications${query}`, {
    method: 'GET',
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch your applications');
  }
  return data.applications || [];
};

export const fetchApplicationById = async (id) => {
  const res = await fetch(`${API_BASE_URL}/underwriting/applications/${id}`, {
    method: 'GET',
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch application details');
  }
  return data;
};

export const submitApplication = async (data) => {
  const res = await fetch(`${API_BASE_URL}/underwriting/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error || (result.details ? result.details.join(', ') : 'Submission failed'));
  }
  return result;
};

export const submitApplyApplication = async (payload) => {
  const res = await fetch(`${API_BASE_URL}/underwriting/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit application');
  }
  return data; // returns { applicationId, decision, applicantMessage }
};

export const updateApplicationStatus = async (id, status, note = '') => {
  const res = await fetch(`${API_BASE_URL}/underwriting/applications/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status, note })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update status');
  }
  return data;
};

export const fetchAdminMetrics = async () => {
  const res = await fetch(`${API_BASE_URL}/admin/metrics`, {
    method: 'GET',
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch metrics');
  }
  return data;
};

export const generateSyntheticData = async (count = 10) => {
  const res = await fetch(`${API_BASE_URL}/admin/generate-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ count })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate synthetic dataset');
  }
  return data;
};

export const submitReviewDecision = async (id, { decision, notes }) => {
  const res = await fetch(`${API_BASE_URL}/underwriting/applications/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ decision, notes })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit review decision');
  }
  return data; // returns { message, application, auditLogs }
};

export const requestApplicationInfo = async (id, { request_type, notes }) => {
  const res = await fetch(`${API_BASE_URL}/underwriting/applications/${id}/request-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ request_type, notes })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit information request');
  }
  return data; // returns { message, auditLogs }
};

export const validateBankAccountApi = async ({ account_number, ifsc, account_holder }) => {
  const res = await fetch(`${API_BASE_URL}/underwriting/validate-bank-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_number, ifsc, account_holder })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to validate bank account');
  }
  return data;
};

export const fetchApplicationStatusApi = async (token) => {
  const res = await fetch(`${API_BASE_URL}/underwriting/status/${token}`, {
    method: 'GET'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch application status');
  }
  return data;
};

