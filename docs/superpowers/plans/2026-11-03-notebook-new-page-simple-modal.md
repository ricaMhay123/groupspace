# Notebook New Page Simple Pop-up Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cluttered "New Page" creation form in the Notebook with a sleek, simple pop-up modal containing only a document title input and three actions: Save, Open in Full Editor, or Cancel (with top-right ✕ close), implemented consistently across the Dashboard Notebook tab and the standalone Notebook editor.

**Architecture:** 
1. In `public/dashboard.html` & `public/js/dashboard.js`: Simplify `#createNoteModal` to only request the document title. Add distinct action handlers for `Save` (creates note in database and keeps user in dashboard notebook view) and `Open in Full Editor` (creates note and immediately redirects to `notebook.html?groupId=...&noteId=...`).
2. In `public/notebook.html`: Introduce `#nbNewPageModal` triggered by `+ New Document` / `+ New Blank Document` / `+Doc`. Provide title input and options to `Save` (direct database save and sidebar addition), `Open in Full Editor` (sets title, clears canvas, and focuses rich-text editor for immediate writing), and `Cancel` / top-right ✕ close.
3. In `public/css/style.css`: Add styling for modal action buttons, clean spacing, and dark/light mode polish.
4. In `tests/test-notebook-new-page-modal.js` & `tests/test-localhost.js`: Verify presence of modal elements, action buttons, syntax, and zero Impeccable Design Quality anti-patterns.

**Tech Stack:** HTML5, CSS3, JavaScript (ES6+), Node.js, Express, Neon PostgreSQL.

---

## Global Constraints

- Preserve all existing tests and zero anti-patterns in Impeccable Design Quality detector.
- Do NOT break existing hidden fields (`#noteFolderSelect`, etc.) so active folder filtering continues to work seamlessly.
- Responsive layout support: buttons must stack cleanly on mobile screen widths without overflowing.
- Both Light and Dark theme harmony.

---

### Task 1: Simplify `#createNoteModal` in `public/dashboard.html` & `public/js/dashboard.js`

**Files:**
- Modify: `public/dashboard.html:528-572`
- Modify: `public/js/dashboard.js:2266-2320`

- [ ] **Step 1.1**: In `public/dashboard.html`, streamline `#createNoteModal`:
  - Retain `modal-header` with title `New Document` and `✕` close button (`onclick="closeModal('createNoteModal')"`).
  - Include `#noteTitle` input field with clean label "Document Title" and autofocus.
  - Retain hidden `<input type="hidden" id="noteFolderSelect">` or invisible fallback so active folder targeting remains functional.
  - Add action buttons:
    - `Cancel` button (`onclick="closeModal('createNoteModal')"`)
    - `Save` button (`id="savePageBtn"`, class `btn-outline`) with `onclick="handleCreateNoteChoice('save', event)"`
    - `Open in Full Editor` button (`id="openInFullEditorBtn"`, class `btn-green`) with `onclick="handleCreateNoteChoice('open', event)"`
- [ ] **Step 1.2**: In `public/js/dashboard.js`:
  - Implement `handleCreateNoteChoice(choice, event)` supporting:
    - `choice === 'save'`: sends `POST /api/groups/:groupId/notes`, refreshes notebook list via `loadNotebook()`, shows success toast, and closes modal without redirecting.
    - `choice === 'open'`: sends `POST /api/groups/:groupId/notes`, closes modal, and navigates to `/notebook.html?groupId=${currentGroupId}&noteId=${newNoteId}`.
  - Update `handleCreateNote(e)` to default to 'open' if form is submitted via Enter key.

---

### Task 2: Implement Simple `#nbNewPageModal` in `public/notebook.html`

**Files:**
- Modify: `public/notebook.html:1500-1550`, `2863-2875`

- [ ] **Step 2.1**: In `public/notebook.html`, add modal `#nbNewPageModal`:
  - Header: `New Document` with `✕` close button (`onclick="closeModal('nbNewPageModal')"`)
  - Body: Form `#nbNewPageForm` with single input `#nbNewPageTitleInput` ("Document Title") and placeholder "e.g. Project Architecture Overview".
  - Actions:
    - `Cancel` button (`onclick="closeModal('nbNewPageModal')"`)
    - `Save` button (`id="nbSaveNewPageDirectBtn"`, class `btn-nb btn-nb-outline`): saves note directly to server via `apiFetch` with blank content, updates sidebar, and highlights the note.
    - `Open in Full Editor` button (`id="nbOpenFullEditorNewPageBtn"`, class `btn-nb btn-nb-primary`): sets `#nbPageTitle` to the entered title, clears canvas, focuses canvas editor, and closes modal.
- [ ] **Step 2.2**: Update `newPage(folderId)` in `public/notebook.html`:
  - Instead of immediately clearing the canvas without user prompt, opens `#nbNewPageModal`, clears `#nbNewPageTitleInput`, stores `pendingNewPageFolderId = folderId`, and focuses the input.

---

### Task 3: CSS Polish in `public/css/style.css`

**Files:**
- Modify: `public/css/style.css`

- [ ] **Step 3.1**: Add CSS rules for `.modal-actions-choice` ensuring buttons have proper gap, responsive flex-wrap, hover transitions, and clean dark/light styling.

---

### Task 4: Test Suite & Verification

**Files:**
- Create: `tests/test-notebook-new-page-modal.js`
- Modify: `tests/test-localhost.js`

- [ ] **Step 4.1**: Create `tests/test-notebook-new-page-modal.js` asserting:
  - `dashboard.html` has `#createNoteModal` with `#noteTitle`, `#savePageBtn`, `#openInFullEditorBtn`, and `closeModal('createNoteModal')`.
  - `dashboard.js` implements `handleCreateNoteChoice`.
  - `notebook.html` has `#nbNewPageModal` with `#nbNewPageTitleInput`, `#nbSaveNewPageDirectBtn`, `#nbOpenFullEditorNewPageBtn`, and close button.
  - `notebook.html` `newPage()` triggers `#nbNewPageModal`.
- [ ] **Step 4.2**: Register `test-notebook-new-page-modal.js` in `tests/test-localhost.js`.
- [ ] **Step 4.3**: Run `node tests/test-notebook-new-page-modal.js` and verify passing.
- [ ] **Step 4.4**: Run `node tests/test-localhost.js` and verify all test suites and Impeccable Design Quality pass.
- [ ] **Step 4.5**: Commit and push to `main`.

