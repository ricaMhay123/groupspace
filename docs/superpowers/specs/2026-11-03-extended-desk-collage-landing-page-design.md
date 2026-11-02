# Extended Desk Collage Landing Page Design Specification

## Overview & Intent
Transform the GroupSpace landing page (`public/index.html` and `public/css/landing.css`) into an authentic, tactile **Extended Desk Collage** stationery experience based on the user-approved reference mock and visual assets (clipboard frame, washi-taped memo notes, blue graph paper grid, hand-sketched ink annotations, and torn-edge cards).

The goal is to give GroupSpace a unique, warm, student-and-team friendly craft personality while strictly preserving backend stability, authentication routes, and all existing features.

---

## Goals, Non-Goals, and Anti-Goals

### Goals
1. **Stationery & Papercraft Visual World**:
   - Off-white paper background (`#fcfbf7`) with subtle repeating blue graph grid pattern (`repeating-linear-gradient`).
   - Continuous red notebook margin guide line running down the left side.
   - Header with Mac-style window dots, monospace file label (`PROJECT_NOTES_2026.RAW`), working `✨ Toggle Annotations` switch, and `Draft v2.4` badge.
2. **Hero & Interactive 3-Card Showcase**:
   - Hand-sketched blue ink annotations (arrows and headline loop) toggled via the header button.
   - Primary and secondary CTAs routing to `/register.html` and `/login.html` / demo preview.
   - 3 tactile paper cards with alternating rotations (`-1.2deg`, `+1.2deg`, `-0.8deg`) that flatten smoothly to `0deg` on hover:
     - `NOTE_CARD_01`: Punched binder holes on the left, metallic silver paperclip, `Priority!` script, torn bottom edge (showcasing Word Notebook & Digital Inking).
     - `CARD_02`: Translucent washi tape overlay, yellow post-it sticky note insert, `Organized` cursive script (showcasing Dual-Approval Kanban Tasks).
     - `CARD_03`: Metallic silver paperclip, dark terminal snippet box, `✓ Ready` script (showcasing Shared Expense Splitter & Performance).
3. **Extended Desk Sections (Below the Fold)**:
   - **Stationery Clipboard Workflow**: Wooden clipboard frame (Image 1 reference) presenting the 3-step collaboration cycle (Drafting, Task Execution, Dual Approval).
   - **Collage Memo Board**: Varied paper note cards (pale yellow sticky note, kraft cardboard, pink memo card from Image 2) showcasing Personal Space isolation, Direct Messaging, and Calendar.
   - **Itemized Paper Receipt**: Receipt-style expense tally card demonstrating GroupSpace's debt settlement algorithm.
4. **Zero Backend Impact & Accessibility**:
   - 100% frontend implementation in `public/index.html` and `public/css/landing.css`.
   - WCAG AA compliant contrast and Impeccable Design Quality detector compliance (0 anti-patterns).
   - Fully responsive for mobile devices with clean vertical stacking.

### Non-Goals
- Altering any Express backend routes, Neon PostgreSQL database schemas, or API endpoints.
- Introducing heavy 3rd-party CSS or JS dependencies (pure Vanilla HTML5, CSS3, ES6 JS).
- Altering the dashboard controller or login authentication pipelines.

### Anti-Goals
- Fake, non-interactive decoration that blocks user clicks (all pseudo-elements have `pointer-events: none`).
- Clashing with Dark Mode (landing page includes harmonious dark stationery palette).

---

## Approaches Considered & Chosen

- **Approach 1: Direct 1-to-1 Papercraft Canvas**: Limited purely to the hero section shown in Image 4. Clean, but leaves sections below the fold mismatched.
- **Approach 2: Wooden Clipboard Hero**: Centering the entire hero inside a single clipboard graphic. Bold, but confines the layout horizontally.
- **Approach 3: Extended Desk Collage (Chosen & Approved by User)**:
  Applies the exact 1-to-1 papercraft hero from Image 4, and extends the visual language across the entire landing page with a wooden clipboard workflow section, washi-taped memo sticky notes (Image 2), and a paper receipt expense calculator. This delivers a complete, cohesive design world from top to bottom.

---

## Detailed Section Architecture

### 1. Paper Top Bar & Header (Clean Brand Navigation)
- **Design Philosophy**: As requested by the user, omit Mac window dots, the dev file label (`PROJECT_NOTES_2026.RAW`), and the `✨ Toggle Annotations` switch to keep the top bar clean, professional, and accessible.
- **Left**:
  - GroupSpace logo (`👥 GroupSpace`) styled as an authentic stationery header badge.
  - Smooth anchor navigation links: `Features` and `How It Works`.
- **Right**:
  - Theme toggle button (`#themeToggle`) with sun/moon icon preservation for manual dark/light mode switching.
  - `Sign in` link routing to `/login.html`.
  - `Get Started` primary action button routing to `/register.html`.
- **Red Margin Rule**: A 2px red notebook guide line (`rgba(239, 68, 68, 0.4)`) running down the left boundary of the main content column.

