# Personal Expense Visual Category Breakdown (Donut Chart & Analytics) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive native SVG Donut Chart and Category Analytics dashboard for Personal Space Budget & Expenses, complete with category progress bars, top expense callouts, interactive category filtering, and category selection when logging expenses.

**Architecture:** Pure native SVG donut calculation with `stroke-dasharray` and `stroke-dashoffset` in JavaScript, paired with responsive CSS grid cards, filter chip navigation, and dropdown integration in the Add Expense modal. Zero external charting dependencies.

**Tech Stack:** Vanilla JavaScript (ES6+), Native SVG, HTML5, CSS custom properties, Express / Node.js backend.

**Spec:** `docs/superpowers/specs/2026-11-02-personal-expense-donut-analytics-design.md`

## Global Constraints

- Currency symbol is Philippine Peso (`₱`) formatted to 2 decimal places (`₱X,XXX.XX`).
- No external charting libraries (e.g. Chart.js, D3) — pure SVG and CSS only.
- Strict dark/light theme harmony using semantic tokens (`var(--card)`, `var(--foreground)`, `var(--border)`, `var(--muted-foreground)`).
- Table filtering must be client-side and instantaneous without reloading data.

## Review Focus

1. **Zero Expenses Empty State**: Renders empty state card prompting the user without throwing NaN or broken SVG division by zero.
2. **Single Expense Category**: When 100% of expenses are in one category, donut ring draws a complete circle (circumference ~408.4) cleanly without clipping.
3. **Category Filtering**: Clicking a category filter pill filters the table correctly and updates the active pill style; clicking "All" restores all rows.
4. **Dark Mode Readability**: Donut center text and category percentage bars maintain contrast standards in dark mode.
5. **Responsive Wrapping**: On mobile viewports (<= 768px), chart and legend stack vertically with full width.

---

### Task 1: Add Category Selector to Personal Expense Modal

**Files:**
- Modify: `public/dashboard.html:780-790`
- Modify: `public/js/dashboard.js:3790-3800, 4150-4185`
- Test: `tests/test-personal-expense-donut-analytics.js`

**Interfaces:**
- Consumes: `#personalItemModal` in `public/dashboard.html`
- Produces: `#personalCategoryGroup` with `#personalItemCategory` select; `handleSavePersonalItem()` passing `category` to `/api/personal`

- [ ] **Step 1: Write the failing test for modal category selector**
Create `tests/test-personal-expense-donut-analytics.js` asserting `#personalCategoryGroup` and `#personalItemCategory` exist with standard categories.

- [ ] **Step 2: Run test to verify it fails**
Run: `node tests/test-personal-expense-donut-analytics.js`
Expected: FAIL with missing element assertions.

- [ ] **Step 3: Implement category select in `public/dashboard.html`**
Add `#personalCategoryGroup` containing options for `🍔 Food & Dining`, `📚 School & Books`, `🖨️ Printing & Supplies`, `🚌 Transportation`, `💻 Tech & Subscriptions`, `🎯 Project Materials`, and `🏷️ Personal / Other`.

- [ ] **Step 4: Update `openPersonalAddModal()` and `handleSavePersonalItem()` in `public/js/dashboard.js`**
Ensure `#personalCategoryGroup` is displayed when `personalSubTab === 'EXPENSE'` and hidden otherwise. Include `category` in `apiFetch('/api/personal')` payload.

- [ ] **Step 5: Run test to verify Task 1 passes**
Run: `node tests/test-personal-expense-donut-analytics.js`
Expected: PASS Task 1 assertions.

---

### Task 2: CSS Layout & Tokens for Donut Chart & Analytics

**Files:**
- Modify: `public/css/style.css:1080-1120`
- Test: `tests/test-personal-expense-donut-analytics.js`

**Interfaces:**
- Consumes: CSS custom tokens (`--card`, `--border`, `--foreground`, `--primary`, `--muted`)
- Produces: `.personal-expense-analytics`, `.donut-chart-container`, `.category-legend-list`, `.category-progress-bar`, `.personal-expense-filter-chips`, `.personal-category-pill`

