# Homespace Settings & Discrete Invite Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up floating profile status cards, persistent theme toggles, sign-out buttons, and header invite codes from global surfaces, consolidating them into an expandable "Workspace Settings & Controls" drawer inside Homespace with discrete masked invite code display and a subtle Danger Zone footer for account deletion.

**Architecture:** 
1. Remove `.profile-card`, dark mode toggle, and sign-out button from the global left sidebar in `public/dashboard.html`. Remove `#joinCodeBadge` from the top header `.dashboard-header-actions`.
2. Add an expandable accordion drawer (`#homespaceSettingsAccordion`) to Homespace (`#tab-overview`) in `public/js/dashboard.js`, featuring an accessible smooth-collapsible panel containing User Profile (Name, Email, Role, Online Status), Theme Toggle, Sign Out, Workspace Settings (with masked Invite Code and Show/Copy toggles), and a Danger Zone footer triggering the existing 2x Password Verification modal (`#deleteAccountModal`).
3. Add fluid CSS transitions, rotating chevrons, and design system token skinning in `public/css/style.css`.
4. Add automated test suite `tests/test-homespace-settings-drawer.js` and run regression checks.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5, CSS3 with CSS Custom Properties, Express.js backend.

**Spec:** User request for "PHASE 1: HOMESPACE SETTINGS & DISCRETE INVITE CODE PLACEMENT (Option B: Expandable drawer/accordion panel)".

## Global Constraints
- Sidebar must contain only GroupSpace branding, workspace selector, and tab navigation links.
- No invite code badges in main top headers, general sidebars, or project page bars.
- Masked invite code in Homespace Settings must show `••••••••` by default with a low-profile toggle to reveal and copy.
- Account deletion must trigger the existing 2x Password Verification modal (`#deleteAccountModal`).
- Minimum 44px touch targets on mobile/desktop interactive buttons.
- Minimum 11px font size across all microcopy and badges (Craft floor compliance).

## Review Focus
- Null pointer safety: Ensure `dashboard.js` handles cases where legacy element IDs (`userFullName`, `userAvatar`, `joinCodeBadge`, `displayJoinCode`) are moved.
- State persistence: Drawer toggle open/closed state should be fluid and keyboard accessible (`aria-expanded`, `Enter`/`Space`).
- Dark mode harmony: Drawer styling must use `var(--card)`, `var(--border)`, `var(--foreground)`, and `var(--secondary)`.
- 2x Password Modal integrity: `public/js/account.js` hooks must work seamlessly when triggered from the new Danger Zone button.

---

### Task 1: Clean Up Floating Sidebar Profile, Theme Toggle, Sign Out, and Header Invite Code

**Files:**
- Modify: `public/dashboard.html` (lines 58-75, 90-95)
- Modify: `public/js/dashboard.js` (lines 20-25, 78, 166-170, 194-200)
- Test: `tests/test-homespace-settings-drawer.js`

- [ ] Remove `.profile-card`, `[data-theme-toggle]`, and `logoutUser()` button from sidebar in `public/dashboard.html`.
- [ ] Remove `#joinCodeBadge` from `.dashboard-header-actions` in `public/dashboard.html`.
- [ ] Add null-guards in `public/js/dashboard.js` for `userFullName`, `userAvatar`, `joinCodeBadge`, and `displayJoinCode` so startup code runs safely without errors.
- [ ] Verify sidebar and header are clean and minimal.

---

### Task 2: Build Expandable Homespace Settings & Controls Drawer in `dashboard.js`

**Files:**
- Modify: `public/js/dashboard.js`
- Test: `tests/test-homespace-settings-drawer.js`

- [ ] Create `renderHomespaceSettingsDrawer(isLeader, isCoLeader, currentGroupDetails, currentUser)` helper in `public/js/dashboard.js`.
- [ ] Incorporate User Profile details: Avatar with initials, Full Name, Email, Role badge, and "Online" status pill.
- [ ] Incorporate Controls: Dark Mode Toggle button (calling existing `toggleTheme()`) and Sign Out button (calling `logoutUser()`).
- [ ] Incorporate Discrete Invite Code Widget:
  - Masked invite code display (`<span id="hsMaskedInviteCode">••••••••</span>`).
  - "Show Code" toggle button that switches between `••••••••` and actual `join_code`.
  - "Copy" button that copies the invite code to clipboard with toast notification.
  - If leader: include "Reset Code" button.
- [ ] Incorporate Workspace Constraints & Name editing (if leader).
- [ ] Incorporate Discrete "Danger Zone" footer:
  - Low-profile danger zone banner with explanation.
  - "Delete Account" button triggering `openDeleteAccountModal()`.
- [ ] Mount the accordion drawer below the KPI cards or triage grid in `renderLeaderHomespace` and `renderMemberHomespace`.
- [ ] Implement `toggleHomespaceSettingsDrawer()` handler with animated height transition and `aria-expanded` synchronization.

---

### Task 3: CSS Styles, Smooth Transitions, and Impeccable Polish

**Files:**
- Modify: `public/css/style.css`
- Test: `tests/test-homespace-settings-drawer.js`

- [ ] Add `.homespace-settings-accordion` container styling using `var(--card)` and `var(--border)`.
- [ ] Add `.hs-accordion-header` with subtle hover feedback and rotating chevron indicator (`transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)`).
- [ ] Add `.hs-accordion-content` with smooth max-height / opacity expansion animation.
- [ ] Style the masked invite code pill, toggle button, and copy action with design system tokens.
- [ ] Style the subtle Danger Zone footer with light red border and high-contrast accessible button.
- [ ] Ensure mobile responsive padding and 44px minimum touch targets.

---

### Task 4: Automated Verification and Pre-Push Localhost Test Suite

**Files:**
- Create: `tests/test-homespace-settings-drawer.js`
- Modify: `tests/test-localhost.js`
- Test: Run `node tests/test-homespace-settings-drawer.js` and `node tests/test-localhost.js`

- [ ] Create test verifying removal of floating sidebar profile, dark mode, sign out, and header invite code.
- [ ] Create test verifying the existence, structure, and functions of `#homespaceSettingsAccordion`.
- [ ] Create test verifying masked invite code and 2x password verification modal trigger.
- [ ] Run test suite and confirm 100% pass rate.

