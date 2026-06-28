# Database Recovery

This directory contains the versioned MySQL schema used to reconstruct the
Attendance System database from the application code.

## Migration Order

Migrations run in filename order:

1. `001_create_users.sql`
2. `002_create_students.sql`
3. `003_create_sessions.sql`
4. `004_create_attendance.sql`
5. `005_create_indexes.sql`

The order creates independent tables first, then attendance foreign keys, then
secondary indexes.

## Migration Tracking

The migration runner creates a `schema_migrations` table in the configured
database. Each successfully applied migration filename is recorded there.
Subsequent runs skip already recorded files and apply only pending migrations.

If a migration fails, the runner rolls back that migration transaction, prints
the migration filename and error message, and stops.

## Local Environment

Copy the example environment file and fill in local-only values:

```sh
cp backend/.env.example backend/.env
```

Do not commit `backend/.env` or any other real `.env` file. Real database
passwords, JWT secrets, and administrator seed passwords must stay out of git.

## Run Migrations

From the backend directory:

```sh
npm run db:migrate
```

This connects with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
It does not start the Express server.

## Create The First Administrator

Set these values in your local `backend/.env`:

```sh
SEED_ADMIN_NAME=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

Then run:

```sh
npm run db:seed-admin
```

The seed script hashes the password with bcrypt, inserts an `admin` user, and
skips safely if the email already exists. It never prints the plaintext
password.
