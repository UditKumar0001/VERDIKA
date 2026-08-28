/**
 * Application API Client
 * Placeholders for underwriting application endpoints (list, getById, submit, review).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const fetchApplications = async () => {
  // Placeholder: GET /api/underwriting/applications
  return [];
};

export const fetchApplicationById = async (id) => {
  // Placeholder: GET /api/underwriting/applications/:id
  return { id, status: 'PENDING_REVIEW' };
};

export const submitApplication = async (data) => {
  // Placeholder: POST /api/underwriting/applications
  return { id: 'app-mock-id', ...data, status: 'SUBMITTED' };
};
