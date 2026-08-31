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

/**
 * POST /api/auth/signup
 * Supports both Merchant applicants and Finance Company multi-tenant registrations.
 */
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { isValid, errors } = validateSignupInput(req.body);
    if (!isValid) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const { name, company_name, email, password, role } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    let company = null;
    let company_id = null;
    const isFinanceCompany = role === 'finance_company' || Boolean(company_name);

    if (isFinanceCompany) {
      const orgName = company_name || name || 'Finance Partner';
      company = await Company.create({
        name: orgName,
        email
      });
      company_id = company.id;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name: name || company_name || 'User',
      company_id,
      email,
      passwordHash,
      role: isFinanceCompany ? 'underwriter' : (role || 'merchant')
    });

    const token = generateToken(user, company);
    setAuthCookie(res, token);

    logger.info(`[Auth] User registered: ${user.email} (Role: ${user.role}${company ? `, Company: ${company.name} [${company.slug}]` : ''})`);

    const sanitizedUser = user.sanitize();
    const appOrigin = req.headers.origin || 'http://localhost:5173';

    return res.status(201).json({
      message: isFinanceCompany ? 'Finance Company registered successfully' : 'Account created successfully',
      user: sanitizedUser,
      company: company ? {
        id: company.id,
        name: company.name,
        slug: company.slug,
        apply_link: `${appOrigin}/apply/${company.slug}`
      } : null
    });
  } catch (error) {
    logger.error('[Auth Signup Error]:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
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
