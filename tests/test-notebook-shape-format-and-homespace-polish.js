/**
 * Test Suite: Notebook Custom Dialogs, Shape Format Tab & Homespace Polish
 * Verifies:
 * 1. Centered custom gsPrompt and gsAlert dialogs in api.js
 * 2. Elimination of native prompt() calls in notebook.html and notebook-editor.js
 * 3. Contextual Shape Format ribbon tab in notebook.html with controls (fill, stroke, weight, size, opacity, delete)
 * 4. Slide-out Workspace Settings & Controls drawer (not an inline homespace panel)
 * 5. User Profile card mounted in dashboard sidebar below navigation
 * 6. Scrollable containers for Recent Activity, Workspace Roster, Pending Approvals, and Scratchpad
 */

'use strict';

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
console.log('🧪 NOTEBOOK SHAPE FORMAT & HOMESPACE POLISH TEST SUITE');
console.log('================================================================\n');

const apiJsPath = path.join(__dirname, '..', 'public', 'js', 'api.js');
const nbHtmlPath = path.join(__dirname, '..', 'public', 'notebook.html');
const nbEditorJsPath = path.join(__dirname, '..', 'public', 'js', 'notebook-editor.js');
const dashHtmlPath = path.join(__dirname, '..', 'public', 'dashboard.html');
const dashJsPath = path.join(__dirname, '..', 'public', 'js', 'dashboard.js');
const styleCssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');

const apiJs = fs.readFileSync(apiJsPath, 'utf8');
const nbHtml = fs.readFileSync(nbHtmlPath, 'utf8');
const nbEditorJs = fs.readFileSync(nbEditorJsPath, 'utf8');
const dashHtml = fs.readFileSync(dashHtmlPath, 'utf8');
const dashJs = fs.readFileSync(dashJsPath, 'utf8');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

// ── 1. CUSTOM IN-PAGE DIALOGS (gsPrompt & gsAlert) ──
console.log('\n💬 1. Centered In-Page Dialogs (api.js):');
assert(apiJs.includes('window.gsPrompt = function'), 'api.js defines window.gsPrompt');
assert(apiJs.includes('window.gsAlert = function'), 'api.js defines window.gsAlert');
assert(apiJs.includes('window.gsConfirm = function'), 'api.js defines window.gsConfirm');
assert(apiJs.includes('gs-prompt-input'), 'gsPrompt renders centered card with input');
assert(apiJs.includes('requestAnimationFrame'), 'Smooth animated entry on modal opening');

// ── 2. NOTEBOOK NATIVE DIALOG ELIMINATION ──
console.log('\n🚫 2. Elimination of Native Browser prompt() in Notebook:');
assert(!nbHtml.includes("prompt('Enter a name for the new folder:')"), 'Folder creation no longer uses native prompt()');
assert(!nbHtml.includes("prompt('Find what:')"), 'Find & Replace no longer uses native prompt()');
assert(!nbHtml.includes("prompt('Enter WordArt text:'"), 'WordArt insertion no longer uses native prompt()');
assert(!nbHtml.includes("prompt('Enter number of rows"), 'Custom table creation no longer uses native prompt()');
assert(!nbEditorJs.includes("prompt('New page title:')") && !nbEditorJs.includes("window.prompt('New page title:')"), 'notebook-editor.js page creation no longer uses native prompt()');
assert(nbHtml.includes('gsPrompt'), 'notebook.html integrates gsPrompt for in-page dialogs');

