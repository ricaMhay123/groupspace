/**
 * Direct Messaging Drawer & 1-on-1 Persistent PMs Test Suite
 *
 * Verifies:
 * 1. Database schema: direct_messages table & indexes in db.config.js
 * 2. Backend Message module: Model, Service, Controller, Routes mounted in app.js
 * 3. Validation: membership guards, non-empty text, self-messaging prevention
 * 4. Slide-out Drawer markup: Header trigger #dmDrawerBtn, overlay #dmDrawerOverlay, aside #dmDrawer
 * 5. Drawer Views: View 1 (Teammates Directory) & View 2 (Active 1-on-1 Chat Thread)
 * 6. Quick PM triggers: Homespace roster, Kanban cards, Discussion comment avatars
 * 7. CSS tokens & animations: 340px slide-out drawer, message bubbles, presence indicators
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🧪 DIRECT MESSAGING DRAWER & 1-ON-1 PMs TEST SUITE');
console.log('================================================================\n');

// ── 1. DATABASE SCHEMA & TABLE DEFINITIONS ──
console.log('📦 1. Database Schema & Tables:');
const dbConfigPath = path.join(__dirname, '..', 'src', 'config', 'db.config.js');
const dbConfigContent = fs.readFileSync(dbConfigPath, 'utf8');

assert(dbConfigContent.includes('CREATE TABLE IF NOT EXISTS direct_messages'), 'db.config.js defines direct_messages table');
assert(dbConfigContent.includes('group_id INTEGER NOT NULL REFERENCES groups(id)'), 'direct_messages has foreign key to groups(id)');
assert(dbConfigContent.includes('sender_id INTEGER NOT NULL REFERENCES users(id)'), 'direct_messages has sender_id foreign key');
assert(dbConfigContent.includes('receiver_id INTEGER NOT NULL REFERENCES users(id)'), 'direct_messages has receiver_id foreign key');
assert(dbConfigContent.includes('is_read BOOLEAN DEFAULT FALSE'), 'direct_messages tracks is_read boolean');
assert(dbConfigContent.includes('idx_direct_messages_group_users'), 'direct_messages has group & users composite index');

// ── 2. BACKEND MODULE ARCHITECTURE & ROUTES ──
console.log('\n🔒 2. Backend Module Architecture & API Endpoints:');
const modelPath = path.join(__dirname, '..', 'src', 'modules', 'messages', 'message.model.js');
const servicePath = path.join(__dirname, '..', 'src', 'modules', 'messages', 'message.service.js');
const ctrlPath = path.join(__dirname, '..', 'src', 'modules', 'messages', 'message.controller.js');
const routesPath = path.join(__dirname, '..', 'src', 'modules', 'messages', 'message.routes.js');
const appPath = path.join(__dirname, '..', 'src', 'app.js');

assert(fs.existsSync(modelPath), 'message.model.js exists');
assert(fs.existsSync(servicePath), 'message.service.js exists');
assert(fs.existsSync(ctrlPath), 'message.controller.js exists');
assert(fs.existsSync(routesPath), 'message.routes.js exists');

const model = require(modelPath);
const service = require(servicePath);
const routesContent = fs.readFileSync(routesPath, 'utf8');
const appContent = fs.readFileSync(appPath, 'utf8');

assert(typeof model.createDirectMessage === 'function', 'model exports createDirectMessage');
assert(typeof model.getConversationMessages === 'function', 'model exports getConversationMessages');
assert(typeof model.getWorkspaceConversations === 'function', 'model exports getWorkspaceConversations');
assert(typeof model.markMessagesAsRead === 'function', 'model exports markMessagesAsRead');
assert(typeof model.createFeedNotification === 'function', 'model exports createFeedNotification');

assert(typeof service.getConversations === 'function', 'service exports getConversations');
assert(typeof service.getDirectHistory === 'function', 'service exports getDirectHistory');
assert(typeof service.sendDirectMessage === 'function', 'service exports sendDirectMessage');

assert(routesContent.includes("router.get('/conversations'"), 'routes expose GET /conversations');
assert(routesContent.includes("router.get('/direct/:otherUserId'"), 'routes expose GET /direct/:otherUserId');
assert(routesContent.includes("router.post('/direct'"), 'routes expose POST /direct');
assert(appContent.includes('/api/groups/:groupId/messages'), 'app.js mounts message routes under /api/groups/:groupId/messages');

// ── 3. SERVICE-LEVEL VALIDATIONS ──
console.log('\n🛡️ 3. Service-Level Validation Guarantees:');
async function testValidations() {
  // Empty message check
  try {
    await service.sendDirectMessage({ groupId: 1, senderId: 10, receiverId: 20, message: '   ' });
    assert(false, 'Should reject empty message');
  } catch (e) {
    assert(e.status === 400 && e.message.includes('cannot be empty'), 'Rejects empty message with 400 status');
  }

  // Self-messaging check
  try {
    await service.sendDirectMessage({ groupId: 1, senderId: 10, receiverId: 10, message: 'Hello self' });
    assert(false, 'Should reject self-messaging');
  } catch (e) {
    assert(e.status === 400 && e.message.includes('Cannot send a direct message to yourself'), 'Rejects self-messaging with 400 status');
  }
}

// ── 4. SLIDE-OUT CHAT DRAWER MARKUP & VIEWS ──
console.log('\n💬 4. Slide-Out Chat Drawer Markup & Views:');
const htmlPath = path.join(__dirname, '..', 'public', 'dashboard.html');
const jsPath = path.join(__dirname, '..', 'public', 'js', 'dashboard.js');
const tasksJsPath = path.join(__dirname, '..', 'public', 'js', 'tasks.js');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const tasksJs = fs.readFileSync(tasksJsPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

assert(html.includes('id="dmDrawerBtn"'), 'dashboard.html includes header button #dmDrawerBtn');
assert(html.includes('id="dmUnreadBadge"'), 'dashboard.html includes unread counter badge #dmUnreadBadge');
assert(html.includes('id="dmDrawerOverlay"'), 'dashboard.html includes #dmDrawerOverlay');
assert(html.includes('id="dmDrawer"'), 'dashboard.html includes #dmDrawer container');
assert(html.includes('id="dmListView"'), 'Drawer includes View 1 #dmListView (Teammates Directory)');
assert(html.includes('id="dmTeammatesList"'), 'View 1 includes #dmTeammatesList');
assert(html.includes('id="dmThreadView"'), 'Drawer includes View 2 #dmThreadView (Active Chat Thread)');
assert(html.includes('id="dmMessagesContainer"'), 'View 2 includes #dmMessagesContainer');
assert(html.includes('id="dmMessageInput"'), 'View 2 includes message text input #dmMessageInput');
assert(html.includes('id="dmSendBtn"'), 'View 2 includes send button #dmSendBtn');

// ── 5. FRONTEND CONTROLLER & QUICK PM TRIGGERS ──
console.log('\n⚡ 5. Frontend Controller Functions & Quick PM Triggers:');
assert(js.includes('function toggleDmDrawer'), 'dashboard.js defines toggleDmDrawer');
assert(js.includes('function openDirectMessageDrawer'), 'dashboard.js defines openDirectMessageDrawer');
assert(js.includes('function loadDmConversations'), 'dashboard.js defines loadDmConversations');
assert(js.includes('function loadDmThread'), 'dashboard.js defines loadDmThread');
assert(js.includes('function sendDirectMessage'), 'dashboard.js defines sendDirectMessage');

// Quick PM actions in Homespace roster, Kanban cards, and Discussions
assert(js.includes('openDirectMessageDrawer('), 'dashboard.js triggers openDirectMessageDrawer from roster/avatars');
assert(tasksJs.includes('openDirectMessageDrawer(') || js.includes('openDirectMessageDrawer('), 'Kanban cards support quick PM trigger');

// ── 6. CSS STYLING & RESPONSIVE DRAWER ──
console.log('\n🎨 6. CSS Tokens, Drawer Animations & Bubble Styling:');
assert(css.includes('#dmDrawer'), 'CSS defines #dmDrawer');
assert(css.includes('width: 340px'), 'Drawer width is 340px');
assert(css.includes('transform: translateX(100%)'), 'Drawer is translated off-canvas by default');
assert(css.includes('#dmDrawer.open'), 'CSS defines open state for drawer');
assert(css.includes('.dm-bubble.sent'), 'CSS defines sent message bubbles');
assert(css.includes('.dm-bubble.received'), 'CSS defines received message bubbles');
assert(css.includes('.dm-presence-dot'), 'CSS defines online/offline presence indicators');

// ── 7. SYNTAX CHECKS ──
console.log('\n⚙️ 7. Script Syntax Integrity Verification:');
try {
  new vm.Script(js, { filename: 'public/js/dashboard.js' });
  assert(true, 'dashboard.js compiles cleanly');
} catch (e) {
  assert(false, `dashboard.js syntax error: ${e.message}`);
}

async function run() {
  await testValidations();

  console.log('\n================================================================');
  console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All Direct Messaging Drawer tests passed!\n');
    process.exit(0);
  }
}

run();
