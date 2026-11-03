# Mobile View Responsive Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform GroupSpace's mobile web experience across viewports ≤768px and ≤480px into a thumb-friendly, visually polished, and WCAG AA-accessible layout while keeping desktop styles 100% untouched.

**Architecture:** Encapsulate all mobile styles strictly within `@media (max-width: 768px)`, `@media (max-width: 480px)`, and `@media (pointer: coarse)` blocks in `public/css/style.css`. Leverage iOS/Android safe area insets (`env(safe-area-inset-bottom)`), thumb-zone touch targets (minimum 44x44px), horizontally scrollable pill bars, and full-screen mobile chat and modal sheets.

**Tech Stack:** Vanilla HTML5, CSS3 Media Queries, CSS Flexbox/Grid, Vanilla ES6 JavaScript, Node.js test harness.

---

## Global Constraints

- **Desktop Invariant**: Zero CSS edits outside `@media (max-width: 768px)`, `@media (max-width: 480px)`, or `@media (pointer: coarse)`. Desktop styles and layout must remain 100% pixel-identical.
- **Touch Target Floor**: Every interactive button, close trigger, tab pill, input, and dropdown must have a minimum clickable area of 44×44px on coarse pointers per WCAG 2.5.5.
- **Viewport Boundary**: Zero horizontal page overflow (`overflow-x: hidden` on viewport roots, tables and ribbons encapsulated in smooth `-webkit-overflow-scrolling: touch` containers).
- **Safe Area Insets**: Floating action footers, mobile chat composers, and modals must include `padding-bottom: max(16px, env(safe-area-inset-bottom))` to avoid home indicator collision on modern phones.
- **Typography Floor**: Body and functional labels must stay ≥14px for effortless reading on small displays; metadata tags must stay ≥11px.

---

## Review Focus

1. **Horizontal Scroll Leakage**: Elements with negative margins, fixed pixel widths, or unconstrained flex rows causing horizontal page jitter on 360px–390px screens.
2. **Desktop Visual Regression**: Accidental leakage of mobile classes or overrides outside `@media` blocks altering desktop layout.
3. **Touch Target Overlap**: Tightly clustered buttons (e.g. table actions, tab icons) under 8px apart resulting in fat-finger misclicks.
4. **Virtual Keyboard Occlusion**: Fixed modals or bottom chat bars becoming pushed off-screen or hidden beneath the software keyboard on Android/iOS.
5. **Sticky Touch Hover States**: Desktop `:hover` effects sticking on mobile after a tap, requiring `@media (hover: hover)` encapsulation.

---

## Adaptation Audit Findings (from `/impeccable adapt mobile`)

### 1. Touch-Target Deficits (< 44px)
- **Modal Close Triggers**: `.modal-close` buttons in multiple modals measure 32×32px or 36×36px, below the 44px accessible touch floor.
- **Table Row Actions**: Expense edit/delete buttons, roster member removal buttons, and calendar nav buttons measure ~30–34px in height.
- **Category Filter Chips**: Calendar and expense chips measure ~32px in height with cramped tap boundaries.
- **Discussion Bubble Controls**: Reply, mention, and attachment download buttons lack generous tap padding.

### 2. Viewport & Padding Issues
- **Nested Card Gutter Squeeze**: On 360–390px screens, `padding: 24px` on `.dashboard-panel` combined with `14px` on `.dashboard-main` squeezes usable content width down to ~300px.
- **Header Stacking Crowding**: `.dashboard-header` on mobile stacks breadcrumbs, title, workspace picker, notification bell, and settings button into a tall, fragmented column.
- **FullCalendar 7-Column Grid**: 7 day columns on a 375px screen yield 45px per column, truncating event names into illegible dots. Needs default auto-switch or prominent List/Day view toggle on mobile.
- **Expense Table Layout**: Desktop tabular layout with 6 columns forces users to scroll horizontally back and forth to inspect expense details.

### 3. Navigation & Interaction Flow
- **Sidebar Drawer Dismissal**: The mobile drawer requires a tiny `✕` or tapping the darkened background; needs touch swipe-to-close or a large prominent close button.
- **Direct Messaging Drawer**: On mobile, takes 380px or partial width, leaving a sliver of dimmed background; on phones it should be a full-width, full-height native chat sheet.
- **Workspace Settings**: Needs full-width modal fitting (`width: calc(100vw - 20px)`) with checkbox rows having full-row tap zones.

---

## Tasks

### Task 1: Setup Isolated Git Worktree

**Files:**
- Worktree location: `.worktrees/mobile-view-optimization`
- Branch: `feat/mobile-view-optimization`

- [x] Run `git worktree add .worktrees/mobile-view-optimization -b feat/mobile-view-optimization`
- [x] Run baseline verification `node tests/test-localhost.js` inside worktree to confirm clean starting state
- [x] Verify `.worktrees/` is properly ignored in git

---

### Task 2: Mobile Navigation, Drawer & Top Bar Refinement

