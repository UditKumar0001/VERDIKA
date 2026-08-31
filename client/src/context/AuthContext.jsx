import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, login as apiLogin, signup as apiSignup, logout as apiLogout } from '../api/authApi';

/**
 * Authentication Context
 * Manages user session state, company details, initialization from token, login, and logout.
 */
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        const data = await getCurrentUser();
        if (isMounted && data) {
          setUser(data.user || null);
          setCompany(data.company || null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setCompany(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials) => {
    setAuthError(null);
    try {
      const data = await apiLogin(credentials);
      setUser(data.user);
      setCompany(data.company || null);
      return data;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  const signup = async (userData) => {
    setAuthError(null);
    try {
      const data = await apiSignup(userData);
      setUser(data.user);
      setCompany(data.company || null);
      return data;
    } catch (err) {
      setAuthError(err.message || 'Signup failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setCompany(null);
      setAuthError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        setCompany,
        isAuthenticated: !!user,
        loading,
        authError,
        login,
        signup,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
