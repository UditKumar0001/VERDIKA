/**
 * Authentication API Client
 * Wraps fetch calls to auth endpoints using httpOnly cookies (credentials: 'include').
 */

import { API_BASE_URL, getAuthHeaders } from './config.js';

/**
 * POST /api/auth/signup
 */
export const signup = async (userData) => {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(userData)
  });

  const data = await res.json();
  if (!res.ok) {
    const errorDetails = data.details && Array.isArray(data.details) && data.details.length > 0
      ? data.details.join(' ')
      : data.error;
    throw new Error(errorDetails || 'Registration failed');
  }
  return data;
};

/**
 * POST /api/auth/login
 */
export const login = async (credentials) => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid email or password');
  }
  return data;
};

/**
 * POST /api/auth/verify-otp
 */
export const verifyOtp = async ({ temp_token, otp }) => {
  const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ temp_token, otp })
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Invalid verification code');
    err.code = data.code;
    throw err;
  }
  return data;
};

/**
 * POST /api/auth/resend-otp
 */
export const resendOtp = async ({ temp_token }) => {
  const res = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ temp_token })
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Failed to resend verification code');
    err.remainingSeconds = data.remainingSeconds;
    throw err;
  }
  return data;
};

/**
 * GET /api/auth/me
 */
export const getCurrentUser = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to restore user session:', error);
    return null;
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async () => {
  const res = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Logout failed');
  }
  return data;
};
