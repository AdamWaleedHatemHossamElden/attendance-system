import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db.js';

const TOKEN_ERROR = { error: 'Invalid or expired token' };

function readBearerToken(req) {
  const header = req.get('authorization');
  if (!header) return { error: 'Missing authorization header' };

  const match = header.match(/^Bearer ([^\s]+)$/);
  if (!match) return { error: 'Malformed authorization header' };

  return { token: match[1] };
}

export async function verifyToken(req, res, next) {
  const { token, error } = readBearerToken(req);
  if (error) return res.status(401).json({ error });

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const userId = Number(payload?.id);

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json(TOKEN_ERROR);
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json(TOKEN_ERROR);
    }

    req.user = rows[0];
    next();
  } catch (e) {
    if (
      e?.name === 'TokenExpiredError' ||
      e?.name === 'JsonWebTokenError' ||
      e?.name === 'NotBeforeError'
    ) {
      return res.status(401).json(TOKEN_ERROR);
    }

    console.error('Authentication lookup failed');
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

export const requireAuth = verifyToken;
