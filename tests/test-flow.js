/**
 * Automated Verification Test Suite for GroupSpace
 * Tests core business workflows across all modules with Neon PostgreSQL (@neondatabase/serverless).
 */

const assert = require('assert');
require('dotenv').config();

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';

const sql = require('../src/config/db.config');
const authService = require('../src/modules/auth/auth.service');
const groupService = require('../src/modules/groups/group.service');
const taskService = require('../src/modules/tasks/task.service');
const notebookService = require('../src/modules/notebook/notebook.service');
const expenseService = require('../src/modules/expenses/expense.service');
const personalService = require('../src/modules/personal-space/personal.service');
const discussionService = require('../src/modules/discussions/discussion.service');
const { ROLES, TASK_STATUS } = require('../src/config/constants');

async function cleanupTestData() {
  try {
    const testEmails = ['alice_test@groupspace.io', 'bob_test@groupspace.io'];
    for (const email of testEmails) {
      const [u] = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (u) {
        await sql`DELETE FROM users WHERE id = ${u.id}`;
      }
      await sql`DELETE FROM email_verifications WHERE email = ${email}`;
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

async function runTests() {
  console.log('🧪 Starting GroupSpace Automated Verification Suite with Neon PostgreSQL...\n');

  try {
    // Ensure DB schema exists
    if (typeof sql.initDb === 'function') {
      await sql.initDb();
    }

    // Clean up previous test runs if any
    await cleanupTestData();

    const aliceEmail = 'alice_test@groupspace.io';
    const bobEmail = 'bob_test@groupspace.io';

    // 1. Email Verification & Auth Registration
    console.log('1️⃣ Testing Email Verification Code & User Registration...');
    
    // Request code for Alice
    const reqCodeResult = await authService.requestVerificationCode(aliceEmail, 'SIGNUP');
    assert(reqCodeResult.success, 'Verification request must succeed');
    
    // Query code from Neon db
    const [codeRecord] = await sql`
      SELECT otp_code FROM email_verifications
      WHERE email = ${aliceEmail} AND type = 'SIGNUP'
      ORDER BY created_at DESC LIMIT 1
    `;
    assert(codeRecord && codeRecord.otp_code, 'Verification code must be saved in database');
    assert.strictEqual(codeRecord.otp_code.length, 6, 'Verification code must be 6 digits');
    console.log(`   ✅ 6-digit email verification code generated: [${codeRecord.otp_code}]`);

    // Verify invalid code throws error
    let invalidCodeRejected = false;
    try {
      await authService.verifyCode(aliceEmail, '000000', 'SIGNUP');
    } catch (e) {
      invalidCodeRejected = true;
    }
    assert(invalidCodeRejected, 'Invalid code should be rejected');
    console.log('   ✅ Invalid verification code correctly rejected.');

    // Register user with valid verification code
    const userLeader = await authService.registerUser({
      fullName: 'Alice Leader',
      email: aliceEmail,
      password: 'password123',
      otpCode: codeRecord.otp_code
    });
    assert(userLeader.token, 'Token must be generated upon registration');
    assert.strictEqual(userLeader.user.avatarInitials, 'AL');
    console.log('   ✅ Email verified & Leader registered successfully (AL) + Welcome Email triggered.');

    // Register second user (Bob)
    const userMember = await authService.registerUser({
      fullName: 'Bob Collaborator',
      email: bobEmail,
      password: 'password123'
    });
    assert.strictEqual(userMember.user.avatarInitials, 'BC');
    console.log('   ✅ Member registered successfully (BC).');

    // 2. Password Reset OTP Flow
    console.log('\n2️⃣ Testing Password Reset via Email OTP...');
    const resetReq = await authService.requestVerificationCode(bobEmail, 'RESET_PASSWORD');
    assert(resetReq.success);
    const [resetRecord] = await sql`
      SELECT otp_code FROM email_verifications
      WHERE email = ${bobEmail} AND type = 'RESET_PASSWORD'
      ORDER BY created_at DESC LIMIT 1
    `;
    assert(resetRecord && resetRecord.otp_code, 'Password reset OTP must be recorded in db');

    // Reset password
    const resetRes = await authService.resetPasswordWithOtp({
      email: bobEmail,
      otpCode: resetRecord.otp_code,
      newPassword: 'newpassword456'
    });
    assert(resetRes.success);

    // Verify login with new password works
    const bobLogin = await authService.loginUser({
      email: bobEmail,
      password: 'newpassword456'
    });
    assert(bobLogin.token, 'Bob must be able to log in with new password');
    console.log('   ✅ Password reset OTP flow verified & new password login successful.');

    // 2b. Failed Login Rate Limiting & 10-Minute Lockout Test
    console.log('\n🔒 Testing 3-Attempt Failed Password Protection & 10-Minute Lockout...');

    // Attempt 1: Wrong password -> 2 attempts remaining
    let attempt1Failed = false;
    try {
      await authService.loginUser({ email: bobEmail, password: 'wrongPassword1' });
    } catch (e) {
      attempt1Failed = true;
      assert.strictEqual(e.attemptsLeft, 2, 'First failed attempt should show 2 attempts remaining');
      assert.strictEqual(e.status, 401);
    }
    assert(attempt1Failed, 'Attempt 1 should fail');
    console.log('   ✅ Attempt 1 failed correctly: 2 attempts remaining.');

    // Attempt 2: Wrong password -> 1 attempt remaining
    let attempt2Failed = false;
    try {
      await authService.loginUser({ email: bobEmail, password: 'wrongPassword2' });
    } catch (e) {
      attempt2Failed = true;
      assert.strictEqual(e.attemptsLeft, 1, 'Second failed attempt should show 1 attempt remaining');
      assert.strictEqual(e.status, 401);
    }
    assert(attempt2Failed, 'Attempt 2 should fail');
    console.log('   ✅ Attempt 2 failed correctly: 1 attempt remaining.');

    // Attempt 3: Wrong password -> Lockout triggered (10 minutes, status 429)
    let attempt3Locked = false;
    try {
      await authService.loginUser({ email: bobEmail, password: 'wrongPassword3' });
    } catch (e) {
      attempt3Locked = true;
      assert(e.isLocked, 'Third failed attempt should trigger lockout flag');
      assert.strictEqual(e.status, 429, 'Lockout should return HTTP 429 status');
      assert(e.message.includes('10 minutes'), 'Lockout message must specify 10 minutes');
    }
    assert(attempt3Locked, 'Attempt 3 should trigger 10-minute lockout');
    console.log('   ✅ Attempt 3 locked out user for 10 minutes with HTTP 429.');

    // Attempt 4: Even with correct password, login is blocked while locked out
    let lockedAttemptBlocked = false;
    try {
      await authService.loginUser({ email: bobEmail, password: 'newpassword456' });
    } catch (e) {
      lockedAttemptBlocked = true;
      assert(e.isLocked, 'Account should remain locked');
      assert.strictEqual(e.status, 429);
    }
    assert(lockedAttemptBlocked, 'Account must remain locked during active 10-minute lockout');
    console.log('   ✅ Active lockout successfully prevents login even with correct password.');

    // Reset lockout in DB for remaining tests
    await sql`UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE email = ${bobEmail}`;

    // Verify Bob can log in again after reset
    const bobUnlockedLogin = await authService.loginUser({ email: bobEmail, password: 'newpassword456' });
    assert(bobUnlockedLogin.token, 'Bob can log in after lockout reset');
    console.log('   ✅ Lockout cleared and login successful.');

    // 3. Workspace Creation & Join Code Test
    console.log('\n3️⃣ Testing Workspace Creation & Multi-Group Switcher...');
    const workspace = await groupService.createWorkspace({
      name: 'CS Capstone 2026',
      description: 'Senior software engineering project',
      category: 'School Project',
      userId: userLeader.user.id,
      userFullName: userLeader.user.fullName
    });
    assert(workspace.id, 'Workspace must have an ID');
    assert(workspace.join_code.startsWith('GS-'), 'Join code should start with GS-');
    console.log(`   ✅ Workspace created with invite code: ${workspace.join_code}`);

    // Verify creator is LEADER
    const leaderMembership = await groupService.getWorkspaceDetails(workspace.id, userLeader.user.id);
    assert.strictEqual(leaderMembership.role, ROLES.LEADER, 'Creator must have LEADER role');
    console.log('   ✅ Creator assigned LEADER role.');

    // Bob joins via join code
    const joined = await groupService.joinWorkspace({
      joinCode: workspace.join_code,
      userId: userMember.user.id,
      userFullName: userMember.user.fullName
    });
    assert.strictEqual(joined.id, workspace.id);
    const memberDetails = await groupService.getWorkspaceDetails(workspace.id, userMember.user.id);
    assert.strictEqual(memberDetails.role, ROLES.MEMBER, 'Joiner must have MEMBER role');
    assert.strictEqual(memberDetails.members.length, 2, 'Workspace should have 2 members');
    console.log('   ✅ Collaborator joined workspace via invite code as MEMBER.');

    // 4. Kanban Tasks & Dual-Approval Workflow
    console.log('\n4️⃣ Testing Kanban Tasks & Dual-Approval Logic...');
    const task = await taskService.createTask({
      groupId: workspace.id,
      title: 'Setup Database Connection',
      description: 'Configure Neon PostgreSQL schema and relations',
      priority: 'HIGH',
      assignedToUserId: userMember.user.id,
      createdByUserId: userLeader.user.id,
      userFullName: userLeader.user.fullName
    });
    assert.strictEqual(task.status, TASK_STATUS.TODO);
    console.log('   ✅ Task created in To Do.');

    // Move to IN_PROGRESS
    const inProg = await taskService.updateTaskStatus({
      taskId: task.id,
      groupId: workspace.id,
      status: TASK_STATUS.IN_PROGRESS,
      userId: userMember.user.id,
      userRole: ROLES.MEMBER,
      userFullName: userMember.user.fullName
    });
    assert.strictEqual(inProg.status, TASK_STATUS.IN_PROGRESS);
    console.log('   ✅ Task started -> IN_PROGRESS.');

    // Member submits for approval
    const pending = await taskService.updateTaskStatus({
      taskId: task.id,
      groupId: workspace.id,
      status: TASK_STATUS.PENDING_APPROVAL,
      userId: userMember.user.id,
      userRole: ROLES.MEMBER,
      userFullName: userMember.user.fullName
    });
    assert.strictEqual(pending.status, TASK_STATUS.PENDING_APPROVAL);
    console.log('   ✅ Task submitted for approval -> PENDING_APPROVAL.');

    // Verification: Non-leader member cannot directly mark DONE
    let dualApprovalBlocked = false;
    try {
      await taskService.updateTaskStatus({
        taskId: task.id,
        groupId: workspace.id,
        status: TASK_STATUS.DONE,
        userId: userMember.user.id,
        userRole: ROLES.MEMBER,
        userFullName: userMember.user.fullName
      });
    } catch (err) {
      dualApprovalBlocked = true;
    }
    assert(dualApprovalBlocked, 'Dual-Approval: Member must be blocked from self-approving task as DONE');
    console.log('   ✅ Dual-Approval successfully blocked standard member from bypassing Leader review!');

    // Leader approves task
    const approved = await taskService.reviewTaskApproval({
      taskId: task.id,
      groupId: workspace.id,
      approved: true,
      approvalNotes: 'Code reviewed and tested with Neon. Excellent job!',
      leaderUserId: userLeader.user.id,
      leaderFullName: userLeader.user.fullName
    });
    assert.strictEqual(approved.status, TASK_STATUS.DONE);
    assert.strictEqual(Number(approved.approved_by_user_id), userLeader.user.id);
    console.log('   ✅ Leader verified and approved task -> DONE.');

    // 5. Collaborative Notebook
    console.log('\n5️⃣ Testing Collaborative Notebook...');
    const note = await notebookService.createNote({
      groupId: workspace.id,
      title: 'Architecture Decisions',
      content: 'We use Express with modular route domains and Neon PostgreSQL storage.',
      tags: 'architecture, backend, neon',
      isPinned: true,
      authorUserId: userLeader.user.id,
      authorName: userLeader.user.fullName
    });
    assert(note.id);
    assert.strictEqual(Number(note.is_pinned), 1);

    const searchResults = await notebookService.getGroupNotes(workspace.id, 'PostgreSQL');
    assert.strictEqual(searchResults.length, 1);
    console.log('   ✅ Notebook page created, pinned, and successfully queried.');

    // 6. Expense Ledger & Split Calculation
    console.log('\n6️⃣ Testing Expense Ledger & Net Debt Settlement Algorithm...');
    await expenseService.addExpense({
      groupId: workspace.id,
      title: 'Hosting & Domain',
      amount: 60.00,
      category: 'Tools & Software',
      paidByUserId: userLeader.user.id,
      splitType: 'EQUAL',
      actorName: userLeader.user.fullName
    });

    const summary = await expenseService.getExpenseSummary(workspace.id);
    assert.strictEqual(Number(summary.totalSpent), 60.00);
    const aliceBal = summary.memberBalances.find(b => Number(b.userId) === Number(userLeader.user.id));
    const bobBal = summary.memberBalances.find(b => Number(b.userId) === Number(userMember.user.id));
    assert.strictEqual(aliceBal.net, 30.00);
    assert.strictEqual(bobBal.net, -30.00);
    assert.strictEqual(summary.settlements.length, 1);
    assert.strictEqual(Number(summary.settlements[0].fromUserId), Number(userMember.user.id));
    assert.strictEqual(Number(summary.settlements[0].toUserId), Number(userLeader.user.id));
    assert.strictEqual(Number(summary.settlements[0].amount), 30.00);
    console.log(`   ✅ Expense split verified: Bob owes Alice $${summary.settlements[0].amount.toFixed(2)}.`);

    // 7. Discussions & Activity Feed
    console.log('\n7️⃣ Testing Discussions & Activity Feed...');
    const topic = await discussionService.createTopic({
      groupId: workspace.id,
      title: 'UI Design Review',
      category: 'General',
      authorUserId: userMember.user.id,
      authorName: userMember.user.fullName
    });
    assert(topic.id);

    const comment = await discussionService.postComment({
      topicId: topic.id,
      groupId: workspace.id,
      content: 'The neon green theme is clean and responsive!',
      userId: userLeader.user.id,
      userName: userLeader.user.fullName
    });
    assert.strictEqual(comment.content, 'The neon green theme is clean and responsive!');

    const activity = await discussionService.getActivityFeed(workspace.id);
    assert(activity.length >= 4, 'Activity feed should capture events');
    console.log(`   ✅ Discussion thread active; ${activity.length} activity audit log events recorded.`);

    // 8. Isolated Personal Space
    console.log('\n8️⃣ Testing Isolated Personal Space (Zero Cross-User Leakage)...');
    const privateNote = await personalService.addPersonalItem({
      userId: userLeader.user.id,
      type: 'NOTE',
      title: 'Alice Secret Exam Prep',
      content: 'Chapter 4 Algorithms and DS notes'
    });
    assert(privateNote.id);

    const aliceNotes = await personalService.getPersonalItems(userLeader.user.id, 'NOTE');
    const bobNotes = await personalService.getPersonalItems(userMember.user.id, 'NOTE');

    assert.strictEqual(aliceNotes.length, 1);
    assert.strictEqual(bobNotes.length, 0, 'Bob must NOT see Alice private personal items');
    console.log('   ✅ Personal space confirmed strictly private and isolated.');

    console.log('\n🎉 ALL 8 TEST SUITES PASSED FLAWLESSLY WITH NEON POSTGRESQL!\n');
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  } finally {
    // Cleanup test data
    await cleanupTestData();
  }
}

runTests();
