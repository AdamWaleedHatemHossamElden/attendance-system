import { Router } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { sendInternalError } from '../utils/errors.js';
import { optionalTrimmedString, optionalDateOnly, parsePositiveInt, requireTrimmedString } from '../utils/validation.js';

export const router = Router();

/* ============================== LIST =============================== */
// GET /api/sessions  (readable by any authenticated user)
// Adds present_count and absent_count per session.
router.get('/', async (req, res) => {
  try {
    const title = optionalTrimmedString(req.query.title) || '';

    const sql = `
      SELECT
        s.id,
        s.title,
        s.session_date,
        COALESCE(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END), 0) AS present_count,
        COALESCE(SUM(CASE WHEN a.status = 'Absent'  THEN 1 ELSE 0 END), 0) AS absent_count
      FROM sessions s
      LEFT JOIN attendance a ON a.session_id = s.id
      WHERE (? = '' OR s.title LIKE CONCAT('%', ?, '%'))
      GROUP BY s.id, s.title, s.session_date
      ORDER BY s.session_date DESC, s.id DESC
    `;
    const [rows] = await pool.query(sql, [title, title]);
    res.json(rows);
  } catch (e) {
    return sendInternalError(res, 'Failed to list sessions');
  }
});

/* ============================== CREATE ============================= */
// POST /api/sessions  (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const titleResult = requireTrimmedString(req.body?.title, 'Title');
    const dateResult = optionalDateOnly(req.body?.session_date, 'session_date');
    if (titleResult.error || dateResult.error || !dateResult.value) {
      return res.status(400).json({ error: 'Title and session_date are required' });
    }
    const title = titleResult.value;
    const session_date = dateResult.value;
    const [r] = await pool.query(
      `INSERT INTO sessions (title, session_date) VALUES (?, ?)`,
      [title, session_date]
    );
    // return shape compatible with list view (counts default to 0 for a new session)
    res.status(201).json({ id: r.insertId, title, session_date, present_count: 0, absent_count: 0 });
  } catch (e) {
    return sendInternalError(res, 'Failed to create session');
  }
});

/* =============================== UPDATE ============================ */
// PUT /api/sessions/:id  (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  const idResult = parsePositiveInt(req.params.id, 'id');
  if (idResult.error) return res.status(400).json({ error: idResult.error });
  const id = idResult.value;
  try {
    const titleResult = requireTrimmedString(req.body?.title, 'Title');
    const dateResult = optionalDateOnly(req.body?.session_date, 'session_date');
    if (titleResult.error || dateResult.error || !dateResult.value) {
      return res.status(400).json({ error: 'Title and session_date are required' });
    }
    const title = titleResult.value;
    const session_date = dateResult.value;
    const [result] = await pool.query(
      `UPDATE sessions SET title = ?, session_date = ? WHERE id = ?`,
      [title, session_date, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ ok: true });
  } catch (e) {
    return sendInternalError(res, 'Failed to update session');
  }
});

/* =============================== DELETE ============================ */
// DELETE /api/sessions/:id  (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const idResult = parsePositiveInt(req.params.id, 'id');
  if (idResult.error) return res.status(400).json({ error: idResult.error });
  const id = idResult.value;
  try {
    const [result] = await pool.query(`DELETE FROM sessions WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ ok: true });
  } catch (e) {
    return sendInternalError(res, 'Failed to delete session');
  }
});

export default router;
