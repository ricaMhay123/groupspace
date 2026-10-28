'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function checkFileSyntax(relPath) {
  const fullPath = path.join(root, relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  new vm.Script(code, { filename: relPath });
  console.log(`[PASS] Syntax valid: ${relPath}`);
}

async function runTests() {
  console.log('=== Verifying Notebook MS Word Toolbar, Auto-Title & Isolated Personal Notebook ===');

  // 1. Syntax checks
  [
    'src/config/db.config.js',
    'src/modules/personal-space/personal.model.js',
    'src/modules/personal-space/personal.service.js',
    'src/modules/personal-space/personal.controller.js',
    'src/modules/personal-space/personal.routes.js',
    'src/modules/notebook/notebook.model.js',
    'src/modules/notebook/notebook.service.js',
    'src/modules/notebook/notebook.controller.js',
    'src/modules/notebook/notebook.routes.js',
    'public/js/notebook.js',
    'public/js/dashboard.js'
  ].forEach(checkFileSyntax);

  // 2. Check notebook.html inline script syntax & MS Word Toolbar / Flowchart Elements
  const notebookHtml = fs.readFileSync(path.join(root, 'public/notebook.html'), 'utf8');
  const scriptMatch = notebookHtml.match(/<script>\s*('use strict';[\s\S]*?)<\/script>/);
  assert(scriptMatch, 'Inline script found in public/notebook.html');
  new vm.Script(scriptMatch[1], { filename: 'public/notebook.html (inline script)' });
  console.log('[PASS] Syntax valid: public/notebook.html inline script');

  // Verify MS Word Ribbon tabs (Home, Insert, Draw, Layout)
  ['home', 'insert', 'draw', 'layout'].forEach(tab => {
    assert(notebookHtml.includes(`data-ribbon-tab="${tab}"`), `notebook.html missing ribbon tab: ${tab}`);
  });
  console.log('[PASS] MS Word Ribbon tabs (Home / Insert / Draw / Layout) present in notebook.html');

  // Verify Shapes & Flowchart Elements + Connectors & Lines
  const requiredShapes = [
    'rectangle',
    'circle',
    'diamond',
    'oval',
    'callout',
    'straight_line',
    'dashed_line',
    'arrow_line',
    'dashed_arrow_line'
  ];
  const notebookJs = fs.readFileSync(path.join(root, 'public/js/notebook.js'), 'utf8');
  requiredShapes.forEach(shape => {
    assert(notebookHtml.includes(`value="${shape}"`), `notebook.html missing shape option: ${shape}`);
    assert(notebookJs.includes(`value="${shape}"`), `notebook.js missing shape option: ${shape}`);
  });
  console.log('[PASS] All Flowchart Shapes & Connectors (Rectangle, Circle, Diamond, Oval, Callout, Straight/Dashed/Arrow/Dashed-Arrow Lines) present');

  // Verify Stroke thicknesses (1px, 2px, 4px, 6px) and Numeric Font Sizes (12px to 36px)
  ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'].forEach(sz => {
    assert(notebookHtml.includes(`value="${sz}"`), `notebook.html missing font size ${sz}`);
    assert(notebookJs.includes(`value="${sz}"`), `notebook.js missing font size ${sz}`);
  });
  ['1', '2', '4', '6'].forEach(sw => {
    assert(notebookHtml.includes(`<option value="${sw}"`), `notebook.html missing stroke width ${sw}px`);
    assert(notebookJs.includes(`<option value="${sw}"`), `notebook.js missing stroke width ${sw}px`);
  });
  console.log('[PASS] Numeric Font Sizes (12px-36px) and Stroke Thicknesses (1px-6px) verified');

  // 3. Verify Independent Title Input & Hybrid Auto-Title System
  assert(notebookHtml.includes('id="nbPageTitle"'), 'notebook.html must have a dedicated #nbPageTitle input');
  assert(notebookHtml.includes('name="manualTitleInput"'), 'notebook.html title input must have name="manualTitleInput"');
  const { extractAutoTitleFromContent } = require('../src/modules/notebook/notebook.service');
  // Case A: Manual custom title is preserved independently of canvas content
  assert.strictEqual(
    extractAutoTitleFromContent('Q4 Product Roadmap — Final', '<p>Completely different first sentence in canvas.</p>'),
    'Q4 Product Roadmap — Final'
  );
  // Case B: Blank manual title falls back to auto-titling from first phrase/sentence in canvas
  assert.strictEqual(
    extractAutoTitleFromContent('   ', '<p>Project Architecture Overview. Here are the details.</p>'),
    'Project Architecture Overview.'
  );
  assert.strictEqual(
    extractAutoTitleFromContent('', '<!--GS_SHAPES_JSON:[{"id":"s1"}]--><div>Sprint Retrospective Notes\nSecond line</div>'),
    'Sprint Retrospective Notes'
  );
  // Case C: Both manual title and canvas empty -> "Untitled Note"
  assert.strictEqual(
    extractAutoTitleFromContent('', ''),
    'Untitled Note'
  );
  assert.strictEqual(
    extractAutoTitleFromContent('   ', '<p>   </p>'),
    'Untitled Note'
  );
  console.log('[PASS] Independent Page Title & Hybrid Auto-Title fallback ("Untitled Note" default) verified');

  // 4. Verify Isolated Personal Space UI & Backend Privacy
  const dashboardHtml = fs.readFileSync(path.join(root, 'public/dashboard.html'), 'utf8');
  assert(dashboardHtml.includes('id="personalNotebookWorkspace"'), 'dashboard.html missing #personalNotebookWorkspace');
  assert(dashboardHtml.includes('id="personalNotebookCanvas"'), 'dashboard.html missing #personalNotebookCanvas');
  assert(dashboardHtml.includes('id="personalNotebookFoldersBar"'), 'dashboard.html missing #personalNotebookFoldersBar');
  assert(dashboardHtml.includes('notebook.html?personal=1'), 'dashboard.html missing Full Editor link for Personal Notebook');

  const personalModelCode = fs.readFileSync(path.join(root, 'src/modules/personal-space/personal.model.js'), 'utf8');
  assert(personalModelCode.includes('WHERE p.user_id = ${userId}'), 'personal.model.js must filter by user_id');
  assert(personalModelCode.includes('is_private'), 'personal.model.js must enforce is_private = TRUE');

  const notebookModelCode = fs.readFileSync(path.join(root, 'src/modules/notebook/notebook.model.js'), 'utf8');
  assert(notebookModelCode.includes('COALESCE(n.is_private, FALSE) = FALSE'), 'notebook.model.js must exclude private notes from group queries');
  console.log('[PASS] Isolated Personal Notebook Space & strict privacy filtering verified');

  console.log('\nALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});

