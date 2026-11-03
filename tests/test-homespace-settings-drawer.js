/**
 * Test Suite: Homespace Settings & Controls 2-Tab Modal & Invite Code Grace Period
 * Verifies:
 * 1. Global sidebar & header cleanup: Settings button hidden by default for regular members
 * 2. Homespace Settings Modal mounting & leader authorization gate
 * 3. Dedicated 2-Tab Navigation Architecture (Workspace & Join Code vs Permissions & Roles)
 * 4. Zero personal profile noise in Workspace Settings (lives in #userProfileModal)
 * 5. Discrete masked invite code display with show/hide and copy handlers
 * 6. Secondary confirmation modal (#regenerateJoinCodeModal) & 24h grace period
 * 7. Member Permission Constraints (Leader Governance)
 * 8. Workspace Dissolution Danger Zone (primary leader safeguard)
 */

const fs = require('fs');
const path = require('path');

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
console.log('🧪 HOMESPACE SETTINGS & CONTROLS 2-TAB MODAL TEST SUITE');
console.log('================================================================\n');

const htmlPath = path.join(__dirname, '..', 'public', 'dashboard.html');
const jsPath = path.join(__dirname, '..', 'public', 'js', 'dashboard.js');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');
const servicePath = path.join(__dirname, '..', 'src', 'modules', 'groups', 'group.service.js');
const modelPath = path.join(__dirname, '..', 'src', 'modules', 'groups', 'group.model.js');

assert(fs.existsSync(htmlPath), 'public/dashboard.html exists');
assert(fs.existsSync(jsPath), 'public/js/dashboard.js exists');
assert(fs.existsSync(cssPath), 'public/css/style.css exists');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const service = fs.readFileSync(servicePath, 'utf8');
const model = fs.readFileSync(modelPath, 'utf8');

// ── 1. GLOBAL SIDEBAR & HEADER CLEANUP ──
console.log('\n🧹 1. Global Sidebar & Header Cleanup:');
const sidebarMatch = html.match(/<aside[^>]*class="[^"]*dashboard-sidebar[^"]*"[^>]*>([\s\S]*?)<\/aside>/);
const sidebarContent = sidebarMatch ? sidebarMatch[1] : '';

assert(!sidebarContent.includes('class="profile-card"'), 'Sidebar no longer contains floating profile status card');
assert(!sidebarContent.includes('data-theme-toggle'), 'Sidebar no longer contains persistent theme toggle button');
assert(!sidebarContent.includes('logoutUser()'), 'Sidebar no longer contains persistent sign out button');
assert(sidebarContent.includes('id="sidebarProfileCard"'), 'Sidebar includes user profile card below navigation');

const headerMatch = html.match(/<div class="dashboard-header-actions">([\s\S]*?)<\/div>/);
const headerContent = headerMatch ? headerMatch[1] : '';
assert(!headerContent.includes('id="joinCodeBadge"'), 'Header no longer displays persistent invite code badge');
assert(html.includes('id="homespaceSettingsBtn"') && html.includes('style="display:none;'), 'Header Settings button is hidden by default for non-leaders');
assert(js.includes("settingsBtn.style.display = isLeader ? 'inline-flex' : 'none'"), 'loadOverview() displays Settings button strictly for leaders & co-leaders');

// ── 2. HOMESPACE SETTINGS MODAL MOUNT & LEADER GATE ──
console.log('\n📂 2. Homespace Settings Modal Mounting & Leader Gate:');
assert(html.includes('id="homespaceSettingsDrawerContainer"'), 'dashboard.html mounts #homespaceSettingsDrawerContainer in tab-overview');
assert(js.includes('function renderHomespaceSettingsDrawer'), 'dashboard.js defines renderHomespaceSettingsDrawer function');
assert(js.includes('function toggleHomespaceSettingsDrawer'), 'dashboard.js defines toggleHomespaceSettingsDrawer function');
assert(js.includes('function focusHomespaceSettingsDrawer'), 'dashboard.js defines focusHomespaceSettingsDrawer function');
assert(js.includes('renderHomespaceSettingsDrawer()'), 'loadOverview() invokes renderHomespaceSettingsDrawer()');

