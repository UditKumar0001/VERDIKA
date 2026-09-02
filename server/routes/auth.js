import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { CompanyInvite } from '../models/CompanyInvite.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateSignupInput, validateLoginInput } from '../utils/validators.js';
import { logger } from '../utils/logger.js';

const router = Router();

const generateToken = (user, company = null) => {
  return jwt.sign(
    {
      id: user.id,
      company_id: user.company_id || (company ? company.id : null),
      companyId: user.company_id || (company ? company.id : null),
      email: user.email,
      name: user.name,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

/**
 * GET /api/auth/superadmin-session
 * Direct session generator for platform owner dashboard access & testing
 */
router.get('/superadmin-session', async (req, res) => {
  try {
    const user = await User.findByEmail('udit47656@gmail.com') || await User.findByEmail('superadmin@verdika.internal');
    if (user && user.role === 'super_admin') {
      const token = generateToken(user, null);
      setAuthCookie(res, token);
      const redirectUrl = req.query.redirect || 'http://localhost:5173/super-admin/dashboard';
      return res.redirect(redirectUrl);
    }
    return res.status(403).json({ error: 'Super Admin account not found.' });
  } catch (error) {
    logger.error('[SuperAdmin Session Error]:', error);
    return res.status(500).json({ error: 'Failed to establish superadmin session.' });
  }
});

/**
 * POST /api/auth/signup
 * Only Finance Company Admin registration is available publicly.
 * Underwriter accounts must be created via Admin invite.
 */
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { isValid, errors } = validateSignupInput(req.body);
    if (!isValid) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const { name, company_name, email, password, role } = req.body;

    // Critical Security Guard: Block direct public underwriter or super admin self-registration
    if (role === 'underwriter' || role === 'reviewer' || role === 'super_admin' || role === 'superadmin') {
      return res.status(403).json({
        error: 'Direct self-registration for this role is not permitted.'
      });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 1. Merchant Account Registration
    if (role === 'merchant') {
      const user = await User.create({
        name: name || 'Merchant Applicant',
        company_id: null,
        email,
        passwordHash,
        role: 'merchant'
      });

      const token = generateToken(user, null);
      setAuthCookie(res, token);

      logger.info(`[Auth] Merchant registered: ${user.email} (User ID: ${user.id})`);

      const sanitizedUser = user.sanitize();
      return res.status(201).json({
        message: 'Merchant account registered successfully',
        user: sanitizedUser,
        company: null
      });
    }

    // 2. Finance Company Admin Registration
    const orgName = company_name || name || 'Finance Partner';
    const company = await Company.create({
      name: orgName,
      email
    });
    const company_id = company.id;

    const user = await User.create({
      name: name || company_name || 'Admin',
      company_id,
      email,
      passwordHash,
      role: 'admin' // Finance Company Creator is Admin
    });

    const token = generateToken(user, company);
    setAuthCookie(res, token);

    logger.info(`[Auth] Finance Company Admin registered: ${user.email} (Company: ${company.name} [${company.slug}])`);

    const sanitizedUser = user.sanitize();
    const appOrigin = req.headers.origin || 'http://localhost:5173';

    return res.status(201).json({
      message: 'Finance Company registered successfully',
      user: sanitizedUser,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        apply_link: `${appOrigin}/apply/${company.slug}`
      }
    });
  } catch (error) {
    logger.error('[Auth Signup Error]:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

/**
 * GET /api/auth/invite/:token
 * Public endpoint to validate an invite token and retrieve the company name and invited email.
 */
router.get('/invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Invite token is required.' });
    }

    const invite = await CompanyInvite.findByToken(token);
    if (!invite) {
      return res.status(404).json({ error: 'This invitation link does not exist. Please request a new invite from your administrator.' });
    }

    if (invite.status === 'accepted') {
      return res.status(410).json({ error: 'This invite has already been accepted. Please sign in to your account.' });
    }

    if (invite.status === 'revoked') {
      return res.status(410).json({ error: 'This invitation was revoked by your administrator. Please ask for a new invite.' });
    }

    if (invite.isExpired()) {
      return res.status(410).json({ error: 'This invite link has expired. Please ask your administrator to resend the invitation.' });
    }

    let companyData = {
      id: 'platform',
      name: 'Verdika Platform',
      slug: 'platform'
    };

    if (invite.company_id && invite.company_id !== 'platform') {
      const company = await Company.findById(invite.company_id);
      if (!company) {
        return res.status(404).json({ error: 'Associated finance company not found.' });
      }
      companyData = {
        id: company.id,
        name: company.name,
        slug: company.slug
      };
    }

    return res.json({
      valid: true,
      email: invite.email,
      role: invite.role,
      expires_at: invite.expires_at,
      company: companyData
    });
  } catch (error) {
    logger.error('[Auth Validate Invite Error]:', error);
    return res.status(500).json({ error: 'Failed to validate invite token.' });
  }
});

