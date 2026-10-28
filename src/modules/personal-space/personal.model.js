/**
 * Personal Space Data Model (Isolated per authenticated user)
 */

const sql = require('../../config/db.config');

const PersonalModel = {
  async createItem({ userId, groupId, type, title, content, status, amount, category, dueDate, folderId, tags, isPinned }) {
    try {
      const [result] = await sql`
        INSERT INTO personal_items (
          user_id, group_id, type, title, content, status, amount, category, due_date,
          is_private, folder_id, tags, is_pinned
        )
        VALUES (
          ${userId}, ${groupId || null}, ${type}, ${title}, ${content || ''},
          ${status || 'PENDING'}, ${amount || 0}, ${category || 'Personal'}, ${dueDate || null},
          TRUE, ${folderId || null}, ${tags || ''}, ${isPinned ? 1 : 0}
        )
        RETURNING id
      `;
      return Number(result.id);
    } catch (e) {
      const [result] = await sql`
        INSERT INTO personal_items (user_id, group_id, type, title, content, status, amount, category, due_date)
        VALUES (${userId}, ${groupId || null}, ${type}, ${title}, ${content || ''}, ${status || 'PENDING'}, ${amount || 0}, ${category || 'Personal'}, ${dueDate || null})
        RETURNING id
      `;
      return Number(result.id);
    }
  },

  async findById(id, userId) {
    try {
      const [item] = await sql`
        SELECT p.*, TRUE AS is_private, p.user_id AS created_by, p.user_id AS author_user_id, f.name AS folder_name
        FROM personal_items p
        LEFT JOIN notebook_folders f ON p.folder_id = f.id
        WHERE p.id = ${id} AND p.user_id = ${userId}
      `;
      return item || null;
    } catch (e) {
      const [item] = await sql`
        SELECT *, TRUE AS is_private, user_id AS created_by, user_id AS author_user_id FROM personal_items
        WHERE id = ${id} AND user_id = ${userId}
      `;
      return item || null;
    }
  },

  async findByType(userId, type, groupId = null, searchQuery = '') {
    try {
      if (searchQuery) {
        const term = `%${searchQuery}%`;
        if (groupId) {
          return await sql`
            SELECT p.*, TRUE AS is_private, p.user_id AS created_by, p.user_id AS author_user_id, f.name AS folder_name
            FROM personal_items p
            LEFT JOIN notebook_folders f ON p.folder_id = f.id
            WHERE p.user_id = ${userId} AND p.type = ${type} AND p.group_id = ${groupId}
              AND (p.title ILIKE ${term} OR p.content ILIKE ${term} OR COALESCE(p.tags, '') ILIKE ${term})
            ORDER BY COALESCE(p.is_pinned, 0) DESC, p.updated_at DESC, p.created_at DESC
          `;
        }
        return await sql`
          SELECT p.*, TRUE AS is_private, p.user_id AS created_by, p.user_id AS author_user_id, f.name AS folder_name
          FROM personal_items p
          LEFT JOIN notebook_folders f ON p.folder_id = f.id
          WHERE p.user_id = ${userId} AND p.type = ${type}
            AND (p.title ILIKE ${term} OR p.content ILIKE ${term} OR COALESCE(p.tags, '') ILIKE ${term})
          ORDER BY COALESCE(p.is_pinned, 0) DESC, p.updated_at DESC, p.created_at DESC
        `;
      }

      if (groupId) {
        return await sql`
          SELECT p.*, TRUE AS is_private, p.user_id AS created_by, p.user_id AS author_user_id, f.name AS folder_name
          FROM personal_items p
          LEFT JOIN notebook_folders f ON p.folder_id = f.id
          WHERE p.user_id = ${userId} AND p.type = ${type} AND p.group_id = ${groupId}
          ORDER BY COALESCE(p.is_pinned, 0) DESC, p.updated_at DESC, p.created_at DESC
        `;
      }
      return await sql`
        SELECT p.*, TRUE AS is_private, p.user_id AS created_by, p.user_id AS author_user_id, f.name AS folder_name
        FROM personal_items p
        LEFT JOIN notebook_folders f ON p.folder_id = f.id
        WHERE p.user_id = ${userId} AND p.type = ${type}
        ORDER BY COALESCE(p.is_pinned, 0) DESC, p.updated_at DESC, p.created_at DESC
      `;
    } catch (e) {
      if (groupId) {
        return await sql`
          SELECT *, TRUE AS is_private, user_id AS created_by, user_id AS author_user_id FROM personal_items
          WHERE user_id = ${userId} AND type = ${type} AND group_id = ${groupId}
          ORDER BY created_at DESC
        `;
      }
      return await sql`
        SELECT *, TRUE AS is_private, user_id AS created_by, user_id AS author_user_id FROM personal_items
        WHERE user_id = ${userId} AND type = ${type}
        ORDER BY created_at DESC
      `;
    }
  },

  async findAllByUser(userId, groupId = null) {
    if (groupId) {
      return await sql`
        SELECT *, TRUE AS is_private, user_id AS created_by, user_id AS author_user_id FROM personal_items
        WHERE user_id = ${userId} AND group_id = ${groupId}
        ORDER BY created_at DESC
      `;
    }
    return await sql`
      SELECT *, TRUE AS is_private, user_id AS created_by, user_id AS author_user_id FROM personal_items
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
  },

  async update(id, userId, fields) {
    const current = await this.findById(id, userId);
    if (!current) return null;

    const newTitle = fields.title !== undefined ? fields.title : current.title;
    const newContent = fields.content !== undefined ? fields.content : current.content;
    const newStatus = fields.status !== undefined ? fields.status : current.status;
    const newAmount = fields.amount !== undefined ? fields.amount : current.amount;
    const newCategory = fields.category !== undefined ? fields.category : current.category;
    const newFolderId = fields.folder_id !== undefined
      ? (fields.folder_id === null || fields.folder_id === '' ? null : Number(fields.folder_id))
      : (current.folder_id || null);
    const newTags = fields.tags !== undefined ? fields.tags : (current.tags || '');
    const newPinned = fields.is_pinned !== undefined ? (fields.is_pinned ? 1 : 0) : (current.is_pinned || 0);

    try {
      await sql`
        UPDATE personal_items
        SET
          title = ${newTitle},
          content = ${newContent},
          status = ${newStatus},
          amount = ${newAmount},
          category = ${newCategory},
          folder_id = ${newFolderId},
          tags = ${newTags},
          is_pinned = ${newPinned},
          is_private = TRUE,
          updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
      `;
    } catch (e) {
      await sql`
        UPDATE personal_items
        SET
          title = ${newTitle},
          content = ${newContent},
          status = ${newStatus},
          amount = ${newAmount},
          category = ${newCategory},
          updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
      `;
    }

    return await this.findById(id, userId);
  },

  async delete(id, userId) {
    return await sql`
      DELETE FROM personal_items
      WHERE id = ${id} AND user_id = ${userId}
    `;
  }
};

module.exports = PersonalModel;
