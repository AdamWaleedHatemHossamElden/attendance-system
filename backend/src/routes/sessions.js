import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const router = Router();

/* ============================== LIST =============================== */
// GET /api/sessions  (readable by any authenticated user)
// Adds present_count and absent_count per session.
router.get('/', requireAuth, async (req, res) => {
  try {
    const { title = '' } = req.query;

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
    res.status(500).json({ error: e.message });
  }
});

/* ============================== CREATE ============================= */
// POST /api/sessions  (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, session_date } = req.body;
    if (!title || !session_date) {
      return res.status(400).json({ error: 'Title and session_date are required' });
    }
    const [r] = await pool.query(
      `INSERT INTO sessions (title, session_date) VALUES (?, ?)`,
      [title, session_date]
    );
    // return shape compatible with list view (counts default to 0 for a new session)
    res.status(201).json({ id: r.insertId, title, session_date, present_count: 0, absent_count: 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =============================== UPDATE ============================ */
// PUT /api/sessions/:id  (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { title, session_date } = req.body;
    if (!title || !session_date) {
      return res.status(400).json({ error: 'Title and session_date are required' });
    }
    await pool.query(
      `UPDATE sessions SET title = ?, session_date = ? WHERE id = ?`,
      [title, session_date, id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =============================== DELETE ============================ */
// DELETE /api/sessions/:id  (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Clean related attendance rows, then the session
    await pool.query(`DELETE FROM attendance WHERE session_id = ?`, [id]);
    await pool.query(`DELETE FROM sessions WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
