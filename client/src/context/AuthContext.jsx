import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Authentication Context
 * Manages user session state, login, and logout.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Placeholder mock state: set default user/auth state
  const [user, setUser] = useState({ id: '1', email: 'underwriter@verdika.internal', role: 'underwriter' });
  const [loading, setLoading] = useState(false);

  const loginUser = async (credentials) => {
    setUser({ id: '1', email: credentials.email, role: 'underwriter' });
  };

  const logoutUser = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login: loginUser,
        logout: logoutUser,
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
