import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const MIN_JWT_SECRET_LENGTH = 32;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(name, defaultValue) {
  const raw = process.env[name];
  const value = raw === undefined || raw === '' ? defaultValue : Number(raw);

  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`Invalid environment variable: ${name}`);
  }

  return value;
}

const jwtSecret = getRequiredEnv('JWT_SECRET');
if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
  throw new Error(`Invalid environment variable: JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
}

export const config = Object.freeze({
  app: Object.freeze({
    port: parsePort('PORT', 4000),
  }),
  db: Object.freeze({
    host: getRequiredEnv('DB_HOST'),
    port: parsePort('DB_PORT', 3306),
    user: getRequiredEnv('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    name: getRequiredEnv('DB_NAME'),
  }),
  jwt: Object.freeze({
    secret: jwtSecret,
    tokenTtl: '7d',
  }),
});
