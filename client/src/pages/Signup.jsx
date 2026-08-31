import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Signup Page Component
 * Handles registration for Finance Companies (Lenders/NBFCs), Merchants, and Underwriters.
 */
export default function Signup() {
  const [accountType, setAccountType] = useState('finance_company'); // 'finance_company' | 'merchant' | 'underwriter'
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('underwriter');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const primaryName = accountType === 'finance_company' ? companyName : name;

    if (!primaryName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: primaryName.trim(),
        company_name: accountType === 'finance_company' ? companyName.trim() : null,
        email: email.trim(),
        password,
        role: accountType === 'finance_company' ? 'finance_company' : (accountType === 'merchant' ? 'merchant' : role)
      };

      const res = await signup(payload);

      if (accountType === 'finance_company') {
        navigate('/dashboard');
      } else if (accountType === 'merchant') {
        navigate('/apply');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <img src="/logo.png" alt="Verdika Logo" className="auth-logo-img" />
          <div className="auth-badge">Multi-Tenant Onboarding</div>
          <h2>Create Verdika Account</h2>
          <p className="auth-subtitle">
            {accountType === 'finance_company'
              ? 'Register your finance institution & generate dedicated merchant application links'
              : 'Join the multi-agent AI risk evaluation system'}
          </p>
        </div>

        {/* Account Type Selection Tabs */}
        <div className="account-type-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`account-tab-btn ${accountType === 'finance_company' ? 'active' : ''}`}
            onClick={() => setAccountType('finance_company')}
            style={{
              flex: 1,
              padding: '0.6rem 0.4rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              borderRadius: '6px',
              border: accountType === 'finance_company' ? '1px solid var(--accent-blue)' : '1px solid var(--border-card)',
              background: accountType === 'finance_company' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-input)',
              color: accountType === 'finance_company' ? 'var(--accent-blue)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🏦 Finance Company
          </button>
          <button
            type="button"
            className={`account-tab-btn ${accountType === 'merchant' ? 'active' : ''}`}
            onClick={() => setAccountType('merchant')}
            style={{
              flex: 1,
              padding: '0.6rem 0.4rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              borderRadius: '6px',
              border: accountType === 'merchant' ? '1px solid var(--accent-blue)' : '1px solid var(--border-card)',
              background: accountType === 'merchant' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-input)',
              color: accountType === 'merchant' ? 'var(--accent-blue)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🛍️ Merchant Applicant
          </button>
          <button
            type="button"
            className={`account-tab-btn ${accountType === 'underwriter' ? 'active' : ''}`}
            onClick={() => setAccountType('underwriter')}
            style={{
              flex: 1,
              padding: '0.6rem 0.4rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              borderRadius: '6px',
              border: accountType === 'underwriter' ? '1px solid var(--accent-blue)' : '1px solid var(--border-card)',
              background: accountType === 'underwriter' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-input)',
              color: accountType === 'underwriter' ? 'var(--accent-blue)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🛡️ Underwriter
          </button>
        </div>

        {error && <div className="auth-alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {accountType === 'finance_company' ? (
            <div className="form-group">
              <label htmlFor="companyName">Finance Company / NBFC Name</label>
              <input
                id="companyName"
                type="text"
                placeholder="e.g. HDFC Finance, BluePeak Capital"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                autoComplete="organization"
              />
              <span className="field-hint" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                A custom public link (e.g. /apply/{companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'your-company'}) will be auto-generated.
              </span>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Work Email</label>
            <input
              id="email"
              type="email"
              placeholder={accountType === 'finance_company' ? 'underwriting@yourcompany.com' : 'user@example.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="password-eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg className="password-eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {accountType === 'underwriter' && (
            <div className="form-group">
              <label htmlFor="role">Platform Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="auth-select"
              >
                <option value="underwriter">Underwriter (Standard)</option>
                <option value="risk_officer">Risk Officer (Senior)</option>
                <option value="viewer">Auditor / Viewer (Read-only)</option>
              </select>
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting
              ? 'Setting up Account...'
              : (accountType === 'finance_company' ? 'Register Finance Company' : 'Create Account')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