// ── 3. CONTEXTUAL SHAPE FORMAT RIBBON TAB & SHAPE DRAGGING ──
console.log('\n🎨 3. Contextual Shape Format Ribbon Tab & Dragging (notebook.html):');
assert(nbHtml.includes('id="nbTabShapeFormat"'), 'notebook.html includes #nbTabShapeFormat ribbon tab button');
assert(nbHtml.includes('data-ribbon-tab="shape-format"'), 'Shape Format tab is registered in ribbon tabs');
assert(nbHtml.includes('data-ribbon-group="shape-format"'), 'Ribbon body defines shape-format toolbar groups');
assert(nbHtml.includes('id="nbSfFillColor"'), 'Shape Format includes shape fill color picker');
assert(nbHtml.includes('id="nbSfNoFill"'), 'Shape Format includes No Fill toggle option');
assert(nbHtml.includes('id="nbSfStrokeColor"'), 'Shape Format includes outline/stroke color picker');
assert(nbHtml.includes('id="nbSfStrokeWidth"'), 'Shape Format includes border weight selector');
assert(nbHtml.includes('id="nbSfBorderStyle"'), 'Shape Format includes border style selector');
assert(nbHtml.includes('id="nbSfWidth"') && nbHtml.includes('id="nbSfHeight"'), 'Shape Format includes width and height numeric inputs');
assert(nbHtml.includes('id="nbSfOpacity"'), 'Shape Format includes opacity selector');
assert(nbHtml.includes('deleteActiveSelectedShape'), 'Shape Format includes dedicated delete action');
assert(nbHtml.includes("switchNotebookRibbonTab('shape-format')"), 'selectShapeById automatically switches to Shape Format tab');
assert(nbHtml.includes('syncShapeFormatPanel'), 'notebook.html syncs panel inputs when shape is selected');
assert(nbHtml.includes('setPointerCapture'), 'Shapes and textboxes use setPointerCapture for smooth dragging');
assert(nbHtml.includes('data-corner="tc"') && nbHtml.includes('data-corner="bc"'), 'Shapes feature 8 resize handles (including top and bottom center)');
assert(nbHtml.includes('is-dragging'), 'Shapes have active is-dragging state with cursor styling');

// ── 4. HOMESPACE SETTINGS AS SLIDE-OUT DRAWER ──
console.log('\n🚪 4. Workspace Settings & Controls Slide-Out Drawer:');
assert(dashHtml.includes('id="homespaceSettingsDrawerContainer"'), 'dashboard.html defines #homespaceSettingsDrawerContainer');
assert(dashHtml.includes('id="hsSettingsDrawerOverlay"'), 'dashboard.html defines #hsSettingsDrawerOverlay');
assert(styleCss.includes('.homespace-settings-drawer-wrapper'), 'style.css defines .homespace-settings-drawer-wrapper');
assert(styleCss.includes('.hs-settings-drawer-overlay'), 'style.css defines .hs-settings-drawer-overlay');
assert(dashJs.includes('function toggleHomespaceSettingsDrawer'), 'dashboard.js implements toggleHomespaceSettingsDrawer');
assert(dashJs.includes('function focusHomespaceSettingsDrawer'), 'dashboard.js implements focusHomespaceSettingsDrawer');

// ── 5. USER PROFILE SETTINGS IN SIDEBAR ──
console.log('\n👤 5. User Profile Card in Dashboard Sidebar:');
assert(dashHtml.includes('id="sidebarProfileCard"'), 'dashboard.html mounts #sidebarProfileCard in sidebar');
assert(dashHtml.includes('id="sidebarUserAvatar"'), 'Sidebar profile card displays user avatar');
assert(dashHtml.includes('id="sidebarUserFullName"'), 'Sidebar profile card displays user full name');
assert(dashHtml.includes('id="sidebarUserRole"'), 'Sidebar profile card displays user workspace role');
assert(dashJs.includes('function updateSidebarProfileCard'), 'dashboard.js defines updateSidebarProfileCard()');

// ── 6. SCROLLABLE HOMESPACE PANELS ──
console.log('\n📜 6. Scrollable Panels in Homespace:');
assert(dashJs.includes('class="activity-feed" style="max-height:260px; overflow-y:auto;"'), 'Activity feed is scrollable with max-height:260px');
assert(dashJs.includes('max-height:260px; overflow-y:auto;'), 'Leader and Member Homespace panels enforce max-height:260px; overflow-y:auto');
assert(dashJs.includes('max-height:230px; overflow-y:auto;'), 'Scratchpad notes list is scrollable with max-height:230px');

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Notebook Shape Format & Homespace Polish tests passed!\n');
}
