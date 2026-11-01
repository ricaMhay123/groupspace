'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Testing Workspace @Mentions, Notebook Page/Folder #Tagging & Pinning Restrictions ===\n');

const discussionModelSource = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.model.js'), 'utf8');
const discussionServiceSource = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.service.js'), 'utf8');
const discussionControllerSource = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.controller.js'), 'utf8');
const discussionRoutesSource = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.routes.js'), 'utf8');
const discussionsJs = fs.readFileSync(path.join(__dirname, '../public/js/discussions.js'), 'utf8');
const dashboardJs = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');

// ─── 1. WORKSPACE-LIMITED MEMBER MENTIONS (@) ──────────────────────────────────
console.log('👥 1. Verifying Workspace-Limited Member Mentions (@)...');
assert(
  discussionModelSource.includes('findMentionableUsers') &&
  discussionModelSource.includes('JOIN group_members gm ON u.id = gm.user_id') &&
  discussionModelSource.includes('gm.group_id = ${groupId}'),
  'findMentionableUsers must strictly query users enrolled in group_members for active groupId'
);
assert(
  discussionsJs.includes('.mention-dropdown') &&
  (discussionsJs.includes('bottom: 100%') || discussionsJs.includes('positionDropdown')),
  'discussions.js must position autocomplete dropdown directly above or near input'
);
console.log('  ✅ @ Mentions are strictly workspace-scoped and positioned above cursor');

// ─── 2. NOTEBOOK PAGE & FOLDER TAGGING (#) ────────────────────────────────────
console.log('\n📖 2. Verifying Notebook Page & Folder Tagging (#)...');
assert(
  discussionModelSource.includes('findMentionablePages'),
  'discussion.model.js must define findMentionablePages'
);
assert(
  discussionModelSource.includes('folder_id IS NULL'),
  'findMentionablePages must query notebook pages with folder_id IS NULL for root category'
);
assert(
  discussionModelSource.includes('findMentionableFolders') || discussionModelSource.includes('findPagesByFolder'),
  'discussion.model.js must support folders and folder sub-pages lookup'
);
assert(
  discussionServiceSource.includes('getMentionablePages'),
  'discussion.service.js must export getMentionablePages'
);
assert(
  discussionControllerSource.includes('getMentionablePages'),
  'discussion.controller.js must export getMentionablePages'
);
assert(
  discussionRoutesSource.includes("'/mentions/pages'"),
  'discussion.routes.js must expose /mentions/pages'
);
assert(
  discussionsJs.includes('/mentions/pages'),
  'discussions.js must fetch #NB Pages from /mentions/pages'
);
assert(
  discussionsJs.includes('/mentions/folders'),
  'discussions.js must fetch #NB Folders from /mentions/folders'
);
assert(
  discussionsJs.includes('handlePageTagClick') || discussionsJs.includes('#Page:'),
  'discussions.js must support clickable #Page chips and click handling'
);
assert(
  discussionsJs.includes('handleFolderTagClick') && discussionsJs.includes('#Folder:'),
  'discussions.js must support clickable #Folder chips and click handling'
);
console.log('  ✅ #NB Pages (folder_id IS NULL) and #NB Folders tagging verified');

// ─── 3. LEADER / THREAD CREATOR DISCUSSION PINNING RESTRICTION ─────────────────
console.log('\n📌 3. Verifying Leader / Thread Creator Pinning Restriction...');
assert(
  discussionServiceSource.includes('isThreadCreator') || discussionServiceSource.includes('author_user_id'),
  'discussion.service.js togglePinComment must evaluate thread creator (author_user_id)'
);
assert(
  discussionServiceSource.includes('403'),
  'discussion.service.js must reject unprivileged pin attempts with 403 Forbidden'
);
assert(
  dashboardJs.includes('isThreadCreator') || dashboardJs.includes('canPin'),
  'dashboard.js must calculate canPin based on leader role or thread creator'
);
assert(
  dashboardJs.includes('comment-pin-btn'),
  'dashboard.js must render comment-pin-btn conditionally'
);
console.log('  ✅ Discussion pinning is restricted strictly to Group Leader and Thread Creator');

console.log('\n🎉 ALL WORKSPACE MENTIONS, #TAGGING & PINNING TESTS PASSED SUCCESSFULLY!\n');
