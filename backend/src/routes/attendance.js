import { Router } from 'express';
import { pool } from '../db.js';
import xlsx from 'xlsx';
import { requireAdmin } from '../middleware/auth.js';
import { sendInternalError } from '../utils/errors.js';
import {
  optionalTrimmedString,
  parsePagination,
  parsePositiveInt,
  requireEnum,
} from '../utils/validation.js';

export const router = Router();

/* ======================= LIST BY SESSION (paged) ==================== */
// GET /api/attendance/session/:sessionId?page=&per_page=&name=&phone=
router.get('/session/:sessionId', async (req, res) => {
  try {
    const sessionIdResult = parsePositiveInt(req.params.sessionId, 'sessionId');
    if (sessionIdResult.error) return res.status(400).json({ error: sessionIdResult.error });
    const paging = parsePagination(req.query, { defaultPage: 1, defaultPerPage: 10, maxPerPage: 100 });
    if (paging.error) return res.status(400).json({ error: paging.error });

    const sessionId = sessionIdResult.value;
    const name = optionalTrimmedString(req.query.name) || '';
    const phone = optionalTrimmedString(req.query.phone) || '';

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
      [sessionId, name, name, phone, phone, paging.perPage, paging.offset]
    );

    res.json({
      page: paging.page,
      per_page: paging.perPage,
      total,
      total_pages: Math.max(1, Math.ceil(total / paging.perPage)),
      rows,
    });
  } catch (e) {
    return sendInternalError(res, 'Failed to list attendance');
  }
});

/* ============================ SEED ABSENT =========================== */
// POST /api/attendance/seed/:sessionId  (admin only)
router.post('/seed/:sessionId', requireAdmin, async (req, res) => {
  try {
    const sessionIdResult = parsePositiveInt(req.params.sessionId, 'sessionId');
    if (sessionIdResult.error) return res.status(400).json({ error: sessionIdResult.error });
    const sessionId = sessionIdResult.value;

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
    return sendInternalError(res, 'Failed to seed attendance');
  }
});

/* ============================== MARK ================================ */
// POST /api/attendance/mark  (admin only)
// Body: { session_id, student_id, status: 'Present'|'Absent' }
router.post('/mark', requireAdmin, async (req, res) => {
  try {
    const sessionIdResult = parsePositiveInt(req.body?.session_id, 'session_id');
    const studentIdResult = parsePositiveInt(req.body?.student_id, 'student_id');
    const statusResult = requireEnum(req.body?.status, ['Present', 'Absent'], 'status');
    if (sessionIdResult.error || studentIdResult.error || statusResult.error) {
      return res.status(400).json({ error: 'session_id, student_id, and valid status are required' });
    }
    const session_id = sessionIdResult.value;
    const student_id = studentIdResult.value;
    const status = statusResult.value;

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
    return sendInternalError(res, 'Failed to mark attendance');
  }
});

/* ============================== EXPORT ============================== */
// GET /api/attendance/export/session/:sessionId  (admin only)
router.get('/export/session/:sessionId', requireAdmin, async (req, res) => {
  try {
    const sessionIdResult = parsePositiveInt(req.params.sessionId, 'sessionId');
    if (sessionIdResult.error) return res.status(400).json({ error: sessionIdResult.error });
    const sessionId = sessionIdResult.value;

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
    return sendInternalError(res, 'Failed to export attendance');
  }
});

export default router;
