import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Login Page Component
 * Handles user authentication with form validation and instant demo credential filling.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
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
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
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
    </div>
  );
}
