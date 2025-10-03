// src/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { pool } from './db.js';

// Routers
import { router as authRouter } from './routes/auth.js';
import { router as studentsRouter } from './routes/students.js';
import { router as sessionsRouter } from './routes/sessions.js';
import { router as attendanceRouter } from './routes/attendance.js';
import { router as reportsRouter } from './routes/reports.js';
import { router as adminsRouter } from './routes/admins.js'; // NEW

// Auth middleware
import { verifyToken as requireAuth, requireAdmin } from './middleware/auth.js';

dotenv.config();

const app = express();

/**
 * CORS – allow Vite dev server and Authorization header
 */
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
// ⛔️ Do NOT use `app.options('*', ...)` on Express 5 — it breaks path-to-regexp
// If you really want an explicit preflight handler, use:
// app.options('/:path(.*)', cors());

app.use(express.json());

/**
 * Public routes
 * (Login + Me under /api/auth; no public signup)
 */
app.use('/api/auth', authRouter);

/**
 * Protected routes (token required)
 */
app.use('/api/students', requireAuth, studentsRouter);
app.use('/api/sessions', requireAuth, sessionsRouter);
app.use('/api/attendance', requireAuth, attendanceRouter);

/**
 * Admin-only routes
 */
app.use('/api/reports', requireAuth, requireAdmin, reportsRouter);
app.use('/api/admins', requireAuth, requireAdmin, adminsRouter); // NEW: manage admins

/**
 * Health check (optional)
 */
app.get('/api/health', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ status: 'ok', db: rows[0].result });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * 404 catch-all (no '*')
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * Global error handler
 */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
