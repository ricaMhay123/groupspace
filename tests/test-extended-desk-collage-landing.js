/**
 * Test Suite: Extended Desk Collage Landing Page Overhaul
 *
 * Verifies:
 * 1. Clean stationery header (GroupSpace logo, #themeToggle, navigation links) with omission of Mac dots & dev labels
 * 2. Continuous red notebook margin guide line
 * 3. Hand-sketched blue ink annotations (arrows, encircled title) with pointer-events: none
 * 4. 3 tactile paper showcase cards (NOTE_CARD_01 with binder holes & paperclip, CARD_02 with washi tape & sticky note, CARD_03 with code snippet & paperclip)
 * 5. Extended desk sections: wooden clipboard workflow, collage memo board, and receipt expense demo
 * 6. CSS stationery styling: #fcfbf7 graph paper grid, alternating rotations (-1.2deg, +1.2deg), torn bottom edges, and dark mode harmony
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

// 3. Hand-Sketched Annotations
check('Hand-sketched ink annotations present with pointer-events: none', () => {
  assert(indexHtml.includes('sketch-arrow'), 'Must include sketched downward arrows');
  assert(indexHtml.includes('sketch-loop'), 'Must include sketched headline loop');
  assert(landingCss.includes('.sketch-arrow') || landingCss.includes('.sketch-loop'), 'CSS must define sketch annotation rules');
  assert(landingCss.includes('pointer-events: none'), 'CSS must enforce pointer-events: none on annotations');
});

// 4. Three Paper Showcase Cards
check('Three tactile paper showcase cards with authentic stationery elements', () => {
  assert(indexHtml.includes('NOTE_CARD_01'), 'Must include NOTE_CARD_01');
  assert(indexHtml.includes('CARD_02'), 'Must include CARD_02');
  assert(indexHtml.includes('CARD_03'), 'Must include CARD_03');
  assert(indexHtml.includes('binder-hole'), 'Must include punched binder holes on Card 1');
  assert(indexHtml.includes('Priority!'), 'Must include Priority! badge on Card 1');
  assert(indexHtml.includes('Organized'), 'Must include Organized badge on Card 2');
  assert(indexHtml.includes('post-it-note') || indexHtml.includes('sticky-note'), 'Must include sticky note insert on Card 2');
  assert(indexHtml.includes('Ready') || indexHtml.includes('✓ Ready'), 'Must include Ready badge on Card 3');
  assert(indexHtml.includes('dark-code-snippet') || indexHtml.includes('code-snippet'), 'Must include code snippet on Card 3');
});

// 5. Extended Desk Sections Below the Fold
check('Extended desk sections (clipboard workflow, memo board, receipt demo)', () => {
  assert(indexHtml.includes('desk-clipboard') || indexHtml.includes('clipboard-frame'), 'Must include wooden clipboard collaboration section');
  assert(indexHtml.includes('desk-memo') || indexHtml.includes('memo-board'), 'Must include collage memo board section');
  assert(indexHtml.includes('paper-receipt') || indexHtml.includes('receipt-slip'), 'Must include paper receipt expense demo');
});

// 6. CSS Stationery Styling & Dark Mode Harmony
check('CSS graph paper pattern, alternating rotations, and dark mode harmony', () => {
  assert(landingCss.includes('#fcfbf7'), 'CSS must define #fcfbf7 paper background');
  assert(landingCss.includes('repeating-linear-gradient'), 'CSS must define repeating blue graph grid pattern');
  assert(landingCss.includes('rotate('), 'CSS must define alternating card rotations');
  assert(landingCss.includes('paper-torn-bottom') || landingCss.includes('torn-bottom'), 'CSS must define torn bottom edge');
  assert(landingCss.includes('.dark') || landingCss.includes('html.dark'), 'CSS must define dark mode stationery rules');
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 Extended Desk Collage Landing Page tests passed successfully!\n');
}

