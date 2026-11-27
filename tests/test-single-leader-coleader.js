'use strict';

/**
 * Verifies the "exactly 1 Leader + at most 1 Co-Leader" rule:
 * leader transfer demotes the actor, co-leader assignment displaces the old co-leader,
 * and the Leader can never be demoted directly.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const GroupModel = require('../src/modules/groups/group.model');
const groupService = require('../src/modules/groups/group.service');

function installFakeModel(initialMembers) {
  const members = initialMembers.map(m => ({ ...m }));
  const calls = [];
  const find = (uid) => members.find(m => Number(m.user_id) === Number(uid));

  GroupModel.findMember = async (gid, uid) => {
    const m = find(uid);
    return m ? { ...m } : null;
  };
  GroupModel.findMembersByGroup = async () => members.map(m => ({ ...m }));
  GroupModel.transferLeadership = async (gid, fromId, toId) => {
    calls.push(['transferLeadership', fromId, toId]);
    find(fromId).role = 'member';
    find(toId).role = 'leader';
  };
  GroupModel.assignCoLeader = async (gid, toId) => {
    calls.push(['assignCoLeader', toId]);
    members.forEach(m => { if (m.role === 'co_leader' && Number(m.user_id) !== Number(toId)) m.role = 'member'; });
    find(toId).role = 'co_leader';
  };
  GroupModel.updateMemberRole = async (gid, uid, role) => {
    calls.push(['updateMemberRole', uid, role]);
    find(uid).role = role;
  };
  GroupModel.logActivity = async () => {};
  GroupModel.createPersonalFeedNotification = async (n) => { calls.push(['notify', n.userId]); };

  return { members, calls, roleOf: (uid) => find(uid).role };
}

const baseRoster = () => ([
  { user_id: 1, role: 'leader', full_name: 'Rica' },
  { user_id: 2, role: 'co_leader', full_name: 'Kevin' },
  { user_id: 3, role: 'member', full_name: 'Rence' },
  { user_id: 4, role: 'member', full_name: 'Ana' }
]);

const countRole = (members, role) => members.filter(m => m.role === role).length;

async function run() {
  console.log('🧪 Verifying single Leader & single Co-Leader rule...\n');

  // 1. Leader transfer: actor becomes Member, target becomes Leader
  {
    const fake = installFakeModel(baseRoster());
    const res = await groupService.applyRoleChange({ groupId: 9, targetUserId: 3, newRole: 'leader', actorUserId: 1 });
    assert.strictEqual(res.actorDemoted, true, 'transfer must report actorDemoted');
    assert.strictEqual(fake.roleOf(3), 'leader');
    assert.strictEqual(fake.roleOf(1), 'member', 'previous Leader must become Member');
    assert.strictEqual(countRole(fake.members, 'leader'), 1, 'exactly 1 Leader after transfer');
    console.log('  ✅ 1. Leader transfer demotes the acting Leader to Member');
  }

  // 2. Transferring leadership to the current Co-Leader empties the Co-Leader seat
  {
    const fake = installFakeModel(baseRoster());
    await groupService.applyRoleChange({ groupId: 9, targetUserId: 2, newRole: 'leader', actorUserId: 1 });
    assert.strictEqual(fake.roleOf(2), 'leader');
    assert.strictEqual(fake.roleOf(1), 'member');
    assert.strictEqual(countRole(fake.members, 'co_leader'), 0);
    console.log('  ✅ 2. Promoting the Co-Leader to Leader leaves the Co-Leader seat empty');
  }

  // 3. Co-Leader swap displaces the existing Co-Leader
  {
    const fake = installFakeModel(baseRoster());
    const res = await groupService.applyRoleChange({ groupId: 9, targetUserId: 4, newRole: 'co_leader', actorUserId: 1 });
    assert.strictEqual(res.displacedUserId, 2, 'old Co-Leader id must be reported');
    assert.strictEqual(fake.roleOf(4), 'co_leader');
    assert.strictEqual(fake.roleOf(2), 'member');
    assert.strictEqual(countRole(fake.members, 'co_leader'), 1, 'exactly 1 Co-Leader after swap');
    assert.strictEqual(fake.roleOf(1), 'leader', 'Leader unaffected by Co-Leader swap');
    console.log('  ✅ 3. Assigning a new Co-Leader demotes the previous Co-Leader');
  }

  // 4. Leader cannot be demoted directly or self-transfer
  {
    installFakeModel(baseRoster());
    await assert.rejects(
      groupService.applyRoleChange({ groupId: 9, targetUserId: 1, newRole: 'member', actorUserId: 1 }),
      /Transfer leadership/
    );
    await assert.rejects(
      groupService.applyRoleChange({ groupId: 9, targetUserId: 1, newRole: 'leader', actorUserId: 1 }),
      /already the Leader/
    );
    await assert.rejects(
      groupService.applyRoleChange({ groupId: 9, targetUserId: 3, newRole: 'leader', actorUserId: 2 }),
      /Only the current Leader/
    );
    console.log('  ✅ 4. Direct Leader demotion, self-transfer, and non-Leader transfer are rejected');
  }

  // 5. Plain Co-Leader → Member demotion
  {
    const fake = installFakeModel(baseRoster());
    await groupService.applyRoleChange({ groupId: 9, targetUserId: 2, newRole: 'member', actorUserId: 1 });
    assert.strictEqual(fake.roleOf(2), 'member');
    console.log('  ✅ 5. Co-Leader can be demoted to Member');
  }

  // 6. Static checks: startup cleanup, frontend confirms & permission refresh
  const root = path.join(__dirname, '..');
  const dbConfig = fs.readFileSync(path.join(root, 'src/config/db.config.js'), 'utf8');
  assert.ok(dbConfig.includes("FROM group_members WHERE role = 'leader'") && dbConfig.includes("FROM group_members WHERE role = 'co_leader'"),
    'db.config.js must clean up duplicate Leaders and Co-Leaders on startup');
  assert.ok(dbConfig.includes('ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY joined_at'), 'cleanup must keep earliest-joined holder');

  const serviceSrc = fs.readFileSync(path.join(root, 'src/modules/groups/group.service.js'), 'utf8');
  assert.ok(/resolveLeadershipRequest[\s\S]*applyRoleChange\(/.test(serviceSrc), 'leadership approvals must go through applyRoleChange');

  const dashJs = fs.readFileSync(path.join(root, 'public/js/dashboard.js'), 'utf8');
  assert.ok(dashJs.includes('Transfer Leadership'), 'dashboard.js must confirm leadership transfer');
  assert.ok(dashJs.includes('Replace Co-Leader'), 'dashboard.js must confirm Co-Leader swap');

  const appJs = fs.readFileSync(path.join(root, 'public/js/app.js'), 'utf8');
  assert.ok(appJs.includes('Transfer Leadership') && appJs.includes('Approve as Co-Leader'), 'app.js must confirm request approvals');
  assert.ok(appJs.includes('currentGroupDetails = gRes.data'), 'app.js must refresh permissions after approval');
  console.log('  ✅ 6. Startup cleanup, approval routing, and frontend confirms verified');

  console.log('\n🎉 Single Leader & Co-Leader rule tests passed!\n');
}

run().then(() => process.exit(0)).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
