/**
 * Kanban Task Data Model
 *
 * Covers two tables:
 *   - tasks            : Kanban board tasks with flag/approval state
 *   - task_assistants  : Peer-help offer records
 */

'use strict';

const sql = require('../../config/db.config');

// ─── Task Model ────────────────────────────────────────────────────────────────

const TaskModel = {
  /**
   * Create a new task row.
   * The caller (service layer) is responsible for determining the correct
   * initial status (TODO vs PENDING_APPROVAL).
   */
  async create({ groupId, title, description, priority, status, assignedToUserId, createdByUserId, dueDate }) {
    const [result] = await sql`
      INSERT INTO tasks (
        group_id, title, description, priority, status,
        assigned_to_user_id, created_by_user_id, due_date
      )
      VALUES (
        ${groupId}, ${title}, ${description || null},
        ${priority || 'MEDIUM'}, ${status || 'TODO'},
        ${assignedToUserId || null}, ${createdByUserId},
        ${dueDate || null}
      )
      RETURNING id
    `;
    return Number(result.id);
  },

  /** Fetch a single task by PK, joining user names and assistant count. */
  async findById(id) {
    const [task] = await sql`
      SELECT
        t.*,
        creator.full_name         AS creator_name,
        assignee.full_name        AS assignee_name,
        assignee.avatar_initials  AS assignee_initials,
        approver.full_name        AS approver_name,
        (
          SELECT COUNT(*)::int
          FROM task_assistants ta
          WHERE ta.task_id = t.id AND ta.status = 'offered'
        )                         AS pending_assist_count
      FROM tasks t
      LEFT JOIN users creator  ON t.created_by_user_id  = creator.id
      LEFT JOIN users assignee ON t.assigned_to_user_id = assignee.id
      LEFT JOIN users approver ON t.approved_by_user_id = approver.id
      WHERE t.id = ${id}
    `;
    return task || null;
  },

  /** Fetch all tasks for a group with open assist-offer counts. */
  async findByGroup(groupId) {
    return await sql`
      SELECT
        t.*,
        creator.full_name         AS creator_name,
        assignee.full_name        AS assignee_name,
        assignee.avatar_initials  AS assignee_initials,
        approver.full_name        AS approver_name,
        (
          SELECT COUNT(*)::int
          FROM task_assistants ta
          WHERE ta.task_id = t.id AND ta.status = 'offered'
        )                         AS pending_assist_count
      FROM tasks t
      LEFT JOIN users creator  ON t.created_by_user_id  = creator.id
      LEFT JOIN users assignee ON t.assigned_to_user_id = assignee.id
      LEFT JOIN users approver ON t.approved_by_user_id = approver.id
      WHERE t.group_id = ${groupId}
      ORDER BY t.created_at DESC
    `;
  },

  /** Partial update — merges supplied fields over current row values. */
  async update(id, fields) {
    const current = await this.findById(id);
    if (!current) return null;

    await sql`
      UPDATE tasks
      SET
        title               = ${fields.title               !== undefined ? fields.title               : current.title},
        description         = ${fields.description         !== undefined ? fields.description         : current.description},
        priority            = ${fields.priority            !== undefined ? fields.priority            : current.priority},
        status              = ${fields.status              !== undefined ? fields.status              : current.status},
        assigned_to_user_id = ${fields.assigned_to_user_id !== undefined ? fields.assigned_to_user_id : current.assigned_to_user_id},
        approved_by_user_id = ${fields.approved_by_user_id !== undefined ? fields.approved_by_user_id : current.approved_by_user_id},
        approval_notes      = ${fields.approval_notes      !== undefined ? fields.approval_notes      : current.approval_notes},
        due_date            = ${fields.due_date            !== undefined ? fields.due_date            : current.due_date},
        is_flagged          = ${fields.is_flagged          !== undefined ? fields.is_flagged          : current.is_flagged},
        flagged_reason      = ${fields.flagged_reason      !== undefined ? fields.flagged_reason      : current.flagged_reason},
        flagged_at          = ${fields.flagged_at          !== undefined ? fields.flagged_at          : current.flagged_at},
        updated_at          = NOW()
      WHERE id = ${id}
    `;

    return await this.findById(id);
  },

  async delete(id) {
    return await sql`DELETE FROM tasks WHERE id = ${id}`;
  }
};

// ─── Task Assistant Model ──────────────────────────────────────────────────────

const TaskAssistantModel = {
  /**
   * Record a peer-help offer from a group member on a flagged task.
   * Duplicate offers are rejected at the DB level (UNIQUE constraint on task_id, user_id).
   */
  async create({ taskId, userId, message }) {
    const [row] = await sql`
      INSERT INTO task_assistants (task_id, user_id, message)
      VALUES (${taskId}, ${userId}, ${message || null})
      RETURNING *
    `;
    return row;
  },

  /** Find a specific offer row. */
  async findOffer(taskId, userId) {
    const [row] = await sql`
      SELECT ta.*, u.full_name AS helper_name, u.avatar_initials AS helper_initials
      FROM task_assistants ta
      JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = ${taskId} AND ta.user_id = ${userId}
    `;
    return row || null;
  },

  /** All offers for a task, with helper user details. */
  async findByTask(taskId) {
    return await sql`
      SELECT ta.*, u.full_name AS helper_name, u.avatar_initials AS helper_initials
      FROM task_assistants ta
      JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = ${taskId}
      ORDER BY ta.created_at ASC
    `;
  },

  /** Update the status of an existing offer (accepted | declined). */
  async updateStatus(taskId, userId, status) {
    const [row] = await sql`
      UPDATE task_assistants
      SET status = ${status}, updated_at = NOW()
      WHERE task_id = ${taskId} AND user_id = ${userId}
      RETURNING *
    `;
    return row || null;
  },

  /** Remove an offer (e.g. helper withdraws). */
  async remove(taskId, userId) {
    return await sql`
      DELETE FROM task_assistants
      WHERE task_id = ${taskId} AND user_id = ${userId}
    `;
  }
};

module.exports = { TaskModel, TaskAssistantModel };
