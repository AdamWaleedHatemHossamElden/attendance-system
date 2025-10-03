import { Router } from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js'; // NEW

export const router = Router();

/* ----------------------------- Helpers ----------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function toDateOnly(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function toIntOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ===================================================================
   LIST + SEARCH + FILTERS + SORT + PAGINATION (with attendance counts)
   GET /api/students
   =================================================================== */
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      name = '',
      phone = '',
      gender = '',
      graduation_year = '',
      sort = 'name_asc',
      page = '1',
      per_page = '10',
    } = req.query;

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const perPageRaw = Math.max(1, parseInt(per_page, 10) || 10);
    const perPage = Math.min(perPageRaw, 100);
    const offset = (pg - 1) * perPage;

    let orderClause = 's.name ASC';
    if (sort === 'name_desc') orderClause = 's.name DESC';
    else if (sort === 'id_desc') orderClause = 's.id DESC';
    else if (sort === 'id_asc') orderClause = 's.id ASC';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM students s
      WHERE (? = '' OR s.name LIKE CONCAT('%', ?, '%')
                  OR s.father_name LIKE CONCAT('%', ?, '%')
                  OR s.last_name   LIKE CONCAT('%', ?, '%'))
        AND (? = '' OR s.phone LIKE CONCAT('%', ?, '%'))
        AND (? = '' OR s.gender = ?)
        AND (? = '' OR s.graduation_year = ?)
    `;
    const countParams = [
      name, name, name, name,
      phone, phone,
      gender, gender,
      graduation_year, graduation_year,
    ];
    const [[{ total }]] = await pool.query(countSql, countParams);

    const rowsSql = `
      SELECT
        s.id,
        s.name,
        s.father_name,
        s.last_name,
        s.address,
        s.phone,
        s.birthdate,
        s.gender,
        s.source,
        s.graduation_year,
        s.notes,
        COALESCE(SUM(a.status = 'Present'), 0) AS present_count,
        COALESCE(SUM(a.status = 'Absent'),  0) AS absent_count
      FROM students s
      LEFT JOIN attendance a ON a.student_id = s.id
      WHERE (? = '' OR s.name LIKE CONCAT('%', ?, '%')
                  OR s.father_name LIKE CONCAT('%', ?, '%')
                  OR s.last_name   LIKE CONCAT('%', ?, '%'))
        AND (? = '' OR s.phone LIKE CONCAT('%', ?, '%'))
        AND (? = '' OR s.gender = ?)
        AND (? = '' OR s.graduation_year = ?)
      GROUP BY
        s.id, s.name, s.father_name, s.last_name, s.address, s.phone, s.birthdate,
        s.gender, s.source, s.graduation_year, s.notes
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `;
    const rowsParams = [
      name, name, name, name,
      phone, phone,
      gender, gender,
      graduation_year, graduation_year,
      perPage, offset,
    ];
    const [rows] = await pool.query(rowsSql, rowsParams);

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

/* =============================== EXPORT ============================= */
/* IMPORTANT: admin-only and placed BEFORE param routes */
router.get('/export', requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id AS ID,
        name AS Name,
        father_name AS FatherName,
        last_name AS LastName,
        address AS Address,
        phone AS Phone,
        birthdate AS Birthdate,
        gender AS Gender,
        source AS Source,
        graduation_year AS GraduationYear,
        notes AS Notes,
        created_at AS CreatedAt
      FROM students
      ORDER BY name ASC
    `);

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, 'Students');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="students.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================ TEMPLATE =============================== */
/* IMPORTANT: admin-only and placed BEFORE param routes */
router.get('/template', requireAdmin, async (_req, res) => {
  try {
    const headers = [
      'Name', 'FatherName', 'LastName', 'Address', 'Phone',
      'Birthdate', 'Gender', 'Source', 'GraduationYear', 'Notes'
    ];

    const sample = [{
      Name: 'Adam',
      FatherName: 'Eric',
      LastName: 'Hull',
      Address: 'Cruzchester',
      Phone: '80071',
      Birthdate: '2000-01-15',
      Gender: 'Male',
      Source: 'Manual',
      GraduationYear: 2027,
      Notes: 'Optional notes here'
    }];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(sample, { header: headers });

    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    ws['!cols'] = [
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 30 },
    ];

    xlsx.utils.book_append_sheet(wb, ws, 'Template');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="students_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ================================ IMPORT ============================= */
router.post('/import', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'File is required' });
    }
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.SheetNames[0];
    if (!sheet) return res.status(400).json({ error: 'Empty file' });

    const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' });

    let inserted = 0, updated = 0, skipped = 0;
    const errors = [];

    for (const [i, r] of rows.entries()) {
      const name = (r.Name ?? r.name ?? '').toString().trim();
      const father_name = (r.FatherName ?? r.father_name ?? '').toString().trim() || null;
      const last_name = (r.LastName ?? r.last_name ?? '').toString().trim() || null;
      const address = (r.Address ?? r.address ?? '').toString().trim() || null;
      const phone = (r.Phone ?? r.phone ?? '').toString().trim();
      const birthdate = toDateOnly((r.Birthdate ?? r.birthdate ?? '').toString().trim() || null);
      const gender = (r.Gender ?? r.gender ?? '').toString().trim() || null;
      const source = (r.Source ?? r.source ?? '').toString().trim() || null;
      const gy = toIntOrNull((r.GraduationYear ?? r.graduation_year ?? r.graduationYear ?? '').toString().trim());
      const notes = (r.Notes ?? r.notes ?? '').toString().trim() || null;

      if (!name || !phone) { skipped++; errors.push(`Row ${i + 2}: missing name or phone`); continue; }

      try {
        const [result] = await pool.query(
          `INSERT INTO students
             (name, father_name, last_name, address, phone, birthdate, gender, source, graduation_year, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name=VALUES(name),
             father_name=VALUES(father_name),
             last_name=VALUES(last_name),
             address=VALUES(address),
             birthdate=VALUES(birthdate),
             gender=VALUES(gender),
             source=VALUES(source),
             graduation_year=VALUES(graduation_year),
             notes=VALUES(notes)`,
          [name, father_name, last_name, address, phone, birthdate, gender, source, gy, notes]
        );
        if (result.affectedRows === 1) inserted++;
        else if (result.affectedRows === 2) updated++;
      } catch (e) {
        skipped++;
        errors.push(`Row ${i + 2}: ${e.code || e.message}`);
      }
    }

    res.json({ inserted, updated, skipped, errors });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =============================== CREATE ============================== */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      father_name = null,
      last_name = null,
      address = null,
      phone,
      birthdate = null,
      gender = null,
      source = null,
      graduation_year = null,
      notes = null,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const [r] = await pool.query(
      `INSERT INTO students
        (name, father_name, last_name, address, phone, birthdate, gender, source, graduation_year, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        father_name || null,
        last_name || null,
        address || null,
        phone,
        toDateOnly(birthdate),
        gender || null,
        source || null,
        toIntOrNull(graduation_year),
        notes || null,
      ]
    );

    res.status(201).json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Duplicate (phone) detected' });
    }
    res.status(500).json({ error: e.message });
  }
});

/* =============================== UPDATE ============================== */
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const {
      name,
      father_name = null,
      last_name = null,
      address = null,
      phone,
      birthdate = null,
      gender = null,
      source = null,
      graduation_year = null,
      notes = null,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    await pool.query(
      `UPDATE students
         SET name=?,
             father_name=?,
             last_name=?,
             address=?,
             phone=?,
             birthdate=?,
             gender=?,
             source=?,
             graduation_year=?,
             notes=?
       WHERE id=?`,
      [
        name,
        father_name || null,
        last_name || null,
        address || null,
        phone,
        toDateOnly(birthdate),
        gender || null,
        source || null,
        toIntOrNull(graduation_year),
        notes || null,
        id,
      ]
    );

    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Duplicate (phone) detected' });
    }
    res.status(500).json({ error: e.message });
  }
});

/* =============================== DELETE ============================== */
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM attendance WHERE student_id = ?', [id]);
    await pool.query('DELETE FROM students WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ========================= UPDATE NOTES ONLY ========================= */
router.put('/:id/notes', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  try {
    await pool.query('UPDATE students SET notes=? WHERE id=?', [notes || null, id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ========================== GET ONE (keep last) ===================== */
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `
      SELECT
        s.*,
        COALESCE(SUM(a.status = 'Present'), 0) AS present_count,
        COALESCE(SUM(a.status = 'Absent'),  0) AS absent_count
      FROM students s
      LEFT JOIN attendance a ON a.student_id = s.id
      WHERE s.id = ?
      GROUP BY s.id
      `,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =================== SESSIONS FOR A STUDENT (keep last) ============= */
router.get('/:id/sessions', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `
      SELECT
        a.session_id,
        a.status,
        a.marked_at,
        se.*
      FROM attendance a
      JOIN sessions se ON se.id = a.session_id
      WHERE a.student_id = ?
      ORDER BY COALESCE(a.marked_at, se.id) DESC
      `,
      [id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