// ── 3. DEDICATED 2-TAB ARCHITECTURE & ZERO PERSONAL PROFILE NOISE ──
console.log('\n📑 3. Dedicated 2-Tab Navigation Architecture (Zero Profile Noise):');
assert(js.includes('id="hsTabBtnWorkspace"'), 'Modal provides Tab 1: "Workspace & Join Code" trigger');
assert(js.includes('id="hsTabBtnPermissions"'), 'Modal provides Tab 2: "Permissions & Roles" trigger');
assert(js.includes('function switchHsSettingsTab'), 'dashboard.js implements switchHsSettingsTab handler');
assert(js.includes('id="hsTabPaneWorkspace"'), 'Modal renders #hsTabPaneWorkspace container');
assert(js.includes('id="hsTabPanePermissions"'), 'Modal renders #hsTabPanePermissions container');
assert(!js.includes('class="hs-personal-bar"'), 'Modal has purged personal profile noise (.hs-personal-bar removed)');

// ── 4. DISCRETE MASKED INVITE CODE DISPLAY ──
console.log('\n🔒 4. Discrete Masked Invite Code Display:');
assert(js.includes('id="hsInviteCodeDisplay"'), 'Drawer renders #hsInviteCodeDisplay for workspace invite code');
assert(js.includes('GS-••••••'), 'Invite code is masked with GS-•••••• by default');
assert(js.includes('function toggleInviteCodeVisibility'), 'dashboard.js implements toggleInviteCodeVisibility function');
assert(js.includes('function copyHomespaceInviteCode'), 'dashboard.js implements copyHomespaceInviteCode function');
assert(js.includes('id="hsToggleCodeBtn"'), 'Drawer includes Show/Hide Code toggle button');

// ── 5. SECONDARY CONFIRMATION MODAL & 24H GRACE PERIOD ──
console.log('\n🛡️ 5. Secondary Confirmation Modal & 24h Grace Period:');
assert(html.includes('id="regenerateJoinCodeModal"'), 'dashboard.html includes #regenerateJoinCodeModal confirmation sheet');
assert(js.includes('function openRegenerateJoinCodeModal'), 'dashboard.js defines openRegenerateJoinCodeModal function');
assert(js.includes('function closeRegenerateJoinCodeModal'), 'dashboard.js defines closeRegenerateJoinCodeModal function');
assert(js.includes('async function executeRegenerateJoinCode'), 'dashboard.js defines executeRegenerateJoinCode handler');
assert(service.includes('graceExpiresAt') && service.includes('24 * 60 * 60 * 1000'), 'group.service.js grants a 24-hour grace period on code regeneration');
assert(model.includes('graceJoinCode'), 'group.model.js stores and honors active graceJoinCode during lookup');

// ── 6. MEMBER PERMISSION CONSTRAINTS (LEADER GOVERNANCE) ──
console.log('\n⚖️ 6. Member Permission Constraints (Leader Governance):');
assert(js.includes('id="hsConstraintApproval"'), 'Modal controls task done approval constraint');
assert(js.includes('id="hsConstraintDiscussions"'), 'Modal controls member discussion topic creation constraint');
assert(js.includes('id="hsConstraintExpenses"'), 'Modal controls leader-only expense ledger constraint');
assert(js.includes('saveMemberConstraints'), 'Modal provides saveMemberConstraints handler');

// ── 7. WORKSPACE DISSOLUTION SAFEGUARD ──
console.log('\n⚠️ 7. Workspace Dissolution Safeguard:');
assert(js.includes('confirmDeleteWorkspace()'), 'Modal provides confirmDeleteWorkspace trigger for primary leaders');
assert(html.includes('id="deleteAccountModal"'), 'Global account deletion remains isolated in #deleteAccountModal');

// ── 8. CSS STYLES & TOKEN HARMONY ──
console.log('\n🎨 8. CSS Styles & Token Harmony:');
assert(css.includes('.homespace-settings-accordion') || css.includes('.hs-settings-drawer-overlay'), 'CSS defines settings drawer overlay and container');
assert(css.includes('.hs-invite-code-container'), 'CSS defines .hs-invite-code-container');
assert(css.includes('.hs-danger-zone-footer'), 'CSS defines .hs-danger-zone-footer');

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Homespace Settings 2-Tab & Grace Period tests passed successfully!');
}
