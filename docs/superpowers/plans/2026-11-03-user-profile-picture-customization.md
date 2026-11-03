# User Profile Picture Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to upload and customize a profile picture (photo upload or image URL) in addition to colors and status messages, with live preview, persistent storage in Neon PostgreSQL, and avatar rendering across the workspaces header and dashboard sidebar.

**Architecture:** Extend `users` table with `avatar_url TEXT`; update `auth.service.js` and `auth.controller.js` to serialize and persist `avatarUrl`; add file upload input (`FileReader` base64 with auto-compression) and image URL input in `#userProfileModal` on both `workspaces.html` and `dashboard.html`; render `avatarUrl` inside `#profileAvatarPreview`, `#userAvatarBadge`, and `#sidebarUserAvatar` with fallback to initials/color.

**Tech Stack:** Node.js, Express, Neon PostgreSQL, HTML5 File API (`FileReader`), CSS3.

## Global Constraints

- Do NOT break existing tests in `tests/test-user-profile-modal.js` or `tests/test-localhost.js` (maintain all 42 passed test suites).
- Support image file upload (PNG, JPEG, WebP, GIF) via client-side `FileReader.readAsDataURL` and image URL input.
- Maintain existing avatar accent color swatches as border/background fallback when no picture is present or when a picture is removed.
- Provide a clean "Remove Photo" button so users can easily toggle between picture and initials avatar.
- 0 Impeccable Design Quality anti-patterns.

---

### Task 1: Database Migration & Backend Auth API (`db.config.js`, `auth.service.js`, `auth.controller.js`)

**Files:**
- Modify: `src/config/db.config.js:31-33`, `323-325`
- Modify: `src/modules/auth/auth.service.js:260-270`, `302-355`
- Modify: `src/modules/auth/auth.controller.js:249-265`
- Test: `tests/test-user-profile-modal.js`

- [ ] **Step 1.1**: Add `avatar_url TEXT DEFAULT ''` to `CREATE TABLE IF NOT EXISTS users` and migration `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT ''` in `src/config/db.config.js`.
- [ ] **Step 1.2**: Update `auth.service.js` `getUserProfile(userId)` to select `avatar_url` and return `avatarUrl: user.avatar_url || ''`.
- [ ] **Step 1.3**: Update `auth.service.js` `updateUserProfile(userId, { fullName, avatarColor, statusMessage, avatarUrl })` to update `avatar_url` and return `avatarUrl` in updated user record.
- [ ] **Step 1.4**: Update `auth.service.js` `loginUser` to return `avatarUrl: user.avatar_url || ''`.
- [ ] **Step 1.5**: Update `auth.controller.js` `updateMe` to receive `avatarUrl` from `req.body` and pass it to `authService.updateUserProfile`.

---

### Task 2: Frontend Profile Picture Customization UI in `workspaces.html`

**Files:**
- Modify: `public/workspaces.html:130-150`, `200-300`
- Test: `tests/test-user-profile-modal.js`

- [ ] **Step 2.1**: In `#userProfileModal` inside `workspaces.html`:
  - Add `#profilePictureInput` (`<input type="file" id="profilePictureInput" accept="image/*">`)
  - Add "Upload Photo" button `<label for="profilePictureInput" class="btn-outline">📷 Upload Photo</label>`
  - Add `#removeProfilePicBtn` button to remove picture and revert to color initials
  - Add optional `#profilePictureUrlInput` for pasting direct image URLs
- [ ] **Step 2.2**: Update `#profileAvatarPreview` to render the uploaded picture image when present (`<img id="profileAvatarImg">`) or text initials when not.
- [ ] **Step 2.3**: Update `updateHeaderUserBadge(user)` in `workspaces.html` to render user photo in `#userAvatarBadge` when `user.avatarUrl` is set.
- [ ] **Step 2.4**: Implement `handleProfilePictureSelected(event)`, `handleProfilePictureUrl(url)`, and `removeProfilePicture()` in `workspaces.html` client scripts.
- [ ] **Step 2.5**: Update `handleSaveUserProfile()` to send `avatarUrl` in `PUT /api/auth/me`.

---

### Task 3: Frontend Profile Picture Customization UI in `dashboard.html` & `dashboard.js`

**Files:**
- Modify: `public/dashboard.html:965-985`
- Modify: `public/js/dashboard.js:872-892`, `4777-4880`
- Test: `tests/test-user-profile-modal.js`

- [ ] **Step 3.1**: In `#userProfileModal` inside `public/dashboard.html`:
  - Mirror the profile picture upload button, URL input, and remove photo button.
- [ ] **Step 3.2**: In `public/js/dashboard.js`:
  - Implement `handleProfilePictureSelected(event)`, `handleProfilePictureUrl(url)`, and `removeProfilePicture()`.
  - Update `openUserProfileModal()` to initialize `currentAvatarUrl = currentUser.avatarUrl || ''` and update preview.
  - Update `updateProfileAvatarPreview()` to show image or initials.
  - Update `updateSidebarProfileCard()` in `public/js/dashboard.js` to render `<img src="${currentUser.avatarUrl}">` in `#sidebarUserAvatar` when set, while preserving `avatarEl.style.backgroundColor = currentUser.avatarColor`.
  - Update `handleSaveUserProfile()` to include `avatarUrl` in the `PUT /api/auth/me` payload.

---

### Task 4: CSS Polish & Styling in `public/css/style.css`

**Files:**
- Modify: `public/css/style.css`
- Test: `tests/test-localhost.js`

- [ ] **Step 4.1**: Add CSS styles for `.profile-avatar-preview-img`, `.profile-photo-actions`, and `.avatar-badge-img` to ensure smooth circular cropping (`object-fit: cover; border-radius: 50%`) with gentle hover scale and dark mode border styling.

---

### Task 5: Extend Test Suite & Verify Localhost

**Files:**
- Modify: `tests/test-user-profile-modal.js`
- Test: `node tests/test-user-profile-modal.js`
- Test: `node tests/test-localhost.js`

- [ ] **Step 5.1**: Add assertions in `tests/test-user-profile-modal.js` verifying:
  - `avatar_url` in `db.config.js` table creation and migration.
  - `avatarUrl` in `auth.service.js` `getUserProfile()` and `updateUserProfile()`.
  - `#profilePictureInput` and picture controls in `workspaces.html` and `dashboard.html`.
  - Image avatar handling in `dashboard.js` and `workspaces.html`.
- [ ] **Step 5.2**: Run `node tests/test-user-profile-modal.js` and verify passing.
- [ ] **Step 5.3**: Run `node tests/test-localhost.js` and verify all 42 suites pass.
- [ ] **Step 5.4**: Git commit and push to `main`.

