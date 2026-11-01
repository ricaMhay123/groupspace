/**
 * Test Suite: Workspace-Scoped @Mentions and Notebook/Folder #Tagging
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Workspace-Scoped @Mentions & Notebook/Folder #Tagging...');

// 1. Verify Discussion Model methods & workspace scoping
const discussionModelSource = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.model.js'), 'utf8');
assert(discussionModelSource.includes('findMentionableUsers'), 'discussion.model.js defines findMentionableUsers');
assert(discussionModelSource.includes('FROM users u') && discussionModelSource.includes('JOIN group_members gm ON u.id = gm.user_id') && discussionModelSource.includes('gm.group_id = ${groupId}'), 'findMentionableUsers strictly joins group_members for active groupId');

assert(discussionModelSource.includes('findMentionableNotebooks'), 'discussion.model.js defines findMentionableNotebooks');
assert(discussionModelSource.includes('findMentionableFolders'), 'discussion.model.js defines findMentionableFolders');
console.log('  ✅ Discussion Model mention methods verified');

// 2. Verify Discussion Service and Controller exports
const discussionServiceSource = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.service.js'), 'utf8');
assert(discussionServiceSource.includes('getMentionableNotebooks'), 'discussion.service.js exports getMentionableNotebooks');
assert(discussionServiceSource.includes('getMentionableFolders'), 'discussion.service.js exports getMentionableFolders');

const discussionControllerSource = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.controller.js'), 'utf8');
assert(discussionControllerSource.includes('getMentionableNotebooks'), 'discussion.controller.js exports getMentionableNotebooks');
assert(discussionControllerSource.includes('getMentionableFolders'), 'discussion.controller.js exports getMentionableFolders');
console.log('  ✅ Discussion Service and Controller methods verified');

// 3. Verify Discussion Routes
const discussionRoutesSource = fs.readFileSync(path.join(__dirname, '../src/modules/discussions/discussion.routes.js'), 'utf8');
assert(discussionRoutesSource.includes("'/mentions/notebooks'"), 'discussion.routes.js exposes /mentions/notebooks');
assert(discussionRoutesSource.includes("'/mentions/folders'"), 'discussion.routes.js exposes /mentions/folders');
console.log('  ✅ Discussion Routes for notebooks & folders verified');

// 4. Verify Frontend Autocomplete in discussions.js
const discussionsJs = fs.readFileSync(path.join(__dirname, '../public/js/discussions.js'), 'utf8');
assert(discussionsJs.includes('/mentions/notebooks'), 'discussions.js queries /mentions/notebooks on # trigger');
assert(discussionsJs.includes('/mentions/folders'), 'discussions.js queries /mentions/folders on # trigger');
assert(discussionsJs.includes('#Notebook:'), 'discussions.js handles #Notebook tag format');
assert(discussionsJs.includes('#Folder:'), 'discussions.js handles #Folder tag format');
assert(discussionsJs.includes('handleNotebookTagClick'), 'discussions.js defines handleNotebookTagClick');
assert(discussionsJs.includes('handleFolderTagClick'), 'discussions.js defines handleFolderTagClick');
console.log('  ✅ Frontend discussions.js autocomplete & tag click handlers verified');

// 5. Verify CSS styling & card pulse animation
const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
assert(styleCss.includes('.notebook-mention-pill'), 'style.css defines .notebook-mention-pill');
assert(styleCss.includes('.folder-mention-pill'), 'style.css defines .folder-mention-pill');
assert(styleCss.includes('cardHighlightPulse'), 'style.css defines cardHighlightPulse animation');
console.log('  ✅ CSS tag pills and card highlight pulse verified');

console.log('\n🎉 ALL WORKSPACE MENTIONS & NOTEBOOK/FOLDER TAGGING TESTS PASSED!\n');
