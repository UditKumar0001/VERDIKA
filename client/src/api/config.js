/**
 * Global API Configuration
 * Resolves API Base URL from VITE_API_URL or environment defaults.
 */
const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://verdika-backend.onrender.com' : 'http://localhost:5000/api');

export const API_BASE_URL = RAW_API_URL.endsWith('/api')
  ? RAW_API_URL
  : `${RAW_API_URL.replace(/\/$/, '')}/api`;

console.log('API Base URL:', API_BASE_URL, '| import.meta.env.VITE_API_URL:', import.meta.env.VITE_API_URL, '| Mode:', import.meta.env.MODE);

const TOKEN_KEY = 'verdika_auth_token';

export const getAuthToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
};

export const removeAuthToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

export const getAuthHeaders = (extraHeaders = {}) => {
  const token = getAuthToken();
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export default API_BASE_URL;
