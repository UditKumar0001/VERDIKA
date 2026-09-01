import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Signup Page Component
 * Handles registration for:
 * 1. Merchants (Business Applicants seeking credit evaluation)
 * 2. Finance Companies (Lenders/NBFCs managing underwriting pipelines)
 */
export default function Signup() {
  const [accountType, setAccountType] = useState('merchant'); // 'merchant' | 'finance_company'
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const isPasswordMismatch = Boolean(confirmPassword && password !== confirmPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (accountType === 'finance_company' && !companyName.trim()) {
      setError('Please provide your Finance Company / Organization name.');
      return;
    }

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
        role: accountType === 'merchant' ? 'merchant' : 'admin',
        ...(accountType === 'finance_company' ? { company_name: companyName.trim() } : {})
      };

      await signup(payload);
      navigate('/dashboard');
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
          <div className="auth-badge">
            {accountType === 'merchant' ? 'Merchant Portal Registration' : 'Finance Company Onboarding'}
          </div>
          <h2>
            {accountType === 'merchant' ? 'Create Merchant Account' : 'Register Your Company'}
          </h2>
          <p className="auth-subtitle">
            {accountType === 'merchant'
              ? 'Apply for business credit, track underwriting evaluation progress, and manage your loan facilities.'
              : 'Deploy AI underwriting pipelines, manage risk parameters, and review incoming loan applications.'}
          </p>
        </div>

        {/* Account Type Selector Capsule */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-input)',
          padding: '0.35rem',
          borderRadius: '10px',
          border: '1px solid var(--border-card)',
          marginBottom: '1.5rem',
          gap: '0.35rem'
        }}>
          <button
            type="button"
            onClick={() => { setAccountType('merchant'); setError(''); }}
            style={{
              flex: 1,
              padding: '0.55rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: 'none',
              background: accountType === 'merchant' ? 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-indigo) 100%)' : 'transparent',
              color: accountType === 'merchant' ? '#ffffff' : 'var(--text-dim)'
            }}
          >
            🏪 Merchant / Applicant
          </button>
          <button
            type="button"
            onClick={() => { setAccountType('finance_company'); setError(''); }}
            style={{
              flex: 1,
              padding: '0.55rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: 'none',
              background: accountType === 'finance_company' ? 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-indigo) 100%)' : 'transparent',
              color: accountType === 'finance_company' ? '#ffffff' : 'var(--text-dim)'
            }}
          >
            🏦 Finance Company / Lender
          </button>
        </div>

        {error && <div className="auth-alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {accountType === 'finance_company' && (
            <div className="form-group">
              <label htmlFor="companyName">Finance Company / NBFC Name *</label>
              <input
                id="companyName"
                type="text"
                placeholder="e.g. BluePeak Capital, Apex Finance"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required={accountType === 'finance_company'}
                autoComplete="organization"
              />
              <span className="field-hint" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                Your dedicated link: <code style={{ color: 'var(--accent-cyan)' }}>/apply/{companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'your-company'}</code>
              </span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">
              {accountType === 'merchant' ? 'Business Owner / Contact Full Name *' : 'Administrator Full Name *'}
            </label>
            <input
              id="name"
              type="text"
              placeholder={accountType === 'merchant' ? 'e.g. Rahul Verma' : 'e.g. Priya Sharma'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              {accountType === 'merchant' ? 'Merchant Email Address *' : 'Work Email *'}
            </label>
            <input
              id="email"
              type="email"
              placeholder={accountType === 'merchant' ? 'rahul@mybusiness.com' : 'admin@yourcompany.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
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
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
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

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <svg className="password-eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
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
            {isPasswordMismatch && (
              <span className="field-error-text">Passwords do not match.</span>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting || isPasswordMismatch}
          >
            {isSubmitting
              ? 'Creating Account...'
              : accountType === 'merchant'
                ? 'Create Merchant Account →'
                : 'Register Finance Company →'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
