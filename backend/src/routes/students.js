import { Router } from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { isDuplicateEntry, sendInternalError } from '../utils/errors.js';
import {
  optionalDateOnly,
  optionalEnum,
  optionalTrimmedString,
  parseOptionalPositiveInt,
  parsePagination,
  parsePositiveInt,
  requireTrimmedString,
} from '../utils/validation.js';

export const router = Router();

/* ----------------------------- Helpers ----------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function formatDateParts(year, month, day) {
  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
}

function normalizeImportBirthdate(value) {
  if (value === undefined || value === null || value === '') return { value: null };

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { value: null };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { error: 'invalid birthdate' };
    const dateResult = optionalDateOnly(trimmed, 'birthdate');
    if (dateResult.error) return { error: 'invalid birthdate' };
    return { value: dateResult.value };
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return { error: 'invalid birthdate' };
    const normalized = formatDateParts(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate()
    );
    const dateResult = optionalDateOnly(normalized, 'birthdate');
    if (dateResult.error) return { error: 'invalid birthdate' };
    return { value: dateResult.value };
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (!parsed) return { error: 'invalid birthdate' };
    const normalized = formatDateParts(parsed.y, parsed.m, parsed.d);
    const dateResult = optionalDateOnly(normalized, 'birthdate');
    if (dateResult.error) return { error: 'invalid birthdate' };
    return { value: dateResult.value };
  }

  return { error: 'invalid birthdate' };
}

function readStudentPayload(body) {
  const name = requireTrimmedString(body?.name, 'Name');
  const phone = requireTrimmedString(body?.phone, 'Phone');
  if (name.error || phone.error) {
    return { error: 'Name and phone are required' };
  }

  const birthdate = optionalDateOnly(body?.birthdate, 'birthdate');
  if (birthdate.error) return { error: birthdate.error };

  const gender = optionalEnum(body?.gender, ['Male', 'Female'], 'gender');
  if (gender.error) return { error: gender.error };

  const graduationYear = parseOptionalPositiveInt(body?.graduation_year, 'graduation_year');
  if (graduationYear.error) return { error: graduationYear.error };
  if (graduationYear.value !== null && graduationYear.value > 65535) {
    return { error: 'graduation_year must be less than or equal to 65535' };
  }

  return {
    value: {
      name: name.value,
      father_name: optionalTrimmedString(body?.father_name),
      last_name: optionalTrimmedString(body?.last_name),
      address: optionalTrimmedString(body?.address),
      phone: phone.value,
      birthdate: birthdate.value,
      gender: gender.value,
      source: optionalTrimmedString(body?.source),
      graduation_year: graduationYear.value,
      notes: optionalTrimmedString(body?.notes),
    },
  };
}

/* ===================================================================
   LIST + SEARCH + FILTERS + SORT + PAGINATION (with attendance counts)
   GET /api/students
   =================================================================== */
router.get('/', async (req, res) => {
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

    const paging = parsePagination(req.query, { defaultPage: 1, defaultPerPage: 10, maxPerPage: 100 });
    if (paging.error) return res.status(400).json({ error: paging.error });

    const safeName = optionalTrimmedString(name) || '';
    const safePhone = optionalTrimmedString(phone) || '';
    const safeGender = optionalTrimmedString(gender) || '';
    if (safeGender && !['Male', 'Female'].includes(safeGender)) {
      return res.status(400).json({ error: 'gender must be one of: Male, Female' });
    }
    const safeGraduationYear = optionalTrimmedString(graduation_year) || '';
    if (safeGraduationYear && parseOptionalPositiveInt(safeGraduationYear, 'graduation_year').error) {
      return res.status(400).json({ error: 'graduation_year must be a positive integer' });
    }

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
      safeName, safeName, safeName, safeName,
      safePhone, safePhone,
      safeGender, safeGender,
      safeGraduationYear, safeGraduationYear,
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
      safeName, safeName, safeName, safeName,
      safePhone, safePhone,
      safeGender, safeGender,
      safeGraduationYear, safeGraduationYear,
      paging.perPage, paging.offset,
    ];
    const [rows] = await pool.query(rowsSql, rowsParams);

    res.json({
      page: paging.page,
      per_page: paging.perPage,
      total,
      total_pages: Math.max(1, Math.ceil(total / paging.perPage)),
      rows,
    });
  } catch (e) {
    return sendInternalError(res, 'Failed to list students');
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
    return sendInternalError(res, 'Failed to export students');
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
    return sendInternalError(res, 'Failed to build student import template');
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
      const birthdateResult = normalizeImportBirthdate(r.Birthdate ?? r.birthdate ?? null);
      const gender = (r.Gender ?? r.gender ?? '').toString().trim() || null;
      const source = (r.Source ?? r.source ?? '').toString().trim() || null;
      const gyResult = parseOptionalPositiveInt((r.GraduationYear ?? r.graduation_year ?? r.graduationYear ?? '').toString().trim(), 'graduation_year');
      const notes = (r.Notes ?? r.notes ?? '').toString().trim() || null;

      if (!name || !phone) { skipped++; errors.push(`Row ${i + 2}: missing name or phone`); continue; }
      if (birthdateResult.error) { skipped++; errors.push(`Row ${i + 2}: invalid birthdate`); continue; }
      if (gender && !['Male', 'Female'].includes(gender)) { skipped++; errors.push(`Row ${i + 2}: invalid gender`); continue; }
      if (gyResult.error || (gyResult.value !== null && gyResult.value > 65535)) {
        skipped++; errors.push(`Row ${i + 2}: invalid graduation year`); continue;
      }

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
          [name, father_name, last_name, address, phone, birthdateResult.value, gender, source, gyResult.value, notes]
        );
        if (result.affectedRows === 1) inserted++;
        else if (result.affectedRows === 2) updated++;
      } catch (e) {
        skipped++;
        errors.push(`Row ${i + 2}: could not import student`);
      }
    }

    res.json({ inserted, updated, skipped, errors });
  } catch (e) {
    return sendInternalError(res, 'Failed to import students');
  }
});

