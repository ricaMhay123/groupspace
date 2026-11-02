# Extended Desk Collage Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the GroupSpace landing page (`public/index.html` and `public/css/landing.css`) into a tactile Extended Desk Collage stationery experience featuring blue graph grid paper, red notebook margin guide, hand-sketched blue annotations, 3 physical paper showcase cards (with binder holes, paperclips, washi tape, and torn edges), a wooden clipboard collaboration workflow, and a paper receipt expense demo—all without altering backend routes or existing event listeners.

**Architecture:** Vanilla HTML5 semantic layout styled through dedicated, modular stationery rules in `public/css/landing.css` and `public/css/style.css`. Pure procedural CSS gradients and lightweight inline SVGs generate graph paper lines, binder cutouts, paperclips, washi tape overlays, and hand-drawn ink markings with `pointer-events: none` safety.

**Tech Stack:** Vanilla HTML5, CSS3 (CSS Gradients, Masking, Transitions, CSS Variables), ES6 JavaScript, Inline SVG.

**Spec:** `docs/superpowers/specs/2026-11-03-extended-desk-collage-landing-page-design.md`

## Global Constraints
- Purely frontend modifications: Zero changes to backend Express API routes, Neon PostgreSQL database schemas, or auth controllers in `src/`.
- Zero new npm or client-side runtime dependencies.
- Header design excludes Mac window dots, dev file label (`PROJECT_NOTES_2026.RAW`), and toggle switch, preserving clean GroupSpace logo branding and `#themeToggle`.
- All decorative pseudo-elements, tape strips, and paperclip overlays must enforce `pointer-events: none !important;` so all buttons and links remain 100% interactive.
- All functional and body text must satisfy WCAG AA contrast (≥ 4.5:1) and minimum 11px font floor.
- Impeccable Design Quality detector must pass with 0 anti-patterns (no zero-offset colored glows, no thick borders on rounded elements).
- Full localhost test suite (`node tests/test-localhost.js`) must pass 100%.

## Review Focus
1. **Interactive Clickability Under Overlays**: Ensure washi tape and paperclip decorations never intercept clicks on the "Start Brainstorming", "Sign In", "Get Started", or `#themeToggle` buttons.
2. **Mobile Viewport Responsiveness**: Ensure paper cards and clipboard containers stack gracefully on viewports under 768px without horizontal overflow.
3. **Dark Mode Harmonization**: Verify graph paper and paper cards switch smoothly to dark slate stationery (`#0f172a` / `#1e293b`) when `#themeToggle` is clicked.
4. **Static Asset Integrity**: Ensure `tests/test-localhost.js` probe for `GET /` continues to return 200 OK and contains `'GroupSpace'`.
5. **Detector Compliance**: Ensure torn bottom edges and shadows use pure gradients and elevation shadows rather than zero-offset chromatic glows or thick one-sided borders on rounded corners.

---

### Task 1: Create Automated Verification Test Suite for the Extended Desk Collage
**Files:**
- Create: `tests/test-extended-desk-collage-landing.js`
- Modify: `tests/test-localhost.js`

- [ ] **Step 1: Write the test suite**
  Create `tests/test-extended-desk-collage-landing.js` checking:
  1. `public/index.html` contains the red notebook margin guide (`red-margin-guide` or `notebook-margin-line`).
  2. Hand-sketched blue annotations exist (`sketch-arrow`, `sketch-loop`, or `sketch-annotation`).
  3. All 3 showcase paper cards exist (`NOTE_CARD_01`, `CARD_02`, `CARD_03` with binder holes, paperclips, washi tape, and torn bottom edges).
  4. Extended desk sections exist (wooden clipboard workflow, collage memo board, and receipt expense demo).
  5. Header preserves GroupSpace logo and `#themeToggle` while omitting Mac window dots and raw file labels.
  6. `public/css/landing.css` defines graph paper background (`#fcfbf7` and `repeating-linear-gradient`), alternating paper rotations (`-1.2deg`, `+1.2deg`), and `pointer-events: none` on overlays.
  7. Dark mode rules exist in `public/css/landing.css`.
- [ ] **Step 2: Run test suite to verify initial failure**
  Run `node tests/test-extended-desk-collage-landing.js` and verify it detects missing elements.
