import { Router } from 'express';
import { pool } from '../db.js';
import xlsx from 'xlsx';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const router = Router();

/* ======================= LIST BY SESSION (paged) ==================== */
// GET /api/attendance/session/:sessionId?page=&per_page=&name=&phone=
router.get('/session/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      page = '1',
      per_page = '10',
      name = '',
      phone = '',
    } = req.query;

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const perPageRaw = Math.max(1, parseInt(per_page, 10) || 10);
    const perPage = Math.min(perPageRaw, 100);
    const offset = (pg - 1) * perPage;

    const [[{ total }]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE a.session_id = ?
        AND (? = '' OR s.name LIKE CONCAT('%', ?, '%'))
        AND (? = '' OR s.phone LIKE CONCAT('%', ?, '%'))
      `,
      [sessionId, name, name, phone, phone]
    );

    const [rows] = await pool.query(
      `
      SELECT
        a.session_id,
        a.student_id,
        a.status,
        a.marked_at,
        s.name,
        s.phone
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE a.session_id = ?
        AND (? = '' OR s.name LIKE CONCAT('%', ?, '%'))
        AND (? = '' OR s.phone LIKE CONCAT('%', ?, '%'))
      ORDER BY s.name ASC, a.student_id ASC
      LIMIT ? OFFSET ?
      `,
      [sessionId, name, name, phone, phone, perPage, offset]
    );

    res.json({
      page: pg,
      per_page: perPage,
      total,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
      rows,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================ SEED ABSENT =========================== */
// POST /api/attendance/seed/:sessionId  (admin only)
router.post('/seed/:sessionId', requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Insert Absent rows for any student not in this session yet (idempotent)
    await pool.query(
      `
      INSERT INTO attendance (session_id, student_id, status)
      SELECT ?, s.id, 'Absent'
      FROM students s
      WHERE NOT EXISTS (
        SELECT 1 FROM attendance a
        WHERE a.session_id = ? AND a.student_id = s.id
      )
      `,
      [sessionId, sessionId]
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================== MARK ================================ */
// POST /api/attendance/mark  (admin only)
// Body: { session_id, student_id, status: 'Present'|'Absent' }
router.post('/mark', requireAdmin, async (req, res) => {
  try {
    const { session_id, student_id, status } = req.body;
    if (!session_id || !student_id || !['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ error: 'session_id, student_id, and valid status are required' });
    }

    await pool.query(
      `
      INSERT INTO attendance (session_id, student_id, status, marked_at)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE status = VALUES(status), marked_at = NOW()
      `,
      [session_id, student_id, status]
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================== EXPORT ============================== */
// GET /api/attendance/export/session/:sessionId  (admin only)
router.get('/export/session/:sessionId', requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        s.id AS StudentID,
        s.name AS Name,
        s.phone AS Phone,
        a.status AS Status,
        a.marked_at AS MarkedAt,
        se.title AS Session,
        se.session_date AS SessionDate
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      JOIN sessions se ON se.id = a.session_id
      WHERE a.session_id = ?
      ORDER BY s.name ASC
      `,
      [sessionId]
    );

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, 'Attendance');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="attendance_session_${sessionId}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
