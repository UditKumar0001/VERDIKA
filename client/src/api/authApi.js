/**
 * Authentication API Client
 * Placeholders for auth endpoints (login, signup, logout, getCurrentUser).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const login = async (credentials) => {
  // Placeholder: POST /api/auth/login
  return { user: { email: credentials.email, role: 'underwriter' }, token: 'mock-token' };
};

export const signup = async (userData) => {
  // Placeholder: POST /api/auth/signup
  return { user: { email: userData.email, role: 'underwriter' }, token: 'mock-token' };
};

export const logout = async () => {
  // Placeholder: POST /api/auth/logout
  return { success: true };
};

export const getCurrentUser = async () => {
  // Placeholder: GET /api/auth/me
  return null;
};
