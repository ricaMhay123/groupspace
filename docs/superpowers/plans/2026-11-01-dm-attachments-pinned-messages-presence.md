# DM Attachments, Pinned Messages in Chats/Threads & Accurate Presence Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement file attachments and preview lightbox in DMs, pinned messages with an expandable top banner tray across DMs and Discussion threads, and an accurate 2-minute activity heartbeat presence system.

**Architecture:** 
- Neon PostgreSQL migrations: add `attachments`, `is_pinned`, `pinned_at` to `direct_messages`; add `is_pinned`, `pinned_at` to `discussion_comments`; add `last_active_at` to `users`.
- Heartbeat system: `POST /api/auth/heartbeat` updates `last_active_at = NOW()`. Dynamic presence calculation (`NOW() - INTERVAL '2 minutes'`) replaces static status in group queries.
- Attachment system in DMs: file picker supporting images and documents, file staging preview, inline thumbnails hooking into Phase 2's `#attachmentLightboxModal`, and document download chips.
- Pinned messages system: expandable top banner tray pinned right beneath chat headers in both DMs (`#dmPinnedTray`) and Discussions (`#topicPinnedTray`), with pin/unpin toggles on individual message bubbles and comments.

**Tech Stack:** Express.js, PostgreSQL (Neon `@neondatabase/serverless`), Vanilla JavaScript (ES6+), CSS3 transitions.

**Spec:** Task: DM Attachments, Pinned Messages in Chats/Threads, and Accurate Online Presence.

---

## Global Constraints
- DM and thread queries must remain strictly scoped to active `groupId`.
- Online presence indicator: ● Green Dot if `last_active_at >= NOW() - INTERVAL '2 minutes'`, ○ Gray otherwise.
- Pinned message trays must be expandable beneath the header and not block message history or input bars.
- Image attachments in DMs must open within the existing keyboard-accessible `#attachmentLightboxModal`.
- Impeccable Design Quality: 0 anti-patterns on `detect public/dashboard.html public/css/style.css`.
- Final commit message: `"feat: implement DM attachments, pinned messages in chats and threads, and accurate online presence"`.

## Review Focus
1. An inactive user whose last activity was > 2 minutes ago must render with an offline indicator (`○`) across roster, DM list, and chat headers.
2. In DMs, selecting an image and document stages preview chips; sending persists metadata (`file_name`, `file_url`, `file_type`) in `direct_messages.attachments`.
3. Clicking an image attachment in a DM bubble opens `#attachmentLightboxModal` with full keyboard cycling and download support.
4. Pinning a message updates `is_pinned = TRUE`, reflects in the top banner tray immediately, and updates the tray count (`📌 N Pinned`).
5. In Discussion threads, comments can be pinned/unpinned by leaders or comment authors and appear in `#topicPinnedTray`.

---

### Task 1: Schema Migrations & Heartbeat Presence Backend
**Files:**
- Modify: `src/config/db.config.js`
- Modify: `src/modules/auth/auth.routes.js`
- Modify: `src/modules/auth/auth.controller.js`
- Modify: `src/modules/messages/message.model.js`
- Modify: `src/modules/discussions/discussion.model.js`
- Create: `tests/test-dm-attachments-pins-presence.js`

**Steps:**
- [ ] Add column migrations to `src/config/db.config.js`:
  - `users`: `last_active_at TIMESTAMPTZ DEFAULT NOW()`
  - `direct_messages`: `attachments JSONB DEFAULT '[]'::jsonb`, `is_pinned BOOLEAN DEFAULT FALSE`, `pinned_at TIMESTAMPTZ NULL`
  - `discussion_comments`: `is_pinned BOOLEAN DEFAULT FALSE`, `pinned_at TIMESTAMPTZ NULL`
