/**
 * Kanban Task Data Model
 */
const sql = require('../../config/db.config');

const TaskModel = {
  async create({ groupId, title, description, priority, status, assignedToUserId, createdByUserId, dueDate }) {
    const [result] = await sql`
      INSERT INTO tasks (group_id, title, description, priority, status, assigned_to_user_id, created_by_user_id, due_date)
      VALUES (${groupId}, ${title}, ${description}, ${priority || 'MEDIUM'}, ${status || 'TODO'}, ${assignedToUserId || null}, ${createdByUserId}, ${dueDate || null})
      RETURNING id
    `;
    return Number(result.id);
  },

  async findById(id) {
    const [task] = await sql`
      SELECT t.*,
        creator.full_name as creator_name,
        assignee.full_name as assignee_name, assignee.avatar_initials as assignee_initials,
        approver.full_name as approver_name
      FROM tasks t
      LEFT JOIN users creator ON t.created_by_user_id = creator.id
      LEFT JOIN users assignee ON t.assigned_to_user_id = assignee.id
      LEFT JOIN users approver ON t.approved_by_user_id = approver.id
      WHERE t.id = ${id}
    `;
    return task || null;
  },

  async findByGroup(groupId) {
    return await sql`
      SELECT t.*,
        creator.full_name as creator_name,
        assignee.full_name as assignee_name, assignee.avatar_initials as assignee_initials,
        approver.full_name as approver_name
      FROM tasks t
      LEFT JOIN users creator ON t.created_by_user_id = creator.id
      LEFT JOIN users assignee ON t.assigned_to_user_id = assignee.id
      LEFT JOIN users approver ON t.approved_by_user_id = approver.id
      WHERE t.group_id = ${groupId}
      ORDER BY t.created_at DESC
    `;
  },

  async update(id, fields) {
    const current = await this.findById(id);
    if (!current) return null;

    const newTitle = fields.title !== undefined ? fields.title : current.title;
    const newDesc = fields.description !== undefined ? fields.description : current.description;
    const newPriority = fields.priority !== undefined ? fields.priority : current.priority;
    const newStatus = fields.status !== undefined ? fields.status : current.status;
    const newAssigned = fields.assigned_to_user_id !== undefined ? fields.assigned_to_user_id : current.assigned_to_user_id;
    const newApproved = fields.approved_by_user_id !== undefined ? fields.approved_by_user_id : current.approved_by_user_id;
    const newNotes = fields.approval_notes !== undefined ? fields.approval_notes : current.approval_notes;
    const newDueDate = fields.due_date !== undefined ? fields.due_date : current.due_date;

    await sql`
      UPDATE tasks
      SET
        title = ${newTitle},
        description = ${newDesc},
        priority = ${newPriority},
        status = ${newStatus},
        assigned_to_user_id = ${newAssigned},
        approved_by_user_id = ${newApproved},
        approval_notes = ${newNotes},
        due_date = ${newDueDate},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    return await this.findById(id);
  },

  async delete(id) {
    return await sql`DELETE FROM tasks WHERE id = ${id}`;
  }
};

module.exports = TaskModel;
