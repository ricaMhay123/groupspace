# Implementation Plan: Refactor Task Creation Scope, Leader Approvals & Assignee-Only Flags

## 1. Objectives & Requirements
- **Member Task Creation Scope & Leader Approval**:
  - When a non-leader member creates a task, force `assigned_to = currentUser.id` (tasks can only be made for themselves).
  - Set initial status to `PENDING_APPROVAL` awaiting Group Leader approval.
  - ONLY the Group Leader can follow up or approve tasks in the pending queue.
  - In frontend modal (`createTaskModal`), non-leaders have `#taskAssignee` locked/prefilled to themselves with clear messaging; leaders retain full member assignment options.
- **Assignee-Only Blocker & Help Flagged Buttons**:
  - Evaluate `currentUser.id` against `task.assigned_to`:
    * The "Blocker" / "Flag for Help" buttons MUST ONLY be visible and clickable for the specific member assigned to that task.
    * Unassigned members and non-assignees cannot flag or block tasks assigned to someone else.
    * Teammates and leaders may still offer help (`Offer Help`) on already flagged tasks, but cannot set the blocker flag unless they are the assigned member.
- **Button Handlers Audit**:
  - Audit all task action buttons across Kanban cards and detail modals to ensure explicit `e.preventDefault()` / `e.stopPropagation()`, disable state during async flight, and robust error handling to prevent UI freezes.

---

## 2. Affected Files
1. `src/middleware/role.middleware.js`:
   - Enforce `checkTaskCreationPermission`: if requester is not leader/co-leader, force `req.body.assignedToUserId = requesterId`.
2. `src/modules/tasks/task.service.js`:
   - In `createTask`: Ensure non-leader always forces `assignedToUserId = createdByUserId` and `status = TASK_STATUS.PENDING_APPROVAL`.
   - In `flagTask`: Reject with 403 if `!task.assigned_to_user_id || Number(task.assigned_to_user_id) !== Number(userId)`.
   - In `unflagTask`: Reject with 403 if requester is neither the assigned member nor a leader.
   - In `followUpOnTask`: Strictly verify leader permission (`isAdminRole(leaderRole)`).
   - In `reviewTaskApproval`: Strictly verify leader permission.
3. `public/js/dashboard.js`:
   - In `populateMemberDropdowns`: If current user is not a leader, set `#taskAssignee` to `currentUser.id` and disable it, showing explanatory helper text.
   - In `openCreateTaskModal`: Configure `#taskAssignee` based on `currentGroupDetails.role`.
   - In `handleCreateTask`: Ensure `if (e && typeof e.preventDefault === 'function') e.preventDefault();`, force assignee to `currentUser.id` for members, and protect submit button against double submission.
   - In `submitReview`: Ensure `if (e && typeof e.preventDefault === 'function') e.preventDefault();`.
4. `public/js/tasks.js`:
   - In `renderKanbanCard`:
     * For `TODO` cards: assigned member gets "Start Task", leader gets "Follow Up".
     * For `IN_PROGRESS` cards: leader gets "Follow Up".
     * For `PENDING_APPROVAL` cards: leader gets "Review & Approve" and "Follow Up"; non-leaders see "⏳ Awaiting Leader Review" (no approval/follow-up buttons).
   - In `openTaskDetailsModal`:
     * Blocker/Help flag button is strictly visible ONLY if `isAssignee` (`currentUserId === assignedTo`).
     * Teammates on flagged tasks see "Offer Help".
     * Pending approval cards in modal show "Review & Approve" and "Follow Up" exclusively to leaders.
     * Ensure all buttons pass `event` and call `event.preventDefault()`.
   - In `toggleTaskFlag`: Client-side check ensuring only `isAssigned` can initiate flagging.
5. `public/dashboard.html`:
   - Audit inline `onclick` attributes in `reviewTaskModal` (`submitReview(false, event)`, `submitReview(true, event)`).
   - Add helper text placeholder under `#taskAssignee`.
6. `tests/test-task-scope-approvals-assignee-flags.js`:
   - Comprehensive test suite asserting:
     * Member task creation self-assignment & PENDING_APPROVAL status.
     * Leader-only pending approval & follow-up.
     * Assignee-only blocker & flag-for-help visibility and permissions.
     * Audited `e.preventDefault()` handlers and button bindings.
7. `tests/test-localhost.js`:
   - Add the test suite into the pre-push runner.

---

## 3. Step-by-Step Implementation Plan

### Step 1: Write Test Suite (TDD Red)
Create `tests/test-task-scope-approvals-assignee-flags.js` asserting all backend constraints, frontend logic, and button audits.

### Step 2: Backend Permissions & Service Refactoring
- Update `src/middleware/role.middleware.js` to unconditionally bind member creations to `requesterId`.
- Update `src/modules/tasks/task.service.js`:
  * `createTask`: Ensure member assignments strictly resolve to `createdByUserId` and `PENDING_APPROVAL`.
  * `flagTask`: Reject if `Number(task.assigned_to_user_id) !== Number(userId)` with explicit 403 message.
  * `unflagTask`: Allow assigned user or workspace leader.
  * `followUpOnTask`: Strictly gate by leader role.

### Step 3: Frontend Task Creation & Leader Queue Refactoring
- In `public/js/dashboard.js`:
  * Update `populateMemberDropdowns`: If member is not leader, lock `#taskAssignee` to self with descriptive label.
  * In `handleCreateTask`: Force `assignedToUserId = currentUser.id` for members, guard `e.preventDefault()`, disable submit button during request.
  * In `public/dashboard.html`: Update review modal buttons with `event` arguments.

### Step 4: Frontend Assignee-Only Flags & Kanban Button Audit
- In `public/js/tasks.js`:
  * In `openTaskDetailsModal`:
    Replace `(isAssignee || isLeader)` on blocker toggle with strict `isAssignee`.
    Unassigned members or other teammates cannot see or click "Flag for Help" / "Blocker".
    If flagged, non-assignees see "Offer Help".
    In `PENDING_APPROVAL`, only leaders see "Review & Approve" and "Follow Up".
  * In `renderKanbanCard`:
    Render "Review & Approve" and "Follow Up" on `PENDING_APPROVAL` column exclusively for leaders.
  * In `toggleTaskFlag`:
    Add client-side guard for `isAssigned`.
  * Audit all buttons for explicit `e.preventDefault()`, `e.stopPropagation()`, and safe loading states.

### Step 5: Verification & Pre-Push Localhost Test Run
- Run `node tests/test-task-scope-approvals-assignee-flags.js`.
- Run `node tests/test-localhost.js`.
- Run Impeccable Design Quality detector.
- Git commit & push.

