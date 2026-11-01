# Direct Messaging Drawer (Persistent 1-on-1 PMs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a persistent global slide-out 1-on-1 direct messaging drawer in GroupSpace with PostgreSQL on Neon storage, Express backend endpoints, personal feed notifications, quick PM triggers across teammate chips, and an Impeccable design-reviewed interface.

**Architecture:** 
- Neon PostgreSQL `direct_messages` table with cascade deletions, foreign keys, and indexes for conversation lookups.
- Express feature module in `src/modules/messages/` (`model`, `service`, `controller`, `routes`) mounted at `/api/groups/:groupId/messages` and guarded by `authMiddleware` and `requireGroupMembership`.
- Vanilla JS slide-out drawer (`#dmDrawer`) with two states: Workspace Teammates List (with online presence and unread counts) and Active 1-on-1 Chat Thread (with auto-scroll and optimistic messaging).
- Quick PM integration hooking teammate avatars and member chips across the Homespace roster, Kanban cards, and Discussion comments.

**Tech Stack:** Express.js, PostgreSQL (Neon `@neondatabase/serverless`), Vanilla JavaScript (ES6+), CSS3 with light/dark mode CSS custom properties.

**Spec:** Phase: Global Slide-Out Direct Messaging Drawer (Persistent 1-on-1 PMs).

---

## Global Constraints
- All backend routes must strictly verify group membership for both sender and recipient in active `groupId`.
- Drawer width: `340px` (or `100vw` on mobile screens `<= 480px`).
- Z-Index: `1100` for drawer, `1099` for backdrop overlay.
- Minimum touch target: 44px × 44px on standalone interactive buttons.
- Minimum font size: 11px.
- Zero anti-patterns on Impeccable design detector (`impeccable detect`).
- Commit message: `"feat: implement persistent global slide-out direct messaging drawer"`.

## Review Focus
1. Non-members of a workspace group cannot access or send messages in that group.
2. Opening a chat thread with `otherUserId` automatically marks all unread incoming messages from that user as read and decrements the header badge.
3. Sending a direct message creates an entry in `direct_messages` and generates a `personal_feed` notification for the recipient.
4. Clicking any teammate avatar in Homespace roster, Kanban cards, or Discussion threads instantly opens the DM drawer in View 2 focused on that user.
5. Online/offline presence indicators correctly display green/gray dots with high contrast against both light and dark card backgrounds.

---

### Task 1: Database Schema & Backend Message Module
**Files:**
- Modify: `src/config/db.config.js`
- Create: `src/modules/messages/message.model.js`
- Create: `src/modules/messages/message.service.js`
- Create: `src/modules/messages/message.controller.js`
- Create: `src/modules/messages/message.routes.js`
- Modify: `src/app.js`
- Create: `tests/test-direct-messaging-drawer.js`

**Steps:**
- [ ] Add `direct_messages` table and performance indexes to `src/config/db.config.js` `initDb()`.
- [ ] Implement `message.model.js` with SQL queries for `createDirectMessage`, `getConversationMessages`, `markMessagesAsRead`, and `getWorkspaceConversations`.
- [ ] Implement `message.service.js` with membership validation, `personal_feed` notification emission, and message formatting.
- [ ] Implement `message.controller.js` and `message.routes.js` exposing `GET /conversations`, `GET /direct/:otherUserId`, and `POST /direct`.
- [ ] Mount message routes in `src/app.js` under `/api/groups/:groupId/messages`.
- [ ] Write failing test in `tests/test-direct-messaging-drawer.js` verifying schema, routes, and membership isolation.

---

### Task 2: Slide-Out Drawer Markup & Header Trigger
**Files:**
- Modify: `public/dashboard.html`
- Modify: `public/css/style.css`

**Steps:**
- [ ] Add `#dmDrawerBtn` with `💬` chat icon and `#dmUnreadBadge` next to `#notificationFeedBtn` in `public/dashboard.html`.
- [ ] Add `#dmDrawerOverlay` and `#dmDrawer` markup in `public/dashboard.html` containing View 1 (Teammates Directory) and View 2 (Active Chat Thread).
- [ ] Add CSS styling in `public/css/style.css` for `#dmDrawer` (`position: fixed; right: 0; top: 0; width: 340px; height: 100vh; transform: translateX(100%); transition: transform 0.3s ease; z-index: 1100;`).
- [ ] Style chat bubbles (`.dm-bubble.sent`, `.dm-bubble.received`), online presence dots (`.dm-presence-dot.online`, `.dm-presence-dot.offline`), and unread count badges.

---

### Task 3: Frontend Controller Logic & Quick PM Hooks
**Files:**
- Modify: `public/js/dashboard.js`
- Modify: `public/js/tasks.js`

**Steps:**
- [ ] Implement `toggleDmDrawer(forceState)`, `loadDmConversations()`, `openDirectMessageDrawer(otherUserId, otherUserName)`, `loadDmThread(otherUserId)`, and `sendDirectMessage(event)` in `public/js/dashboard.js`.
- [ ] Add auto-scroll to bottom on thread load and message delivery.
- [ ] Hook teammate quick PM actions:
  - Homespace Roster: add message action / clickable avatar to each member item.
  - Kanban Cards: clicking assignee name/chip triggers `openDirectMessageDrawer`.
  - Discussion Comments: clicking author avatar/name triggers `openDirectMessageDrawer`.
- [ ] Add polling interval to refresh conversation unread count and active chat thread when drawer is open.

---

### Task 4: Impeccable Design Quality Audit & Polish
**Files:**
- Modify: `public/css/style.css`
- Modify: `public/dashboard.html`

**Steps:**
- [ ] Run Impeccable detector check (`.agents\skills\impeccable\scripts\impeccable.cmd detect public\dashboard.html public\css\style.css --no-advisory`).
- [ ] Verify drawer list item padding (no cramped padding), online status badge alignment, and accessible focus states.
- [ ] Verify light and dark mode contrast for message bubbles and typography.

---

### Task 5: Comprehensive Verification & Git Commit/Push
**Files:**
- Modify: `tests/test-localhost.js`
- Execute terminal tests and verification commands.

**Steps:**
- [ ] Register `tests/test-direct-messaging-drawer.js` in `tests/test-localhost.js`.
- [ ] Run `node tests/test-localhost.js` and verify all 15 test suites and server health checks pass.
- [ ] Run `git add .`.
- [ ] Run `git commit -m "feat: implement persistent global slide-out direct messaging drawer"`.
- [ ] Run `git push origin main`.
