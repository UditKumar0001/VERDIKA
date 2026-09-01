import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/**
 * Premium Navbar Component
 * Navigation bar with glassmorphism backdrop, active state indicators, profile chip, theme toggle, and logout control.
 */
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Route matching for active link indicators
  const isHomeActive = location.pathname === '/';
  const isApplyActive = location.pathname === '/apply';
  const isAnalyticsActive = location.pathname === '/dashboard' && location.search.includes('tab=analytics');
  const isQueueActive = location.pathname === '/dashboard' && !location.search.includes('tab=analytics');

  // Compute initials for user profile chip
  const userInitials = (() => {
    if (!user?.name) return 'U';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  })();

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Brand Logo & Engine Tag */}
        <div className="navbar-brand">
          <Link to="/" className="brand-logo">
            <img src="/logo.png" alt="Verdika Logo" className="brand-logo-img" />
            <span className="brand-name">Verdika</span>
            <span className="brand-tag">Risk Engine</span>
          </Link>
        </div>

        {/* Central Navigation Links with Active Indicator */}
        <div className="navbar-links">
          <Link
            to="/"
            className={`nav-link ${isHomeActive ? 'active' : ''}`}
          >
            <span>Home</span>
            {isHomeActive && <span className="nav-active-dot"></span>}
          </Link>

          <Link
            to="/apply"
            className={`nav-link ${isApplyActive ? 'active' : ''}`}
          >
            <span>Find a Lender</span>
            {isApplyActive && <span className="nav-active-dot"></span>}
          </Link>

          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                className={`nav-link ${isQueueActive ? 'active' : ''}`}
              >
                <span>Queue</span>
                {isQueueActive && <span className="nav-active-dot"></span>}
              </Link>
              <Link
                to="/dashboard?tab=analytics"
                className={`nav-link ${isAnalyticsActive ? 'active' : ''}`}
              >
                <span>Analytics</span>
                {isAnalyticsActive && <span className="nav-active-dot"></span>}
              </Link>
            </>
          )}
        </div>

        {/* Right Authentication & Settings Cluster */}
        <div className="navbar-auth">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle visual theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {isAuthenticated ? (
            /* User Profile Chip */
            <div className="user-profile-chip">
              <div className="user-avatar-badge">
                {userInitials}
              </div>
              <div className="user-info">
                <span className="user-name">{user?.name || user?.email}</span>
                <span className="user-role">{user?.role || 'underwriter'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="logout-btn"
                title="Sign Out"
              >
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
