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

// ─── Notebook Pages ────────────────────────────────────────────────────────────

const NotebookPageModel = {
  /** Add a new page to a notebook. */
  async create({ notebookId, title, content, position, authorUserId }) {
    const [row] = await sql`
      INSERT INTO notebook_pages (notebook_id, title, content, position, author_user_id, last_edited_by_user_id)
      VALUES (
        ${notebookId},
        ${title},
        ${content || ''},
        ${position ?? 0},
        ${authorUserId},
        ${authorUserId}
      )
      RETURNING *
    `;
    return row;
  },

  /** Fetch a single page by id. */
  async findById(id) {
    const [row] = await sql`
      SELECT
        p.*,
        a.full_name        AS author_name,
        a.avatar_initials  AS author_initials,
        e.full_name        AS last_editor_name
      FROM notebook_pages p
      LEFT JOIN users a ON p.author_user_id         = a.id
      LEFT JOIN users e ON p.last_edited_by_user_id = e.id
      WHERE p.id = ${id}
    `;
    return row || null;
  },

  /** All pages in a notebook, ordered by position then creation time. */
  async findByNotebook(notebookId) {
    return await sql`
      SELECT
        p.*,
        a.full_name        AS author_name,
        a.avatar_initials  AS author_initials,
        e.full_name        AS last_editor_name
      FROM notebook_pages p
      LEFT JOIN users a ON p.author_user_id         = a.id
      LEFT JOIN users e ON p.last_edited_by_user_id = e.id
      WHERE p.notebook_id = ${notebookId}
      ORDER BY p.position ASC, p.created_at ASC
    `;
  },

  /** Update a page's content. Records last editor. */
  async update(id, { title, content, position, editorUserId }) {
    const current = await this.findById(id);
    if (!current) return null;

    const [updated] = await sql`
      UPDATE notebook_pages
      SET
        title                  = ${title    !== undefined ? title    : current.title},
        content                = ${content  !== undefined ? content  : current.content},
        position               = ${position !== undefined ? position : current.position},
        last_edited_by_user_id = ${editorUserId},
        updated_at             = NOW()
      WHERE id = ${id}
      RETURNING *
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

module.exports = {
  NotebookModel,
  NotebookPageModel,
  NotebookPermissionModel
};
