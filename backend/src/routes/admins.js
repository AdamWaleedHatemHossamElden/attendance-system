// src/routes/admins.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { isDuplicateEntry, sendInternalError } from '../utils/errors.js';
import { normalizeEmail, parsePositiveInt, requireTrimmedString } from '../utils/validation.js';

export const router = Router();

/**
 * GET /api/admins
 * List admins (id, name, email, role)
 */
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role
         FROM users
        WHERE role = 'admin'
        ORDER BY id DESC`
    );
    res.json(rows);
  } catch (e) {
    return sendInternalError(res, 'Failed to list admins');
  }
});

/**
 * POST /api/admins
 * Create admin (name, email, password) -> { id, name, email, role:'admin' }
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const nameResult = requireTrimmedString(req.body?.name, 'name');
    const emailResult = normalizeEmail(req.body?.email);

    if (nameResult.error || typeof req.body?.password !== 'string' || !req.body.password.trim()) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (emailResult.error) return res.status(400).json({ error: emailResult.error });

    const name = nameResult.value;
    const email = emailResult.value;
    const password = req.body.password;

    // Enforce unique email
    const [exists] = await pool.query(`SELECT id FROM users WHERE email = ?`, [email]);
    if (exists.length) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const password_hash = await bcrypt.hash(String(password), 10);
    const [r] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, 'admin')`,
      [name, email, password_hash]
    );

    res.status(201).json({ id: r.insertId, name, email, role: 'admin' });
  } catch (e) {
    if (isDuplicateEntry(e)) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    return sendInternalError(res, 'Failed to create admin');
  }
});

/**
 * DELETE /api/admins/:id
 * Delete an admin (cannot delete yourself; must leave at least 1 admin)
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const idResult = parsePositiveInt(req.params.id, 'id');
    if (idResult.error) return res.status(400).json({ error: idResult.error });
    const id = idResult.value;

    // Can't delete yourself
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Count admins — must keep at least one
    const [[cnt]] = await pool.query(`SELECT COUNT(*) AS c FROM users WHERE role = 'admin'`);
    if (Number(cnt.c) <= 1) {
      return res.status(400).json({ error: 'At least one admin must remain' });
    }

    // Ensure target is an admin
    const [[row]] = await pool.query(`SELECT id, role FROM users WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ error: 'Admin not found' });
    if (row.role !== 'admin') {
      return res.status(400).json({ error: 'Target user is not an admin' });
    }

    await pool.query(`DELETE FROM users WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    return sendInternalError(res, 'Failed to delete admin');
  }
});

export default router;
