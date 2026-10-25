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
        role VARCHAR(20) NOT NULL DEFAULT 'member',
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
        is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
        flagged_reason TEXT,
        flagged_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // ── task_assistants — peer-help offers ───────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS task_assistants (
        id            SERIAL PRIMARY KEY,
        task_id       INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        -- 'offered'  → member volunteered
        -- 'accepted' → assignee / leader accepted the offer
        -- 'declined' → assignee / leader declined
        status        VARCHAR(20) NOT NULL DEFAULT 'offered'
                        CHECK (status IN ('offered', 'accepted', 'declined')),
        message       TEXT,         -- optional message from the helper
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (task_id, user_id)   -- one active offer per user per task
      );
    `;
    try { await sql`CREATE INDEX IF NOT EXISTS idx_task_assistants_task_id ON task_assistants(task_id)`; } catch (e) {}
    try { await sql`CREATE INDEX IF NOT EXISTS idx_task_assistants_user_id ON task_assistants(user_id)`; } catch (e) {}

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

    // ── Collaborative Notebook Module ──────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS notebooks (
        id            SERIAL PRIMARY KEY,
        group_id      INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        title         TEXT    NOT NULL,
        description   TEXT,
        -- 'shared'  => all workspace members can view; explicit grants control edit/admin
        -- 'private' => only explicitly granted members can see or interact
        visibility    VARCHAR(10) NOT NULL DEFAULT 'shared'
                        CHECK (visibility IN ('shared', 'private')),
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS notebook_pages (
        id          SERIAL PRIMARY KEY,
        notebook_id INTEGER NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
        title       TEXT    NOT NULL,
        content     TEXT,
        position    INTEGER NOT NULL DEFAULT 0,   -- display order within notebook
        author_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        last_edited_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS notebook_permissions (
        id          SERIAL PRIMARY KEY,
        notebook_id INTEGER NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
        user_id     INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
        -- Granular roles: viewer | editor | admin
        role        VARCHAR(10) NOT NULL DEFAULT 'viewer'
                      CHECK (role IN ('viewer', 'editor', 'admin')),
        granted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (notebook_id, user_id)
      );
    `;
    // ─── Indexes for hot lookup paths ──────────────────────────────────────────
    try { await sql`CREATE INDEX IF NOT EXISTS idx_notebooks_group_id ON notebooks(group_id)`; } catch (e) {}
    try { await sql`CREATE INDEX IF NOT EXISTS idx_notebook_pages_notebook_id ON notebook_pages(notebook_id)`; } catch (e) {}
    try { await sql`CREATE INDEX IF NOT EXISTS idx_notebook_permissions_notebook_user ON notebook_permissions(notebook_id, user_id)`; } catch (e) {}

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
    // Peer-assist / flagging columns (new)
    try { await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT FALSE`; } catch (e) {}
    try { await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS flagged_reason TEXT`; } catch (e) {}
    try { await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ`; } catch (e) {}

    // notes table migrations
    try { await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_pinned INTEGER DEFAULT 0`; } catch (e) {}
    try { await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags TEXT`; } catch (e) {}
    try { await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS author_user_id INTEGER`; } catch (e) {}
    try { await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`; } catch (e) {}

    // notebooks table migrations
    try { await sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS description TEXT`; } catch (e) {}
    try { await sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) NOT NULL DEFAULT 'shared'`; } catch (e) {}
    try { await sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`; } catch (e) {}

    // notebook_pages table migrations
    try { await sql`ALTER TABLE notebook_pages ADD COLUMN IF NOT EXISTS content TEXT`; } catch (e) {}
    try { await sql`ALTER TABLE notebook_pages ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0`; } catch (e) {}
    try { await sql`ALTER TABLE notebook_pages ADD COLUMN IF NOT EXISTS last_edited_by_user_id INTEGER`; } catch (e) {}
    try { await sql`ALTER TABLE notebook_pages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`; } catch (e) {}

    // notebook_permissions table migrations
    try { await sql`ALTER TABLE notebook_permissions ADD COLUMN IF NOT EXISTS granted_by_user_id INTEGER`; } catch (e) {}
    try { await sql`ALTER TABLE notebook_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`; } catch (e) {}

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

    // discussion_mentions — every row is pinned to one workspace (group_id)
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS discussion_mentions (
          id SERIAL PRIMARY KEY,
          group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          discussion_id INTEGER NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
          comment_id INTEGER NOT NULL REFERENCES discussion_comments(id) ON DELETE CASCADE,
          mentioned_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
          mentioned_topic_id INTEGER REFERENCES discussions(id) ON DELETE CASCADE,
          author_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      try { await sql`ALTER TABLE discussion_mentions ADD COLUMN IF NOT EXISTS mentioned_topic_id INTEGER REFERENCES discussions(id) ON DELETE CASCADE`; } catch (e) {}
      try { await sql`ALTER TABLE discussion_mentions ALTER COLUMN mentioned_user_id DROP NOT NULL`; } catch (e) {}
      await sql`CREATE INDEX IF NOT EXISTS idx_discussion_mentions_user_group ON discussion_mentions (mentioned_user_id, group_id)`;
      try { await sql`CREATE INDEX IF NOT EXISTS idx_discussion_mentions_topic ON discussion_mentions (mentioned_topic_id, group_id)`; } catch (e) {}
    } catch (e) { console.error('discussion_mentions init failed:', e.message); }

    // Standardize group_members roles strictly as 'leader' | 'member'
    try { await sql`ALTER TABLE group_members ALTER COLUMN role SET DEFAULT 'member'`; } catch (e) {}
    try { await sql`UPDATE group_members SET role = LOWER(role) WHERE role <> LOWER(role)`; } catch (e) {}

    // Workspace settings column
    try { await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'`; } catch (e) {}

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