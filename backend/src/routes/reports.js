import { Router } from 'express';
import { pool } from '../db.js';
import xlsx from 'xlsx';
import { requireAdmin } from '../middleware/auth.js';

export const router = Router();

/**
 * GET /api/reports/summary
 * Totals for dashboard tiles: students, sessions, attendance records
 */
router.get('/summary', requireAdmin, async (req, res) => {
  const [[students]] = await pool.query('SELECT COUNT(*) AS total_students FROM students');
  const [[sessions]] = await pool.query('SELECT COUNT(*) AS total_sessions FROM sessions');
  const [[att]] = await pool.query('SELECT COUNT(*) AS total_attendance FROM attendance');
  res.json({
    total_students: students.total_students,
    total_sessions: sessions.total_sessions,
    total_attendance: att.total_attendance,
  });
});

/**
 * GET /api/reports/students-by-birthyear
 * Bar chart dataset: count of students grouped by YEAR(birthdate)
 */
router.get('/students-by-birthyear', requireAdmin, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT YEAR(birthdate) AS birth_year, COUNT(*) AS count
    FROM students
    WHERE birthdate IS NOT NULL
    GROUP BY YEAR(birthdate)
    ORDER BY birth_year
  `);
  res.json(rows);
});

/**
 * GET /api/reports/students-by-graduation-year
 * Bar chart dataset: count grouped by graduation_year
 */
router.get('/students-by-graduation-year', requireAdmin, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT graduation_year, COUNT(*) AS count
    FROM students
    WHERE graduation_year IS NOT NULL
    GROUP BY graduation_year
    ORDER BY graduation_year
  `);
  res.json(rows);
});

/**
 * GET /api/reports/gender-distribution
 * Pie dataset: counts per gender
 */
router.get('/gender-distribution', requireAdmin, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT gender, COUNT(*) AS count
    FROM students
    WHERE gender IS NOT NULL
    GROUP BY gender
  `);
  res.json(rows);
});

/**
 * GET /api/reports/birthdays?month=1..12
 * Returns students born in the given month + computed age
 */
router.get('/birthdays', requireAdmin, async (req, res) => {
  const month = parseInt(req.query.month, 10);
  if (Number.isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'month must be 1-12' });
  }
  const [rows] = await pool.query(`
    SELECT
      id, name, phone, address, birthdate, gender, graduation_year,
      TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) AS age
    FROM students
    WHERE birthdate IS NOT NULL AND MONTH(birthdate) = ?
    ORDER BY DAY(birthdate), name
  `, [month]);
  res.json(rows);
});

/**
 * GET /api/reports/birthdays/export?month=1..12
 * Export the birthday list for the month to Excel
 */
router.get('/birthdays/export', requireAdmin, async (req, res) => {
  const month = parseInt(req.query.month, 10);
  if (Number.isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'month must be 1-12' });
  }
  const [rows] = await pool.query(`
    SELECT
      id AS StudentID, name AS Name, phone AS Phone, address AS Address,
      birthdate AS Birthdate, gender AS Gender, graduation_year AS GraduationYear,
      TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) AS Age
    FROM students
    WHERE birthdate IS NOT NULL AND MONTH(birthdate) = ?
    ORDER BY DAY(birthdate), name
  `, [month]);

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Birthdays');

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `birthdays_month_${month}.xlsx`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

/* ==================================================================
   NEW (paginated): exact-count query for Present / Absent totals
   Example: GET /api/reports/students-by-count?present=0&absent=11&page=1&per_page=10
   ================================================================== */
router.get('/students-by-count', requireAdmin, async (req, res) => {
  const present = parseInt(req.query.present, 10);
  const absent  = parseInt(req.query.absent, 10);
  let page      = parseInt(req.query.page, 10);
  let perPage   = parseInt(req.query.per_page, 10);

  if ([present, absent].some(n => Number.isNaN(n) || n < 0)) {
    return res.status(400).json({ error: 'present and absent must be non-negative integers' });
  }
  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(perPage) || perPage < 1 || perPage > 200) perPage = 10;

  const offset = (page - 1) * perPage;

  // total count (matching students)
  const [[tot]] = await pool.query(
    `
    SELECT COUNT(*) AS total FROM (
      SELECT s.id,
             COALESCE(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END), 0) AS present_count,
             COALESCE(SUM(CASE WHEN a.status = 'Absent'  THEN 1 ELSE 0 END), 0) AS absent_count
      FROM students s
      LEFT JOIN attendance a ON a.student_id = s.id
      GROUP BY s.id
      HAVING present_count = ? AND absent_count = ?
    ) AS t
    `,
    [present, absent]
  );
  const total = Number(tot?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // page rows
  const [rows] = await pool.query(
    `
    SELECT
      s.id,
      s.name,
      s.phone,
      COALESCE(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END), 0) AS present_count,
      COALESCE(SUM(CASE WHEN a.status = 'Absent'  THEN 1 ELSE 0 END), 0) AS absent_count
    FROM students s
    LEFT JOIN attendance a ON a.student_id = s.id
    GROUP BY s.id, s.name, s.phone
    HAVING present_count = ? AND absent_count = ?
    ORDER BY s.name ASC
    LIMIT ? OFFSET ?
    `,
    [present, absent, perPage, offset]
  );

  const data = rows.map(r => {
    const p = Number(r.present_count || 0);
    const a = Number(r.absent_count  || 0);
    const t = p + a;
    const pct = t ? Math.round((p / t) * 100) : 0;
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      present_count: p,
      absent_count: a,
      total: t,
      percent_present: pct
    };
  });

  res.json({
    present, absent,
    page, per_page: perPage,
    total, total_pages: totalPages,
    rows: data
  });
});

export default router;
