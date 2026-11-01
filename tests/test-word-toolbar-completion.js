'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Verifying Word Toolbar Completion (Pages, TOC, Indent/Spacing) & Folder Safety ===\n');
const nbHtml = fs.readFileSync(path.join(__dirname, '../public/notebook.html'), 'utf8');
const nbJs = fs.readFileSync(path.join(__dirname, '../public/js/notebook.js'), 'utf8');

['insertCoverPage', 'insertBlankPage', 'insertPageBreak', 'handleInsertPicture',
 'insertTableOfContents', 'updateTableOfContents', 'markHeadingLevel',
 'applyParagraphIndent', 'applyParagraphSpacingPt'].forEach(fn => {
  assert(nbHtml.includes('function ' + fn), `notebook.html must define ${fn}`);
});
['nbIndentLeft', 'nbIndentRight', 'nbSpacingBefore', 'nbSpacingAfter'].forEach(id => {
  assert(nbHtml.includes('id="' + id + '"'), `notebook.html must render #${id}`);
});
console.log('  ✅ Standalone Insert/Layout groups present');

['renderEmbeddedExtraRibbonSections', 'embeddedInsertTOC', 'embeddedUpdateTOC', 'applyEmbeddedPageSetup',
 'applyEmbeddedBlockStyle', 'arrangeEmbeddedShape', 'applyEmbeddedHeadingStyle', 'embeddedInsertPicture',
 'embeddedInsertTextBox', 'embeddedInsertWordArt'].forEach(fn => {
  assert(nbJs.includes('function ' + fn), `notebook.js must define ${fn}`);
});
console.log('  ✅ Embedded (Private Space) toolbar mirrors full toolbar');

// Excluded features must not appear in the Insert tab
['3D Models', 'Online Videos', 'Bookmark', 'Cross-reference'].forEach(t => {
  assert(!nbJs.includes('>' + t + '<'), `${t} must be excluded`);
});
assert(nbHtml.includes('Are you sure you want to delete this folder and all notes inside it? This action cannot be undone.'),
  'folder deletion must require confirmation');
console.log('  ✅ Excluded features absent; folder delete confirmation present');
console.log('\n🎉 WORD TOOLBAR COMPLETION TESTS PASSED!\n');
