# Notebook Module: Document Imports & Table Styles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement client-side `.pdf` and `.docx` document imports across Shared Notebook and Private Notes, and build a Microsoft Word-style contextual "Table Design" ribbon tab with presets (Default Grid, Striped Rows, Header Accent, Borderless), dynamic cell padding, border/shading pickers, and row/column operations.

**Architecture:** 
- Client-side ingestion using `mammoth.browser.min.js` for `.docx` and `pdf.min.js` for `.pdf` to convert uploaded documents directly into HTML and populate the editable canvas without server bottlenecks.
- Full ribbon integration in `public/notebook.html` with a contextual `Table Design` tab (`data-ribbon-tab="table-design"`) that activates automatically when the user's cursor or selection enters any `<td>` or `<th>` element within `.nb-table-resizer`.
- Embedded toolbar alignment in `public/js/notebook.js` and `public/dashboard.html` for both Shared and Private Quick Capture.
- Preset CSS classes (`.table-preset-default-grid`, `.table-preset-striped`, `.table-preset-header-accent`, `.table-preset-borderless`) with full light/dark mode theme harmony.

**Tech Stack:** Vanilla JavaScript (ES6+), Mammoth.js (CDN browser build), PDF.js (CDN browser build), Express.js backend, HTML5 contenteditable, CSS3 custom properties.

**Spec:** Phase 3 Requirements: Document Import System (.docx, .pdf) & Table Styling System (Contextual Word-style Ribbon Tab).

---

## Global Constraints
- Must support both Shared Notebook (`isPersonalMode = false`) and Private Notes (`isPersonalMode = true`).
- Minimum touch target size: 44px × 44px for standalone touch buttons; toolbar buttons must have at least 32px height with minimum 11px font size floor.
- Clean color token harmony for both light (`:root`) and dark mode (`html.dark`).
- Impeccable Design Quality: 0 anti-patterns on `detect public/notebook.html public/dashboard.html public/css/style.css`.
- Exact final commit message specified: `"feat: move profile settings to homespace, hide invite code discretely, add discussion file viewing, pdf/docx imports, and notebook table styles"`.

## Review Focus
1. Uploading a `.docx` file containing bold text, headings, and tables must preserve structure when converted into `#nbPageContent`.
2. Uploading a multi-page `.pdf` file must extract all pages and join text paragraphs into clean `<p>` tags without crashing or dropping text.
3. Clicking inside a table cell must immediately light up the "Table Design" ribbon tab and switch to it; clicking outside the table switches back to "Home".
4. Applying a table preset (e.g., "Striped Rows") must update the selected table's classes and trigger auto-save.
5. Dynamic padding, border color, and background shading controls must apply directly to the active table or selected cells.

---

### Task 1: Client-Side Parsing Libraries & Document Import System
**Files:**
- Modify: `public/notebook.html`
- Modify: `public/dashboard.html`
- Modify: `public/js/dashboard.js`
- Create: `tests/test-notebook-document-imports.js`

**Steps:**
- [ ] Add `mammoth.browser.min.js` and `pdf.min.js` script tags to `public/notebook.html` and `public/dashboard.html`.
- [ ] Update `#nbFileInput`, `#dashboardImportFileInput`, and `#personalImportFileInput` accept attributes to: `.docx,.pdf,.txt,.md,.markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,text/markdown`.
- [ ] Implement `parseUploadedDocument(file)` helper function supporting `.docx` via `mammoth.convertToHtml` and `.pdf` via `pdfjsLib.getDocument`.
- [ ] Update `handleImportFile(event)` in `public/notebook.html` to invoke `parseUploadedDocument` and populate `#nbPageContent`.
- [ ] Update `handleDashboardImportDocument(event)` and `handlePersonalImportDocument(event)` in `public/js/dashboard.js` to parse `.docx` and `.pdf` files.
- [ ] Create and run `tests/test-notebook-document-imports.js` to verify file parsing, DOM acceptance, and fallback behaviors.

---

### Task 2: Contextual "Table Design" Ribbon Tab & Controls
**Files:**
- Modify: `public/notebook.html`
- Modify: `public/css/style.css`
- Modify: `public/js/notebook.js`

**Steps:**
- [ ] Add contextual ribbon tab button `<button type="button" class="nb-ribbon-tab contextual-tab" id="nbTabTableDesign" data-ribbon-tab="table-design" style="display:none;" onclick="switchNotebookRibbonTab('table-design')">Table Design</button>` in `public/notebook.html`.
- [ ] Add the `Table Design` ribbon toolbar group container with:
  - Table Preset Dropdown: Default Grid, Striped Rows, Header Accent, Borderless
  - Cell Padding Dropdown: Compact (6px), Standard (10px), Relaxed (16px)
  - Border Color picker (`#nbTableBorderColor`)
  - Shading Color picker (`#nbTableShadingColor`)
  - Row & Column action buttons: + Row Above, + Row Below, + Col Left, + Col Right, Delete Row, Delete Col, Delete Table
- [ ] Add event listeners on `#nbPageContent` (`selectionchange`, `click`, `keyup`) detecting when cursor is inside `TABLE`, `TD`, or `TH`.
- [ ] Implement table manipulation functions: `applyTablePreset(preset)`, `applyTableCellPadding(size)`, `applyTableBorderColor(color)`, `applyTableCellShading(color)`, `insertTableRow(position)`, `insertTableColumn(position)`, `deleteCurrentTableRow()`, `deleteCurrentTableColumn()`, `deleteActiveTable()`.

---

### Task 3: Table Styling CSS & Impeccable Motion Polish
**Files:**
- Modify: `public/css/style.css`
- Modify: `public/notebook.html`

**Steps:**
- [ ] Add CSS classes for table presets:
  - `.table-preset-default-grid`: uniform 1px `#cbd5e1` / `#334155` borders, clean header bg.
  - `.table-preset-striped`: alternating `tbody tr:nth-child(even)` background `#f8fafc` / `#1e293b`.
  - `.table-preset-header-accent`: header row bg `var(--primary, #2563eb)` with white text and crisp borders.
  - `.table-preset-borderless`: no border lines, generous padding, clean white/dark card look.
- [ ] Add contextual tab indicator styling: distinct badge accent (`#3b82f6` border-bottom/background) so users immediately recognize it as a contextual tool.
- [ ] Add smooth CSS transition for ribbon tabs and controls.
- [ ] Run Impeccable design quality check (`impeccable detect`) to ensure 0 anti-patterns and WCAG AA compliance.

---

### Task 4: Comprehensive Verification & Git Commit/Push
**Files:**
- Modify: `tests/test-localhost.js`
- Execute terminal tests and verification commands.

**Steps:**
- [ ] Register new import and table style tests in `tests/test-localhost.js`.
- [ ] Run `node tests/test-localhost.js` to verify all 14 test suites and localhost integrity.
- [ ] Execute `git add .`.
- [ ] Execute `git commit -m "feat: move profile settings to homespace, hide invite code discretely, add discussion file viewing, pdf/docx imports, and notebook table styles"`.
- [ ] Execute `git push origin main`.

