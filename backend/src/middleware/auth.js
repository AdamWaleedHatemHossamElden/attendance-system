// src/middleware/auth.js
import jwt from 'jsonwebtoken';

export function verifyToken(req, res, next) {
  try {
    const hdr =
      req.headers.authorization ||
      req.headers.Authorization ||
      req.get('authorization') ||
      '';

    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : hdr;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

// ✅ Alias to satisfy existing imports like: import { requireAuth } from '../middleware/auth.js'
export const requireAuth = verifyToken;
