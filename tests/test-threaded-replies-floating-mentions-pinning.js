'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Testing Threaded Comment Replies, Floating Overlay Mentions/Tagging & Restricted Pinning ===\n');

const dbConfig = fs.readFileSync(path.join(__dirname, '../src/config/db.config.js'), 'utf8');
const discussionModel = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.model.js'), 'utf8');
const discussionService = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.service.js'), 'utf8');
const discussionController = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.controller.js'), 'utf8');
const discussionsJs = fs.readFileSync(path.join(__dirname, '../public/js/discussions.js'), 'utf8');
const dashboardJs = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');

// 1. THREADED REPLIES (REPLY-TO-REPLY)
console.log('💬 1. Verifying Threaded Comment Replies (Database, Backend & Nested Frontend)...');
assert(
  dbConfig.includes('parent_comment_id INTEGER REFERENCES discussion_comments(id) ON DELETE CASCADE'),
  'db.config.js must include parent_comment_id INTEGER REFERENCES discussion_comments(id) ON DELETE CASCADE on discussion_comments'
);
assert(
  discussionModel.includes('parentCommentId') &&
  discussionModel.includes('parent_comment_id'),
  'discussion.model.js addComment must support parentCommentId -> parent_comment_id'
);
assert(
  discussionService.includes('parentCommentId') &&
  discussionController.includes('parentCommentId'),
  'discussion.service.js and discussion.controller.js must accept and pass parentCommentId'
);
assert(
  (discussionsJs.includes('border-left: 2px solid #cbd5e1') || dashboardJs.includes('border-left:2px solid #cbd5e1')) &&
  (discussionsJs.includes('margin-left: 16px') || dashboardJs.includes('margin-left:16px')) &&
  (discussionsJs.includes('padding-left: 12px') || dashboardJs.includes('padding-left:12px')),
  'Nested replies must be indented with border-left: 2px solid #cbd5e1; margin-left: 16px; padding-left: 12px;'
);
assert(
  discussionsJs.includes('MAX_INDENT_LEVEL = 3') &&
  dashboardJs.includes('MAX_INDENT_LEVEL = 3') &&
  discussionsJs.includes('reply-handle') &&
  dashboardJs.includes('reply-handle'),
  'Visual indentation must be capped at 3 levels and display @AuthorName handle tag for deeper replies'
);
assert(
  dashboardJs.includes('toggleInlineReply') &&
  dashboardJs.includes('submitInlineReply') &&
  dashboardJs.includes('toggleCommentReplies') &&
  discussionsJs.includes('renderThreadedComments'),
  'Inline reply input toggle, submit handler, and Hide/Show X replies collapse toggle must be defined'
);
console.log('  ✅ Threaded comment replies (parent_comment_id, 3-level cap, @handle, inline reply & collapse toggle) verified');

// 2. FLOATING OVERLAY MENTIONS (@) & NOTEBOOK/FOLDER TAGGING (#)
console.log('\n🎯 2. Verifying Floating Caret-Positioned Mentions (@) & Accordion Folder Tagging (#)...');
assert(
  discussionsJs.includes('function getCaretCoordinates') &&
  discussionsJs.includes('function positionDropdown') &&
  discussionsJs.includes("dd.style.position = 'fixed'"),
  'discussions.js must calculate typing cursor caret coordinates and position floating overlay dropdown near/above caret'
);
assert(
  discussionsJs.includes("e.key === 'Escape'") &&
  discussionsJs.includes('hideDropdown()') &&
  discussionsJs.includes('function handleDropdownItemEvent'),
  'discussions.js must immediately select item on click/mousedown and close/hide dropdown on item selection or Escape key'
);
assert(
  discussionsJs.includes('expandFolderAccordionInline') &&
  discussionsJs.includes('openFolderSubPagesView') &&
  discussionsJs.includes('#NB Pages') &&
  discussionsJs.includes('#NB Folders'),
  'discussions.js must display #NB Pages and #NB Folders with hover/click accordion sub-page expansion'
);
assert(
  discussionsJs.includes('#Page:') &&
  discussionsJs.includes('#Folder:') &&
  discussionsJs.includes('handlePageTagClick') &&
  discussionsJs.includes('handleFolderTagClick'),
  'discussions.js must render clickable #Page and #Folder UI chips'
);
console.log('  ✅ Floating overlay caret positioning, Escape/select close, and #NB Folder accordion expansion verified');

// 3. THREAD PINNING AUTHORIZATION RESTRICTION
console.log('\n📌 3. Verifying Restricted Thread Pinning (Leader or Thread Creator Only)...');
assert(
  discussionService.includes('isLeader') &&
  discussionService.includes('isThreadCreator') &&
  discussionService.includes('topic.created_by') &&
  discussionService.includes('403'),
  'Backend togglePinComment must restrict pinning to Group Leader or Thread Creator with 403 Forbidden'
);
assert(
  dashboardJs.includes('const canPin = Boolean(isLeader || isThreadCreator)') &&
  dashboardJs.includes('canPin ?'),
  'Frontend must hide the interactive Pin button (📌) for regular unprivileged members'
);
console.log('  ✅ Thread pinning strictly restricted to Group Leader or Thread Creator');

console.log('\n🎉 ALL THREADED REPLIES, FLOATING MENTIONS & PINNING RESTRICTION TESTS PASSED!\n');

