# Workspaces Directory Owned-First Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `workspaces.html` so users immediately see their own created workspaces on top of joined workspaces, with balanced horizontal header padding, clean single-click cards, copyable invite codes on owned spaces, and zero placeholder noise.

**Architecture:** All changes are frontend-only (`public/workspaces.html` and `public/css/style.css`). `loadWorkspaces()` partitions the `/api/groups` payload using pure JS helpers (`partitionWorkspaces`, `formatWorkspaceDescription`, `renderWorkspaceCard`, `copyWorkspaceCode`) into **Created by You** (`Number(ws.created_by) === Number(user.id)` with `ws.role === 'leader'` fallback) above **Joined Workspaces**, inside generously padded flex cards and responsive grids.

**Tech Stack:** Vanilla HTML/CSS/JS (`public/workspaces.html`, `public/css/style.css`), Node.js built-in `assert` + `vm` (`tests/test-workspaces-directory.js`, `tests/test-user-profile-modal.js`).

**Spec:** [docs/superpowers/specs/2026-11-27-workspaces-directory-design.md](file:///c:/Users/ricam/.gemini/antigravity/scratch/groupspace/docs/superpowers/specs/2026-11-27-workspaces-directory-design.md)

## Global Constraints

- Frontend-only scope: do not modify backend routes, controllers, or SQL queries (`GET /api/groups` already returns `g.created_by`, `gm.role`, `member_count`, and `pending_task_count`).
- Keep `#userProfileChip`, `#userProfileModal`, `#createModal`, `#joinModal`, dark mode rules, and `tests/test-user-profile-modal.js` intact and passing.
- Anti-AI-slop & spacing discipline: no colored border stripes on card edges, no nested bordered boxes inside cards, no `N/A` or `No description provided.` placeholders, and generous padding (`40px 28px 72px` desktop page container, `24px` card padding with `16px` footer breathing room, `24px 16px 48px` mobile page padding).

## Review Focus

- **Joined-only user (`created.length === 0, joined.length > 0`):** Omit the `Created by You` section cleanly so the page never shows an empty placeholder heading above `Joined Workspaces`.
- **Creator-only user (`created.length > 0, joined.length === 0`):** Omit `Joined Workspaces` completely rather than rendering an empty trailing section.
- **Legacy row with null/undefined `created_by`:** Fall back to `String(ws.role || '').toLowerCase() === 'leader'` in `partitionWorkspaces()` so older owned workspaces stay in `Created by You`.
- **Clicking `Copy` on an owned workspace invite code:** `copyWorkspaceCode(event, code)` must call `event.stopPropagation()` so clicking `Copy` copies the join code and shows toast feedback without triggering `selectWorkspace(ws.id)`.
- **Uneven or `"N/A"` descriptions:** `formatWorkspaceDescription()` returns `''` for empty or `"N/A"` strings and omits the `<p>` element, while `.workspace-card` (`display: flex; flex-direction: column; height: 100%;`) + `.workspace-card-footer` (`margin-top: auto;`) keep card bottom edges and padding aligned.

---

### Task 1: Header Bar Cleanup, Top Row Layout, and Padded Grid/Card CSS

**Files:**
- Modify: `public/workspaces.html:20-55`
- Modify: `public/css/style.css:350-465`, `public/css/style.css:2155-2164`, `public/css/style.css:2323-2330`
- Test: `tests/test-workspaces-directory.js`

**Interfaces:**
- Produces CSS hooks consumed by Task 2: `.workspace-header-bar`, `.workspace-section`, `.workspace-section-header`, `.workspace-section-title`, `.workspace-grid`, `.workspace-card`, `.workspace-card-top`, `.workspace-role-pill`, `.workspace-card-desc`, `.workspace-meta-line`, `.workspace-code-row`, `.btn-copy-code`, `.workspace-card-footer`, and `#workspaceGrid.workspace-sections`.

- [ ] **Step 1: Write failing structure and padding tests in `tests/test-workspaces-directory.js`**

```js
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const wsHtml = fs.readFileSync(path.join(__dirname, '../public/workspaces.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');

console.log('=== Testing Workspaces Directory Layout, Paddings & Grouping ===');

assert(!wsHtml.includes('<nav>\n    <a href="workspaces.html"'), 'Header removes redundant lone Workspaces nav pill');
assert(wsHtml.includes('class="workspace-header-bar"'), 'workspaces.html uses left-aligned .workspace-header-bar');
assert(wsHtml.includes('id="workspaceGrid"') && wsHtml.includes('class="workspace-sections"'), '#workspaceGrid mounts .workspace-sections');

['.workspace-header-bar', '.workspace-section', '.workspace-card-top', '.workspace-card-desc', '.workspace-meta-line', '.workspace-code-row', '.workspace-card-footer'].forEach(sel => {
  assert(styleCss.includes(sel), `style.css defines ${sel}`);
});
assert(styleCss.includes('.workspace-card') && styleCss.includes('display: flex;') && styleCss.includes('flex-direction: column;'), '.workspace-card uses flex column for even footers');
console.log('PASS: Task 1 header, layout, and padding selectors');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test-workspaces-directory.js`
Expected: FAIL (`AssertionError: Header removes redundant lone Workspaces nav pill`).

- [ ] **Step 3: Update header & directory container in `public/workspaces.html` and spacing CSS in `public/css/style.css`**

In `public/workspaces.html` (`L20-55`): remove the centered `<nav>...</nav>`, replace `.workspace-header` + `.workspace-actions` with `.workspace-header-bar` (title `Your Workspaces` + subtext on left, `Join with Code` + `+ Create Workspace` buttons inside `.workspace-actions` on right), and change `<div class="workspace-grid" id="workspaceGrid">` to `<div class="workspace-sections" id="workspaceGrid">`.

In `public/css/style.css` (`L350-465`, `L2155-2164`, `L2323-2330`):
- `.workspace-page { max-width: 1120px; margin: 0 auto; padding: 40px 28px 72px; }`
- `.workspace-header-bar { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }`
- `.workspace-section + .workspace-section { margin-top: 40px; }`
- `.workspace-section-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }`
- `.workspace-section-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }`
- `.workspace-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 24px; align-items: stretch; }`
- `.workspace-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; display: flex; flex-direction: column; height: 100%; cursor: pointer; transition: var(--transition); }`
- Comfortable vertical spacing inside cards: `.workspace-card-top` (`margin-bottom: 12px`), `.workspace-card h2` (`margin-bottom: 8px`), `.workspace-card-desc` (2-line clamp, `margin-bottom: 16px`), `.workspace-meta-line` (`margin-bottom: 14px`), `.workspace-code-row` (`padding: 8px 10px; border-radius: 8px; background: var(--muted); margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px;`), `.workspace-card-footer` (`margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: flex-end;`).
- Mobile `@media (max-width: 640px)`: `.workspace-page { padding: 24px 16px 48px; }`, `.workspace-header-bar { align-items: stretch; margin-bottom: 24px; padding-bottom: 20px; }`, `.workspace-card { padding: 20px; }`.
- Dark mode overrides: extend `.dark .workspace-*` for `.workspace-code-row`, `.workspace-role-pill`, and `.btn-copy-code`.

- [ ] **Step 4: Run test to verify Task 1 passes**

Run: `node tests/test-workspaces-directory.js`
Expected: `PASS: Task 1 header, layout, and padding selectors`.

- [ ] **Step 5: Commit Task 1**

```bash
git add public/workspaces.html public/css/style.css tests/test-workspaces-directory.js
git commit -m "Refactor workspaces header bar and padded directory styles"
```

---

### Task 2: Owned-First Partitioning, Clean Card Rendering & Copyable Invite Code

**Files:**
- Modify: `public/workspaces.html:404-455`
- Modify: `tests/test-workspaces-directory.js`

**Interfaces:**
- Consumes CSS classes from Task 1 and `/api/groups` payload (`id`, `name`, `description`, `category`, `role`, `created_by`, `member_count`, `pending_task_count`, `join_code`) + `user.id`.
- Produces testable functions in `public/workspaces.html` inline script: `partitionWorkspaces(groups, currentUserId)`, `formatWorkspaceDescription(rawDescription)`, `renderWorkspaceCard(ws, isOwned)`, `renderWorkspaceSectionsHtml(groups, user)`, `copyWorkspaceCode(event, joinCode)`.

- [ ] **Step 1: Add failing unit tests for partitioning, placeholders, invite visibility, and copy handler in `tests/test-workspaces-directory.js`**

Extract the helper functions from `public/workspaces.html`'s inline `<script>` inside `vm` (with stubbed `escapeHtml`, `localStorage`, `document`) and assert:
1. `partitionWorkspaces` places `Defense` (`member`, `created_by: 9`) into `joined` and `PT` / `Project Management` (`created_by: 1`) into `created`, even when `Defense` came first from `/api/groups`.
2. Legacy workspace with `created_by: null` and `role: 'leader'` is classified into `created`.
3. `formatWorkspaceDescription('N/A')`, `formatWorkspaceDescription('No description provided.')`, and `formatWorkspaceDescription('   ')` all return `''`.
4. `renderWorkspaceSectionsHtml(mixedGroups, { id: 1 })` renders `Created by You` before `Joined Workspaces`; renders only `Joined Workspaces` when `created.length === 0`; renders only `Created by You` when `joined.length === 0`.
5. `renderWorkspaceCard` for `isOwned = true` includes copy button (`copyWorkspaceCode(event, ...)`) with `join_code`, uses `Open →`, and omits `N/A`; for `isOwned = false` omits the invite code block.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test-workspaces-directory.js`
Expected: FAIL (`partitionWorkspaces is not defined`).

- [ ] **Step 3: Implement helpers and update `loadWorkspaces()` in `public/workspaces.html`**

Add:
- `partitionWorkspaces(groups, currentUserId)`: separates each item into `created` when `Number(ws.created_by) === Number(currentUserId)` or (`ws.created_by == null` and `String(ws.role || '').toLowerCase() === 'leader'`), else `joined`.
- `formatWorkspaceDescription(rawDesc)`: returns trimmed string unless empty or matching `/^(n\/a|none|no description provided\.?)$/i`, in which case `''`.
- `copyWorkspaceCode(event, code)`: calls `event.stopPropagation()`, copies via `navigator.clipboard.writeText(code)` (with silent DOM textarea fallback if unavailable), and calls `showToast('Invite code copied!', 'success')`.
- `renderWorkspaceCard(ws, isOwned)`: builds `.workspace-card` markup with top row (category + role pill), heading, optional `.workspace-card-desc`, single `.workspace-meta-line` (`X member(s) · Y pending`), conditional `.workspace-code-row` with `Copy` button when `isOwned`, and `.workspace-card-footer` with `<span class="workspace-open-cta">Open →</span>` (clicking card opens `selectWorkspace(ws.id)` without nested duplicate CTA navigation conflicts).
- `renderWorkspaceSectionsHtml(groups, user)`: renders `Created by You (N)` section first when non-empty and `Joined Workspaces (N)` section below when non-empty.
- `loadWorkspaces()` sets `container.innerHTML = renderWorkspaceSectionsHtml(res.data, user);`.

- [ ] **Step 4: Run test to verify Task 2 passes**

Run: `node tests/test-workspaces-directory.js`
Expected: All assertions PASS cleanly (`exit 0`).

- [ ] **Step 5: Commit Task 2**

```bash
git add public/workspaces.html tests/test-workspaces-directory.js
git commit -m "Prioritize created workspaces and streamline directory cards"
```

---

### Task 3: Regression & Responsive Verification

**Files:**
- Verify: `tests/test-workspaces-directory.js`, `tests/test-user-profile-modal.js`, `tests/test-mobile-responsive.js`, `tests/test-followup-and-theme-harmony.js`

- [ ] **Step 1: Run all workspace, profile modal, responsive, and theme regression suites**

```powershell
foreach ($t in @(
  'tests/test-workspaces-directory.js',
  'tests/test-user-profile-modal.js',
  'tests/test-mobile-responsive.js',
  'tests/test-followup-and-theme-harmony.js'
)) { node $t; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

Expected: All 4 suites exit `0` with zero failures.
