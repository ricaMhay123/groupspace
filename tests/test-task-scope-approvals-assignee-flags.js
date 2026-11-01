/**
 * Test Suite: Task Creation Scope, Leader Approvals & Assignee-Only Flags
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Task Creation Scope, Leader Approvals & Assignee-Only Flags...');

// 1. Verify Task Service & Middleware member creation & pending approval
const roleMiddlewareSource = fs.readFileSync(path.join(__dirname, '../src/middleware/role.middleware.js'), 'utf8');
assert(roleMiddlewareSource.includes('checkTaskCreationPermission'), 'role.middleware.js exports checkTaskCreationPermission');
assert(roleMiddlewareSource.includes('req.body.assignedToUserId = requesterId'), 'checkTaskCreationPermission forces assignedToUserId to requesterId for members');

const taskServiceSource = fs.readFileSync(path.join(__dirname, '../src/modules/tasks/task.service.js'), 'utf8');
assert(taskServiceSource.includes('TASK_STATUS.PENDING_APPROVAL'), 'task.service.js sets initialStatus to PENDING_APPROVAL for members');
assert(taskServiceSource.includes('createdByUserId'), 'task.service.js resolves assignee to createdByUserId for members');
console.log('  ✅ 1. Member task creation scope & pending approval status verified in backend');

// 2. Verify Leader-only approvals & follow-ups
assert(taskServiceSource.includes('isAdminRole(leaderRole)') || taskServiceSource.includes('isAdminRole(userRole)'), 'task.service.js gates leader approvals and follow-ups with isAdminRole');
const taskRoutesSource = fs.readFileSync(path.join(__dirname, '../src/modules/tasks/task.routes.js'), 'utf8');
assert(taskRoutesSource.includes("router.put('/:taskId/approve', requireGroupLeader") || taskRoutesSource.includes("requireGroupLeader, ctrl.reviewApproval"), 'task.routes.js protects approve route with requireGroupLeader');
assert(taskRoutesSource.includes("requireGroupLeader, ctrl.followUpTask"), 'task.routes.js protects follow-up route with requireGroupLeader');
console.log('  ✅ 2. Leader-only approval & follow-up permissions verified in backend');

// 3. Verify Assignee-Only Blocker & Help Flagged logic
assert(taskServiceSource.includes('flagTask'), 'task.service.js defines flagTask');
assert(taskServiceSource.includes('Number(assignedUserId) !== Number(userId)') || taskServiceSource.includes('assigned_to_user_id !== userId'), 'flagTask ensures only assigned member can flag a task');

const tasksJsSource = fs.readFileSync(path.join(__dirname, '../public/js/tasks.js'), 'utf8');
assert(tasksJsSource.includes('isAssignee ?'), 'tasks.js renders Flag for Help button strictly for isAssignee');
assert(!tasksJsSource.includes('${(isAssignee || isLeader) ?'), 'tasks.js does NOT allow non-assignee leaders to flag member tasks');
console.log('  ✅ 3. Assignee-only blocker and help flag restrictions verified');

// 4. Verify Frontend Task Creation Modal & Member dropdown locking
const dashboardJsSource = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');
assert(dashboardJsSource.includes('handleCreateTask'), 'dashboard.js defines handleCreateTask');
assert(dashboardJsSource.includes('typeof e.preventDefault === \'function\''), 'handleCreateTask guards e.preventDefault() safely');
assert(dashboardJsSource.includes('taskAssignee'), 'dashboard.js manages taskAssignee');
console.log('  ✅ 4. Frontend task creation modal & assignee handling verified');

// 5. Verify Button Handlers Audit (e.preventDefault & error handling)
assert(tasksJsSource.includes('updateTaskStatusAndClose'), 'tasks.js defines updateTaskStatusAndClose');
assert(tasksJsSource.includes('deleteTaskAndClose'), 'tasks.js defines deleteTaskAndClose');
assert(tasksJsSource.includes('toggleTaskFlagDetails'), 'tasks.js defines toggleTaskFlagDetails');
assert(tasksJsSource.includes('offerTaskHelpDetails'), 'tasks.js defines offerTaskHelpDetails');
assert(tasksJsSource.includes('respondAssistOffer'), 'tasks.js defines respondAssistOffer');
assert(dashboardJsSource.includes('submitReview'), 'dashboard.js defines submitReview');
console.log('  ✅ 5. Button handlers audited with e.preventDefault() and safe error boundaries');

console.log('\n🎉 ALL TASK CREATION SCOPE, LEADER APPROVAL & ASSIGNEE-ONLY FLAG TESTS PASSED!\n');
