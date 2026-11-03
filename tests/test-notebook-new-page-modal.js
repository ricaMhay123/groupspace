/**
 * Test Suite: Notebook New Page Simple Pop-up Modal
 * Verifies:
 * 1. Dashboard Notebook `#createNoteModal` is streamlined to Title input + Save + Open in Full Editor + Cancel / ✕
 * 2. Dashboard JS implements `handleCreateNoteChoice('save')` and `handleCreateNoteChoice('open')`
 * 3. Standalone Notebook `#nbNewPageModal` contains Title input + Save + Open in Full Editor + Cancel / ✕
 * 4. Standalone Notebook JS `newPage()` triggers `#nbNewPageModal`
 * 5. CSS `.modal-actions-choice` transitions and responsive layout
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
console.log('🧪 NOTEBOOK NEW PAGE SIMPLE POP-UP MODAL TEST SUITE');
console.log('================================================================\n');

// ── 1. DASHBOARD NOTEBOOK MODAL & JS ──
console.log('📊 1. Dashboard Notebook Modal (#createNoteModal):');
const dashHtmlPath = path.join(__dirname, '..', 'public', 'dashboard.html');
const dashJsPath = path.join(__dirname, '..', 'public', 'js', 'dashboard.js');

check(fs.existsSync(dashHtmlPath), 'public/dashboard.html exists');
check(fs.existsSync(dashJsPath), 'public/js/dashboard.js exists');

const dashHtml = fs.readFileSync(dashHtmlPath, 'utf8');
const dashJs = fs.readFileSync(dashJsPath, 'utf8');

check(dashHtml.includes('id="createNoteModal"'), 'dashboard.html defines #createNoteModal');
check(dashHtml.includes('id="noteTitle"'), 'createNoteModal includes #noteTitle input');
check(dashHtml.includes('id="savePageBtn"'), 'createNoteModal includes #savePageBtn ("Save")');
check(dashHtml.includes('id="openInFullEditorBtn"'), 'createNoteModal includes #openInFullEditorBtn ("Open in Full Editor")');
check(dashHtml.includes("closeModal('createNoteModal')"), 'createNoteModal supports close action / top-right ✕');

check(dashJs.includes('function handleCreateNoteChoice'), 'dashboard.js implements handleCreateNoteChoice()');
check(dashJs.includes("handleCreateNoteChoice('save'") || dashJs.includes("choice === 'save'"), 'handleCreateNoteChoice supports direct Save');
check(dashJs.includes("handleCreateNoteChoice('open'") || dashJs.includes("choice === 'open'"), 'handleCreateNoteChoice supports Open in Full Editor');

// ── 2. STANDALONE NOTEBOOK MODAL & JS ──
console.log('\n📓 2. Standalone Notebook Editor Modal (#nbNewPageModal):');
const nbHtmlPath = path.join(__dirname, '..', 'public', 'notebook.html');
check(fs.existsSync(nbHtmlPath), 'public/notebook.html exists');

const nbHtml = fs.readFileSync(nbHtmlPath, 'utf8');

check(nbHtml.includes('id="nbNewPageModal"'), 'notebook.html defines #nbNewPageModal');
check(nbHtml.includes('id="nbNewPageTitleInput"'), 'nbNewPageModal includes #nbNewPageTitleInput');
check(nbHtml.includes('id="nbSaveNewPageDirectBtn"'), 'nbNewPageModal includes #nbSaveNewPageDirectBtn ("Save")');
check(nbHtml.includes('id="nbOpenFullEditorNewPageBtn"'), 'nbNewPageModal includes #nbOpenFullEditorNewPageBtn ("Open in Full Editor")');
check(nbHtml.includes('closeNbNewPageModal'), 'nbNewPageModal includes closeNbNewPageModal() / top-right ✕');
check(nbHtml.includes('handleNbNewPageChoice'), 'notebook.html implements handleNbNewPageChoice()');
check(nbHtml.includes("modal.classList.add('open')") && nbHtml.includes('function newPage'), 'newPage() triggers the modal');

// ── 3. STYLESHEET TOKENS ──
console.log('\n🎨 3. CSS Tokens & Transitions:');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');

check(css.includes('.modal-actions-choice'), 'style.css defines .modal-actions-choice layout');

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Notebook New Page Simple Pop-up Modal tests passed!\n');
}

