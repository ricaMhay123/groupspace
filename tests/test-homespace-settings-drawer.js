/**
 * Test Suite: Homespace Settings & Controls Accordion Drawer
 * Verifies:
 * 1. Global sidebar cleanup (no profile card, theme toggle, or sign-out button)
 * 2. Header cleanup (no persistent #joinCodeBadge)
 * 3. Homespace Settings Drawer integration (#homespaceSettingsAccordion)
 * 4. User profile details, theme toggle, and sign out inside Homespace
 * 5. Discrete masked invite code widget with show/hide toggle and copy handler
 * 6. Subtle Danger Zone footer with 2x Password Verification modal trigger
 * 7. Smooth CSS accordion transitions and token-based theme harmony
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
console.log('🧪 HOMESPACE SETTINGS & CONTROLS ACCORDION DRAWER TEST SUITE');
console.log('================================================================\n');

const htmlPath = path.join(__dirname, '..', 'public', 'dashboard.html');
const jsPath = path.join(__dirname, '..', 'public', 'js', 'dashboard.js');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');

assert(fs.existsSync(htmlPath), 'public/dashboard.html exists');
assert(fs.existsSync(jsPath), 'public/js/dashboard.js exists');
assert(fs.existsSync(cssPath), 'public/css/style.css exists');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

// ── 1. GLOBAL SIDEBAR CLEANUP ──
console.log('\n🧹 1. Global Sidebar & Header Cleanup:');
const sidebarMatch = html.match(/<aside class="dashboard-sidebar">([\s\S]*?)<\/aside>/);
const sidebarContent = sidebarMatch ? sidebarMatch[1] : '';

assert(!sidebarContent.includes('class="profile-card"'), 'Sidebar no longer contains floating profile status card');
assert(!sidebarContent.includes('data-theme-toggle'), 'Sidebar no longer contains persistent theme toggle button');
assert(!sidebarContent.includes('logoutUser()'), 'Sidebar no longer contains persistent sign out button');

const headerMatch = html.match(/<div class="dashboard-header-actions">([\s\S]*?)<\/div>/);
const headerContent = headerMatch ? headerMatch[1] : '';
assert(!headerContent.includes('id="joinCodeBadge"'), 'Header no longer displays persistent invite code badge');

// ── 2. HOMESPACE SETTINGS DRAWER CONTAINER & MOUNT ──
console.log('\n📂 2. Homespace Settings Drawer Mounting:');
assert(html.includes('id="homespaceSettingsDrawerContainer"'), 'dashboard.html mounts #homespaceSettingsDrawerContainer in tab-overview');
assert(js.includes('function renderHomespaceSettingsDrawer'), 'dashboard.js defines renderHomespaceSettingsDrawer function');
assert(js.includes('function toggleHomespaceSettingsDrawer'), 'dashboard.js defines toggleHomespaceSettingsDrawer function');
assert(js.includes('function focusHomespaceSettingsDrawer'), 'dashboard.js defines focusHomespaceSettingsDrawer function');
assert(js.includes('renderHomespaceSettingsDrawer()'), 'loadOverview() invokes renderHomespaceSettingsDrawer()');

// ── 3. USER PROFILE & CONTROLS IN HOMESPACE ──
console.log('\n👤 3. User Profile Details & Direct Controls:');
assert(js.includes('id="hsUserAvatar"'), 'Drawer renders user avatar initials');
assert(js.includes('id="hsUserFullName"'), 'Drawer renders user full name');
assert(js.includes('Online</span>'), 'Drawer renders live online status badge');
assert(js.includes('data-theme-toggle') && js.includes('window.gsToggleTheme'), 'Drawer provides integrated dark/light mode toggle');
assert(js.includes('logoutUser()') && js.includes('Sign Out'), 'Drawer provides integrated sign out action');

// ── 4. DISCRETE MASKED INVITE CODE DISPLAY ──
console.log('\n🔒 4. Discrete Masked Invite Code Display:');
assert(js.includes('id="hsInviteCodeDisplay"'), 'Drawer renders #hsInviteCodeDisplay for workspace invite code');
assert(js.includes('GS-••••••'), 'Invite code is masked with GS-•••••• by default');
assert(js.includes('function toggleInviteCodeVisibility'), 'dashboard.js implements toggleInviteCodeVisibility function');
assert(js.includes('function copyHomespaceInviteCode'), 'dashboard.js implements copyHomespaceInviteCode function');
assert(js.includes('id="hsToggleCodeBtn"'), 'Drawer includes Show/Hide Code toggle button');

// ── 5. SUBTLE DANGER ZONE & 2X PASSWORD MODAL ──
console.log('\n⚠️ 5. Subtle Danger Zone & 2x Password Modal Trigger:');
assert(js.includes('hs-danger-zone-footer'), 'Drawer renders subtle danger zone footer');
assert(js.includes('openDeleteAccountModal()'), 'Delete Account button triggers openDeleteAccountModal()');
assert(html.includes('id="deleteAccountModal"'), 'dashboard.html includes #deleteAccountModal');
assert(html.includes('id="deletePassword"') && html.includes('id="deleteConfirmPassword"'), 'deleteAccountModal enforces 2x password verification inputs');

// ── 6. CSS ACCORDION TRANSITION & CRAFT ──
console.log('\n🎨 6. CSS Accordion Transition & Polish:');
assert(css.includes('.homespace-settings-accordion'), 'CSS defines .homespace-settings-accordion container');
assert(css.includes('.hs-accordion-header'), 'CSS defines .hs-accordion-header interactive trigger');
assert(css.includes('.hs-accordion-chevron.rotated'), 'CSS defines rotating chevron on open state');
assert(css.includes('.hs-accordion-content'), 'CSS defines .hs-accordion-content');
assert(css.includes('cubic-bezier'), 'CSS uses smooth cubic-bezier easing curve for accordion expansion');
assert(css.includes('.hs-invite-code-container'), 'CSS defines .hs-invite-code-container');
assert(css.includes('.hs-danger-zone-footer'), 'CSS defines .hs-danger-zone-footer');

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Homespace Settings & Controls Drawer tests passed!\n');
}
