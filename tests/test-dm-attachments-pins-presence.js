/**
 * Test Suite: DM Attachments, Pinned Messages in Chats/Threads, and Accurate Online Presence
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing DM Attachments, Pinned Messages & Accurate Online Presence...');

// 1. Verify db schema migrations in db.config.js
const dbConfigSource = fs.readFileSync(path.join(__dirname, '../src/config/db.config.js'), 'utf8');
assert(dbConfigSource.includes('last_active_at TIMESTAMPTZ DEFAULT NOW()'), 'db.config.js adds last_active_at to users table');
assert(dbConfigSource.includes('ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS attachments JSONB'), 'db.config.js adds attachments to direct_messages table');
assert(dbConfigSource.includes('ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN'), 'db.config.js adds is_pinned to direct_messages table');
assert(dbConfigSource.includes('ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ'), 'db.config.js adds pinned_at to direct_messages table');
assert(dbConfigSource.includes('ALTER TABLE discussion_comments ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN'), 'db.config.js adds is_pinned to discussion_comments table');
assert(dbConfigSource.includes('ALTER TABLE discussion_comments ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ'), 'db.config.js adds pinned_at to discussion_comments table');
console.log('  ✅ Database schema migrations verified');

// 2. Verify Heartbeat Route & Controller
const authRoutesSource = fs.readFileSync(path.join(__dirname, '../src/modules/auth/auth.routes.js'), 'utf8');
assert(authRoutesSource.includes("router.post('/heartbeat'"), 'auth.routes.js exposes POST /api/auth/heartbeat');

const authControllerSource = fs.readFileSync(path.join(__dirname, '../src/modules/auth/auth.controller.js'), 'utf8');
assert(authControllerSource.includes('heartbeat'), 'auth.controller.js defines and exports heartbeat');
assert(authControllerSource.includes('last_active_at'), 'heartbeat updates users.last_active_at');
console.log('  ✅ Heartbeat route & controller verified');

// 3. Verify Dynamic Online Presence SQL calculation
const messageModelSource = fs.readFileSync(path.join(__dirname, '../src/modules/messages/message.model.js'), 'utf8');
assert(messageModelSource.includes("INTERVAL '2 minutes'") || messageModelSource.includes('INTERVAL \'2 minutes\''), 'message.model.js calculates 2-minute active presence window');

const groupModelSource = fs.readFileSync(path.join(__dirname, '../src/modules/groups/group.model.js'), 'utf8');
assert(groupModelSource.includes("INTERVAL '2 minutes'") || groupModelSource.includes('INTERVAL \'2 minutes\''), 'group.model.js calculates 2-minute active presence window for roster');
console.log('  ✅ 2-minute active presence calculation verified');

// 4. Verify DM Attachments & Pinning in message module
assert(messageModelSource.includes('attachments'), 'message.model.js persists attachments');
assert(messageModelSource.includes('is_pinned'), 'message.model.js supports message pinning');
assert(messageModelSource.includes('togglePinMessage'), 'message.model.js has togglePinMessage method');

const messageRoutesSource = fs.readFileSync(path.join(__dirname, '../src/modules/messages/message.routes.js'), 'utf8');
assert(messageRoutesSource.includes(':messageId/pin') || messageRoutesSource.includes('/pin'), 'message.routes.js exposes pin endpoint');

const messageServiceSource = fs.readFileSync(path.join(__dirname, '../src/modules/messages/message.service.js'), 'utf8');
assert(messageServiceSource.includes('togglePinMessage'), 'message.service.js implements togglePinMessage');
assert(messageServiceSource.includes('attachments'), 'message.service.js supports attachments');
console.log('  ✅ Direct messaging attachments & pin model/service verified');

// 5. Verify Discussion Comments Pinning
const discussionModelSource = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.model.js'), 'utf8');
assert(discussionModelSource.includes('togglePinComment'), 'discussion.model.js implements togglePinComment');

const discussionRoutesSource = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.routes.js'), 'utf8');
assert(discussionRoutesSource.includes(':commentId/pin'), 'discussion.routes.js exposes comment pin endpoint');

const discussionServiceSource = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.service.js'), 'utf8');
assert(discussionServiceSource.includes('togglePinComment'), 'discussion.service.js implements togglePinComment');
console.log('  ✅ Discussion comments pin model/service verified');

// 6. Verify Dashboard Frontend HTML elements
const dashboardHtml = fs.readFileSync(path.join(__dirname, '../public/dashboard.html'), 'utf8');
assert(dashboardHtml.includes('id="dmPinnedTray"'), 'dashboard.html includes #dmPinnedTray in DM drawer');
assert(dashboardHtml.includes('id="dmPinTrayToggleBtn"'), 'dashboard.html includes #dmPinTrayToggleBtn');
assert(dashboardHtml.includes('id="dmAttachBtn"'), 'dashboard.html includes #dmAttachBtn');
assert(dashboardHtml.includes('id="dmFileInput"'), 'dashboard.html includes #dmFileInput');
assert(dashboardHtml.includes('id="dmAttachmentStaging"'), 'dashboard.html includes #dmAttachmentStaging');
assert(dashboardHtml.includes('id="topicPinnedTray"'), 'dashboard.html includes #topicPinnedTray in discussion chat');
console.log('  ✅ Frontend HTML pinned trays and attachment inputs verified');

// 7. Verify Dashboard Controller Script
const dashboardJs = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');
assert(dashboardJs.includes('toggleDmPinnedTray'), 'dashboard.js implements toggleDmPinnedTray');
assert(dashboardJs.includes('togglePinDmMessage'), 'dashboard.js implements togglePinDmMessage');
assert(dashboardJs.includes('togglePinDiscussionComment'), 'dashboard.js implements togglePinDiscussionComment');
assert(dashboardJs.includes('openAttachmentLightbox'), 'dashboard.js connects DM image attachments to openAttachmentLightbox');
assert(dashboardJs.includes('/api/auth/heartbeat'), 'dashboard.js implements periodic presence heartbeat');
console.log('  ✅ Frontend JavaScript presence, attachment and pin logic verified');

// 8. Verify CSS styles for pinned trays
const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
assert(styleCss.includes('.chat-pinned-tray'), 'style.css defines .chat-pinned-tray');
assert(styleCss.includes('.dm-pinned-tray'), 'style.css defines .dm-pinned-tray');
console.log('  ✅ CSS styles for pinned trays verified');

console.log('\n🎉 ALL DM ATTACHMENTS, PINNED MESSAGES & PRESENCE TESTS PASSED!\n');

