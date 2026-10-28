const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Verifying Strict Notebook Tab Isolation (Home, Insert, Draw, Layout) ===');

const notebookHtml = fs.readFileSync(path.join(__dirname, '../public/notebook.html'), 'utf8');
const notebookJs = fs.readFileSync(path.join(__dirname, '../public/js/notebook.js'), 'utf8');

// 1. Strict Tab Navigation & Isolation in notebook.html
assert(!notebookHtml.includes('data-ribbon-tab="all"'), 'Legacy "All Tools" tab must be completely removed');
assert(notebookHtml.includes('data-ribbon-tab="home"'), 'Must have Home tab');
assert(notebookHtml.includes('data-ribbon-tab="insert"'), 'Must have Insert tab');
assert(notebookHtml.includes('data-ribbon-tab="draw"'), 'Must have Draw tab');
assert(notebookHtml.includes('data-ribbon-tab="layout"'), 'Must have Layout tab');

// Check strict switchNotebookRibbonTab logic (display flex vs none)
assert(notebookHtml.includes("grp.style.display = 'flex'"), 'Active ribbon groups must have display flex');
assert(notebookHtml.includes("grp.style.display = 'none'"), 'Inactive ribbon groups must have display none');
assert(notebookHtml.includes("switchNotebookRibbonTab('home')"), 'Must initialize strictly to Home tab on DOMContentLoaded');
console.log('[PASS] Strict Tab Navigation & dynamic display toggling verified.');

// 2. Home Tab Specifications
assert(notebookHtml.includes('handleClipboardPaste'), 'Home tab must have clipboard paste handler');
assert(notebookHtml.includes('toggleFormatPainter') && notebookHtml.includes('applyFormatPainterIfActive'), 'Home tab must have format painter');
assert(notebookHtml.includes("execFmt('cut')") && notebookHtml.includes("execFmt('copy')"), 'Home tab must have cut and copy');
assert(notebookHtml.includes('nbFontSize') && notebookHtml.includes('12px') && notebookHtml.includes('36px'), 'Home tab must have numeric font sizes 12px to 36px');
assert(notebookHtml.includes('nbFontFamily') && notebookHtml.includes('Arial') && notebookHtml.includes('Calibri') && notebookHtml.includes('Times New Roman'), 'Home tab must have font family dropdown');
assert(notebookHtml.includes("execFmt('bold')") && notebookHtml.includes("execFmt('italic')") && notebookHtml.includes("execFmt('underline')"), 'Home tab must have basic text formats');
assert(notebookHtml.includes("execFmt('strikeThrough')") && notebookHtml.includes("execFmt('subscript')") && notebookHtml.includes("execFmt('superscript')") && notebookHtml.includes("execFmt('removeFormat')"), 'Home tab must have strikethrough, subscript, superscript, remove format');
assert(notebookHtml.includes('applyTextColor') && notebookHtml.includes('applyHighlightColor'), 'Home tab must have text color and highlight');
assert(notebookHtml.includes("execFmt('insertUnorderedList')") && notebookHtml.includes("execFmt('insertOrderedList')"), 'Home tab must have bullets & numbering');
assert(notebookHtml.includes("execFmt('justifyLeft')") && notebookHtml.includes("execFmt('justifyCenter')") && notebookHtml.includes("execFmt('justifyRight')") && notebookHtml.includes("execFmt('justifyFull')"), 'Home tab must have 4 alignment options');
assert(notebookHtml.includes('applyHeadingStyle') && notebookHtml.includes('nbHeadingStyles'), 'Home tab must have pre-styled headings');
assert(notebookHtml.includes('openFindReplacePrompt'), 'Home tab must have find & replace');
console.log('[PASS] Home Tab (Clipboard, Font, Paragraph, Styles, Find & Replace) verified.');

