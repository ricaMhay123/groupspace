# 3D Tilted Push Pins & Varied Washi Tapes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement realistic 3D tilted glossy push pins (based on Photo 1) in multiple vibrant colors and varied washi tapes (based on Photo 2) in distinct colors and placements (top-center, angled, and diagonal corners) across landing page cards and dashboard panels without obscuring any text.

**Architecture:** SVG data-URIs for photorealistic 3D tilted push pins with specular highlights, collars, and metal needles; CSS pseudo-elements (`::before`, `::after`) for varied translucent washi tapes with distinct tints, angles, and diagonal corner placements; alternating balanced distribution on `:nth-child()` rules; strict `pointer-events: none` and non-overlapping z-indexing.

**Tech Stack:** CSS3 (gradients, SVG data URIs, transforms, drop-shadows), HTML5, Vanilla JavaScript.

**Spec:** User reference photos `media_1793660454932_67ec32cb.jpg` (3D tilted glossy pink push pin) and `media_1793660490566_7a2b1d7a.jpg` (6 distinct washi tape colors and placements).

## Global Constraints

- No text or button labels may be modified.
- All fasteners (pins and washi tapes) MUST have `pointer-events: none !important;` to ensure clicks pass through.
- No fastener may obscure header text, badges, or counts.
- Must pass all 42 localhost test suites (`node tests/test-localhost.js`).
- Must maintain 0 Impeccable Design Quality anti-patterns.
- Dark mode must preserve pin and tape aesthetics against the blueprint grid without washed out overrides.

## Review Focus

1. **Text Obstruction**: Washi tapes and pins must never overlap header titles (e.g. "Approvals [0]", "Roles", "Feed").
2. **Clickability**: Fasteners must never intercept clicks on buttons or interactive inputs (`pointer-events: none`).
3. **Corner Overflow**: Diagonal corner washi tapes must not trigger unwanted horizontal scrollbars on parent containers (`overflow: hidden` on cards where appropriate or tight bounding).
4. **Color Fidelity**: Pins must replicate the 3D perspective, bulbous collar, cap, and metallic tip across 6 distinct colorways.
5. **Dark Mode**: Pins and tapes must look natural on `#1e293b` dark backgrounds with appropriate drop-shadows.

---

### Task 1: Create 3D Tilted Push Pin SVGs & CSS Fasteners in `public/css/style.css`

**Files:**
- Modify: `public/css/style.css:5040-5230`
- Test: `tests/test-localhost.js`

- [ ] **Step 1.1**: Define the 3D tilted push pin SVG data URIs for all 6 colorways:
  - Pink (Reference 1: `#f472b6` body, `#db2777` shadow, `#fbcfe8` highlight)
  - Sky Blue (`#38bdf8` body, `#0284c7` shadow, `#bae6fd` highlight)
  - Sage Mint (`#34d399` body, `#059669` shadow, `#a7f3d0` highlight)
  - Lavender Lilac (`#a78bfa` body, `#7c3aed` shadow, `#ddd6fe` highlight)
  - Sunny Amber (`#fbbf24` body, `#d97706` shadow, `#fef08a` highlight)
  - Coral Orange (`#fb923c` body, `#ea580c` shadow, `#fed7aa` highlight)
- [ ] **Step 1.2**: Define varied washi tape styles:
  - Translucent Parchment Cream (slight angle, top center)
  - Golden Kraft Tan (top off-center)
  - Frosted White Crinkle (top-left angled)
  - Slate Graphite (top center)
  - Diagonal Corner Tape (top-right corner `rotate(42deg)`)
- [ ] **Step 1.3**: Assign balanced alternating collage rules across dashboard panels:
  - `.dashboard-panel:nth-child(4n+1)`: Sunny Amber 3D Tilted Pin (`top: -15px; left: 50%`)
  - `.dashboard-panel:nth-child(4n+2)`: Diagonal Corner Kraft Washi Tape (`top: 8px; right: -12px; transform: rotate(42deg)`)
  - `.dashboard-panel:nth-child(4n+3)`: Bubblegum Pink 3D Tilted Pin (`top: -15px; left: 50%`)
  - `.dashboard-panel:nth-child(4n+4)`: Slate Charcoal Washi Tape (`top: -10px; left: 50%`)
- [ ] **Step 1.4**: Ensure `.panel-header::before`, `.dashboard-header::before`, etc. remain `display: none !important;` so text is never obscured.
- [ ] **Step 1.5**: Update dark mode rules for pins and washi tapes.

---

### Task 2: Implement Alternating 3D Pins & Varied Washi Tapes on Landing Page Feature Cards in `public/css/landing.css`

**Files:**
- Modify: `public/css/landing.css:339-420`, `1130-1170`
- Test: `tests/test-extended-desk-collage-landing.js`

- [ ] **Step 2.1**: Implement alternating fastener styles on `.feature-card` (the 6 sticky notes):
  - Card 1 (Canary Yellow - Discussions): 3D Tilted Bubblegum Pink Pin (`top: -15px; left: 50%; transform: translateX(-50%) rotate(-3deg);`)
  - Card 2 (Sky Blue - Tasks): Golden Kraft Washi Tape (`top: -10px; left: 52%; transform: translateX(-50%) rotate(2deg); width: 62px; height: 18px;`)
  - Card 3 (Sage Mint - Documents): 3D Tilted Sky Blue Pin (`top: -15px; left: 50%; transform: translateX(-50%) rotate(4deg);`)
  - Card 4 (Peach Apricot - Schedule): Diagonal Corner Parchment Washi Tape (`top: 8px; right: -12px; transform: rotate(42deg); width: 64px; height: 17px;`)
  - Card 5 (Lavender Lilac - Team): 3D Tilted Sage Mint Pin (`top: -15px; left: 50%; transform: translateX(-50%) rotate(-4deg);`)
  - Card 6 (Blush Rose - Finance): Frosted White Angled Washi Tape (`top: -10px; left: 46%; transform: translateX(-50%) rotate(-2.5deg); width: 56px; height: 17px;`)
- [ ] **Step 2.2**: Update dark mode styles for `.feature-card::before` and `.feature-card::after` to support both pins and washi tapes with authentic translucent shading.

---

### Task 3: Verification, Pre-Push Suite, and Git Delivery

**Files:**
- Test: `tests/test-extended-desk-collage-landing.js`
- Test: `tests/test-localhost.js` (42 test suites)
- Audit: `.agents\skills\impeccable\scripts\impeccable.cmd detect`

- [ ] **Step 3.1**: Run `node tests/test-extended-desk-collage-landing.js` and verify passing.
- [ ] **Step 3.2**: Run Impeccable Design Quality detector and verify 0 anti-patterns.
- [ ] **Step 3.3**: Run `node tests/test-localhost.js` and verify all 42 suites pass.
- [ ] **Step 3.4**: Commit changes with descriptive message and push to GitHub repository.

