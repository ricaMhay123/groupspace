# Workspace-Scoped @Mentions & Notebook/Folder #Tagging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scope `@` mentions strictly to active workspace group members, enhance `#` autocomplete to suggest workspace Notebooks and Folders alongside tasks/topics, and render clickable chips that seamlessly navigate and filter the Notebook grid with card highlight pulse animations.

**Architecture:**
- Backend: Expose `GET /api/groups/:groupId/discussions/mentions/notebooks` and `/folders` in the discussion module, verifying workspace isolation via `group_id = ${groupId}` and `COALESCE(is_private, FALSE) = FALSE`. Ensure member mentions query only `group_members`.
- Frontend: Bind autocomplete to discussion inputs (`#newCommentInput` and `#topicTitle`), fetch and display Notebooks and Folders in the `#` autocomplete dropdown, and format `#Notebook: Spec` and `#Folder: Assets` as interactive clickable chips.
- Seamless Navigation: Clicking `#Notebook: ...` switches to the Notebook tab, filters notes, and triggers `.card-highlight-pulse`; clicking `#Folder: ...` switches to the Notebook tab and triggers `filterDashboardNotesByFolder(folderId)`.

**Tech Stack:** Express.js, PostgreSQL (Neon `@neondatabase/serverless`), Vanilla JavaScript (ES6+), CSS3 keyframe animations.

**Spec:** Task: Workspace-Scoped @Mentions and Notebook/Folder #Tagging in Discussions (Option A: Seamless Tab & Filter Navigation).

---

## Global Constraints
- Mentions must strictly be isolated to the active workspace (`groupId`). Members, notebooks, folders, and tasks from other workspaces MUST NOT appear.
- Retain existing board task tagging (`#123` / `#[Task: ...]`).
- Touch target minimum: >= 44px for clickable elements.
- Text contrast: WCAG AA (>= 4.5:1).
- 0 anti-patterns on Impeccable detector.

## Review Focus
1. An enrolled user from Workspace A must never appear in the `@` mention dropdown of Workspace B.
2. Typing `#` in a discussion reply displays active Notebook titles and Folder names belonging to `groupId`.
3. Clicking a `#Notebook: Title` chip switches to `#tab-notebook`, populates the search bar, filters the grid, and pulses the matching note card.
4. Clicking a `#Folder: FolderName` chip switches to `#tab-notebook` and activates `filterDashboardNotesByFolder`.
5. Autocomplete functions cleanly in both `#newCommentInput` and `#topicTitle`.

---

### Task 1: Backend Notebook & Folder Mentions Endpoints
**Files:**
- Modify: `src/modules/discussions/discussion.model.js`
- Modify: `src/modules/discussions/discussion.service.js`
- Modify: `src/modules/discussions/discussion.controller.js`
- Modify: `src/modules/discussions/discussion.routes.js`
- Create: `tests/test-workspace-mentions-notebook-tagging.js`

**Steps:**
- [ ] Add `findMentionableNotebooks(groupId, q)` and `findMentionableFolders(groupId, q)` to `discussion.model.js`.
- [ ] Add `getMentionableNotebooks` and `getMentionableFolders` in `discussion.service.js` and `discussion.controller.js`.
- [ ] Expose `GET /mentions/notebooks` and `GET /mentions/folders` in `discussion.routes.js`.
- [ ] Create failing test in `tests/test-workspace-mentions-notebook-tagging.js` verifying the new routes and workspace scoping.

---

### Task 2: Autocomplete Menu Enhancement for # (Notebooks, Folders & Tasks)
**Files:**
- Modify: `public/js/discussions.js`
- Modify: `public/js/dashboard.js`

**Steps:**
- [ ] Update `fetchSuggestions` in `public/js/discussions.js` to query `/mentions/notebooks` and `/mentions/folders` in addition to topics and tasks when trigger is `#`.
- [ ] Enhance `renderDropdown` to render Notebook and Folder suggestion items with distinct avatars and category tags.
- [ ] Update `applySuggestion` to format notebook tags as `#[Notebook: ${item.name}] ` and folder tags as `#[Folder: ${item.name}] `.
- [ ] Ensure `setupMentionInput` attaches mention listeners to both `#newCommentInput` and `#topicTitle`.
- [ ] Expose `window.dashboardNotebookFolders` in `public/js/dashboard.js`.

---

### Task 3: Clickable Tag Rendering & Seamless Tab Navigation
**Files:**
- Modify: `public/js/discussions.js`
- Modify: `public/css/style.css`

**Steps:**
- [ ] Update `highlightMentions(text)` in `public/js/discussions.js` to replace `#[Notebook: ...]` and `#[Folder: ...]` patterns with clickable chip spans.
- [ ] Implement `window.handleNotebookTagClick(title)` and `window.handleFolderTagClick(folderName)`.
- [ ] Implement `window.handleTaskTagClick(taskRef)`.
- [ ] Add CSS styling in `public/css/style.css` for `.notebook-mention-pill`, `.folder-mention-pill`, `.clickable-tag`, and `@keyframes cardHighlightPulse`.

---

### Task 4: Verification, Impeccable Audit & Integration
**Files:**
- Modify: `tests/test-localhost.js`

**Steps:**
- [ ] Run `node tests/test-workspace-mentions-notebook-tagging.js`.
- [ ] Add `tests/test-workspace-mentions-notebook-tagging.js` to `tests/test-localhost.js` (suite 17).
- [ ] Run `.agents\skills\impeccable\scripts\impeccable.cmd detect public\dashboard.html public\css\style.css --no-advisory`.
- [ ] Run `node tests/test-localhost.js` (verifying all 17 feature test suites pass).
- [ ] Execute `git add .`, `git commit -m "feat: implement workspace-scoped mentions and notebook/folder tagging with seamless filter navigation"`, and `git push origin main`.