- [ ] **Step 3: Register test suite in `tests/test-localhost.js`**
  Add `tests/test-extended-desk-collage-landing.js` to the pre-push test suites array in `tests/test-localhost.js`.
- [ ] **Step 4: Commit test infrastructure**
  Stage and commit with message: `test(landing): add automated verification suite for extended desk collage overhaul`.

---

### Task 2: Build Clean Stationery Header and Red Margin Layout
**Files:**
- Modify: `public/index.html`
- Modify: `public/css/landing.css`
- Test: `tests/test-extended-desk-collage-landing.js`

- [ ] **Step 1: Update header markup in `public/index.html`**
  - Retain GroupSpace brand logo (`👥 GroupSpace`), navigation links (`Features`, `How It Works`), `#themeToggle` (with sun and moon SVGs), and action links (`Sign in`, `Get Started` button).
  - Wrap the landing page body/canvas in the notebook paper container featuring the continuous red vertical notebook margin line.
- [ ] **Step 2: Style header & paper canvas in `public/css/landing.css`**
  - Set page background to `#fcfbf7` with subtle repeating blue graph grid pattern (`repeating-linear-gradient`).
  - Style the header as an authentic stationery top bar with clean border divider and subtle shadow.
  - Position the red margin guide line (`border-left: 2px solid rgba(239, 68, 68, 0.4)`).
  - Add dark mode support for `#0f172a` slate paper and sky-blue grid lines.
- [ ] **Step 3: Run verification tests**
  Run `node tests/test-extended-desk-collage-landing.js` to verify header and margin tests pass.
- [ ] **Step 4: Commit header and canvas layout**
  Stage and commit with message: `feat(landing): implement clean stationery header and notebook margin layout`.

---

### Task 3: Build Papercraft Hero Section with Hand-Sketched Annotations
**Files:**
- Modify: `public/index.html`
- Modify: `public/css/landing.css`
- Test: `tests/test-extended-desk-collage-landing.js`

- [ ] **Step 1: Implement hero markup and sketched SVGs in `public/index.html`**
  - Add the 3 blue downward sketched ink arrows (`.sketch-arrow`) pointing toward the headline.
  - Add the blue hand-drawn sketched elliptical loop (`.sketch-loop`) encircling `Craft Creative Ideas`.
  - Add the hero headline: `Craft Creative Ideas` with subtext and tactile action buttons:
    * Primary: `Start Brainstorming →` linking to `/register.html`.
    * Secondary: `📄 View Samples` linking smoothly to `#samples` / desk showcase.
- [ ] **Step 2: Style hero section and annotations in `public/css/landing.css`**
  - Position sketched arrows and elliptical loop with `pointer-events: none !important;` so CTA buttons underneath remain fully clickable.
  - Style primary button with rich blue fill (`#2563eb`), hover lift, and elevation shadow.
  - Style secondary button as an off-white paper card pill.
- [ ] **Step 3: Run verification tests**
  Run `node tests/test-extended-desk-collage-landing.js`.
- [ ] **Step 4: Commit hero and annotations**
  Stage and commit with message: `feat(landing): implement papercraft hero with hand-sketched ink annotations`.

---

### Task 4: Build the 3 Paper Showcase Cards
**Files:**
- Modify: `public/index.html`
- Modify: `public/css/landing.css`
- Test: `tests/test-extended-desk-collage-landing.js`

- [ ] **Step 1: Markup the 3 paper cards in `public/index.html`**
  - **Card 1 (`NOTE_CARD_01`)**:
    * Silver paperclip icon at upper right (`.card-paperclip`).
    * 3 round punched binder holes along left margin (`.binder-hole`).
    * `Priority!` blue cursive script badge.
    * Headline: `Tactile Document UI`.
    * Copy describing MS Word-style editor, flowchart vector shapes, and digital inking.
    * Footer: `Updated 2h ago` and `Design System` pill.
    * Bottom edge: Jagged torn/perforated zigzag pattern (`.paper-torn-bottom`).
  - **Card 2 (`CARD_02`)**:
    * Translucent beige washi tape strip at top center (`.washi-tape-strip`).
    * `Organized` ochre cursive script badge.
    * Headline: `Task & Approval Flow`.
    * Copy describing dual-approval Kanban board and leader verification.
    * Insert: Yellow post-it sticky note (`.post-it-note`) with handwritten cursive note.
    * Footer: `Drafted Notes` and `Kanban Board` pill.
    * Bottom edge: Jagged torn/perforated zigzag pattern.
  - **Card 3 (`CARD_03`)**:
    * Silver paperclip icon at upper left (`.card-paperclip`).
    * `✓ Ready` emerald cursive script badge.
    * Headline: `Zero Bloat & Net Ledger`.
    * Copy describing zero-dependency speed, isolated personal space, and debt settlement.
    * Insert: Dark code terminal block (`.dark-code-snippet`) showing debt simplification.
    * Footer: `Standalone File` and `Net Split` pill.
    * Bottom edge: Jagged torn/perforated zigzag pattern.