### 2. Papercraft Hero Section
- **Title**: `Craft Creative Ideas` / `One Workspace. Better Teamwork.`
- **Natural Hand-Sketched Annotations**:
  - 3 hand-drawn blue vector ink arrows (`.sketch-arrow`) pointing down toward the headline.
  - A hand-drawn blue elliptical vector loop (`.sketch-loop`) encircling the title, giving an authentic handwritten emphasis.
  - Rendered with crisp inline SVG paths (`pointer-events: none`).
- **Subtext**: "A tactile digital canvas built with paper-like textures, torn page cards, clips, and hand-sketched annotations. Designed for intuitive project planning."
- **Action Buttons**:
  - Primary: `Start Brainstorming →` (`.hero-btn-primary`, linking to `/register.html`).
  - Secondary: `📄 View Samples` (`.hero-btn-secondary`, smooth scrolling to the desk showcase).

### 3. The 3 Paper Showcase Cards (Copy & Feature Synthesis)
The 3 cards marry the tactile stationery aesthetic from the user's mock directly with GroupSpace's core product features:
- **Card 1: `NOTE_CARD_01` (Notebook & Digital Inking)**:
  - Header: Metallic paperclip pinned at upper right, monospace `NOTE_CARD_01`, blue cursive badge `Priority!`.
  - Body: Punched binder holes (`.binder-hole`) down the left margin, title **Tactile Document UI**, copy highlighting GroupSpace's collaborative MS Word-style rich editor, flowchart vector shapes, and digital inking on authentic paper canvas.
  - Footer: `Updated 2h ago` and `.pill-design-system` (`Design System` / `Word Notebook`).
  - Bottom: Perforated zigzag torn bottom edge (`.paper-torn-bottom`).
- **Card 2: `CARD_02` (Kanban Task Board & Dual Approvals)**:
  - Header: Translucent beige washi tape strip at top center, monospace `CARD_02`, warm ochre cursive badge `Organized`.
  - Body: Title **Task & Approval Flow**, copy highlighting GroupSpace's dual-approval Kanban board where members complete tasks and leaders verify completion.
  - Insert: Yellow sticky note box (`.post-it-note`) with handwritten cursive note: *"Leader verified & approved for sprint deadline!"*.
  - Footer: `Drafted Notes` and `.pill-structure` (`Structure` / `Kanban Board`).
  - Bottom: Perforated zigzag torn bottom edge.
- **Card 3: `CARD_03` (Zero Bloat & Expense Ledger)**:
  - Header: Metallic paperclip pinned at upper left, monospace `CARD_03`, emerald cursive badge `✓ Ready`.
  - Body: Title **Zero Bloat & Net Ledger**, copy highlighting framework-free lightning speed, completely isolated private personal spaces, and net debt simplification.
  - Insert: Dark terminal code block (`.dark-code-snippet` with `#0f172a` ground and cyan/emerald code text showing the net split ledger algorithm).
  - Footer: `Standalone File` and `.pill-optimized` (`Optimized` / `Net Split`).
  - Bottom: Perforated zigzag torn bottom edge.

### 4. Extended Desk Sections (Below Hero)
- **Wooden Clipboard Collaboration Workflow**:
  - A styled clipboard container (Image 1 reference) featuring an authentic top metallic clip.
  - Inside the clipboard sheet: 3 structured phases (1. Drafting & Inking, 2. Task Dual-Approval, 3. Net Debt Settlement).
- **Collage Memo Board (Features & Privacy)**:
  - Styled as varied memo sheets pinned with washi tape (Image 2 reference):
    - Kraft paper card for **Isolated Personal Space** (`is_private = true`).
    - Pale yellow sticky note for **Direct Messaging & Real-Time Presence**.
    - Soft pink memo for **Shared Team Calendar & Deadlines**.
- **Interactive Paper Receipt (Shared Expenses Demo)**:
  - A visual receipt-style demonstration slip with jagged tear edges detailing how GroupSpace automatically simplifies multiple debts into minimal net transactions, with interactive hover highlights on debtor-to-creditor links.
- **Footer**:
  - Left: Blue dot + `Hand-crafted Grid Canvas System`.
  - Right: `Tip: Hover over paper cards to inspect paper depth!`.
  - Links: Login, Register, GitHub / Docs.

---

## Technical Implementation Details
1. **File Locations**:
   - HTML: `public/index.html`
   - Styles: `public/css/landing.css`
   - Interactive Logic: Embedded inline or in `public/js/landing.js` (toggling annotations, smooth card hover, receipt micro-interactions).
2. **Asset Pipeline & Zero-Dependency Constraints**:
   - Pure procedural CSS gradients, layered shadows, and inline SVGs (no heavy raster assets required, 100% vector sharpness at retina displays).
   - Zero new npm packages.
   - Decorative SVGs (arrows, loop, paperclip, washi tape) use `pointer-events: none !important;` so interactions remain 100% accessible.
3. **Verification**:
   - `node tests/test-localhost.js` (verifies `GET /` contains `GroupSpace` and runs full test suite).
   - `.agents/skills/impeccable/scripts/impeccable.cmd detect public/index.html public/css/landing.css --no-advisory` (0 anti-patterns).

