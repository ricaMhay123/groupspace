/**
 * Personal Space Data Model (Isolated per authenticated user)
 */

const sql = require('../../config/db.config');

const PersonalModel = {
  async createItem({ userId, groupId, type, title, content, status, amount, category, dueDate }) {
    const [result] = await sql`
      INSERT INTO personal_items (user_id, group_id, type, title, content, status, amount, category, due_date)
      VALUES (${userId}, ${groupId || null}, ${type}, ${title}, ${content || ''}, ${status || 'PENDING'}, ${amount || 0}, ${category || 'Personal'}, ${dueDate || null})
      RETURNING id
    `;
    return Number(result.id);
  },

  async findById(id, userId) {
    const [item] = await sql`
      SELECT * FROM personal_items
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return item || null;
  },

  async findByType(userId, type, groupId = null) {
    if (groupId) {
      return await sql`
        SELECT * FROM personal_items
        WHERE user_id = ${userId} AND type = ${type} AND group_id = ${groupId}
        ORDER BY created_at DESC
      `;
    }
    return await sql`
      SELECT * FROM personal_items
      WHERE user_id = ${userId} AND type = ${type}
      ORDER BY created_at DESC
    `;
  },

  async findAllByUser(userId, groupId = null) {
    if (groupId) {
      return await sql`
        SELECT * FROM personal_items
        WHERE user_id = ${userId} AND group_id = ${groupId}
        ORDER BY created_at DESC
      `;
    }
    return await sql`
      SELECT * FROM personal_items
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
