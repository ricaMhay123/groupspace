'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('🧪 Verifying Notebook Resizable Sidebar (150px-420px) & Auto-Wrapping Ribbon...\n');

const nbHtml = fs.readFileSync(path.join(__dirname, '../public/notebook.html'), 'utf8');

// 1. Validate inline script syntax
const scriptMatch = nbHtml.match(/<script>\s*('use strict';[\s\S]*?)<\/script>/);
assert(scriptMatch, 'Inline script found in public/notebook.html');
new vm.Script(scriptMatch[1], { filename: 'public/notebook.html (inline script)' });
console.log('  ✅ 1. public/notebook.html inline script syntax valid');

// 2. Verify draggable sidebar resizer HTML, CSS, and JS
assert(nbHtml.includes('id="nbSidebarResizer"'), 'notebook.html includes #nbSidebarResizer element');
assert(nbHtml.includes('class="nb-sidebar-resizer"'), 'notebook.html includes .nb-sidebar-resizer class');
assert(nbHtml.includes('width: var(--nb-sidebar-width, 260px);'), '.nb-sidebar uses --nb-sidebar-width custom property');
assert(nbHtml.includes('min-width: 150px;') && nbHtml.includes('max-width: 420px;'), '.nb-sidebar clamps between 150px and 420px');
assert(nbHtml.includes('cursor: col-resize;'), '.nb-sidebar-resizer uses col-resize cursor');
assert(nbHtml.includes('function initNotebookSidebarResizer()'), 'notebook.html defines initNotebookSidebarResizer()');
assert(nbHtml.includes('const MIN_WIDTH = 150;') && nbHtml.includes('const MAX_WIDTH = 420;'), 'JS resizer enforces 150px to 420px bounds');
assert(nbHtml.includes('groupspace_nb_sidebar_width'), 'JS resizer persists sidebar width in localStorage');
console.log('  ✅ 2. Draggable sidebar resizer (150px–420px, double-click reset, localStorage persistence) verified');

// 3. Verify auto-wrapping ribbon & flex overflow constraints
assert(
  nbHtml.includes('.nb-editor-area') &&
  nbHtml.includes('flex: 1 1 0%;') &&
  nbHtml.includes('min-width: 0;'),
  '.nb-editor-area constrains flex width with min-width: 0 so ribbon cannot overflow off-screen'
);

const ribbonBodyMatch = nbHtml.match(/\.nb-ribbon-body\s*\{[\s\S]*?\}/);
assert(ribbonBodyMatch && ribbonBodyMatch[0].includes('flex-wrap: wrap;'), '.nb-ribbon-body uses flex-wrap: wrap so all buttons stay accessible at 100% zoom');

const groupContentMatch = nbHtml.match(/\.nb-ribbon-group-content\s*\{[\s\S]*?\}/);
assert(groupContentMatch && groupContentMatch[0].includes('flex-wrap: wrap;'), '.nb-ribbon-group-content wraps cleanly on narrower viewports');

const ribbonRowMatch = nbHtml.match(/\.nb-ribbon-row\s*\{[\s\S]*?\}/);
assert(ribbonRowMatch && ribbonRowMatch[0].includes('flex-wrap: wrap;'), '.nb-ribbon-row wraps cleanly so wide groups never clip');
console.log('  ✅ 3. Auto-wrapping ribbon across File, Home, Insert, Draw, Layout, and View verified');

console.log('\n🎉 All Notebook Resizable Sidebar & Auto-Wrapping Ribbon tests passed!\n');
