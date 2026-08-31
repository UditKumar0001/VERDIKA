import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { validateInviteToken, acceptInvite } from '../api/companyApi';
import { useAuth } from '../context/AuthContext';

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { fetchCurrentUser } = useAuth();

  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isPasswordMismatch = Boolean(confirmPassword && password !== confirmPassword);

  useEffect(() => {
    async function checkInvite() {
      if (!token) {
        setError('No invitation token provided.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await validateInviteToken(token);
        setInviteData(data);
        setError(null);
      } catch (err) {
        setError(err.message || 'This invitation link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    }

    checkInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim() || !password || !confirmPassword) {
      setSubmitError('Please provide your full name and choose a secure password.');
      return;
    }

    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      await acceptInvite({
        token,
        name: name.trim(),
        password
      });

      if (fetchCurrentUser) {
        await fetchCurrentUser();
      }

      navigate('/dashboard');
    } catch (err) {
      setSubmitError(err.message || 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page-container">
        <div className="auth-card" style={{ maxWidth: '440px', textAlign: 'center', padding: '3rem 2rem' }}>
          <div className="inline-spinner" style={{ width: '36px', height: '36px', margin: '0 auto 1rem auto' }}></div>
          <h2>Verifying Invitation...</h2>
          <p className="text-muted">Connecting with Verdika security registry...</p>
        </div>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="auth-page-container">
        <div className="auth-card" style={{ maxWidth: '460px', textAlign: 'center', padding: '2.5rem 2rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>⚠️</span>
          <h2>Invitation Invalid or Expired</h2>
          <p className="text-muted" style={{ margin: '0.75rem 0 1.75rem 0', fontSize: '0.9rem', lineHeight: '1.5' }}>
            {error || 'This invite link is no longer valid. Please ask your administrator to resend it.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to="/login" className="btn-primary">
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const companyName = inviteData.company?.name || 'Finance Company';
  const roleLabel = inviteData.role === 'admin' ? 'Administrator' : 'Underwriter';

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <img src="/logo.png" alt="Verdika Logo" className="auth-logo-img" />
          <div className="auth-badge">Team Member Onboarding</div>
          <h2>Join {companyName}</h2>
          <p className="auth-subtitle">
            You've been invited to join <strong>{companyName}</strong> as an authorized <strong>{roleLabel}</strong>.
          </p>
        </div>

        {submitError && <div className="auth-alert-error">{submitError}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Work Email (Locked by Admin)</label>
            <input
              id="email"
              type="email"
              value={inviteData.email}
              disabled
              style={{ opacity: 0.75, cursor: 'not-allowed', background: 'rgba(30, 41, 59, 0.5)' }}
            />
            <span className="field-hint" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              🔒 Verified by {companyName} Admin
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="name">Your Full Name *</label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Ananya Roy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Create Password *</label>
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
                style={{
                  borderColor: isPasswordMismatch ? '#ef4444' : (confirmPassword && password === confirmPassword ? '#10b981' : undefined)
                }}
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
              <span className="field-error-text" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                ⚠️ Passwords do not match
              </span>
            )}
            {confirmPassword && !isPasswordMismatch && (
              <span style={{ color: '#10b981', fontSize: '0.78rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                ✓ Passwords match
              </span>
            )}
          </div>

          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? 'Setting up Profile...' : 'Accept Invite & Join Team →'}
          </button>
        </form>

        <div className="auth-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1.25rem' }}>
          <p>
            Already an active member? <Link to="/login">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
