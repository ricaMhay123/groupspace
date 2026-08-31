require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

// Connect to Neon PostgreSQL using serverless HTTP queries
const sql = neon(process.env.DATABASE_URL);

/**
 * Initializes required tables in Neon PostgreSQL if they do not already exist.
 */
async function initDb() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_initials VARCHAR(10),
        status VARCHAR(20) DEFAULT 'offline',
        failed_login_attempts INTEGER DEFAULT 0,
        lockout_until TIMESTAMPTZ,
        last_failed_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        type VARCHAR(30) DEFAULT 'SIGNUP',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        join_code VARCHAR(20) UNIQUE NOT NULL,
        category VARCHAR(50) DEFAULT 'School Project',
        privacy VARCHAR(20) DEFAULT 'public',
        theme VARCHAR(30) DEFAULT 'green',
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(group_id, user_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'MEDIUM',
        status VARCHAR(30) DEFAULT 'TODO',
        assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        approved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        approval_notes TEXT,
        due_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT,
        tags TEXT,
        is_pinned INTEGER DEFAULT 0,
        author_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        category VARCHAR(50) DEFAULT 'General',
        paid_by_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        split_type VARCHAR(20) DEFAULT 'EQUAL',
        date VARCHAR(30),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS expense_splits (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS discussions (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'General',
        author_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS discussion_comments (
        id SERIAL PRIMARY KEY,
        discussion_id INTEGER NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS personal_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        amount NUMERIC(10, 2) DEFAULT 0,
        category VARCHAR(50) DEFAULT 'Personal',
        due_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        event_date TIMESTAMPTZ NOT NULL,
        event_type VARCHAR(30) DEFAULT 'EVENT',
        color VARCHAR(20) DEFAULT '#4f46e5',
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Execute table column migrations to ensure all required columns exist in pre-existing tables
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_initials VARCHAR(10)`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline'`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMPTZ`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`; } catch (e) {}

    // groups table migrations
    try { await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS name TEXT`; } catch (e) {}
    try { await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS description TEXT`; } catch (e) {}
    try { await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS join_code VARCHAR(20)`; } catch (e) {}
    try { await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'School Project'`; } catch (e) {}
    try { await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS privacy VARCHAR(20) DEFAULT 'public'`; } catch (e) {}
    try { await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS theme VARCHAR(30) DEFAULT 'green'`; } catch (e) {}
    try { await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER`; } catch (e) {}
    try { await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`; } catch (e) {}

    // tasks table migrations
    try { await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'MEDIUM'`; } catch (e) {}
    try { await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'TODO'`; } catch (e) {}
    try { await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_user_id INTEGER`; } catch (e) {}
    try { await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER`; } catch (e) {}
    try { await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_by_user_id INTEGER`; } catch (e) {}
    try { await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approval_notes TEXT`; } catch (e) {}
    try { await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ`; } catch (e) {}
    try { await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`; } catch (e) {}

    // notes table migrations
    try { await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_pinned INTEGER DEFAULT 0`; } catch (e) {}
    try { await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags TEXT`; } catch (e) {}
    try { await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS author_user_id INTEGER`; } catch (e) {}
    try { await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`; } catch (e) {}

    // expenses table migrations
    try { await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General'`; } catch (e) {}
    try { await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_by_user_id INTEGER`; } catch (e) {}
    try { await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS split_type VARCHAR(20) DEFAULT 'EQUAL'`; } catch (e) {}
    try { await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS date VARCHAR(30)`; } catch (e) {}
    try { await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT`; } catch (e) {}

    // discussions table migrations
    try { await sql`ALTER TABLE discussions ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General'`; } catch (e) {}
    try { await sql`ALTER TABLE discussions ADD COLUMN IF NOT EXISTS author_user_id INTEGER`; } catch (e) {}

    // personal_items table migrations
    try { await sql`ALTER TABLE personal_items ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING'`; } catch (e) {}
    try { await sql`ALTER TABLE personal_items ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) DEFAULT 0`; } catch (e) {}
    try { await sql`ALTER TABLE personal_items ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Personal'`; } catch (e) {}
    try { await sql`ALTER TABLE personal_items ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ`; } catch (e) {}

    // Relax any legacy NOT NULL constraints
    try { await sql`ALTER TABLE groups ALTER COLUMN group_name DROP NOT NULL`; } catch (e) {}
    try { await sql`ALTER TABLE groups ALTER COLUMN created_by DROP NOT NULL`; } catch (e) {}
    try { await sql`ALTER TABLE tasks ALTER COLUMN assigned_to DROP NOT NULL`; } catch (e) {}
    try { await sql`ALTER TABLE tasks ALTER COLUMN is_blocked DROP NOT NULL`; } catch (e) {}
    try { await sql`ALTER TABLE expenses ALTER COLUMN paid_by DROP NOT NULL`; } catch (e) {}

    // Sync legacy columns to current column names if needed
    try { await sql`UPDATE groups SET name = group_name WHERE name IS NULL AND group_name IS NOT NULL`; } catch (e) {}
    try { await sql`UPDATE groups SET created_by_user_id = created_by WHERE created_by_user_id IS NULL AND created_by IS NOT NULL`; } catch (e) {}
    try { await sql`UPDATE groups SET join_code = 'GS-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6)) WHERE join_code IS NULL`; } catch (e) {}
    try { await sql`UPDATE tasks SET assigned_to_user_id = assigned_to WHERE assigned_to_user_id IS NULL AND assigned_to IS NOT NULL`; } catch (e) {}
    try { await sql`UPDATE expenses SET paid_by_user_id = paid_by WHERE paid_by_user_id IS NULL AND paid_by IS NOT NULL`; } catch (e) {}

    console.log('✅ Neon PostgreSQL database schema verified successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize Neon PostgreSQL database tables:', err.message);
  }
}

// Attach helper
sql.initDb = initDb;

module.exports = sql;