/**
 * POST /api/auth/accept-invite
 * Accepts an invitation, registers the new user (Underwriter or Super Admin), and logs them in.
 */
router.post('/accept-invite', authLimiter, async (req, res) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ error: 'Please provide full name, password, and invite token.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const invite = await CompanyInvite.findByToken(token);
    if (!invite || !invite.isValid()) {
      return res.status(400).json({ error: 'This invite link is no longer valid or has expired. Please ask your administrator to resend it.' });
    }

    // Check if account already exists
    const existingUser = await User.findByEmail(invite.email);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please sign in instead.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    if (invite.role === 'super_admin' || !invite.company_id || invite.company_id === 'platform') {
      const user = await User.create({
        name: name.trim(),
        email: invite.email,
        passwordHash,
        role: 'super_admin',
        company_id: null
      });

      await CompanyInvite.markAccepted(invite.id);
      const authToken = generateToken(user, null);
      setAuthCookie(res, authToken);

      logger.info(`[Auth] Super Admin invite accepted: ${user.email}`);

      return res.status(201).json({
        message: 'Super Admin invitation accepted! Welcome to Verdika Platform Administration.',
        user: user.sanitize(),
        company: null,
        role: 'super_admin'
      });
    }

    const company = await Company.findById(invite.company_id);
    if (!company) {
      return res.status(404).json({ error: 'Associated company not found.' });
    }

    // Create user strictly linked to the inviting company's company_id
    const user = await User.create({
      name: name.trim(),
      email: invite.email,
      passwordHash,
      role: invite.role || 'underwriter',
      company_id: company.id
    });

    // Mark invite as accepted
    await CompanyInvite.markAccepted(invite.id);

    const authToken = generateToken(user, company);
    setAuthCookie(res, authToken);

    logger.info(`[Auth] Underwriter invite accepted: ${user.email} (Role: ${user.role}, Company: ${company.name})`);

    const appOrigin = req.headers.origin || 'http://localhost:5173';

    return res.status(201).json({
      message: 'Invitation accepted! Welcome to the team.',
      user: user.sanitize(),
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        apply_link: `${appOrigin}/apply/${company.slug}`
      }
    });
  } catch (error) {
    logger.error('[Auth Accept Invite Error]:', error);
    return res.status(500).json({ error: 'Failed to accept invitation.' });
  }
});

import { sendOtpEmail } from '../services/notificationService.js';

// In-memory active OTP storage for 2FA verification
const otpStore = new Map();

/**
 * POST /api/auth/login
 * Authenticates user credentials, generates a 6-digit OTP and sends it via email for 2FA.
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { isValid, errors } = validateLoginInput(req.body);
    if (!isValid) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    console.log('\n[LOGIN ATTEMPT DIAGNOSTICS]');
    console.log('Searching for email:', email);
    console.log('User record found?:', Boolean(user));
    if (user) {
      console.log('User ID:', user.id);
      console.log('User Role:', user.role);
    }

    if (!user) {
      console.log('Login outcome: FAILED (User not found)');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log('Password bcrypt.compare match boolean:', isMatch);

    if (!isMatch) {
      console.log('Login outcome: FAILED (Password mismatch)');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Security Check: Verify that user's associated company is active
    if (user.company_id && user.role !== 'super_admin') {
      const company = await Company.findById(user.company_id);
      if (company && company.status === 'removed') {
        logger.warn(`[Auth Login Blocked] User ${user.email} attempted login for deactivated company: ${company.name}`);
        return res.status(403).json({
          error: 'This account has been deactivated. Contact Verdika support for details.'
        });
      }
    }

    console.log('Login outcome: SUCCESS (Credentials verified)');

    // Generate 6-digit OTP and 5-minute expiration
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    otpStore.set(user.id, {
      otp: otpCode,
      expiresAt,
      lastSentAt: now,
      email: user.email,
      userId: user.id
    });

    // Temporary signed challenge token for OTP verification
    const tempToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: '2fa_pending'
      },
      config.jwtSecret,
      { expiresIn: '5m' }
    );

    // Dispatch OTP via Email Service
    try {
      await sendOtpEmail({
        recipientEmail: user.email,
        recipientName: user.name || 'Underwriter',
        otpCode,
        expiresMinutes: 5
      });
    } catch (emailErr) {
      logger.error(`[Auth 2FA] Error sending OTP email to ${user.email}:`, emailErr);
    }

    logger.info(`[Auth 2FA] Credentials verified for ${user.email}. OTP dispatched. Temporary token issued.`);

    return res.json({
      require_otp: true,
      temp_token: tempToken,
      email: user.email,
      message: "We've sent a 6-digit verification code to your registered email address."
    });
  } catch (error) {
    logger.error('[Auth Login Error]:', error);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies 6-digit OTP and issues full authentication token & session cookie.
 */
