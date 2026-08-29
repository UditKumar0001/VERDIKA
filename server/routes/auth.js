import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateSignupInput, validateLoginInput } from '../utils/validators.js';
import { logger } from '../utils/logger.js';

const router = Router();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
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
 * Validates email and min 8-char password, hashes password with bcrypt (10 rounds),
 * inserts user into DB, and returns user info with httpOnly JWT cookie.
 */
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { isValid, errors } = validateSignupInput(req.body);
    if (!isValid) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const { name, email, password, role } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || 'underwriter'
    });

    const token = generateToken(user);
    setAuthCookie(res, token);

    logger.info(`[Auth] User registered: ${user.email} (Role: ${user.role})`);

    // Return sanitized user object without token or password in response body
    return res.status(201).json({
      message: 'Account created successfully',
      user: user.sanitize()
    });
  } catch (error) {
    logger.error('[Auth Signup Error]:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user credentials and sets httpOnly session cookie.
 * Returns generic "Invalid email or password" on failure.
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
      // Generic error - never reveal whether the email exists or not
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Generic error - never reveal whether the email exists or not
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    logger.info(`[Auth] User logged in: ${user.email}`);

    // Return sanitized user object without token in response body
    return res.json({
      message: 'Login successful',
      user: user.sanitize()
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
 * Protected route, verifies JWT from cookie, returns current user's info minus password hash.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    return res.json({ user: user.sanitize() });
  } catch (error) {
    logger.error('[Auth Me Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve session profile.' });
  }
});

export default router;