- [ ] **Step 1: Add failing test for CSS classes**
Add assertions checking for `.personal-expense-analytics`, `.donut-chart-container`, and `.personal-category-pill` in `public/css/style.css`.

- [ ] **Step 2: Run test to verify it fails**
Run: `node tests/test-personal-expense-donut-analytics.js`
Expected: FAIL on missing CSS selectors.

- [ ] **Step 3: Implement CSS in `public/css/style.css`**
Add responsive 2-column analytics grid, donut container centering, category progress meter bars, active filter pill highlights, and dark mode overrides.

- [ ] **Step 4: Run test to verify Task 2 passes**
Run: `node tests/test-personal-expense-donut-analytics.js`
Expected: PASS Task 2 assertions.

---

### Task 3: Implement SVG Donut Chart & Category Analytics in JavaScript

**Files:**
- Modify: `public/js/dashboard.js:4120-4150`
- Test: `tests/test-personal-expense-donut-analytics.js`

**Interfaces:**
- Consumes: `items` from `apiFetch('/api/personal?type=EXPENSE')`
- Produces: `renderPersonalExpenseAnalytics(items)`, `filterPersonalExpensesByCategory(category)`, dynamic SVG donut markup, and color-coded table rows.

- [ ] **Step 1: Add failing test for analytics JS functions**
Assert `public/js/dashboard.js` defines `renderPersonalExpenseAnalytics`, calculates category totals and percentages, and defines `filterPersonalExpensesByCategory`.

- [ ] **Step 2: Run test to verify it fails**
Run: `node tests/test-personal-expense-donut-analytics.js`
Expected: FAIL on missing JS function definitions.

- [ ] **Step 3: Implement `renderPersonalExpenseAnalytics()` in `public/js/dashboard.js`**
- Group items by category.
- Calculate total amount and percentages.
- Build SVG `<circle>` elements with radius 65, circumference 408.4, and corresponding `stroke-dasharray` / `stroke-dashoffset`.
- Build the center text `<text>` for `Total` and formatted `₱X,XXX.XX`.
- Render the Category Legend with colored progress bars, amounts, percentages, and Top Expense Callout.
- Render category filter chips (`All`, `🍔 Food`, etc.) above the table.

- [ ] **Step 4: Implement `filterPersonalExpensesByCategory()`**
Filter table rows by selected category without mutating raw data, updating chip `.active` state dynamically.

- [ ] **Step 5: Run test to verify Task 3 passes**
Run: `node tests/test-personal-expense-donut-analytics.js`
Expected: PASS Task 3 assertions.

---

### Task 4: Complete Pre-Push Verification Suite

**Files:**
- Modify: `tests/test-localhost.js`
- Test: `node tests/test-localhost.js`

**Interfaces:**
- Consumes: all test suites including `tests/test-personal-expense-donut-analytics.js`
- Produces: 41 passed test suites (100% success rate)

- [ ] **Step 1: Register test suite in `tests/test-localhost.js`**
Add `{ script: 'tests/test-personal-expense-donut-analytics.js', name: 'Personal Expense Donut Chart & Analytics' }`.

- [ ] **Step 2: Run full pre-push test suite**
Run: `node tests/test-localhost.js`
Expected: PASS 41 / 41 suites with 0 regressions.

---

### Task 5: Git Commit & Push

- [ ] **Step 1: Verify `.env` is ignored**
Run: `git check-ignore .env`
Expected: `.env`

- [ ] **Step 2: Stage and commit changes**
Stage modified files: `public/dashboard.html`, `public/js/dashboard.js`, `public/css/style.css`, `tests/test-localhost.js`, `tests/test-personal-expense-donut-analytics.js`.
Commit with message: `feat(personal-space): implement native SVG donut chart and category analytics for personal budget`

- [ ] **Step 3: Push to origin main**
Push to `origin main` and verify clean working tree.

