import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Authentication & Authorization Middleware
 * Verifies JWT token from cookies or authorization header.
 */
export const requireAuth = (req, res, next) => {
  let token = null;

  // 1. Check Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      token = parts[1].trim();
    } else {
      token = authHeader.trim();
    }
  }

  // 2. Check Cookie
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    console.log(`[AUTH_MIDDLEWARE] 401 Unauthorized: No token provided. Origin: ${req.headers.origin} | Path: ${req.originalUrl}`);
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    console.log(`[AUTH_MIDDLEWARE] 401 Unauthorized: Invalid or expired token (${err.message}) | Path: ${req.originalUrl}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const requireRole = (roleOrRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const allowed = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions for this resource' });
    }
    next();
  };
};
