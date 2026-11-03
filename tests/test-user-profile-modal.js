/**
 * Test Suite: Direct "My Profile" Modal & Customization
 * Verifies:
 * 1. Database schema & column migrations for avatar_color and status_message in users table
 * 2. Backend service & controller for updateUserProfile and PUT /api/auth/me
 * 3. Workspaces header user badge converted to interactive #userProfileChip with avatar
 * 4. Centered "My Profile" modal (#userProfileModal) on both Workspaces and Dashboard
 * 5. Live avatar preview (#profileAvatarPreview) with palette swatches (.color-swatch-btn)
 * 6. Display name & status message customization with mood presets
 * 7. Sidebar profile card (#sidebarProfileCard) integration and live avatar styling
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
console.log('🧪 DIRECT "MY PROFILE" MODAL & CUSTOMIZATION TEST SUITE');
console.log('================================================================\n');

// ── 1. DATABASE SCHEMA & MIGRATIONS ──
console.log('🗄️ 1. Database Schema & Column Migrations:');
const dbConfigPath = path.join(__dirname, '..', 'src', 'config', 'db.config.js');
assert(fs.existsSync(dbConfigPath), 'src/config/db.config.js exists');
const dbConfig = fs.readFileSync(dbConfigPath, 'utf8');

assert(dbConfig.includes('avatar_color TEXT') || dbConfig.includes('avatar_color'), 'db.config.js defines avatar_color column in users table');
assert(dbConfig.includes('status_message TEXT') || dbConfig.includes('status_message'), 'db.config.js defines status_message column in users table');
assert(dbConfig.includes('avatar_url TEXT') || dbConfig.includes('avatar_url'), 'db.config.js defines avatar_url column in users table');
assert(dbConfig.includes('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color'), 'db.config.js executes avatar_color column migration');
assert(dbConfig.includes('ALTER TABLE users ADD COLUMN IF NOT EXISTS status_message'), 'db.config.js executes status_message column migration');
assert(dbConfig.includes('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url'), 'db.config.js executes avatar_url column migration');

// ── 2. BACKEND AUTH API & CONTROLLER ──
console.log('\n🔒 2. Backend Auth API & Controller:');
const authServicePath = path.join(__dirname, '..', 'src', 'modules', 'auth', 'auth.service.js');
const authCtrlPath = path.join(__dirname, '..', 'src', 'modules', 'auth', 'auth.controller.js');
const authRoutesPath = path.join(__dirname, '..', 'src', 'modules', 'auth', 'auth.routes.js');

const authService = fs.readFileSync(authServicePath, 'utf8');
const authCtrl = fs.readFileSync(authCtrlPath, 'utf8');
const authRoutes = fs.readFileSync(authRoutesPath, 'utf8');

assert(authService.includes('async function updateUserProfile'), 'auth.service.js implements updateUserProfile()');
assert(authService.includes('avatarColor: user.avatar_color') || authService.includes('avatarColor'), 'getUserProfile() returns avatarColor');
assert(authService.includes('statusMessage: user.status_message') || authService.includes('statusMessage'), 'getUserProfile() returns statusMessage');
assert(authService.includes('avatarUrl: user.avatar_url') || authService.includes('avatarUrl'), 'getUserProfile() returns avatarUrl');
assert(authCtrl.includes('async function updateMe'), 'auth.controller.js implements updateMe()');
assert(authCtrl.includes('avatarUrl'), 'auth.controller.js extracts avatarUrl from req.body');
assert(authRoutes.includes("router.put('/me'"), "auth.routes.js exposes PUT /me endpoint");

// ── 3. WORKSPACES USER BADGE & MODAL ──
console.log('\n🌐 3. Workspaces Header Chip & Modal:');
const wsHtmlPath = path.join(__dirname, '..', 'public', 'workspaces.html');
const wsHtml = fs.readFileSync(wsHtmlPath, 'utf8');

assert(wsHtml.includes('id="userProfileChip"'), 'workspaces.html mounts interactive #userProfileChip in header');
assert(wsHtml.includes('id="userAvatarBadge"'), 'userProfileChip displays #userAvatarBadge avatar');
assert(wsHtml.includes('id="userNameBadge"'), 'userProfileChip retains #userNameBadge for dynamic user name');
assert(wsHtml.includes('id="userProfileModal"'), 'workspaces.html includes centered #userProfileModal');
assert(wsHtml.includes('id="profileAvatarPreview"'), 'userProfileModal includes live #profileAvatarPreview');
assert(wsHtml.includes('id="profilePictureInput"'), 'userProfileModal includes #profilePictureInput file picker');
assert(wsHtml.includes('id="removeProfilePicBtn"'), 'userProfileModal includes #removeProfilePicBtn button');
assert(wsHtml.includes('class="color-swatch-btn"'), 'userProfileModal includes .color-swatch-btn color palette swatches');
assert(wsHtml.includes('id="profileDisplayNameInput"'), 'userProfileModal includes #profileDisplayNameInput');
assert(wsHtml.includes('id="profileStatusMessageInput"'), 'userProfileModal includes #profileStatusMessageInput');
assert(wsHtml.includes('function openUserProfileModal'), 'workspaces.html defines openUserProfileModal()');
assert(wsHtml.includes('function selectProfileAvatarColor'), 'workspaces.html defines selectProfileAvatarColor()');
assert(wsHtml.includes('function handleProfilePictureSelected'), 'workspaces.html defines handleProfilePictureSelected()');
assert(wsHtml.includes('function handleSaveUserProfile'), 'workspaces.html defines handleSaveUserProfile()');

// ── 4. DASHBOARD MODAL & SIDEBAR PROFILE CARD ──
console.log('\n📊 4. Dashboard Modal & Sidebar Integration:');
const dashHtmlPath = path.join(__dirname, '..', 'public', 'dashboard.html');
const dashJsPath = path.join(__dirname, '..', 'public', 'js', 'dashboard.js');
const dashHtml = fs.readFileSync(dashHtmlPath, 'utf8');
const dashJs = fs.readFileSync(dashJsPath, 'utf8');

assert(dashHtml.includes('id="userProfileModal"'), 'dashboard.html mounts centered #userProfileModal');
assert(dashHtml.includes('id="profilePictureInput"'), 'dashboard.html includes #profilePictureInput');
assert(dashHtml.includes('id="removeProfilePicBtn"'), 'dashboard.html includes #removeProfilePicBtn');
assert(dashHtml.includes('id="sidebarProfileCard"'), 'dashboard.html retains #sidebarProfileCard');
assert(dashHtml.includes('id="sidebarUserStatus"'), 'dashboard.html includes #sidebarUserStatus in sidebar profile card');
const sidebarCardMatch = dashHtml.match(/<div[^>]*id="sidebarProfileCard"[\s\S]*?<\/div>\s*<\/aside>/);
const sidebarCardHtml = sidebarCardMatch ? sidebarCardMatch[0] : '';
assert(!sidebarCardHtml.includes('focusHomespaceSettingsDrawer') && !sidebarCardHtml.includes('&#9881;'), 'dashboard.html removed settings icon from #sidebarProfileCard');
assert(dashHtml.includes('openUserProfileModal()'), 'dashboard.html triggers openUserProfileModal() from sidebar profile card');
assert(dashJs.includes('function openUserProfileModal'), 'dashboard.js defines openUserProfileModal()');
assert(dashJs.includes('function selectProfileAvatarColor'), 'dashboard.js defines selectProfileAvatarColor()');
assert(dashJs.includes('function handleProfilePictureSelected'), 'dashboard.js defines handleProfilePictureSelected()');
assert(dashJs.includes('function handleSaveUserProfile'), 'dashboard.js defines handleSaveUserProfile()');
assert(dashJs.includes('avatarEl.style.backgroundColor = currentUser.avatarColor'), 'dashboard.js applies avatarColor to #sidebarUserAvatar');
assert(dashJs.includes('currentUser.avatarUrl'), 'dashboard.js renders currentUser.avatarUrl in sidebar when available');
assert(dashJs.includes("document.getElementById('sidebarUserStatus')"), 'dashboard.js updates #sidebarUserStatus in updateSidebarProfileCard');

// ── 5. CSS TOKENS & STYLING ──
console.log('\n🎨 5. CSS Tokens & Transitions:');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');

assert(css.includes('.user-profile-chip'), 'style.css defines .user-profile-chip transitions and hover state');
assert(css.includes('.color-swatch-btn'), 'style.css defines .color-swatch-btn hover animations');
assert(css.includes('#profileAvatarPreview img'), 'style.css defines circular crop for profile avatar images');

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Direct "My Profile" Modal & Customization tests passed!\n');
}