- [ ] **Step 2: Style cards, alternating rotations, and hover dynamics in `public/css/landing.css`**
  - Apply physical paper texture, layered box-shadows (`2px 8px 20px rgba(0,0,0,0.06)`), and alternating rotations (`-1.2deg`, `+1.2deg`, `-0.8deg`).
  - Add smooth hover transitions flattening to `0deg` and lifting with deeper shadow (`2px 14px 28px rgba(0,0,0,0.1)`).
  - Implement the perforated zigzag bottom edge using standard CSS linear-gradient zigzags.
  - Set `pointer-events: none` on paperclip and tape overlays.
- [ ] **Step 3: Run verification tests**
  Run `node tests/test-extended-desk-collage-landing.js`.
- [ ] **Step 4: Commit 3 paper showcase cards**
  Stage and commit with message: `feat(landing): implement 3 tactile paper showcase cards with clips and torn edges`.

---

### Task 5: Build Extended Desk Sections (Clipboard Workflow, Collage Memo Board & Paper Receipt)
**Files:**
- Modify: `public/index.html`
- Modify: `public/css/landing.css`
- Test: `tests/test-extended-desk-collage-landing.js`

- [ ] **Step 1: Markup extended desk sections in `public/index.html`**
  - **Section 1: Wooden Clipboard Collaboration Workflow** (Image 1 reference):
    * Clipboard frame with top metallic clip clamp.
    * Paper pad showing the 3 collaboration phases (Drafting, Dual-Approval, Expense Settlement).
  - **Section 2: Collage Memo Board** (Image 2 reference):
    * Varied washi-taped memo notes: kraft cardboard note (Isolated Personal Space), pale yellow sticky (Direct Messaging & Presence), pink memo (Team Calendar & Deadlines).
  - **Section 3: Interactive Paper Receipt** (Shared Expense Net Split):
    * Paper receipt slip with jagged tear edges detailing debt simplification from 12 messy transactions into 3 clean payments.
  - **Stationery Footer**:
    * Left: Blue dot + `Hand-crafted Grid Canvas System`.
    * Right: `Tip: Hover over paper cards to inspect paper depth!`.
    * Clean navigation & legal links.
- [ ] **Step 2: Style extended desk sections in `public/css/landing.css`**
  - Implement realistic wooden texture / warm kraft tones for the clipboard and memos.
  - Style receipt typography with monospace tabular figures and dashed dividers.
  - Ensure full Dark Mode harmony across all memo types.
- [ ] **Step 3: Run verification tests**
  Run `node tests/test-extended-desk-collage-landing.js`.
- [ ] **Step 4: Commit extended desk sections**
  Stage and commit with message: `feat(landing): implement clipboard workflow, collage memo board, and receipt demo`.

---

### Task 6: Full Verification, Detector Audit, and Git Push
**Files:**
- Test: `tests/test-localhost.js`
- Test: `tests/test-extended-desk-collage-landing.js`

- [ ] **Step 1: Run Impeccable Design Quality detector**
  Run `.agents\skills\impeccable\scripts\impeccable.cmd detect public\index.html public\css\landing.css --no-advisory`.
  Confirm 0 anti-patterns found.
- [ ] **Step 2: Run full pre-push test harness**
  Run `node tests/test-localhost.js`.
  Confirm all 42 test suites pass.
- [ ] **Step 3: Verify clean git status and push to origin main**
  Stage all files, commit, and push to `origin main`.

