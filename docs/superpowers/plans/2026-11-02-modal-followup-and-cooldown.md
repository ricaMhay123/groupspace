# Implementation Plan: Contain Leader Follow-Up Button Inside Task Modal & Anti-Spam Cooldown

## Context
In GroupSpace, Leaders and Co-Leaders can send a follow-up ping on tasks to nudge the assigned member. Previously, the "Follow Up" button was displayed directly on outer Kanban cards in TODO, IN_PROGRESS, and PENDING_APPROVAL columns. To maintain a clean, minimalist card aesthetic and prevent notification spam, this plan encapsulates the "Follow Up" action strictly inside the Task Details Modal and implements a 24-hour anti-spam cooldown window both on the backend and frontend.

## Goals & Requirements
1. **Task Modal Encapsulation**:
   - Remove "Follow Up" buttons from outer Kanban cards (`renderKanbanCard`).
   - Place "Follow Up" strictly inside Task Details Modal (`openTaskDetailsModal`), visible ONLY when `currentUser.role === 'leader'` (or `'co_leader'`) and `currentUser.id !== task.assigned_to`.
2. **Database Cooldown Tracking**:
   - Add `last_followed_up_at TIMESTAMPTZ` column to `tasks` table in schema DDL and dynamic migration in `src/config/db.config.js`.
   - Update `TaskModel.update` in `src/modules/tasks/task.model.js` to persist `last_followed_up_at`.
3. **Backend Anti-Spam Rate Limiting**:
   - In `taskService.followUpOnTask`: check `task.last_followed_up_at`. If within the last 24 hours (`Date.now() - new Date(task.last_followed_up_at).getTime() < 24 * 60 * 60 * 1000`), reject with HTTP 429 Too Many Requests (`"Follow-up already sent today"`).
   - If allowed: set `last_followed_up_at = new Date().toISOString()`, update task in DB, and insert notification in `personal_feed` / `discussion_mentions`.
4. **Frontend Modal Button States**:
   - Inside Task Details Modal (`public/js/tasks.js`), check `task.last_followed_up_at`:
     * If within 24 hours: disable button and display `"Followed Up Today ✓"`.
     * If 24+ hours or NULL: enable button with label `"Follow Up"`.
   - When clicked: temporarily show `"Follow-Up Sent ✓"` (2 seconds) before disabling it with label `"Followed Up Today ✓"`.

---

## File Changes
1. `src/config/db.config.js`: Add column `last_followed_up_at TIMESTAMPTZ` to `CREATE TABLE IF NOT EXISTS tasks` and migration `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_followed_up_at TIMESTAMPTZ`.
2. `src/modules/tasks/task.model.js`: Support `last_followed_up_at` in `TaskModel.update`.
3. `src/modules/tasks/task.service.js`: Enforce 24h cooldown throwing 429 domain error in `followUpOnTask` and update `last_followed_up_at`.
4. `public/js/tasks.js`:
   - Remove `.btn-follow-up` creation from `renderKanbanCard`.
   - In `openTaskDetailsModal`, render `"Followed Up Today ✓"` (disabled) when cooldown is active, or `"Follow Up"` when eligible.
   - In `followUpOnTask`, after 2s feedback set button to disabled `"Followed Up Today ✓"` and update local task state.
5. `tests/test-task-modal-followup-cooldown.js`: New test suite verifying DDL, model, 24h rate limiting (429), outer Kanban card cleanliness, and modal button states.
6. `tests/test-localhost.js`: Add suite 20 to the main localhost test runner.
