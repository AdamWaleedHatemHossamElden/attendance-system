import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../database/migrations');

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required database environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const connectionConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  multipleStatements: true,
};

async function ensureMigrationTable(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_schema_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getAppliedMigrations(connection) {
  const [rows] = await connection.execute('SELECT filename FROM schema_migrations');
  return new Set(rows.map((row) => row.filename));
}

async function getMigrationFiles() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function run() {
  let connection;

  try {
    connection = await mysql.createConnection(connectionConfig);
    await ensureMigrationTable(connection);

    const applied = await getAppliedMigrations(connection);
    const files = await getMigrationFiles();
    const pending = files.filter((file) => !applied.has(file));

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    for (const file of pending) {
      const fullPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(fullPath, 'utf8');

      console.log(`Applying migration: ${file}`);
      try {
        await connection.beginTransaction();
        await connection.query(sql);
        await connection.execute(
          'INSERT INTO schema_migrations (filename) VALUES (?)',
          [file]
        );
        await connection.commit();
        console.log(`Applied migration: ${file}`);
      } catch (error) {
        await connection.rollback();
        console.error(`Migration failed: ${file}`);
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
    }

    console.log('All pending migrations applied successfully.');
  } catch (error) {
    console.error('Database migration failed.');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

run();