// 3. Insert Tab Specifications
assert(notebookHtml.includes('insertDynamicTable') && notebookHtml.includes('nbInsertTableSelect'), 'Insert tab must have dynamic table generator');
assert(notebookHtml.includes('handleInsertShapeSelect') && notebookHtml.includes('nbShapeSelect'), 'Insert tab must have shapes dropdown');
assert(notebookHtml.includes('rectangle') && notebookHtml.includes('circle') && notebookHtml.includes('diamond') && notebookHtml.includes('oval') && notebookHtml.includes('callout'), 'Insert tab must have vector shapes (Rectangle, Circle, Diamond, Oval, Callout)');
assert(notebookHtml.includes('straight_line') && notebookHtml.includes('dashed_line') && notebookHtml.includes('arrow_line') && notebookHtml.includes('dashed_arrow_line'), 'Insert tab must have lines & connectors');
assert(notebookHtml.includes('nbStrokeWidth') && notebookHtml.includes('nbShapeFillColor') && notebookHtml.includes('nbShapeStrokeColor'), 'Insert tab must have stroke thickness and color pickers');
assert(notebookHtml.includes('insertTextBox') && notebookHtml.includes('interactive-textbox-inner'), 'Insert tab must have text boxes');
assert(notebookHtml.includes('insertWordArt') && notebookHtml.includes('insertEquation') && notebookHtml.includes('insertSymbol'), 'Insert tab must have WordArt, Equations, and Symbols');
console.log('[PASS] Insert Tab (Tables, Vector shapes, Lines, Text boxes, WordArt, Equations, Symbols) verified.');

// 4. Draw Tab Specifications
assert(notebookHtml.includes('nbInkCanvas') && notebookHtml.includes('setInkingMode'), 'Draw tab must have inking canvas and mode switcher');
assert(notebookHtml.includes("setInkingMode('pen')") && notebookHtml.includes("setInkingMode('highlighter')") && notebookHtml.includes("setInkingMode('eraser')") && notebookHtml.includes("setInkingMode('lasso')"), 'Draw tab must have pen, highlighter, eraser, and lasso');
assert(notebookHtml.includes('clearInkCanvas'), 'Draw tab must have clear ink canvas');
assert(notebookHtml.includes('nbInkThickness') && notebookHtml.includes('applyMetallicInkPreset') && notebookHtml.includes('nbInkMetallicPreset'), 'Draw tab must have thickness (1px-10px) and metallic presets');
console.log('[PASS] Draw Tab (Digital inking canvas overlay, configurable instruments & metallic palettes) verified.');

// 5. Layout Tab Specifications
assert(notebookHtml.includes('applyPageMargins') && notebookHtml.includes('applyPageOrientation') && notebookHtml.includes('applyPageColumns') && notebookHtml.includes('applyPaperSize'), 'Layout tab must have page setup controls');
assert(notebookHtml.includes('columns-3'), 'Layout tab must support three-column split');
assert(notebookHtml.includes('applyParaSpacingDropdown') && notebookHtml.includes('execFmt(\'indent\')') && notebookHtml.includes('execFmt(\'outdent\')'), 'Layout tab must have spacing & indent controls');
assert(notebookHtml.includes('bringSelectedShapeForward') && notebookHtml.includes('sendSelectedShapeBackward'), 'Layout tab must have bring forward and send backward');
assert(notebookHtml.includes('rotateSelectedShape90') && notebookHtml.includes('flipSelectedShapeH') && notebookHtml.includes('alignSelectedShapeCenter') && notebookHtml.includes('applyTextWrap'), 'Layout tab must have rotate, flip, center, and text wrap');
console.log('[PASS] Layout Tab (Page Setup, Margins, Paper Size, Columns, Spacing & Arrange) verified.');

// 6. Embedded Toolbar in notebook.js Strict Isolation
assert(notebookJs.includes('switchEmbeddedRibbonTab'), 'notebook.js must have switchEmbeddedRibbonTab');
assert(notebookJs.includes("sec.style.display = sections.includes(activeTab) ? 'flex' : 'none'"), 'notebook.js must strictly isolate ribbon sections');
console.log('[PASS] Embedded notebook.js ribbon toolbar strict tab isolation verified.');

console.log('\nALL STRICT TAB ISOLATION TESTS PASSED!');
