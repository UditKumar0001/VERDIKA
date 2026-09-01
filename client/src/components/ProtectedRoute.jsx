import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * Wraps routes requiring authentication and redirects unauthenticated users to /login
 * once the auth check finishes loading. Also validates allowedRoles when specified.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: 'var(--text-muted)',
        fontSize: '0.95rem'
      }}>
        Verifying session authentication...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) {
    if (user.role === 'super_admin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // If super_admin attempts to navigate to regular dashboard, redirect to super-admin dashboard
  if (!allowedRoles && user.role === 'super_admin') {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}
