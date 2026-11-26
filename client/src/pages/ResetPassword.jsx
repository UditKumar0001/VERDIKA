import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../api/config';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState({ loading: false, success: false, message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setStatus({ loading: false, success: false, message: 'Missing reset token. Please use the link from your email.' });
      return;
    }
    if (password.length < 6) {
      setStatus({ loading: false, success: false, message: 'Password must be at least 6 characters.' });
      return;
    }
    if (password !== confirm) {
      setStatus({ loading: false, success: false, message: 'Passwords do not match.' });
      return;
    }

    setStatus({ loading: true, success: false, message: '' });
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
      setStatus({ loading: false, success: true, message: data.message });
    } catch (err) {
      setStatus({ loading: false, success: false, message: err.message });
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Set New Password</h1>
          <p className="auth-subtitle">Enter your new password below to regain access.</p>
        </div>

        {status.message && (
          <div className={status.success ? 'success-banner' : 'error-banner'} style={{ marginBottom: '1rem' }}>
            {status.message}
          </div>
        )}

        {!status.success ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>
            <button type="submit" className="submit-btn-primary" disabled={status.loading} style={{ width: '100%' }}>
              {status.loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/login" className="submit-btn-primary" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', textDecoration: 'none' }}>
              Go to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
