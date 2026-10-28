/**
 * Collaborative Notebook Data Models
 *
 * Covers three tables:
 *   - notebooks            : top-level notebook documents linked to a group
 *   - notebook_pages       : ordered pages within a notebook
 *   - notebook_permissions : per-user, per-notebook role grants (viewer|editor|admin)
 */

'use strict';

const sql = require('../../config/db.config');

// ─── Notebook ──────────────────────────────────────────────────────────────────

const NotebookModel = {
  /**
   * Create a new notebook for a group.
   * The creator is automatically granted the 'admin' role via the service layer.
   */
  async create({ groupId, title, description, visibility, createdByUserId }) {
    const [row] = await sql`
      INSERT INTO notebooks (group_id, title, description, visibility, created_by_user_id)
      VALUES (
        ${groupId},
        ${title},
        ${description || null},
        ${visibility || 'shared'},
        ${createdByUserId}
      )
      RETURNING *
    `;
    return row;
  },

  /** Fetch a single notebook by primary key. */
  async findById(id) {
    const [row] = await sql`
      SELECT
        nb.*,
        u.full_name       AS creator_name,
        u.avatar_initials AS creator_initials
      FROM notebooks nb
      LEFT JOIN users u ON nb.created_by_user_id = u.id
      WHERE nb.id = ${id}
    `;
    return row || null;
  },

  /**
   * Fetch all notebooks visible to a specific user inside a group.
   *
   * Visibility rules:
   *   - visibility = 'shared'  => every group member can see it
   *   - visibility = 'private' => only users with an explicit notebook_permissions row
   */
  async findByGroupForUser(groupId, userId) {
    return await sql`
      SELECT DISTINCT
        nb.*,
        u.full_name        AS creator_name,
        u.avatar_initials  AS creator_initials,
        COALESCE(np.role, CASE WHEN nb.visibility = 'shared' THEN 'viewer' ELSE NULL END) AS user_role
      FROM notebooks nb
      LEFT JOIN users u ON nb.created_by_user_id = u.id
      LEFT JOIN notebook_permissions np
             ON np.notebook_id = nb.id AND np.user_id = ${userId}
      WHERE nb.group_id = ${groupId}
        AND COALESCE(nb.is_private, FALSE) = FALSE
        AND (
              nb.visibility = 'shared'
          OR  np.notebook_id IS NOT NULL
        )
      ORDER BY nb.updated_at DESC
    `;
  },

  /** Update mutable fields of a notebook. */
  async update(id, { title, description, visibility }) {
    const current = await this.findById(id);
    if (!current) return null;

    const [updated] = await sql`
      UPDATE notebooks
      SET
        title       = ${title       !== undefined ? title       : current.title},
        description = ${description !== undefined ? description : current.description},
        visibility  = ${visibility  !== undefined ? visibility  : current.visibility},
        updated_at  = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return updated;
  },

  /** Hard-delete a notebook (cascades to pages + permissions). */
  async delete(id) {
    return await sql`DELETE FROM notebooks WHERE id = ${id}`;
  }
};

// ─── Notebook Folders ──────────────────────────────────────────────────────────

const NotebookFolderModel = {
  /** Create a new folder inside a workspace / notebook. */
  async create({ groupId, notebookId, name, createdByUserId }) {
    const [row] = await sql`
      INSERT INTO notebook_folders (group_id, notebook_id, name, created_by_user_id)
      VALUES (${groupId}, ${notebookId || null}, ${name}, ${createdByUserId || null})
      RETURNING *
    `;
    return row;
  },

  /** Fetch all folders for a workspace. */
  async findByGroup(groupId) {
    return await sql`
      SELECT
        f.*,
        u.full_name AS creator_name
      FROM notebook_folders f
      LEFT JOIN users u ON f.created_by_user_id = u.id
      WHERE f.group_id = ${groupId}
        AND COALESCE(f.is_private, FALSE) = FALSE
      ORDER BY f.created_at ASC
    `;
  },

  /** Fetch a single folder by primary key. */
  async findById(id) {
    const [row] = await sql`
      SELECT * FROM notebook_folders WHERE id = ${id}
    `;
    return row || null;
  },

  /** Delete a folder and all pages/notes inside it. */
  async delete(id, groupId) {
    await sql`DELETE FROM notebook_pages WHERE folder_id = ${id}`;
    await sql`DELETE FROM notes WHERE folder_id = ${id}`;
    return await sql`DELETE FROM notebook_folders WHERE id = ${id} AND group_id = ${groupId}`;
  }
};

// ─── Notebook Pages ────────────────────────────────────────────────────────────

const NotebookPageModel = {
  /** Add a new page to a notebook. */
  async create({ notebookId, folderId, title, content, position, authorUserId, permittedEditors }) {
    const editorsJson = JSON.stringify(Array.isArray(permittedEditors) ? permittedEditors : []);
    const [row] = await sql`
      INSERT INTO notebook_pages (
        notebook_id, folder_id, title, content, position,
        author_user_id, last_edited_by_user_id, permitted_editors
      )
      VALUES (
        ${notebookId},
        ${folderId || null},
        ${title},
        ${content || ''},
        ${position ?? 0},
        ${authorUserId},
        ${authorUserId},
        ${editorsJson}::jsonb
      )
      RETURNING *, author_user_id AS created_by
    `;
    return row;
  },

  /** Fetch a single page by id. */
  async findById(id) {
    const [row] = await sql`
      SELECT
        p.*,
        p.author_user_id   AS created_by,
        COALESCE(p.permitted_editors, '[]'::jsonb) AS permitted_editors,
        a.full_name        AS author_name,
        a.avatar_initials  AS author_initials,
        e.full_name        AS last_editor_name,
        f.name             AS folder_name
      FROM notebook_pages p
      LEFT JOIN users a ON p.author_user_id         = a.id
      LEFT JOIN users e ON p.last_edited_by_user_id = e.id
      LEFT JOIN notebook_folders f ON p.folder_id   = f.id
      WHERE p.id = ${id}
    `;
    return row || null;
  },

  /** All pages in a notebook, ordered by position then creation time. */
  async findByNotebook(notebookId) {
    return await sql`
      SELECT
        p.*,
        p.author_user_id   AS created_by,
        COALESCE(p.permitted_editors, '[]'::jsonb) AS permitted_editors,
        a.full_name        AS author_name,
        a.avatar_initials  AS author_initials,
        e.full_name        AS last_editor_name,
        f.name             AS folder_name
      FROM notebook_pages p
      LEFT JOIN users a ON p.author_user_id         = a.id
      LEFT JOIN users e ON p.last_edited_by_user_id = e.id
      LEFT JOIN notebook_folders f ON p.folder_id   = f.id
      WHERE p.notebook_id = ${notebookId}
      ORDER BY p.position ASC, p.created_at ASC
    `;
  },

  /** Update a page's content, folder, or permitted editors. Records last editor. */
  async update(id, { title, content, position, folderId, permittedEditors, editorUserId }) {
    const current = await this.findById(id);
    if (!current) return null;

    const newFolderId = folderId !== undefined ? (folderId === null || folderId === '' ? null : Number(folderId)) : current.folder_id;
    const newPermitted = permittedEditors !== undefined
      ? JSON.stringify(Array.isArray(permittedEditors) ? permittedEditors.map(Number) : [])
      : JSON.stringify(Array.isArray(current.permitted_editors) ? current.permitted_editors : []);

    const [updated] = await sql`
      UPDATE notebook_pages
      SET
        title                  = ${title    !== undefined ? title    : current.title},
        content                = ${content  !== undefined ? content  : current.content},
        position               = ${position !== undefined ? position : current.position},
        folder_id              = ${newFolderId},
        permitted_editors      = ${newPermitted}::jsonb,
        last_edited_by_user_id = ${editorUserId || current.last_edited_by_user_id},
        updated_at             = NOW()
      WHERE id = ${id}
      RETURNING *, author_user_id AS created_by
    `;
    return updated;
  },

  /** Delete a single page. */
  async delete(id) {
    return await sql`DELETE FROM notebook_pages WHERE id = ${id}`;
  }
};

// ─── Notebook Permissions ──────────────────────────────────────────────────────

const NotebookPermissionModel = {
  /**
   * Upsert a user's role on a notebook.
   * If a row already exists it is updated; otherwise it is inserted.
   */
  async upsert({ notebookId, userId, role, grantedByUserId }) {
    const [row] = await sql`
      INSERT INTO notebook_permissions (notebook_id, user_id, role, granted_by_user_id)
      VALUES (${notebookId}, ${userId}, ${role}, ${grantedByUserId})
      ON CONFLICT (notebook_id, user_id)
      DO UPDATE SET
        role               = EXCLUDED.role,
        granted_by_user_id = EXCLUDED.granted_by_user_id,
        updated_at         = NOW()
      RETURNING *
    `;
    return row;
  },

  /** Fetch a single permission row. */
  async findOne(notebookId, userId) {
    const [row] = await sql`
      SELECT * FROM notebook_permissions
      WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    `;
    return row || null;
  },

  /** All permission grants for a given notebook, with user details. */
  async findByNotebook(notebookId) {
    return await sql`
      SELECT
        np.*,
        u.full_name       AS user_name,
        u.email           AS user_email,
        u.avatar_initials AS user_initials
      FROM notebook_permissions np
      JOIN users u ON np.user_id = u.id
      WHERE np.notebook_id = ${notebookId}
      ORDER BY np.role DESC, u.full_name ASC
    `;
  },

  /** Remove a specific user's permission on a notebook. */
  async revoke(notebookId, userId) {
    return await sql`
      DELETE FROM notebook_permissions
      WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    `;
  }
};

// ─── Legacy / Flat Note Model (Dashboard Workspace Notes) ─────────────────────

const NoteModel = {
  async create({ groupId, folderId, title, content, tags, isPinned, authorUserId, permittedEditors }) {
    const editorsJson = JSON.stringify(Array.isArray(permittedEditors) ? permittedEditors : []);
    const [result] = await sql`
      INSERT INTO notes (group_id, folder_id, title, content, tags, is_pinned, author_user_id, permitted_editors)
      VALUES (
        ${groupId},
        ${folderId || null},
        ${title},
        ${content || ''},
        ${tags || ''},
        ${isPinned ? 1 : 0},
        ${authorUserId},
        ${editorsJson}::jsonb
      )
      RETURNING *, author_user_id AS created_by
    `;
    return result;
  },

  async findById(id) {
    const [note] = await sql`
      SELECT
        n.*,
        n.author_user_id AS created_by,
        COALESCE(n.permitted_editors, '[]'::jsonb) AS permitted_editors,
        u.full_name as author_name,
        u.avatar_initials as author_initials,
        f.name AS folder_name
      FROM notes n
      JOIN users u ON n.author_user_id = u.id
      LEFT JOIN notebook_folders f ON n.folder_id = f.id
      WHERE n.id = ${id}
    `;
    return note || null;
  },

  async findByGroup(groupId, searchQuery = '') {
    if (searchQuery) {
      const term = `%${searchQuery}%`;
      return await sql`
        SELECT
          n.*,
          n.author_user_id AS created_by,
          COALESCE(n.permitted_editors, '[]'::jsonb) AS permitted_editors,
          u.full_name as author_name,
          u.avatar_initials as author_initials,
          f.name AS folder_name
        FROM notes n
        JOIN users u ON n.author_user_id = u.id
        LEFT JOIN notebook_folders f ON n.folder_id = f.id
        WHERE n.group_id = ${groupId}
          AND COALESCE(n.is_private, FALSE) = FALSE
          AND (n.title ILIKE ${term} OR n.content ILIKE ${term} OR n.tags ILIKE ${term})
        ORDER BY n.is_pinned DESC, n.updated_at DESC
      `;
    }

    return await sql`
      SELECT
        n.*,
        n.author_user_id AS created_by,
        COALESCE(n.permitted_editors, '[]'::jsonb) AS permitted_editors,
        u.full_name as author_name,
        u.avatar_initials as author_initials,
        f.name AS folder_name
      FROM notes n
      JOIN users u ON n.author_user_id = u.id
      LEFT JOIN notebook_folders f ON n.folder_id = f.id
      WHERE n.group_id = ${groupId}
        AND COALESCE(n.is_private, FALSE) = FALSE
      ORDER BY n.is_pinned DESC, n.updated_at DESC
    `;
  },

  async update(id, fields) {
    const current = await this.findById(id);
    if (!current) return null;

    const newTitle = fields.title !== undefined ? fields.title : current.title;
    const newContent = fields.content !== undefined ? fields.content : current.content;
    const newTags = fields.tags !== undefined ? fields.tags : current.tags;
    const newPinned = fields.is_pinned !== undefined ? (fields.is_pinned ? 1 : 0) : current.is_pinned;
    const newFolderId = fields.folder_id !== undefined
      ? (fields.folder_id === null || fields.folder_id === '' ? null : Number(fields.folder_id))
      : current.folder_id;
    const newPermitted = fields.permitted_editors !== undefined
      ? JSON.stringify(Array.isArray(fields.permitted_editors) ? fields.permitted_editors.map(Number) : [])
      : JSON.stringify(Array.isArray(current.permitted_editors) ? current.permitted_editors : []);

    await sql`
      UPDATE notes
      SET
        title = ${newTitle},
        content = ${newContent},
        tags = ${newTags},
        is_pinned = ${newPinned},
        folder_id = ${newFolderId},
        permitted_editors = ${newPermitted}::jsonb,
        updated_at = NOW()
      WHERE id = ${id}
    `;

    return await this.findById(id);
  },

  async delete(id) {
    return await sql`DELETE FROM notes WHERE id = ${id}`;
  }
};

module.exports = {
  NoteModel,
  NotebookModel,
  NotebookFolderModel,
  NotebookPageModel,
  NotebookPermissionModel
};
