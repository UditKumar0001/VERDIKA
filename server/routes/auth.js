import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * Authentication Routes
 * Handles user login, registration, token verification, and logout.
 */

// POST /api/auth/login
router.post('/login', authLimiter, (req, res) => {
  // Placeholder login handler
  res.json({
    message: 'Login endpoint placeholder',
    user: { id: 'mock-1', email: req.body.email || 'underwriter@verdika.internal', role: 'underwriter' },
    token: 'mock-jwt-token'
  });
});

// POST /api/auth/signup
router.post('/signup', authLimiter, (req, res) => {
  // Placeholder signup handler
  res.status(201).json({
    message: 'Signup endpoint placeholder',
    user: { id: 'mock-new', email: req.body.email, role: 'underwriter' },
    token: 'mock-jwt-token'
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