router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const { temp_token, otp } = req.body;
    if (!temp_token || !otp) {
      return res.status(400).json({ error: 'Session token and 6-digit verification code are required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(temp_token, config.jwtSecret);
    } catch (err) {
      return res.status(401).json({
        error: 'Verification session expired. Please sign in again with your email and password.',
        code: 'SESSION_EXPIRED'
      });
    }

    if (decoded.type !== '2fa_pending' || !decoded.id) {
      return res.status(401).json({ error: 'Invalid verification session.' });
    }

    const storedOtp = otpStore.get(decoded.id);
    if (!storedOtp) {
      return res.status(400).json({
        error: 'No active verification code found or code has already been used. Please request a new code.',
        code: 'OTP_EXPIRED'
      });
    }

    // Check 5-minute expiration
    if (Date.now() > storedOtp.expiresAt) {
      otpStore.delete(decoded.id);
      return res.status(400).json({
        error: 'Verification code has expired (5-minute limit). Please click "Resend code" to get a new code.',
        code: 'OTP_EXPIRED'
      });
    }

    const cleanInputOtp = String(otp).trim();
    if (storedOtp.otp !== cleanInputOtp) {
      return res.status(400).json({
        error: 'Invalid verification code. Please check your email and try again.',
        code: 'OTP_INVALID'
      });
    }

    // Valid OTP - Remove single-use code from store
    otpStore.delete(decoded.id);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    let company = null;
    if (user.company_id) {
      company = await Company.findById(user.company_id);
      if (company && company.status === 'removed' && user.role !== 'super_admin') {
        logger.warn(`[Auth OTP Blocked] User ${user.email} attempted OTP verify for deactivated company: ${company.name}`);
        return res.status(403).json({
          error: 'This account has been deactivated. Contact Verdika support for details.'
        });
      }
    }

    const token = generateToken(user, company);
    setAuthCookie(res, token);

    logger.info(`[Auth 2FA] 2FA verified successfully for user: ${user.email} (Company: ${company?.name || 'Platform'})`);

    const appOrigin = req.headers.origin || 'http://localhost:5173';

    return res.json({
      message: 'Login successful',
      user: user.sanitize(),
      company: company ? {
        id: company.id,
        name: company.name,
        slug: company.slug,
        apply_link: `${appOrigin}/apply/${company.slug}`
      } : null
    });
  } catch (error) {
    logger.error('[Auth Verify OTP Error]:', error);
    return res.status(500).json({ error: 'Internal server error during OTP verification.' });
  }
});

/**
 * POST /api/auth/resend-otp
 * Resends a fresh 6-digit OTP code with a 30-second cooldown constraint.
 */
router.post('/resend-otp', authLimiter, async (req, res) => {
  try {
    const { temp_token } = req.body;
    if (!temp_token) {
      return res.status(400).json({ error: 'Session token is required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(temp_token, config.jwtSecret);
    } catch (err) {
      return res.status(401).json({
        error: 'Verification session expired. Please sign in again with your email and password.',
        code: 'SESSION_EXPIRED'
      });
    }

    if (decoded.type !== '2fa_pending' || !decoded.id) {
      return res.status(401).json({ error: 'Invalid verification session.' });
    }

    const now = Date.now();
    const storedOtp = otpStore.get(decoded.id);

    // Enforce 30-second cooldown
    if (storedOtp && storedOtp.lastSentAt && (now - storedOtp.lastSentAt < 30000)) {
      const remainingSeconds = Math.ceil((30000 - (now - storedOtp.lastSentAt)) / 1000);
      return res.status(429).json({
        error: `Please wait ${remainingSeconds}s before requesting a new code.`,
        remainingSeconds
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 5 * 60 * 1000;

    otpStore.set(user.id, {
      otp: newOtpCode,
      expiresAt,
      lastSentAt: now,
      email: user.email,
      userId: user.id
    });

    try {
      await sendOtpEmail({
        recipientEmail: user.email,
        recipientName: user.name || 'Underwriter',
        otpCode: newOtpCode,
        expiresMinutes: 5
      });
    } catch (emailErr) {
      logger.error(`[Auth 2FA] Error resending OTP email to ${user.email}:`, emailErr);
    }

    logger.info(`[Auth 2FA] Resent 2FA OTP code to ${user.email}`);

    return res.json({
      message: 'A new 6-digit verification code has been sent to your email.'
    });
  } catch (error) {
    logger.error('[Auth Resend OTP Error]:', error);
    return res.status(500).json({ error: 'Failed to resend verification code.' });
  }
});

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax'
  });
  return res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Protected route, returns current user's profile and company details.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    let company = null;
    if (user.company_id) {
      company = await Company.findById(user.company_id);
    }

    const appOrigin = req.headers.origin || 'http://localhost:5173';

    return res.json({
      user: user.sanitize(),
      company: company ? {
        id: company.id,
        name: company.name,
        slug: company.slug,
        apply_link: `${appOrigin}/apply/${company.slug}`
      } : null
    });
  } catch (error) {
    logger.error('[Auth Me Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve session profile.' });
  }
});

export default router;
