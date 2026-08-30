import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Navbar Component
 * Navigation bar with authentication state, user badge, theme toggle, and logout control.
 */
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="brand-logo">
            <img src="/logo.png" alt="Verdika Logo" className="brand-logo-img" />
            <span className="brand-name">Verdika</span>
            <span className="brand-tag">Risk Engine</span>
          </Link>
        </div>

        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          {isAuthenticated && (
            <Link to="/dashboard" className="nav-link">Dashboard Queue</Link>
          )}
        </div>

        <div className="navbar-auth">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {isAuthenticated ? (
            <div className="user-profile-badge">
              <div className="user-info">
                <span className="user-name">{user?.name || user?.email}</span>
                <span className="user-role">{user?.role || 'underwriter'}</span>
              </div>
              <button onClick={handleLogout} className="logout-btn" title="Sign Out">
                Sign Out
              </button>
            </div>
          ) : (
            <div className="auth-actions">
              <Link to="/login" className="login-link">Sign In</Link>
              <Link to="/signup" className="signup-btn">Get Started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
