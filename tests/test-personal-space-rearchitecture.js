/**
 * Test Suite: Isolated Personal Space Re-architecture Verification
 *
 * Verifies:
 * 1. Collapsible Quick Capture Drawer (#personalQuickCaptureDrawer)
 * 2. CTA Consolidation (+ New Note primary trigger, duplicate buttons removed)
 * 3. Removal of SQL schema jargon (`is_private = TRUE`, `user_id = current_user.id`)
 * 4. Removal of heading kickers/eyebrows in personal space
 * 5. Decluttered note card styling (.note-card-folder-badge, .note-export-group, etc.)
 * 6. Quick Capture Drawer toggle function in dashboard.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('\n================================================================');
console.log('🧪 TEST SUITE: ISOLATED PERSONAL SPACE RE-ARCHITECTURE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  failed++;
  console.error(`  ❌ [FAIL] ${name}: ${error.message || error}`);
}

const dashboardHtml = fs.readFileSync(path.join(__dirname, '../public/dashboard.html'), 'utf8');
const dashboardJs = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');

// 1. Collapsible Quick Capture Drawer
try {
  assert(dashboardHtml.includes('id="personalQuickCaptureDrawer"'), 'Missing #personalQuickCaptureDrawer in dashboard.html');
  assert(dashboardHtml.includes('class="personal-quick-capture-drawer"'), 'Missing .personal-quick-capture-drawer class');
  assert(styleCss.includes('.personal-quick-capture-drawer'), 'Missing .personal-quick-capture-drawer in style.css');
  pass('Collapsible Quick Capture Drawer', '#personalQuickCaptureDrawer container and styles verified');
} catch (err) { fail('Collapsible Quick Capture Drawer', err); }

// 2. Action Consolidation
try {
  assert(dashboardHtml.includes('id="togglePersonalQuickCaptureBtn"'), 'Missing #togglePersonalQuickCaptureBtn');
  assert(dashboardHtml.includes('+ New Note'), 'Missing + New Note primary action button');
  assert(dashboardJs.includes('function togglePersonalQuickCapture'), 'Missing togglePersonalQuickCapture function in dashboard.js');
  pass('Action Consolidation & Quick Note Trigger', 'Single + New Note CTA and toggle handler verified');
} catch (err) { fail('Action Consolidation & Quick Note Trigger', err); }

// 3. Removal of SQL Schema Jargon
try {
  const personalTabSection = dashboardHtml.substring(
    dashboardHtml.indexOf('id="tab-personal"'),
    dashboardHtml.indexOf('id="personalItemsContainer"')
  );
  assert(!personalTabSection.includes('`is_private = TRUE`'), 'Found raw SQL `is_private = TRUE` in personal tab HTML');
  assert(!personalTabSection.includes('`user_id = current_user.id`'), 'Found raw SQL `user_id = current_user.id` in personal tab HTML');
  assert(personalTabSection.includes('Your personal sanctuary'), 'Missing humanized privacy assurance in hero copy');
  pass('Humanized Privacy Copy & SQL Jargon Removal', 'Raw SQL expressions removed; human privacy assurances verified');
} catch (err) { fail('Humanized Privacy Copy & SQL Jargon Removal', err); }

// 4. Kicker / Eyebrow Ban Conformance
try {
  const personalHeader = dashboardHtml.substring(
    dashboardHtml.indexOf('id="tab-personal"'),
    dashboardHtml.indexOf('<h2>Your Isolated Space</h2>')
  );
  assert(!personalHeader.includes('STRICTLY PRIVATE TO YOU'), 'Found prohibited kicker eyebrow tag above <h2>');
  pass('Craft Floor Heading Conformance', 'Kicker tag above <h2> successfully removed');
} catch (err) { fail('Craft Floor Heading Conformance', err); }

// 5. Note Card Decluttering & Refined Styling
try {
  assert(styleCss.includes('.note-card-folder-badge'), 'Missing .note-card-folder-badge in style.css');
  assert(styleCss.includes('.note-card-actions-bar'), 'Missing .note-card-actions-bar in style.css');
  assert(styleCss.includes('.note-export-group'), 'Missing .note-export-group in style.css');
  assert(styleCss.includes('.btn-note-delete'), 'Missing .btn-note-delete in style.css');
  assert(dashboardJs.includes('note-card-actions-bar'), 'Missing note-card-actions-bar in card renderer');
  pass('Note Card Decluttering', 'Clean folder badge and action bar styles verified');
} catch (err) { fail('Note Card Decluttering', err); }

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================\n');

if (failed > 0) process.exit(1);
