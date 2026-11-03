/**
 * Test Suite: Workspace Roster & Roles User Status Messages & Direct Message Icon Removal
 * Verifies:
 * 1. group.model.js selects u.status_message, u.avatar_color, u.avatar_url in findMembersByGroup
 * 2. dashboard.js renders user-status-msg for roster members in Workspace Roster & Roles
 * 3. dashboard.js removes the 💬 direct message icon button from Workspace Roster & Roles
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🧪 WORKSPACE ROSTER STATUS MESSAGES & DM ICON REMOVAL TEST SUITE');
console.log('================================================================\n');

// ── 1. BACKEND MODEL MEMBER QUERY ──
console.log('🗄️ 1. Backend Group Model (group.model.js):');
const groupModelPath = path.join(__dirname, '..', 'src', 'modules', 'groups', 'group.model.js');
check(fs.existsSync(groupModelPath), 'group.model.js exists');

const groupModel = fs.readFileSync(groupModelPath, 'utf8');
check(groupModel.includes('u.status_message'), 'group.model.js selects u.status_message in findMembersByGroup');
check(groupModel.includes('u.avatar_color'), 'group.model.js selects u.avatar_color in findMembersByGroup');
check(groupModel.includes('u.avatar_url'), 'group.model.js selects u.avatar_url in findMembersByGroup');

// ── 2. FRONTEND ROSTER RENDERING ──
console.log('\n👥 2. Frontend Roster Rendering (dashboard.js):');
const dashJsPath = path.join(__dirname, '..', 'public', 'js', 'dashboard.js');
check(fs.existsSync(dashJsPath), 'dashboard.js exists');

const dashJs = fs.readFileSync(dashJsPath, 'utf8');

check(dashJs.includes('m.status_message'), 'dashboard.js checks m.status_message for roster members');
check(dashJs.includes('user-status-msg'), 'dashboard.js renders .user-status-msg in roster');
check(!dashJs.includes("title=\"Direct message\">\n              💬") && !dashJs.includes("title=\"Direct message\">\r\n              💬"), 'dashboard.js removes direct message 💬 icon button from roster');

// ── 3. CSS STYLING ──
console.log('\n🎨 3. CSS Styling (style.css):');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');
check(css.includes('.user-status-msg'), 'style.css defines .user-status-msg styling');

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Workspace Roster Status & DM Icon Removal tests passed!\n');
}