/* =============================== CREATE ============================== */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const payload = readStudentPayload(req.body);
    if (payload.error) return res.status(400).json({ error: payload.error });
    const student = payload.value;

    const [r] = await pool.query(
      `INSERT INTO students
        (name, father_name, last_name, address, phone, birthdate, gender, source, graduation_year, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student.name,
        student.father_name,
        student.last_name,
        student.address,
        student.phone,
        student.birthdate,
        student.gender,
        student.source,
        student.graduation_year,
        student.notes,
      ]
    );

    res.status(201).json({ id: r.insertId });
  } catch (e) {
    if (isDuplicateEntry(e)) {
      return res.status(409).json({ error: 'Duplicate (phone) detected' });
    }
    return sendInternalError(res, 'Failed to create student');
  }
});

/* =============================== UPDATE ============================== */
router.put('/:id', requireAdmin, async (req, res) => {
  const idResult = parsePositiveInt(req.params.id, 'id');
  if (idResult.error) return res.status(400).json({ error: idResult.error });
  const id = idResult.value;
  try {
    const payload = readStudentPayload(req.body);
    if (payload.error) return res.status(400).json({ error: payload.error });
    const student = payload.value;

    const [result] = await pool.query(
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
        student.name,
        student.father_name,
        student.last_name,
        student.address,
        student.phone,
        student.birthdate,
        student.gender,
        student.source,
        student.graduation_year,
        student.notes,
        id,
      ]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ ok: true });
  } catch (e) {
    if (isDuplicateEntry(e)) {
      return res.status(409).json({ error: 'Duplicate (phone) detected' });
    }
    return sendInternalError(res, 'Failed to update student');
  }
});

/* =============================== DELETE ============================== */
router.delete('/:id', requireAdmin, async (req, res) => {
  const idResult = parsePositiveInt(req.params.id, 'id');
  if (idResult.error) return res.status(400).json({ error: idResult.error });
  const id = idResult.value;
  try {
    const [result] = await pool.query('DELETE FROM students WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ ok: true });
  } catch (e) {
    return sendInternalError(res, 'Failed to delete student');
  }
});

/* ========================= UPDATE NOTES ONLY ========================= */
router.put('/:id/notes', requireAdmin, async (req, res) => {
  const idResult = parsePositiveInt(req.params.id, 'id');
  if (idResult.error) return res.status(400).json({ error: idResult.error });
  const id = idResult.value;
  const notes = optionalTrimmedString(req.body?.notes);
  try {
    const [result] = await pool.query('UPDATE students SET notes=? WHERE id=?', [notes, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ ok: true });
  } catch (e) {
    return sendInternalError(res, 'Failed to update student notes');
  }
});

/* ========================== GET ONE (keep last) ===================== */
router.get('/:id', async (req, res) => {
  const idResult = parsePositiveInt(req.params.id, 'id');
  if (idResult.error) return res.status(400).json({ error: idResult.error });
  const id = idResult.value;
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
    return sendInternalError(res, 'Failed to load student');
  }
});

/* =================== SESSIONS FOR A STUDENT (keep last) ============= */
router.get('/:id/sessions', async (req, res) => {
  const idResult = parsePositiveInt(req.params.id, 'id');
  if (idResult.error) return res.status(400).json({ error: idResult.error });
  const id = idResult.value;
  try {
    const [studentRows] = await pool.query('SELECT id FROM students WHERE id = ? LIMIT 1', [id]);
    if (studentRows.length === 0) return res.status(404).json({ error: 'Student not found' });

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
    return sendInternalError(res, 'Failed to load student sessions');
  }
});

export default router;
