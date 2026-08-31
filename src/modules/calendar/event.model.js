/**
 * Calendar Event Data Model
 */
const sql = require('../../config/db.config');

const EventModel = {
  async create({ groupId, title, description, eventDate, eventType, color, createdByUserId }) {
    const [result] = await sql`
      INSERT INTO calendar_events (group_id, title, description, event_date, event_type, color, created_by_user_id)
      VALUES (${groupId}, ${title}, ${description || null}, ${eventDate}, ${eventType || 'EVENT'}, ${color || '#4f46e5'}, ${createdByUserId})
      RETURNING id
    `;
    return Number(result.id);
  },

  async findByGroup(groupId) {
    return await sql`
      SELECT e.*,
        u.full_name as creator_name
      FROM calendar_events e
      LEFT JOIN users u ON e.created_by_user_id = u.id
      WHERE e.group_id = ${groupId}
      ORDER BY e.event_date ASC
    `;
  },

  async findByGroupAndMonth(groupId, year, month) {
    return await sql`
      SELECT e.*,
        u.full_name as creator_name
      FROM calendar_events e
      LEFT JOIN users u ON e.created_by_user_id = u.id
      WHERE e.group_id = ${groupId}
        AND EXTRACT(YEAR FROM e.event_date) = ${year}
        AND EXTRACT(MONTH FROM e.event_date) = ${month}
      ORDER BY e.event_date ASC
    `;
  },

  async findById(id) {
    const [event] = await sql`SELECT * FROM calendar_events WHERE id = ${id}`;
    return event || null;
  },

  async delete(id) {
    return await sql`DELETE FROM calendar_events WHERE id = ${id}`;
  }
};

module.exports = EventModel;
