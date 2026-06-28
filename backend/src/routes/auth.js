// src/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

export const router = Router();

const TOKEN_TTL = config.jwt.tokenTtl;

function normEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/* ================================ LOGIN ===============================
POST /api/auth/login
Body: { email, password }
Returns: { token, user: { id, name, email, role } }
====================================================================== */
router.post('/login', async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const user = { id: u.id, name: u.name, email: u.email, role: u.role };
    const token = jwt.sign(user, config.jwt.secret, { expiresIn: TOKEN_TTL });

    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ================================= ME =================================
GET /api/auth/me
Headers: Authorization: Bearer <token>
Returns: { user: { id, name, email, role } }
====================================================================== */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.json({ user: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
