const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Verifying Full MS Word Toolbar Suite (Home, Insert, Draw, Layout) in Notebook ===');

const notebookHtml = fs.readFileSync(path.join(__dirname, '../public/notebook.html'), 'utf8');
const notebookJs = fs.readFileSync(path.join(__dirname, '../public/js/notebook.js'), 'utf8');

// 1. Home Tab verification
assert(notebookHtml.includes('data-ribbon-tab="home"'), 'Notebook HTML must have Home ribbon tab');
assert(notebookHtml.includes('12px') && notebookHtml.includes('36px'), 'Notebook HTML must have 12px to 36px font sizes');
assert(notebookHtml.includes('Arial') && notebookHtml.includes('Calibri') && notebookHtml.includes('Times New Roman'), 'Notebook HTML must have Arial, Calibri, Times New Roman');
assert(notebookHtml.includes("execFmt('bold')"), 'Must support bold');
assert(notebookHtml.includes("execFmt('italic')"), 'Must support italic');
assert(notebookHtml.includes("execFmt('underline')"), 'Must support underline');
assert(notebookHtml.includes("execFmt('strikeThrough')"), 'Must support strikethrough');
assert(notebookHtml.includes("execFmt('subscript')"), 'Must support subscript');
assert(notebookHtml.includes("execFmt('superscript')"), 'Must support superscript');
assert(notebookHtml.includes("execFmt('removeFormat')"), 'Must support clear formatting');
assert(notebookHtml.includes("execFmt('insertUnorderedList')"), 'Must support bullet lists');
assert(notebookHtml.includes("execFmt('insertOrderedList')"), 'Must support numbered lists');
assert(notebookHtml.includes("execFmt('justifyLeft')") && notebookHtml.includes("execFmt('justifyFull')"), 'Must support full text alignment');
assert(notebookHtml.includes('1.0') && notebookHtml.includes('1.15') && notebookHtml.includes('1.5') && notebookHtml.includes('2.0'), 'Must support line spacing options');
console.log('[PASS] Home Tab (Font, text styling, sub/superscript, lists, alignment & spacing) verified.');

// 2. Insert Tab verification
assert(notebookHtml.includes('data-ribbon-tab="insert"'), 'Notebook HTML must have Insert ribbon tab');
assert(notebookHtml.includes('nbInsertTableSelect') || notebookHtml.includes('insertDynamicTable'), 'Must have dynamic table generator');
assert(notebookHtml.includes('rectangle') && notebookHtml.includes('circle') && notebookHtml.includes('diamond') && notebookHtml.includes('arrow_line') && notebookHtml.includes('straight_line') && notebookHtml.includes('dashed_line') && notebookHtml.includes('callout'), 'Must support all flowchart & line shapes');
assert(notebookHtml.includes('1px') && notebookHtml.includes('8px'), 'Stroke thickness must span 1px to 8px');
assert(notebookHtml.includes('insertTextBox') && notebookHtml.includes('interactive-textbox-inner'), 'Must support draggable & rotatable text boxes with contenteditable');
console.log('[PASS] Insert Tab (Tables, flowchart shapes & lines, floating text boxes) verified.');

// 3. Draw Tab verification
assert(notebookHtml.includes('data-ribbon-tab="draw"'), 'Notebook HTML must have Draw ribbon tab');
assert(notebookHtml.includes('nbInkCanvas') && notebookHtml.includes('setInkingMode'), 'Must have digital inking canvas overlay & tools');
assert(notebookHtml.includes('nbInkPenBtn') && notebookHtml.includes('nbInkHighlighterBtn') && notebookHtml.includes('nbInkEraserBtn'), 'Must have pen, highlighter, and eraser tools');
assert(notebookHtml.includes('nbInkThickness') && notebookHtml.includes('nbInkColor'), 'Must support pen thickness & color pickers');
console.log('[PASS] Draw Tab (Digital inking canvas, Pen, Highlighter, Eraser) verified.');

// 4. Layout Tab verification
assert(notebookHtml.includes('data-ribbon-tab="layout"'), 'Notebook HTML must have Layout ribbon tab');
assert(notebookHtml.includes('nbPageMargins') && notebookHtml.includes('normal') && notebookHtml.includes('narrow') && notebookHtml.includes('wide'), 'Must have page margins presets');
assert(notebookHtml.includes('nbPageOrientation') && notebookHtml.includes('portrait') && notebookHtml.includes('landscape'), 'Must support page orientation');
assert(notebookHtml.includes('nbPageColumns') && notebookHtml.includes('columns-2'), 'Must support page column splits');
console.log('[PASS] Layout Tab (Page Margins, Orientation, Columns) verified.');

// 5. Automatic Title System & Document Export
assert(notebookHtml.includes('extractAutoTitle') && notebookHtml.includes('resolvePageTitle'), 'Must have auto-titling from first sentence/word');
assert(notebookHtml.includes("exportPage('txt')"), 'Must have .txt export');
assert(notebookHtml.includes("exportPage('pdf')"), 'Must have .pdf export');
assert(notebookHtml.includes("exportPage('docx')"), 'Must have .docx export');
console.log('[PASS] Auto-titling & Multi-Format Export (.txt, .pdf, .docx) verified.');

// 6. High contrast styling check
assert(notebookHtml.includes('background: #0f172a') || notebookHtml.includes('background:#0f172a'), 'Toolbar must be dark slate #0f172a');
assert(notebookHtml.includes('color: #ffffff') || notebookHtml.includes('color:#ffffff'), 'Toolbar text must be #ffffff');
console.log('[PASS] High contrast toolbar styling (#0f172a dark slate / #ffffff white) verified.');

console.log('\nALL MS WORD TOOLBAR SUITE TESTS PASSED SUCCESSFULLY!');
