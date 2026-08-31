import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
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

import { CompanyInvite } from '../models/CompanyInvite.js';

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

    // Critical Security Guard: Block direct public underwriter self-registration
    if (role === 'underwriter' || role === 'reviewer') {
      return res.status(403).json({
        error: 'Underwriter accounts cannot be created directly. Please ask your Finance Company Administrator for an official team invitation link.'
      });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const orgName = company_name || name || 'Finance Partner';
    const company = await Company.create({
      name: orgName,
      email
    });
    const company_id = company.id;

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

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

    const company = await Company.findById(invite.company_id);
    if (!company) {
      return res.status(404).json({ error: 'Associated finance company not found.' });
    }

    return res.json({
      valid: true,
      email: invite.email,
      role: invite.role,
      expires_at: invite.expires_at,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug
      }
    });
  } catch (error) {
    logger.error('[Auth Validate Invite Error]:', error);
    return res.status(500).json({ error: 'Failed to validate invite token.' });
  }
});

/**
 * POST /api/auth/accept-invite
 * Accepts an invitation, registers the new Underwriter, assigns them to the inviting company, and logs them in.
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

    const company = await Company.findById(invite.company_id);
    if (!company) {
      return res.status(404).json({ error: 'Associated company not found.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

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

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns session + company info.
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { isValid, errors } = validateLoginInput(req.body);
    if (!isValid) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let company = null;
    if (user.company_id) {
      company = await Company.findById(user.company_id);
    }

    const token = generateToken(user, company);
    setAuthCookie(res, token);

    logger.info(`[Auth] User logged in: ${user.email}`);

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
    logger.error('[Auth Login Error]:', error);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
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
