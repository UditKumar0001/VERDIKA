/**
 * Authentication API Client
 * Wraps fetch calls to auth endpoints using httpOnly cookies (credentials: 'include').
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    throw new Error(data.error || (data.details ? data.details.join(', ') : 'Registration failed'));
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
 * GET /api/auth/me
 */
export const getCurrentUser = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.user || null;
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
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Logout failed');
  }
  return data;
};
