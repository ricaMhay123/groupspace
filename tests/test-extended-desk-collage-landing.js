/**
 * Test Suite: Extended Desk Collage Landing Page Overhaul (User Specification)
 *
 * Verifies:
 * 1. Clean stationery header (GroupSpace logo, #themeToggle, navigation links) with omission of Mac dots & dev labels
 * 2. Continuous red notebook margin guide line
 * 3. Hero section per Pic 2 specification:
 *    - Headline: "Organize your team to maximum impact"
 *    - Subtext: "GroupSpace simplifies collaboration for students, organizations, and project teams. Manage discussions, tasks, files, schedules, and expenses inside one modern workspace."
 *    - Action buttons: "Get Started" and "Explore Features"
 * 4. Six feature cards grid per Pic 2 specification:
 *    - Section title: "Everything Your Team Needs"
 *    - Card 1: 01 / Discussions -> Group Discussions
 *    - Card 2: 02 / Tasks -> Task Management
 *    - Card 3: 03 / Documents -> File Sharing
 *    - Card 4: 04 / Schedule -> Calendar
 *    - Card 5: 05 / Team -> Group Members
 *    - Card 6: 06 / Finance -> Expense Tracker
 * 5. Extended desk sections below the fold: wooden clipboard workflow, collage memo board, and receipt expense demo
 * 6. CSS stationery styling: #fcfbf7 graph paper grid, dark mode harmony, and responsive card layouts
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 EXTENDED DESK COLLAGE LANDING PAGE TEST SUITE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

const indexPath = path.join(__dirname, '..', 'public', 'index.html');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'landing.css');

assert(fs.existsSync(indexPath), 'public/index.html must exist');
assert(fs.existsSync(cssPath), 'public/css/landing.css must exist');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const landingCss = fs.readFileSync(cssPath, 'utf8');

// 1. Clean Stationery Header Checks
check('Header preserves GroupSpace brand logo & theme toggle', () => {
  assert(indexHtml.includes('GroupSpace'), 'Must retain GroupSpace brand');
  assert(indexHtml.includes('id="themeToggle"'), 'Must retain #themeToggle button');
  assert(indexHtml.includes('href="/login.html"') || indexHtml.includes("href='/login.html'"), 'Must retain login link');
  assert(indexHtml.includes('href="/register.html"') || indexHtml.includes("href='/register.html'"), 'Must retain register link');
});

check('Header cleanly omits Mac window dots and dev raw file labels', () => {
  assert(!indexHtml.includes('PROJECT_NOTES_2026.RAW'), 'Must not include raw dev file stamp in header');
  assert(!indexHtml.includes('Toggle Annotations'), 'Must not include toggle annotations button in header');
});

// 2. Continuous Red Notebook Margin Guide
check('Continuous red notebook margin guide line present', () => {
  assert(
    indexHtml.includes('notebook-margin-guide') || indexHtml.includes('red-margin-line') || landingCss.includes('border-left: 2px solid rgba(239, 68, 68'),
    'Must include red margin guide line'
  );
});

// 3. Hero Section per Pic 2 Specification
check('Hero headline, subtext, and action buttons match Pic 2 specification', () => {
  assert(indexHtml.includes('Organize your team'), 'Must include "Organize your team" headline');
  assert(indexHtml.includes('maximum impact'), 'Must include "maximum impact"');
  assert(indexHtml.includes('GroupSpace simplifies collaboration'), 'Must include hero subtext');
  assert(indexHtml.includes('Get Started'), 'Must include "Get Started" CTA');
  assert(indexHtml.includes('Explore Features'), 'Must include "Explore Features" CTA');
  assert(landingCss.includes('.hero-heading'), 'CSS must define .hero-heading');
  assert(landingCss.includes('.hero-subtext'), 'CSS must define .hero-subtext');
  assert(landingCss.includes('.hero-btn-primary'), 'CSS must define .hero-btn-primary');
  assert(landingCss.includes('.hero-btn-secondary'), 'CSS must define .hero-btn-secondary');
});

// 4. Six Feature Cards Grid per Pic 2 Specification
check('Six core feature cards with kickers and descriptions match Pic 2 specification', () => {
  assert(indexHtml.includes('Everything Your Team Needs'), 'Must include "Everything Your Team Needs" title');
  
  // Card 1: Discussions
  assert(indexHtml.includes('01 / Discussions'), 'Must include kicker 01 / Discussions');
  assert(indexHtml.includes('Group Discussions'), 'Must include title Group Discussions');
  assert(indexHtml.includes('Create discussion threads, ask questions, and keep everyone updated.'), 'Must include Discussions copy');

  // Card 2: Tasks
  assert(indexHtml.includes('02 / Tasks'), 'Must include kicker 02 / Tasks');
  assert(indexHtml.includes('Task Management'), 'Must include title Task Management');
  assert(indexHtml.includes("Assign tasks, monitor deadlines, and track every member's progress."), 'Must include Tasks copy');

  // Card 3: Documents
  assert(indexHtml.includes('03 / Documents'), 'Must include kicker 03 / Documents');
  assert(indexHtml.includes('File Sharing'), 'Must include title File Sharing');
  assert(indexHtml.includes('Upload and organize documents, presentations, images, and reports.'), 'Must include Documents copy');

  // Card 4: Schedule
  assert(indexHtml.includes('04 / Schedule'), 'Must include kicker 04 / Schedule');
  assert(indexHtml.includes('Calendar'), 'Must include title Calendar');
  assert(indexHtml.includes('Never miss meetings or project deadlines with a shared calendar.'), 'Must include Schedule copy');

  // Card 5: Team
  assert(indexHtml.includes('05 / Team'), 'Must include kicker 05 / Team');
  assert(indexHtml.includes('Group Members'), 'Must include title Group Members');
  assert(indexHtml.includes('Manage team members and assign different responsibilities.'), 'Must include Team copy');

  // Card 6: Finance
  assert(indexHtml.includes('06 / Finance'), 'Must include kicker 06 / Finance');
  assert(indexHtml.includes('Expense Tracker'), 'Must include title Expense Tracker');
  assert(indexHtml.includes('Record shared expenses and easily monitor group contributions.'), 'Must include Finance copy');

  // CSS definitions
  assert(landingCss.includes('.feature-container'), 'CSS must define .feature-container');
  assert(landingCss.includes('.feature-card'), 'CSS must define .feature-card');
  assert(landingCss.includes('.feature-kicker'), 'CSS must define .feature-kicker');
});

// 5. Extended Desk Sections Below the Fold
check('Extended desk sections (clipboard workflow, memo board, receipt demo)', () => {
  assert(indexHtml.includes('desk-clipboard') || indexHtml.includes('clipboard-frame'), 'Must include wooden clipboard collaboration section');
  assert(indexHtml.includes('desk-memo') || indexHtml.includes('memo-board'), 'Must include collage memo board section');
  assert(indexHtml.includes('paper-receipt') || indexHtml.includes('receipt-slip'), 'Must include paper receipt expense demo');
});

// 6. CSS Stationery Styling & Dark Mode Harmony
check('CSS graph paper pattern, responsive grid, and dark mode harmony', () => {
  assert(landingCss.includes('#fcfbf7'), 'CSS must define #fcfbf7 paper background');
  assert(landingCss.includes('repeating-linear-gradient'), 'CSS must define repeating blue graph grid pattern');
  assert(landingCss.includes('.dark') || landingCss.includes('html.dark'), 'CSS must define dark mode stationery rules');
  assert(landingCss.includes('@media (max-width: 768px)'), 'CSS must define mobile responsive media query');
  assert(landingCss.includes('min-height: 44px'), 'CSS must enforce 44px touch targets on mobile');
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 Extended Desk Collage Landing Page tests passed successfully!\n');
}
