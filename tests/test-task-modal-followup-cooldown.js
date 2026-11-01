'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Testing Task Modal Follow-Up Encapsulation & 24h Cooldown ===\n');

const dbConfigJs = fs.readFileSync(path.join(__dirname, '../src/config/db.config.js'), 'utf8');
const taskModelJs = fs.readFileSync(path.join(__dirname, '../src/modules/tasks/task.model.js'), 'utf8');
const taskServiceJs = fs.readFileSync(path.join(__dirname, '../src/modules/tasks/task.service.js'), 'utf8');
const tasksJs = fs.readFileSync(path.join(__dirname, '../public/js/tasks.js'), 'utf8');

// ─── 1. DATABASE SCHEMA & MODEL CHECKS ──────────────────────────────────────────
console.log('📦 1. Verifying Database Schema & Model for last_followed_up_at...');
assert(
  dbConfigJs.includes('last_followed_up_at TIMESTAMPTZ') || dbConfigJs.includes('last_followed_up_at TIMESTAMP'),
  'db.config.js must include last_followed_up_at in tasks table definition'
);
assert(
  dbConfigJs.includes('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_followed_up_at'),
  'db.config.js must include migration to add last_followed_up_at to tasks'
);
assert(
  taskModelJs.includes('last_followed_up_at'),
  'task.model.js must support last_followed_up_at in TaskModel.update'
);
console.log('  ✅ Database schema & task model include last_followed_up_at');

// ─── 2. BACKEND RATE LIMITING & 429 ANTI-SPAM ─────────────────────────────────
console.log('\n🔒 2. Verifying Backend Rate Limiting (429 Too Many Requests)...');
assert(
  taskServiceJs.includes('last_followed_up_at'),
  'task.service.js must check task.last_followed_up_at'
);
assert(
  taskServiceJs.includes('429') || taskServiceJs.includes('TOO_MANY_REQUESTS'),
  'task.service.js must throw 429 when follow-up cooldown is active'
);
assert(
  taskServiceJs.includes('Follow-up already sent today'),
  'task.service.js must return "Follow-up already sent today" message on 429'
);
assert(
  taskServiceJs.includes('24 * 60 * 60 * 1000') || taskServiceJs.includes('86400000'),
  'task.service.js must enforce 24-hour cooldown window'
);
assert(
  taskServiceJs.includes('TaskModel.update') && taskServiceJs.includes('last_followed_up_at'),
  'task.service.js must update last_followed_up_at timestamp upon sending follow-up'
);
console.log('  ✅ Backend 24h anti-spam rate limiting and timestamp persistence verified');

// ─── 3. TASK MODAL ENCAPSULATION (OUTER CARDS MUST NOT CONTAIN FOLLOW UP) ──────
console.log('\n🎴 3. Verifying Outer Kanban Cards Do Not Render Follow-Up Buttons...');
// Extract renderKanbanCard implementation body
const renderKanbanStart = tasksJs.indexOf('function renderKanbanCard(');
const renderKanbanEnd = tasksJs.indexOf('function openTaskDetailsModal(');
assert(renderKanbanStart !== -1 && renderKanbanEnd !== -1, 'renderKanbanCard function must exist');
const renderKanbanBody = tasksJs.slice(renderKanbanStart, renderKanbanEnd);

assert(
  !renderKanbanBody.includes('btn-follow-up') && !renderKanbanBody.includes('followUpOnTask'),
  'renderKanbanCard must NOT create or append any btn-follow-up buttons to outer Kanban cards'
);
console.log('  ✅ Outer Kanban cards are clean and free of follow-up buttons');

// ─── 4. MODAL BUTTON STATES & COOLDOWN RENDERING ───────────────────────────────
console.log('\n🪟 4. Verifying Task Details Modal Button States & Cooldown Evaluation...');
const openModalStart = tasksJs.indexOf('async function openTaskDetailsModal(');
const openModalEnd = tasksJs.indexOf('window.renderKanbanCard =');
assert(openModalStart !== -1 && openModalEnd !== -1, 'openTaskDetailsModal function must exist');
const openModalBody = tasksJs.slice(openModalStart, openModalEnd);

assert(
  openModalBody.includes('btn-follow-up'),
  'openTaskDetailsModal must contain the follow-up button'
);
assert(
  openModalBody.includes('Followed Up Today ✓'),
  'openTaskDetailsModal must render "Followed Up Today ✓" when in 24h cooldown'
);
assert(
  openModalBody.includes('disabled'),
  'openTaskDetailsModal must render disabled button when in cooldown'
);
assert(
  tasksJs.includes("btn.textContent = 'Follow-Up Sent ✓'"),
  'followUpOnTask must temporarily show "Follow-Up Sent ✓"'
);
assert(
  tasksJs.includes('2000'),
  'followUpOnTask must retain 2000ms visual timeout'
);
assert(
  tasksJs.includes('Followed Up Today ✓'),
  'followUpOnTask must transition to "Followed Up Today ✓" after send'
);
console.log('  ✅ Task Details Modal correctly evaluates 24h cooldown and toggles button states');

console.log('\n🎉 ALL TASK MODAL FOLLOW-UP & COOLDOWN TESTS PASSED SUCCESSFULLY!\n');

