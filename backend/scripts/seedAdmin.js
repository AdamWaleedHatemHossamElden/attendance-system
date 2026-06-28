import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const requiredDbEnv = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const requiredSeedEnv = [
  'SEED_ADMIN_NAME',
  'SEED_ADMIN_EMAIL',
  'SEED_ADMIN_PASSWORD',
];

const missing = [...requiredDbEnv, ...requiredSeedEnv].filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const password = String(process.env.SEED_ADMIN_PASSWORD);
const minPasswordLength = 10;

if (password.length < minPasswordLength) {
  console.error(`SEED_ADMIN_PASSWORD must be at least ${minPasswordLength} characters long.`);
  process.exit(1);
}

const name = String(process.env.SEED_ADMIN_NAME).trim();
const email = String(process.env.SEED_ADMIN_EMAIL).trim().toLowerCase();

if (!name || !email) {
  console.error('SEED_ADMIN_NAME and SEED_ADMIN_EMAIL must not be blank.');
  process.exit(1);
}

const connectionConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
};

async function run() {
  let connection;

  try {
    connection = await mysql.createConnection(connectionConfig);

    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      console.log(`Admin seed skipped: a user with email ${email} already exists.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await connection.execute(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, 'admin')`,
      [name, email, passwordHash]
    );

    console.log(`Admin user created with id ${result.insertId}.`);
  } catch (error) {
    console.error('Admin seed failed.');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

run();
