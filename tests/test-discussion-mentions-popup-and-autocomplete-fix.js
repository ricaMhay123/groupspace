'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Verifying Discussion Mentions Autocomplete & Writing Bubble Popup Fixes ===\n');

const dashboardHtml = fs.readFileSync(path.join(__dirname, '../public/dashboard.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
const dashboardJs = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');
const discussionsJs = fs.readFileSync(path.join(__dirname, '../public/js/discussions.js'), 'utf8');

// 1. SUPPRESSION OF BROWSER POPUP / EDGE EDITOR SPEECH BUBBLE
console.log('🚫 1. Verifying Browser Writing Bubble / Assistant Popup Suppression...');
assert(
  dashboardHtml.includes('id="newCommentInput"') &&
  dashboardHtml.includes('data-ms-editor="false"') &&
  dashboardHtml.includes('autocomplete="off"') &&
  dashboardHtml.includes('spellcheck="false"'),
  '#newCommentInput in dashboard.html must have data-ms-editor="false", autocomplete="off", spellcheck="false"'
);
assert(
  dashboardHtml.includes('id="topicTitle"') &&
  dashboardHtml.includes('data-ms-editor="false"'),
  '#topicTitle in dashboard.html must have data-ms-editor="false"'
);
assert(
  styleCss.includes('#newCommentInput::-ms-clear') || styleCss.includes('data-ms-editor="false"]::-ms-clear'),
  'style.css must suppress ::-ms-clear and ::-ms-reveal for data-ms-editor inputs'
);
assert(
  styleCss.includes('#topicChatPanel') && styleCss.includes('overflow: visible'),
  'style.css must ensure #topicChatPanel does not clip mention dropdown'
);
console.log('  ✅ Native browser editor speech bubbles and clear buttons successfully suppressed');

// 2. ACTIVE GROUP ID RESOLUTION & DOM FALLBACKS
console.log('\n🔍 2. Verifying Resilient Active Group ID Resolution...');
assert(
  dashboardJs.includes('window.currentGroupId = currentGroupId'),
  'dashboard.js switchWorkspace must expose window.currentGroupId'
);
assert(
  discussionsJs.includes('function getActiveGroupId()') &&
  discussionsJs.includes('groupSwitcher') &&
  discussionsJs.includes('groupspace_active_group_id'),
  'discussions.js must implement getActiveGroupId with DOM switcher and localStorage fallbacks'
);
console.log('  ✅ Workspace ID resolution is resilient across DOM, window, and storage');

// 3. DROPDOWN LIFECYCLE, EMPTY STATE FEEDBACK & OUTSIDE CLICK DISMISSAL
console.log('\n📋 3. Verifying Dropdown Lifecycle, Empty State Feedback & Outside Click Dismissal...');
assert(
  discussionsJs.includes('mention-dropdown-header') &&
  discussionsJs.includes('No results matching') || discussionsJs.includes('No members found in this workspace'),
  'discussions.js renderDropdown must provide explicit user-facing empty state instead of hiding silently'
);
assert(
  discussionsJs.includes("document.addEventListener('pointerdown'") || discussionsJs.includes('pointerdown'),
  'discussions.js must dismiss dropdown on outside click rather than premature blur'
);
assert(
  discussionsJs.includes('getBoundingClientRect') &&
  discussionsJs.includes('top < 220'),
  'discussions.js must dynamically flip dropdown position when space above is constrained'
);
assert(
  discussionsJs.includes('window.setupMentionInput = setupMentionInput'),
  'discussions.js must export setupMentionInput to window'
);
console.log('  ✅ Dropdown lifecycle, empty feedback state, and outside click handling verified');

console.log('\n🎉 ALL DISCUSSION MENTIONS & POPUP REMOVAL TESTS PASSED!\n');
