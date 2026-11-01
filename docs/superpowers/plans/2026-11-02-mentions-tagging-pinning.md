# Implementation Plan: Workspace-Scoped @Mentions, Notebook Page/Folder #Tagging & Restricted Discussion Pinning

## Context
In GroupSpace discussions, members can mention teammates and tag workspace resources (#tasks, #topics, #notebooks, #folders). We need to refine the `@` and `#` autocomplete experiences so that:
1. `@` mentions strictly query active workspace members enrolled in `group_members` for `groupId`.
2. `#` tagging categorizes notebook content into:
   - Category 1: `#NB Pages` (`notebook_pages` with `folder_id IS NULL`).
   - Category 2: `#NB Folders` (`notebook_folders` in `groupId`).
   Selecting a folder in the autocomplete menu drills into the folder to display its sub-pages, giving the user the choice to mention an individual sub-page (`#Page: Title`) or mention the entire folder (`#Folder: Name`).
3. Restrict post/comment pinning in discussions strictly to the Group Leader or the original Thread Creator, hiding/disabling the pin button for other members.

---

## Tasks & File Changes

### Task 1: Backend Model, Service, and Routes
- **File**: `src/modules/discussions/discussion.model.js`
  - Implement `findMentionablePages(groupId, q, folderId)` querying pages with `folder_id IS NULL` when folderId is null, or sub-pages of that folder when folderId is passed.
  - Implement `findPagesByFolder(groupId, folderId)` returning all pages inside `folderId`.
- **File**: `src/modules/discussions/discussion.service.js`
  - Add `getMentionablePages` and `getFolderPages`.
  - In `togglePinComment`, enforce that only `isLeader || isThreadCreator` can toggle pin status, throwing HTTP 403 otherwise.
- **File**: `src/modules/discussions/discussion.controller.js`
  - Expose `getMentionablePages` and `getMentionableFolderPages`.
- **File**: `src/modules/discussions/discussion.routes.js`
  - Add routes `GET /mentions/pages` and `GET /mentions/folders/:folderId/pages`.

### Task 2: Frontend Autocomplete & Folder Drill-down (`public/js/discussions.js`)
- Update `fetchSuggestions` for `#`:
  - Fetch `#NB Pages` (root pages with `folder_id IS NULL`) from `/api/groups/:groupId/discussions/mentions/pages`.
  - Fetch `#NB Folders` from `/api/groups/:groupId/discussions/mentions/folders`.
  - Retain tasks and topics.
- Implement Folder Sub-Page Drill-Down:
  - When clicking a folder in the autocomplete menu, fetch `/api/groups/:groupId/discussions/mentions/folders/:folderId/pages`.
  - Render sub-pages view:
    * Option 1: `📁 Mention entire folder: #[Folder: Name]`
    * Option 2+: `📄 #[Page: Title]` for each sub-page.
    * `← Back` button to return to root suggestions.
- Render Clickable Chips:
  - Parse `#[Page: ...]` and `#Page:...` into clickable `.page-mention-pill` chips invoking `window.handlePageTagClick`.
  - Support `#[Folder: ...]` and `#Folder:...` invoking `window.handleFolderTagClick`.
  - Define `window.handlePageTagClick` to switch to the Notebook tab and scroll/highlight the target page.

### Task 3: Pinning Restrictions (`public/js/dashboard.js`)
- In `selectTopic`, evaluate:
  - `const isLeader = currentGroupDetails && (currentGroupDetails.role === 'leader' || currentGroupDetails.role === 'co_leader');`
  - `const isThreadCreator = currentUser && (Number(topic.author_user_id) === Number(currentUser.id) || Number(topic.created_by) === Number(currentUser.id));`
  - `const canPin = Boolean(isLeader || isThreadCreator);`
- In `container.innerHTML = comments.map(...)`:
  - Hide or disable `.comment-pin-btn` when `!canPin`.
- In `renderTopicPinnedTray`:
  - Hide `.pinned-tray-item-unpin` when `!canPin`.
- In `togglePinDiscussionComment`:
  - Block unprivileged execution if `!canPin`.

### Task 4: Testing & Pre-Push Verification
- Create `tests/test-workspace-mentions-notebook-tagging-pinning.js`.
- Add to `tests/test-localhost.js` as test suite 21.
- Verify all tests pass (36 passed).
- Execute terminal git commands: `git add .`, `git commit -m "feat: implement workspace @mentions, notebook page/folder #tagging, and restrict discussion pinning to leader/creator"`, `git push origin main`.

