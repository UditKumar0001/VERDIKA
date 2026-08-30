import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Login Page Component
 * Handles user authentication with form validation, password toggle, forgot password modal, and demo credential filling.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState({ loading: false, success: false, message: '' });

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotStatus({ loading: false, success: false, message: 'Please enter your email address.' });
      return;
    }

    setForgotStatus({ loading: true, success: false, message: '' });
    setTimeout(() => {
      setForgotStatus({
        loading: false,
        success: true,
        message: `Password reset instructions have been sent to ${forgotEmail}. Please check your inbox.`
      });
    }, 600);
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.png" alt="Verdika Logo" className="auth-logo-img" />
          <div className="auth-badge">Verdika Risk Engine</div>
          <h2>Sign In to Verdika</h2>
          <p className="auth-subtitle">Access the autonomous multi-agent underwriting platform</p>
        </div>

        {error && <div className="auth-alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Work Email</label>
            <input
              id="email"
              type="email"
              placeholder="name@verdika.internal"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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

          <div className="auth-forgot-row">
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => {
                setShowForgotModal(true);
                setForgotEmail(email || '');
                setForgotStatus({ loading: false, success: false, message: '' });
              }}
            >
              Forgot Password?
            </button>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-demo-section">
          <span className="demo-label">Quick Demo Access</span>
          <div className="demo-buttons">
            <button
              type="button"
              className="demo-btn"
              onClick={() => handleDemoFill('merchant@verdika.internal', 'Merchant123!')}
            >
              🏬 Demo Merchant
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => handleDemoFill('underwriter@verdika.internal', 'Verdika123!')}
            >
              👤 Underwriter
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => handleDemoFill('admin@verdika.internal', 'Admin123!')}
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/signup">Create one now</Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="forgot-modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div className="forgot-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="forgot-modal-header">
              <h3>Reset Password</h3>
              <p>Enter your account email to receive a password reset link.</p>
            </div>

            {forgotStatus.success ? (
              <div className="forgot-alert-success">
                ✅ {forgotStatus.message}
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="auth-form">
                {forgotStatus.message && !forgotStatus.success && (
                  <div className="auth-alert-error">{forgotStatus.message}</div>
                )}
                <div className="form-group">
                  <label htmlFor="forgot-email">Account Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="name@verdika.internal"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="forgot-modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowForgotModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="new-app-btn"
                    disabled={forgotStatus.loading}
                  >
                    {forgotStatus.loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}

            {forgotStatus.success && (
              <div className="forgot-modal-actions">
                <button
                  type="button"
                  className="new-app-btn"
                  onClick={() => setShowForgotModal(false)}
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
