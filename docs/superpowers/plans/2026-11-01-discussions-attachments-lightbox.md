# Discussions Attachment System & Keyboard Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete file attachment viewing and download system for GroupSpace Discussions: interactive keyboard-accessible Lightbox for images (Escape, Left/Right cycling, download button, backdrop dismissal), downloadable badge chips for documents (.pdf, .docx, .txt), attachment rendering on both topics and comment threads, and backend API normalization and workspace isolation.

**Architecture:** 
1. Backend: Update `src/modules/discussions/discussion.service.js` to normalize attachment metadata (`file_name`, `file_url`, `file_type`) on `getGroupTopics` and `getTopicDetails`. Enforce active workspace membership check (`requireGroupMembership`).
2. Frontend: Update `public/js/dashboard.js` to provide `openAttachmentLightbox`, `closeAttachmentLightbox`, `prevLightboxImage`, and `nextLightboxImage` with full keyboard listeners (`Escape`, `ArrowLeft`, `ArrowRight`). Fix `selectTopic` topic-level attachment loading.
3. Lightbox & Document Badges: In `public/dashboard.html` and `public/js/dashboard.js`, render image thumbnails with lightbox triggers and documents as downloadable badge chips with explicit `<a href="..." target="_blank" download>`.
4. CSS & Polish: In `public/css/style.css`, style the lightbox overlay with smooth backdrop blur, fluid image scaling, 44px touch targets, and high-contrast focus-visible rings.
5. Automated Verification: Build `tests/test-discussions-attachments.js` testing backend endpoints, authorization, and frontend DOM/script hooks.

**Tech Stack:** Express.js, PostgreSQL (Neon), Vanilla JavaScript, CSS3 with CSS Custom Properties.

**Spec:** Phase 2 Discussions Module user request (Attachment viewing & downloads, keyboard-accessible lightbox, document download badges, API metadata guarantee).

## Global Constraints
- Images (.png, .jpg, .jpeg, .gif, .webp) must trigger the keyboard-accessible lightbox modal.
- Documents (.pdf, .docx, .txt, etc.) must render as downloadable badge chips with explicit `target="_blank"` and `download` attributes.
- Keyboard navigation must support: `Escape` (close), `ArrowLeft` (previous image in thread), and `ArrowRight` (next image in thread).
- Focus states must be prominent (`focus-visible: 2px solid var(--primary)`).
- All touch targets on lightbox controls must satisfy the 44px minimum touch height.
- All microcopy must satisfy the 11px font size floor.

## Review Focus
- Null/empty attachment safety: Ensure discussion topics and comments with empty or malformed `attachments` don't throw errors.
- Image cycling boundaries: Ensure cycling wraps or disables correctly when only one image is in the thread.
- Memory/listener leaks: Ensure lightbox keydown listener is only active while the lightbox modal is open.
- Dark mode compatibility: Ensure lightbox controls and document badge chips maintain WCAG AA contrast across themes.

---

### Task 1: Backend API Attachment Normalization & Workspace Guard

**Files:**
- Modify: `src/modules/discussions/discussion.service.js`
- Test: `tests/test-discussions-attachments.js`

- [ ] Add `normalizeAttachments(attachments)` helper to sanitize and guarantee `{ file_name, file_url, file_type }`.
- [ ] Apply normalization to `getGroupTopics` so topic attachments are returned consistently.
- [ ] Apply normalization to `getTopicDetails` so both topic attachments and each comment's attachments are formatted.
- [ ] Ensure `createTopic` and `postComment` persist valid attachment objects.
- [ ] Verify `requireGroupMembership` protects `/api/groups/:groupId/discussions` endpoints from non-members.

---

### Task 2: Frontend Lightbox Modal & Discussion Attachment Rendering

**Files:**
- Modify: `public/dashboard.html` (mount `#attachmentLightboxModal`)
- Modify: `public/js/dashboard.js` (`renderAttachmentsHtml`, `selectTopic`, and Lightbox controller)
- Test: `tests/test-discussions-attachments.js`

- [ ] Add `#attachmentLightboxModal` markup to `public/dashboard.html` with image viewport, header, close button, download button, and left/right arrows.
- [ ] Implement `openAttachmentLightbox(imageUrl, fileName, index, threadImages)` in `public/js/dashboard.js`.
- [ ] Implement keyboard navigation (`Escape`, `ArrowLeft`, `ArrowRight`) attached when open and cleaned up on close.
- [ ] Implement `nextLightboxImage()` and `prevLightboxImage()` with counter indicator (e.g. `2 of 4`).
- [ ] Update `renderAttachmentsHtml(attachments, threadContextId)`:
  - Image attachments: render as thumbnails with `onclick="openAttachmentLightbox(...)"`.
  - Document attachments: render as `<a href="..." target="_blank" download="..." class="attachment-doc-badge">`.
- [ ] Fix `selectTopic` in `public/js/dashboard.js` (`res.data.topic || res.data`) so topic-level attachments render.

---

### Task 3: CSS Styles, Backdrop Animation, and Impeccable Polish

**Files:**
- Modify: `public/css/style.css`
- Test: `tests/test-discussions-attachments.js`

- [ ] Add `.lightbox-modal-overlay` with `backdrop-filter: blur(8px)` and smooth fade-in.
- [ ] Add `.lightbox-modal-card`, `.lightbox-image-wrapper`, `.lightbox-image`, and responsive sizing.
- [ ] Add `.lightbox-nav-btn` for previous/next arrows with 44px touch targets and accessible hover/focus states.
- [ ] Style `.attachment-doc-badge` using design system tokens (`var(--secondary)`, `var(--border)`, `var(--foreground)`).
- [ ] Ensure high-contrast visible focus rings on all keyboard-navigable elements.

---

### Task 4: Automated Verification Suite

**Files:**
- Create: `tests/test-discussions-attachments.js`
- Modify: `tests/test-localhost.js`
- Test: Run `node tests/test-discussions-attachments.js`

- [ ] Create test verifying backend `normalizeAttachments` returns expected properties.
- [ ] Create test verifying non-members receive 403 Forbidden.
- [ ] Create test verifying Lightbox modal elements and keyboard navigation handlers.
- [ ] Create test verifying document badge chips have `download` and `target="_blank"` attributes.
- [ ] Run full test suite and confirm 100% pass rate.
