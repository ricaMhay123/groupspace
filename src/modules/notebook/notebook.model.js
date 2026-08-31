/**
 * Collaborative Notebook Data Model
 */

const sql = require('../../config/db.config');

const NotebookModel = {
  async create({ groupId, title, content, tags, isPinned, authorUserId }) {
    const [result] = await sql`
      INSERT INTO notes (group_id, title, content, tags, is_pinned, author_user_id)
      VALUES (${groupId}, ${title}, ${content || ''}, ${tags || ''}, ${isPinned ? 1 : 0}, ${authorUserId})
      RETURNING id
    `;
    return Number(result.id);
  },

  async findById(id) {
    const [note] = await sql`
      SELECT n.*, u.full_name as author_name, u.avatar_initials as author_initials
      FROM notes n
      JOIN users u ON n.author_user_id = u.id
      WHERE n.id = ${id}
    `;
    return note || null;
  },

  async findByGroup(groupId, searchQuery = '') {
    if (searchQuery) {
      const term = `%${searchQuery}%`;
      return await sql`
        SELECT n.*, u.full_name as author_name, u.avatar_initials as author_initials
        FROM notes n
        JOIN users u ON n.author_user_id = u.id
        WHERE n.group_id = ${groupId} AND (n.title ILIKE ${term} OR n.content ILIKE ${term} OR n.tags ILIKE ${term})
        ORDER BY n.is_pinned DESC, n.updated_at DESC
      `;
    }

    return await sql`
      SELECT n.*, u.full_name as author_name, u.avatar_initials as author_initials
      FROM notes n
      JOIN users u ON n.author_user_id = u.id
      WHERE n.group_id = ${groupId}
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

    await sql`
      UPDATE notes
      SET
        title = ${newTitle},
        content = ${newContent},
        tags = ${newTags},
        is_pinned = ${newPinned},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    return await this.findById(id);
  },

  async delete(id) {
    return await sql`DELETE FROM notes WHERE id = ${id}`;
  }
};

module.exports = NotebookModel;
