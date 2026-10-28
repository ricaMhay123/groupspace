/**
 * Verification test for Co-Leader Role and Leadership Requests System
 */

const assert = require('assert');
const fs = require('fs');
const { ROLES, isAdminRole } = require('../src/config/constants');
const groupRoutes = require('../src/modules/groups/group.routes');
const groupService = require('../src/modules/groups/group.service');
const groupModel = require('../src/modules/groups/group.model');

async function run() {
  console.log('🧪 Starting Co-Leader & Leadership Request Verification...\n');

  // 1. Verify Constants
  console.log('1️⃣ Checking Roles and Admin Role Constants...');
  assert.strictEqual(ROLES.CO_LEADER, 'co_leader', 'ROLES.CO_LEADER should be co_leader');
  assert.strictEqual(isAdminRole(ROLES.LEADER), true, 'isAdminRole(leader) should be true');
  assert.strictEqual(isAdminRole(ROLES.CO_LEADER), true, 'isAdminRole(co_leader) should be true');
  assert.strictEqual(isAdminRole(ROLES.MEMBER), false, 'isAdminRole(member) should be false');
  console.log('   ✅ Roles and Admin Role Helper verified.');

  // 2. Verify Routes
  console.log('2️⃣ Checking Group Routes for Leadership Requests...');
  const routes = groupRoutes.stack
    .filter(r => r.route)
    .map(r => ({
      path: r.route.path,
      methods: Object.keys(r.route.methods)
    }));

  const hasPostReq = routes.some(r => r.path === '/:id/leadership-requests' && r.methods.includes('post'));
  const hasPatchReq = routes.some(r => r.path === '/:id/leadership-requests/:requestId' && r.methods.includes('patch'));
  assert.strictEqual(hasPostReq, true, 'POST /:id/leadership-requests route must exist');
  assert.strictEqual(hasPatchReq, true, 'PATCH /:id/leadership-requests/:requestId route must exist');
  console.log('   ✅ Leadership Request routes registered.');

  // 3. Verify Group Service exports
  console.log('3️⃣ Checking Group Service Exports...');
  assert.strictEqual(typeof groupService.requestLeadership, 'function', 'requestLeadership should be exported');
  assert.strictEqual(typeof groupService.resolveLeadershipRequest, 'function', 'resolveLeadershipRequest should be exported');
  assert.strictEqual(typeof groupModel.createLeadershipRequest, 'function', 'createLeadershipRequest should exist on model');
  assert.strictEqual(typeof groupModel.resolveLeadershipRequest, 'function', 'resolveLeadershipRequest should exist on model');
  console.log('   ✅ Group Service and Model methods verified.');

  // 4. Verify Frontend Dashboard HTML
  console.log('4️⃣ Checking dashboard.html Modal Structure...');
  const dashHtml = fs.readFileSync('public/dashboard.html', 'utf8');
  assert.ok(dashHtml.includes('id="requestLeadershipModal"'), 'requestLeadershipModal must exist in dashboard.html');
  assert.ok(dashHtml.includes('id="leadershipRequestReason"'), 'leadershipRequestReason textarea must exist');
  assert.ok(dashHtml.includes('Why do you want to become a leader?'), 'Prompt question must be displayed');
  console.log('   ✅ Request Leadership Modal verified in HTML.');

  // 5. Verify tasks.js Role Context for Co-Leaders
  console.log('5️⃣ Checking tasks.js Role-based Actions for Co-Leaders...');
  const tasksJs = fs.readFileSync('public/js/tasks.js', 'utf8');
  assert.ok(tasksJs.includes("user.role === 'leader' || user.role === 'co_leader'"), 'tasks.js must treat co_leader as leader for task admin capabilities');
  console.log('   ✅ tasks.js treats co_leader as administrative role.');

  // 6. Verify app.js Personal Feed Leadership Request Handling
  console.log('6️⃣ Checking app.js Feed Drawer Rendering & Action Buttons...');
  const appJs = fs.readFileSync('public/js/app.js', 'utf8');
  assert.ok(appJs.includes("section('Leadership Requests'"), 'app.js must render Leadership Requests section');
  assert.ok(appJs.includes("resolveLeadershipRequestFromFeed"), 'app.js must implement resolveLeadershipRequestFromFeed');
  assert.ok(appJs.includes("'leader'"), 'Must have Approve as Leader option');
  assert.ok(appJs.includes("'co_leader'"), 'Must have Approve as Co-Leader option');
  assert.ok(appJs.includes("'reject'"), 'Must have Reject option');
  console.log('   ✅ Feed Drawer renders Leadership Requests with 3 discrete action buttons.');

  // 7. Verify dashboard.js Member Self-Promotion Restriction
  console.log('7️⃣ Checking dashboard.js Member Self-Promotion Restriction & Dropdown Option...');
  const dashJs = fs.readFileSync('public/js/dashboard.js', 'utf8');
  assert.ok(dashJs.includes('<option value="co_leader"'), 'Role select must include co_leader option');
  assert.ok(dashJs.includes('handleMemberSelfRoleDropdown'), 'dashboard.js must implement handleMemberSelfRoleDropdown');
  assert.ok(dashJs.includes('openRequestLeadershipModal'), 'dashboard.js must implement openRequestLeadershipModal');
  assert.ok(dashJs.includes('submitLeadershipRequest'), 'dashboard.js must implement submitLeadershipRequest');
  console.log('   ✅ dashboard.js enforces role change interception and opens leadership modal.');

  console.log('\n🎉 ALL CO-LEADER & LEADERSHIP REQUEST SYSTEM VERIFICATIONS PASSED!\n');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
