// src/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

export const router = Router();

const TOKEN_TTL = config.jwt.tokenTtl;
const LOGIN_ERROR = { error: 'Invalid email or password' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normEmail(email) {
  return email.trim().toLowerCase();
}

/* ================================ LOGIN ===============================
POST /api/auth/login
Body: { email, password }
Returns: { token, user: { id, name, email, role } }
====================================================================== */
router.post('/login', async (req, res) => {
  try {
    const { email: rawEmail, password: rawPassword } = req.body || {};

    if (typeof rawEmail !== 'string' || typeof rawPassword !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const email = normEmail(rawEmail);
    const password = rawPassword;

    if (!email || !password.trim()) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Email must be valid' });
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json(LOGIN_ERROR);
    }

    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json(LOGIN_ERROR);

    const user = { id: u.id, name: u.name, email: u.email, role: u.role };
    const token = jwt.sign(user, config.jwt.secret, { expiresIn: TOKEN_TTL });

    res.json({ token, user });
  } catch (e) {
    console.error('Login failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ================================= ME =================================
GET /api/auth/me
Headers: Authorization: Bearer <token>
Returns: { user: { id, name, email, role } }
====================================================================== */
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
