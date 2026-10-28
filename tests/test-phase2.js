/**
 * Phase 2 Unit & Integration Tests:
 * Role-Based Task Actions (Leader Follow-Up vs. Member Start Button)
 */

const assert = require('assert');

async function run() {
  console.log('🧪 Starting Phase 2 Role-Based Task Actions Verification...\n');

  // 1. Test frontend button logic in DOM environment simulation
  console.log('1️⃣ Testing Frontend Task Action Button Logic (tasks.js)...');

  // Minimal DOM simulation
  const mockElements = {
    taskDetailsModal: { id: 'taskDetailsModal' },
    taskDetailsPriority: { textContent: '', className: '' },
    taskDetailsStatus: { textContent: '' },
    taskDetailsTitle: { textContent: '' },
    taskDetailsBody: { innerHTML: '' }
  };

  global.document = {
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      className: '',
      style: { cssText: '' },
      setAttribute: function(k, v) { this[k] = v; },
      appendChild: function(child) { this.children = this.children || []; this.children.push(child); },
      querySelectorAll: function() { return []; },
      children: [],
      onclick: null,
      textContent: '',
      title: ''
    }),
    getElementById: (id) => mockElements[id] || null
  };
  global.window = {};
  global.escapeHtml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  global.apiFetch = async () => ({ success: true, data: [] });
  global.showToast = () => {};
  global.openModal = () => {};
  global.closeModal = () => {};
  global.currentGroupId = 1;

  // Load tasks.js
  require('../public/js/tasks.js');

  // Test A: Assigned member viewing TODO task card
  global.currentUser = { id: 10, role: 'member' };
  const memberTask = {
    id: 101,
    title: 'Implement Auth',
    status: 'TODO',
    assigned_to: 10,
    assigned_to_user_id: 10,
    created_by_user_id: 10,
    assignee_name: 'Member Alice'
  };

  const cardMember = window.renderKanbanCard(memberTask);
  const memberStartBtn = (cardMember.children || []).find(c => c.textContent === 'Start Task');
  const memberFollowUpBtn = (cardMember.children || []).find(c => c.textContent === 'Follow Up');

  assert(memberStartBtn, 'Assigned member MUST see "Start Task" button on their TODO task card');
  assert(!memberFollowUpBtn, 'Assigned member must NOT see "Follow Up" button');
  console.log('   ✅ Assigned Member sees "Start Task" and no "Follow Up" button on card.');

  // Test B: Leader viewing teammate's TODO task card
  global.currentUser = { id: 1, role: 'leader' };
  const teammateTask = {
    id: 102,
    title: 'Setup Database',
    status: 'TODO',
    assigned_to: 10,
    assigned_to_user_id: 10,
    created_by_user_id: 1,
    assignee_name: 'Member Alice'
  };

  const cardLeader = window.renderKanbanCard(teammateTask);
  const leaderStartBtn = (cardLeader.children || []).find(c => c.textContent === 'Start Task');
  const leaderFollowUpBtn = (cardLeader.children || []).find(c => c.textContent === 'Follow Up');

  assert(!leaderStartBtn, 'Leader must NOT see "Start Task" button on teammate\'s task card');
  assert(leaderFollowUpBtn, 'Leader MUST see "Follow Up" button on teammate\'s task card');
  console.log('   ✅ Leader sees discrete "Follow Up" and NOT "Start Task" on teammate\'s task card.');

  // Test C: Leader viewing their own assigned TODO task card
  const leaderOwnTask = {
    id: 103,
    title: 'Architecture Review',
    status: 'TODO',
    assigned_to: 1,
    assigned_to_user_id: 1,
    created_by_user_id: 1,
    assignee_name: 'Leader Bob'
  };
  const cardLeaderOwn = window.renderKanbanCard(leaderOwnTask);
  const leaderOwnStartBtn = (cardLeaderOwn.children || []).find(c => c.textContent === 'Start Task');
  const leaderOwnFollowUpBtn = (cardLeaderOwn.children || []).find(c => c.textContent === 'Follow Up');

  assert(leaderOwnStartBtn, 'Leader assigned to task MUST see "Start Task" button');
  assert(!leaderOwnFollowUpBtn, 'Leader must NOT see "Follow Up" button on their own task');
  console.log('   ✅ Leader assigned to task sees "Start Task" on their own task.');

  // Test D: Other member viewing teammate's task card
  global.currentUser = { id: 20, role: 'member' };
  const cardOtherMember = window.renderKanbanCard(teammateTask);
  const otherMemberStartBtn = (cardOtherMember.children || []).find(c => c.textContent === 'Start Task');
  const otherMemberFollowUpBtn = (cardOtherMember.children || []).find(c => c.textContent === 'Follow Up');

  assert(!otherMemberStartBtn, 'Non-assigned member must NOT see "Start Task" on teammate task');
  assert(!otherMemberFollowUpBtn, 'Member must NOT see "Follow Up" on teammate task');
  console.log('   ✅ Other member sees neither "Start Task" nor "Follow Up" on teammate task.');

  // Test E: Modal Action Buttons
  console.log('\n2️⃣ Testing Task Details Modal Action Button Rendering...');
  window.currentTasks = [teammateTask, memberTask, leaderOwnTask];

  // Leader viewing teammate task in modal
  global.currentUser = { id: 1, role: 'leader' };
  await window.openTaskDetailsModal(102);
  assert(mockElements.taskDetailsBody.innerHTML.includes('Follow Up'), 'Leader modal MUST have Follow Up button on teammate task');
  assert(!mockElements.taskDetailsBody.innerHTML.includes('Start Task'), 'Leader modal must NOT have Start Task button on teammate task');
  console.log('   ✅ Modal renders "Follow Up" button (and not "Start Task") for leader on teammate task.');

  // Assigned Member viewing own task in modal
  global.currentUser = { id: 10, role: 'member' };
  await window.openTaskDetailsModal(101);
  assert(mockElements.taskDetailsBody.innerHTML.includes('Start Task'), 'Assigned member modal MUST have "Start Task" button');
  assert(!mockElements.taskDetailsBody.innerHTML.includes('Follow Up'), 'Assigned member modal must NOT have Follow Up button');
  console.log('   ✅ Modal renders "Start Task" button (and not "Follow Up") for assigned member.');

  // 3. Test Backend Route Registration & Constraints
  console.log('\n3️⃣ Testing Backend Route Setup & Route Isolation...');
  const taskRoutes = require('../src/modules/tasks/task.routes');
  const followUpRoute = taskRoutes.stack.find(layer => layer.route && layer.route.path === '/:taskId/follow-up');

  assert(followUpRoute, 'POST /:taskId/follow-up route must be registered');
  assert(followUpRoute.route.methods.post, 'Route must handle POST method');
  console.log('   ✅ POST /api/tasks/:taskId/follow-up route is registered.');

  // Verify followUpOnTask function is exported in task.service
  const taskService = require('../src/modules/tasks/task.service');
  assert(typeof taskService.followUpOnTask === 'function', 'taskService.followUpOnTask must be a function');
  console.log('   ✅ taskService.followUpOnTask is implemented and exported.');

  console.log('\n🎉 All Phase 2 role-based task action tests passed successfully!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
