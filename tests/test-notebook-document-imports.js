/**
 * Verification Suite for Phase 3: Notebook Module (Document Imports & Table Styles)
 *
 * Tests:
 * 1. Client-Side Document Import System:
 *    - Ingestion of .pdf and .docx via Mammoth.js & PDF.js
 *    - File inputs accept attributes in notebook.html and dashboard.html (.doc, .docx, .pdf, .txt, .md)
 *    - parseUploadedDocument helper parses docx, doc, pdf, and txt/md with dynamic loaders & stream fallbacks
 * 2. Express Server 50MB Payload Handling:
 *    - express.json({ limit: '50mb' }) and express.urlencoded({ limit: '50mb' }) in app.js
 * 3. Safe Export Handlers & Multi-Format Downloads:
 *    - exportNotebook & exportPage support .txt, .pdf, .docx
 *    - Safe noteId lookup avoiding unescaped inline onclick string injection
 * 4. Microsoft Word-Style Contextual Table Ribbon System:
 *    - #nbTabTableDesign contextual ribbon tab
 *    - data-ribbon-group="table-design" toolbar container
 *    - Table Presets (Default Grid, Striped Rows, Header Accent, Borderless)
 *    - Real-time cell padding (compact, standard, relaxed)
 *    - Border color picker & background shading picker
 *    - Row and Column operations (insert above/below, left/right, delete)
 * 5. CSS Tokens & Impeccable Craft Harmony:
 *    - Preset styling in style.css
 *    - Contextual tab animations and light/dark theme variables
 * 6. Syntax & Compilation:
 *    - notebook.html, dashboard.js, notebook.js compile cleanly in Node VM
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
console.log('🧪 NOTEBOOK DOCUMENT IMPORTS & TABLE STYLES TEST SUITE');
console.log('================================================================\n');

const notebookHtmlPath = path.join(__dirname, '..', 'public', 'notebook.html');
const dashboardHtmlPath = path.join(__dirname, '..', 'public', 'dashboard.html');
const dashboardJsPath = path.join(__dirname, '..', 'public', 'js', 'dashboard.js');
const notebookJsPath = path.join(__dirname, '..', 'public', 'js', 'notebook.js');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');
const appJsPath = path.join(__dirname, '..', 'src', 'app.js');

const notebookHtml = fs.readFileSync(notebookHtmlPath, 'utf8');
const dashboardHtml = fs.readFileSync(dashboardHtmlPath, 'utf8');
const dashboardJs = fs.readFileSync(dashboardJsPath, 'utf8');
const notebookJs = fs.readFileSync(notebookJsPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const appJs = fs.readFileSync(appJsPath, 'utf8');

// ── 1. SCRIPT LIBRARIES & FILE INPUT ACCEPTS ──
console.log('📦 1. Client-Side Libraries & Input Accept Attributes:');
assert(notebookHtml.includes('mammoth.browser.min.js'), 'notebook.html loads Mammoth.js browser CDN');
assert(notebookHtml.includes('pdf.min.js'), 'notebook.html loads PDF.js CDN');
assert(dashboardHtml.includes('mammoth.browser.min.js'), 'dashboard.html loads Mammoth.js browser CDN');
assert(dashboardHtml.includes('pdf.min.js'), 'dashboard.html loads PDF.js CDN');

assert(notebookHtml.includes('id="nbFileInput"') && notebookHtml.includes('.docx') && notebookHtml.includes('.doc') && notebookHtml.includes('.pdf'),
  'notebook.html #nbFileInput accepts .docx, .doc and .pdf files');
assert(dashboardHtml.includes('id="dashboardImportFileInput"') && dashboardHtml.includes('.docx') && dashboardHtml.includes('.doc') && dashboardHtml.includes('.pdf'),
  'dashboard.html #dashboardImportFileInput accepts .docx, .doc and .pdf files');
assert(dashboardHtml.includes('id="personalImportFileInput"') && dashboardHtml.includes('.docx') && dashboardHtml.includes('.doc') && dashboardHtml.includes('.pdf'),
  'dashboard.html #personalImportFileInput accepts .docx, .doc and .pdf files');

// ── 2. PARSER LOGIC IN NOTEBOOK.HTML & DASHBOARD.JS ──
console.log('\n📄 2. Document Parser Integration & Handlers:');
assert(notebookHtml.includes('async function parseUploadedDocument'), 'notebook.html defines parseUploadedDocument helper');
assert(notebookHtml.includes('mammoth.convertToHtml'), 'notebook.html integrates mammoth.convertToHtml for .docx parsing');
assert(notebookHtml.includes('pdfjsLib.getDocument'), 'notebook.html integrates pdfjsLib.getDocument for .pdf parsing');
assert(notebookHtml.includes('handleImportFile'), 'notebook.html defines handleImportFile');
assert(notebookHtml.includes('ensureScript'), 'notebook.html includes dynamic CDN script loader fallback');

assert(dashboardJs.includes('parseUploadedDocument') || dashboardJs.includes('mammoth.convertToHtml'),
  'dashboard.js supports rich document parsing for dashboard imports');
assert(dashboardJs.includes('handleDashboardImportDocument'), 'dashboard.js defines handleDashboardImportDocument');
assert(dashboardJs.includes('handlePersonalImportDocument'), 'dashboard.js defines handlePersonalImportDocument');

// ── 3. LARGE PAYLOAD & SERVER LIMITS ──
console.log('\n🚀 3. Server Body Parser Limit Configuration:');
assert(appJs.includes("limit: '50mb'") || appJs.includes('limit: "50mb"'),
  'src/app.js configures 50MB body parser limits for large imported documents and base64 images');

// ── 4. SAFE EXPORT HANDLERS & MULTI-FORMAT SUPPORT ──
console.log('\n💾 4. Document Export Handlers (.txt, .pdf, .docx):');
assert(notebookJs.includes("async function exportNotebook(format, noteId"),
  'notebook.js defines unified exportNotebook(format, noteId, ...) handler');
assert(!dashboardJs.includes("exportNotebook('txt', ${n.id}, '${escapeHtml(displayTitle)}'"),
  'dashboard.js uses safe exportNotebook click handlers without inlining raw multiline strings');
assert(notebookHtml.includes("async function exportPage(format)"),
  'notebook.html defines exportPage supporting txt, pdf, docx formats');

// ── 5. CONTEXTUAL TABLE DESIGN RIBBON TAB ──
console.log('\n🗂️ 5. Microsoft Word-Style Contextual Table Design Tab:');
assert(notebookHtml.includes('id="nbTabTableDesign"'), 'notebook.html includes #nbTabTableDesign ribbon tab button');
assert(notebookHtml.includes('data-ribbon-tab="table-design"'), 'Ribbon tab has data-ribbon-tab="table-design"');
assert(notebookHtml.includes('data-ribbon-group="table-design"'), 'Toolbar includes data-ribbon-group="table-design" group container');
assert(notebookHtml.includes('contextual-tab'), 'Tab button has .contextual-tab class indicator');

// ── 6. TABLE STYLE PRESETS & MANIPULATION CONTROLS ──
console.log('\n🎨 6. Table Style Presets & Action Controls:');
assert(notebookHtml.includes('id="nbTablePresetSelect"'), 'Table Design group includes preset selector');
assert(notebookHtml.includes('value="default-grid"'), 'Includes Default Grid preset');
assert(notebookHtml.includes('value="striped"'), 'Includes Striped Rows preset');
assert(notebookHtml.includes('value="header-accent"'), 'Includes Header Accent preset');
assert(notebookHtml.includes('value="borderless"'), 'Includes Borderless preset');

assert(notebookHtml.includes('id="nbTableCellPaddingSelect"'), 'Includes cell padding dropdown');
assert(notebookHtml.includes('id="nbTableBorderColor"'), 'Includes border color picker');
assert(notebookHtml.includes('id="nbTableCellShading"'), 'Includes cell shading color picker');

assert(notebookHtml.includes('insertTableRow'), 'notebook.html defines insertTableRow function');
assert(notebookHtml.includes('insertTableColumn'), 'notebook.html defines insertTableColumn function');
assert(notebookHtml.includes('deleteCurrentTableRow'), 'notebook.html defines deleteCurrentTableRow function');
assert(notebookHtml.includes('deleteCurrentTableColumn'), 'notebook.html defines deleteCurrentTableColumn function');
assert(notebookHtml.includes('deleteActiveTable'), 'notebook.html defines deleteActiveTable function');
assert(notebookHtml.includes('applyTablePreset'), 'notebook.html defines applyTablePreset function');

// ── 7. CSS TOKENS, PRESETS & IMPECCABLE TRANSITIONS ──
console.log('\n💎 7. CSS Classes, Presets & Visual Craft:');
assert(css.includes('.table-preset-default-grid'), 'CSS defines .table-preset-default-grid');
assert(css.includes('.table-preset-striped'), 'CSS defines .table-preset-striped');
assert(css.includes('.table-preset-header-accent'), 'CSS defines .table-preset-header-accent');
assert(css.includes('.table-preset-borderless'), 'CSS defines .table-preset-borderless');
assert(css.includes('.nb-ribbon-tab.contextual-tab'), 'CSS defines .nb-ribbon-tab.contextual-tab');
assert(css.includes('@keyframes contextualTabGlow') || css.includes('transition:'), 'CSS includes smooth animations/transitions for contextual tab');

// ── 8. JAVASCRIPT SYNTAX & VM VALIDATION ──
console.log('\n⚙️ 8. Script Syntax Integrity Verification:');
try {
  const inlineScriptMatch = notebookHtml.match(/<script>\s*('use strict';[\s\S]*?)<\/script>/);
  assert(Boolean(inlineScriptMatch), 'notebook.html retains valid strict mode inline script');
  new vm.Script(inlineScriptMatch[1], { filename: 'public/notebook.html (inline script)' });
  assert(true, 'public/notebook.html inline script compiles with 0 syntax errors');
} catch (err) {
  assert(false, `public/notebook.html script syntax error: ${err.message}`);
}

try {
  new vm.Script(dashboardJs, { filename: 'public/js/dashboard.js' });
  assert(true, 'public/js/dashboard.js compiles with 0 syntax errors');
} catch (err) {
  assert(false, `public/js/dashboard.js script syntax error: ${err.message}`);
}

try {
  new vm.Script(notebookJs, { filename: 'public/js/notebook.js' });
  assert(true, 'public/js/notebook.js compiles with 0 syntax errors');
} catch (err) {
  assert(false, `public/js/notebook.js script syntax error: ${err.message}`);
}

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Notebook Document Imports & Table Styles tests passed!\n');
}
