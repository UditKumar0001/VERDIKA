import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Login Page Component with Two-Factor Authentication (2FA)
 * Handles user authentication with email + password, followed by a 6-digit OTP verification code sent to the user's email.
 */
export default function Login() {
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2FA OTP state
  const [tempToken, setTempToken] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const otpInputRefs = useRef([]);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState({ loading: false, success: false, message: '' });

  const { login, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (otpCooldown > 0) {
      timer = setInterval(() => {
        setOtpCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Focus first OTP input when transitioning to OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus();
        }
      }, 100);
    }
  }, [step]);

  // Step 1: Submit Credentials
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResendStatus('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    setTempToken('');
    setOtpDigits(['', '', '', '', '', '']);

    try {
      const res = await login({ email, password });
      if (res && res.require_otp) {
        console.log('[FRONTEND] temp_token received for this login:', res.temp_token, 'for email:', email);
        setTempToken(res.temp_token);
        setStep('otp');
        setOtpDigits(['', '', '', '', '', '']);
        setOtpCooldown(30); // 30-second cooldown before resend
      } else if (res?.user?.role === 'super_admin') {
        navigate('/super-admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Handle Individual Digit Inputs
  const handleDigitChange = (index, value) => {
    setError('');
    setResendStatus('');

    // Only allow numeric input
    const cleanValue = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (cleanValue && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0 && otpInputRefs.current[index - 1]) {
      otpInputRefs.current[index - 1].focus();
    }
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(5, pastedData.length);
    if (otpInputRefs.current[nextIndex]) {
      otpInputRefs.current[nextIndex].focus();
    }
  };

  // Step 2: Submit OTP Verification
  const handleOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setResendStatus('');

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    console.log('[FRONTEND] calling verify-otp with temp_token:', tempToken, 'for email:', email, 'otp:', fullOtp);
    try {
      const verifyRes = await verifyOtp({
        temp_token: tempToken,
        otp: fullOtp
      });
      if (verifyRes?.user?.role === 'super_admin') {
        navigate('/super-admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Step 2: Resend OTP Code
  const handleResendOtp = async () => {
    if (otpCooldown > 0 || isResending) return;

    setIsResending(true);
    setError('');
    setResendStatus('');

    try {
      const res = await resendOtp({ temp_token: tempToken });
      setResendStatus(res.message || 'A fresh 6-digit verification code has been sent to your email.');
      setOtpCooldown(30);
      setOtpDigits(['', '', '', '', '', '']);
      if (otpInputRefs.current[0]) {
        otpInputRefs.current[0].focus();
      }
    } catch (err) {
      if (err.remainingSeconds) {
        setOtpCooldown(err.remainingSeconds);
      }
      setError(err.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleDemoFill = (demoEmail, demoPassword) => {
    setTempToken('');
    setOtpDigits(['', '', '', '', '', '']);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setStep('credentials');
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
        {/* STEP 1: EMAIL & PASSWORD CREDENTIALS */}
        {step === 'credentials' ? (
          <>
            <div className="auth-header">
              <img src="/logo.png" alt="Verdika Logo" className="auth-logo-img" />
              <div className="auth-badge">Verdika Risk Engine</div>
              <h2>Sign In to Verdika</h2>
              <p className="auth-subtitle">Access the autonomous multi-agent underwriting platform</p>
            </div>

            {error && <div className="auth-alert-error">{error}</div>}

            <form onSubmit={handleCredentialsSubmit} className="auth-form">
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
                {isSubmitting ? 'Authenticating...' : 'Sign In →'}
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
                  onClick={() => handleDemoFill('udit54638@gmail.com', '129760@gmailUdit')}
                >
                  🛡️ Admin
                </button>
                <button
                  type="button"
                  className="demo-btn"
                  style={{ borderColor: 'rgba(6, 182, 212, 0.4)', color: 'var(--accent-cyan)' }}
                  onClick={() => handleDemoFill('udit47656@gmail.com', '47656*ShahUdit')}
                >
                  ⚡ Super Admin
                </button>
              </div>
            </div>

            <div className="auth-footer">
              <p>
                Don't have an account? <Link to="/signup">Create one now</Link>
              </p>
            </div>
          </>
        ) : (
          /* STEP 2: TWO-FACTOR AUTHENTICATION (2FA) OTP SCREEN */
          <>
            <div className="auth-header">
              <img src="/logo.png" alt="Verdika Logo" className="auth-logo-img" />
              <div className="auth-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-cyan)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                🔐 Two-Factor Authentication
              </div>
              <h2>Enter Verification Code</h2>
              <p className="auth-subtitle">
                We've sent a 6-digit code to <span className="otp-email-highlight">{email}</span> — enter it below to complete sign-in.
              </p>
            </div>

            {error && <div className="auth-alert-error">{error}</div>}
            {resendStatus && <div className="forgot-alert-success" style={{ marginBottom: '1.25rem' }}>✅ {resendStatus}</div>}

            <form onSubmit={handleOtpSubmit} className="auth-form">
              <div className="otp-box-group">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    onPaste={handleDigitPaste}
                    className={`otp-digit-input ${digit ? 'has-value' : ''}`}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              <div className="otp-expiry-hint">
                <span>⏱️</span>
                <span>Code expires in <strong>5 minutes</strong></span>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={isVerifyingOtp || otpDigits.join('').length !== 6}
              >
                {isVerifyingOtp ? 'Verifying Code...' : 'Verify Code & Sign In →'}
              </button>

              <div className="otp-resend-row">
                <button
                  type="button"
                  className="btn-back-login"
                  onClick={() => {
                    setTempToken('');
                    setOtpDigits(['', '', '', '', '', '']);
                    setError('');
                    setResendStatus('');
                    setStep('credentials');
                  }}
                >
                  ← Back to Login
                </button>

                <button
                  type="button"
                  className="btn-resend-otp"
                  disabled={otpCooldown > 0 || isResending}
                  onClick={handleResendOtp}
                >
                  {isResending
                    ? 'Sending code...'
                    : otpCooldown > 0
                    ? `Resend code in ${otpCooldown}s`
                    : 'Resend Code'}
                </button>
              </div>
            </form>
          </>
        )}
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
                  className="btn-back-login"
                  onClick={() => {
                    setTempToken('');
                    setOtpDigits(['', '', '', '', '', '']);
                    setError('');
                    setResendStatus('');
                    setStep('credentials');
                  }}
                >
                  ← Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