- [ ] Implement `POST /api/auth/heartbeat` in `auth.controller.js` and `auth.routes.js`.
- [ ] Update SQL in `message.model.js` (`getWorkspaceConversations`) to calculate `status = CASE WHEN u.last_active_at >= NOW() - INTERVAL '2 minutes' THEN 'online' ELSE 'offline' END`.
- [ ] Write failing test in `tests/test-dm-attachments-pins-presence.js` verifying schema columns, heartbeat endpoint, and presence calculation.

---

### Task 2: Pinned Messages Backend Endpoints (DMs & Discussions)
**Files:**
- Modify: `src/modules/messages/message.model.js`
- Modify: `src/modules/messages/message.service.js`
- Modify: `src/modules/messages/message.controller.js`
- Modify: `src/modules/messages/message.routes.js`
- Modify: `src/modules/discussions/discussion.model.js`
- Modify: `src/modules/discussions/discussion.service.js`
- Modify: `src/modules/discussions/discussion.controller.js`
- Modify: `src/modules/discussions/discussion.routes.js`

**Steps:**
- [ ] Add `togglePinMessage(messageId, groupId, userId)` in `message.model.js` & `message.service.js`.
- [ ] Add `PUT /api/groups/:groupId/messages/:messageId/pin` in `message.routes.js`.
- [ ] Add `togglePinComment(commentId, discussionId, groupId, userId)` in `discussion.model.js` & `discussion.service.js`.
- [ ] Add `PUT /api/groups/:groupId/discussions/:topicId/comments/:commentId/pin` in `discussion.routes.js`.
- [ ] Support `attachments` array parameter in `messageService.sendDirectMessage`.

---

### Task 3: Frontend Pinned Banner Tray & Attachment Bar in DMs
**Files:**
- Modify: `public/dashboard.html`
- Modify: `public/css/style.css`
- Modify: `public/js/dashboard.js`

**Steps:**
- [ ] Add `#dmPinnedTray` right beneath `#dmThreadView` header in `public/dashboard.html`.
- [ ] Add 📎 attachment button, 📌 pinned tray toggle button, and `#dmFileInput` into `#dmMessageForm`.
- [ ] Add attachment staging chip container `#dmAttachmentStaging`.
- [ ] In `public/js/dashboard.js`:
  - Implement `handleDmFileSelection(event)` and `removeDmStagedAttachment(index)`.
  - Update `handleSendDirectMessage(event)` to send staged attachments.
  - Render attachments in DM bubbles (`renderAttachmentsHtml` with thumbnail lightbox click and doc chips).
  - Implement `toggleDmPinnedTray()`, `renderDmPinnedTray(messages)`, and `togglePinDmMessage(messageId)`.

---

### Task 4: Discussion Thread Pinned Banner & Client Heartbeat
**Files:**
- Modify: `public/dashboard.html`
- Modify: `public/js/dashboard.js`
- Modify: `public/js/app.js`

**Steps:**
- [ ] Add `#topicPinnedTray` beneath `#activeTopicMeta` in `#topicChatPanel`.
- [ ] In `public/js/dashboard.js`:
  - Render 📌 pin button on comments.
  - Implement `togglePinDiscussionComment(commentId)` and render pinned comments inside `#topicPinnedTray`.
- [ ] Implement client-side heartbeat loop in `public/js/dashboard.js` / `public/js/app.js` running every 60 seconds and on window focus.

---

### Task 5: Impeccable Design Quality & Pre-Push Verification
**Files:**
- Modify: `public/css/style.css`
- Modify: `tests/test-localhost.js`

**Steps:**
- [ ] Run Impeccable detector check (`.agents\skills\impeccable\scripts\impeccable.cmd detect public\dashboard.html public\css\style.css --no-advisory`).
- [ ] Verify banner tray transitions, spacing, touch targets (>= 44px), and font sizes (>= 11px).
- [ ] Add `tests/test-dm-attachments-pins-presence.js` to `tests/test-localhost.js`.
- [ ] Run `node tests/test-localhost.js` (all 16 suites passing).
- [ ] Execute `git add .`, `git commit -m "feat: implement DM attachments, pinned messages in chats and threads, and accurate online presence"`, and `git push origin main`.