**Files:**
- Modify: `public/css/style.css` (inside `@media (max-width: 768px)`)
- Test: `tests/test-mobile-responsive.js`

- [x] Write tests in `tests/test-mobile-responsive.js` asserting mobile navigation items have `min-height: 44px`, sidebar close button has `min-width: 44px; min-height: 44px;`, and mobile header actions stack cleanly.
- [x] Enforce `min-height: 44px` on all mobile hamburger triggers (`.mobile-hamburger-btn`, `.hamburger-btn`), close triggers (`.mobile-sidebar-close-btn`), and notification bell.
- [x] Add touch active states (`:active { transform: scale(0.98); background: var(--secondary); }`) to sidebar navigation links for responsive tactile feedback.
- [x] Refine mobile `.dashboard-header` with a sleek 2-row layout: Row 1 = Hamburger + Active Workspace Pill; Row 2 = Page Title + Primary Action button.
- [x] Run `node tests/test-mobile-responsive.js` and verify passing status.

---

### Task 3: Homespace & Content Card Padding Optimization

**Files:**
- Modify: `public/css/style.css` (inside `@media (max-width: 768px)`)
- Test: `tests/test-mobile-responsive.js`

- [x] Write tests asserting `.dashboard-panel`, `.dashboard-card`, `.hs-drawer-card` enforce relaxed mobile padding (`padding: 16px 14px !important;`).
- [x] Update card container rules at `@media (max-width: 768px)` so padding drops from 24px/20px to 16px 14px, maximizing readable horizontal measure on 360px–390px screens.
- [x] Ensure Roster member rows stack cleanly on mobile: member avatar + name on left, role badge and remove button wrapped on right with ≥44px touch targets.
- [x] Add `overflow-x: clip;` to card containers so decorative push pins and washi tapes do not produce horizontal scroll leakage on narrow screens.
- [x] Run `node tests/test-mobile-responsive.js` and verify.

---

### Task 4: Kanban Tasks Board & Modal Dialog Touch Ergonomics

**Files:**
- Modify: `public/css/style.css` (inside `@media (max-width: 768px)`)
- Test: `tests/test-mobile-responsive.js`

- [x] Write tests asserting all modal close buttons (`.modal-close`) and modal submit buttons have `min-height: 44px` on mobile.
- [x] Set all modal close buttons on mobile to `min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;`.
- [x] Set `.modal-card` mobile width to `calc(100vw - 20px)` with `max-height: calc(100vh - 32px)` and internal scrollable body.
- [x] Ensure Kanban column headers have full-width touch drag/toggle indicators and card action buttons (Move, Done, Follow-up) maintain 44px touch area.
- [x] Run tests and verify.

---

### Task 5: Team Calendar & Filter Chip Horizontal Scroll

**Files:**
- Modify: `public/css/style.css` (inside `@media (max-width: 768px)`)
- Test: `tests/test-calendar-redesign.js`

- [x] Write assertions for mobile calendar view selectors and scrollable category ribbon.
- [x] Make category filter chips horizontally scrollable on mobile: `.cal-filter-bar { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }`.
- [x] Ensure view switcher buttons (`Month`, `Week`, `Day`, `List`) have `min-height: 44px; flex: 1;`.
- [x] On screens ≤600px, optimize day cell rendering and ensure list view displays event dots with generous touch rows.
- [x] Run `node tests/test-calendar-redesign.js` and `node tests/test-mobile-responsive.js`.

---

### Task 6: Direct Messaging Drawer & Mobile Full-Screen Chat

**Files:**
- Modify: `public/css/style.css` (inside `@media (max-width: 768px)`)
- Test: `tests/test-direct-messaging-drawer.js`

- [x] Write assertions verifying DM slide drawer expands to 100vw on mobile with safe-area bottom padding.
- [x] Set `.dm-drawer { width: 100vw !important; max-width: 100vw !important; right: -100vw !important; }` and `.dm-drawer.open { right: 0 !important; }`.
- [x] Add `padding-bottom: max(16px, env(safe-area-inset-bottom))` to the mobile chat input bar so the iOS home bar does not obscure input fields.
- [x] Ensure chat send button and attachment button have `min-width: 44px; min-height: 44px;`.
- [x] Run `node tests/test-direct-messaging-drawer.js`.

---

### Task 7: Full Localhost Verification & Desktop Invariant Audit

**Files:**
- Run: `tests/test-localhost.js` (44 test suites + Impeccable Design Quality detector)
- Compare: Desktop view styles in `public/css/style.css`

- [x] Run `git diff` against `main` to verify **ZERO lines outside `@media` blocks were changed**, strictly preserving desktop styling.
- [x] Run `node tests/test-localhost.js` to ensure all 44 test suites pass with 0 errors.
- [x] Run Impeccable Design Quality detector to ensure 0 anti-patterns and WCAG AA compliance.
- [x] Merge worktree branch to `main` and push to remote.

