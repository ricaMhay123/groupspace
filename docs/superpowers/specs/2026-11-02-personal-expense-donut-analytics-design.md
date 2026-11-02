# Design Specification: Personal Expense Visual Category Breakdown (Donut Chart & Analytics)

**Date**: 2026-11-02  
**Status**: Pending Review  
**Topic**: Personal Space — Visual Category Breakdown (Donut Chart / Analytics) for Personal Budget & Expenses  

---

## 1. Intent & The Why
Currently, the **Personal Budget & Expenses** tab in Personal Space only lists items in a simple table with a plain sum total (`₱Total Spent`). Users cannot see where their money is being spent across categories, nor can they filter expenses or select categories when adding an expense. 

This feature introduces a native, interactive **SVG Donut Chart & Category Analytics Dashboard** directly into the Personal Space Budget view. Users can immediately visualize their spending distribution, identify their highest spending category, filter expenses by category, and assign clean categories when logging personal expenses.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Native SVG Donut Chart**: Render an SVG donut chart dynamically sized to the category amounts, with dark/light mode token integration.
- **Center Metric**: Display formatted total spending inside the donut ring center (`₱X,XXX.XX`).
- **Category Analytics Cards & Legend**: Show each category with an emoji icon, amount, and percentage bar (e.g. `🍔 Food & Dining: ₱1,200.00 (35%)`).
- **Top Expense Callout**: Display a badge indicating the top spending category (e.g. *"Biggest Expense: 🍔 Food & Dining (35%)"*).
- **Interactive Filtering**: Provide category filter pills (`All`, `Food`, `School`, `Printing`, `Transport`, `Tech`, `Project`, `Other`) that instantly filter the expense table below.
- **Category Selector in Add Modal**: Add a clean category dropdown in the `personalItemModal` when adding a personal expense so expenses are categorized upon creation.
- **Graceful Empty State**: If no expenses exist, display a friendly placeholder prompting the user to log their first expense to see analytics.

### Non-Goals
- We are not building multi-currency conversion (remains in Philippine Pesos `₱`).
- We are not modifying the workspace group expense ledger (this is isolated strictly to the user's private Personal Space).

### Anti-Goals
- **No external charting dependencies**: Do not import Chart.js, D3, or external CDNs that could break offline, violate sandboxes, or fail in dark mode. Everything will be pure native SVG + CSS variables.

---

## 3. Approaches Considered & Selected

| Approach | Description | Trade-offs | Decision |
| :--- | :--- | :--- | :--- |
| **Approach 1: Native SVG Donut Chart with Category Legend** | Generates SVG circular arcs using `stroke-dasharray` and `stroke-dashoffset` with CSS custom properties. Center shows total amount. Color-coded legend with category percentages and interactive filters. | Fast, 0 external dependencies, dark mode token harmony, 100% offline-ready. | **SELECTED by User** |
| **Approach 2: Chart.js Canvas via CDN** | Uses external Chart.js library to render a canvas donut chart. | Requires external network script; theme changes require manual canvas redraw hooks; heavier bundle. | Discarded |
| **Approach 3: Segmented Horizontal Stacked Bar** | Renders a multi-colored horizontal stacked progress bar without a circular chart. | Compact for mobile, but lacks the user's requested circular donut visual aesthetic. | Discarded |

---

## 4. Detailed Implementation Specification

### 4.1 Categories & Color Palette
Standard categories with distinct, accessible color tokens:
1. **🍔 Food & Dining**: `#ef4444` (Rose / Red)
2. **📚 School & Books**: `#6366f1` (Indigo)
3. **🖨️ Printing & Supplies**: `#0ea5e9` (Sky Blue)
4. **🚌 Transportation**: `#f59e0b` (Amber)
5. **💻 Tech & Subscriptions**: `#8b5cf6` (Purple)
6. **🎯 Project Materials**: `#10b981` (Emerald)
7. **🏷️ Personal / Other**: `#64748b` (Slate)

### 4.2 SVG Donut Chart Architecture
- SVG dimensions: `viewBox="0 0 180 180"` with radius $r = 65$, circumference $C = 2 \times \pi \times 65 \approx 408.4$.
- Each category slice calculates:
  $$\text{sliceLength} = \frac{\text{categoryAmount}}{\text{totalAmount}} \times C$$
  $$\text{strokeDasharray} = \text{sliceLength} + " " + (C - \text{sliceLength})$$
  $$\text{strokeDashoffset} = -\text{accumulatedLength}$$
- Center text: `<text>` rendering `Total` in `11px var(--muted-foreground)` and formatted `₱X,XXX.XX` in `16px font-weight:700 var(--foreground)`.

### 4.3 UI Layout in Personal Space
- **Top Dashboard Grid (`.personal-expense-analytics`)**:
  - **Left Card**: Donut chart with centered text and subtle glow.
  - **Right Card**: Category Breakdown Legend with color swatch, category title, amount, percentage progress bar (`height: 6px; border-radius: 999px; background: categoryColor;`), and top expense highlight banner.
- **Filter Bar (`.personal-expense-filters`)**:
  - Horizontal chip group (`All`, `🍔 Food`, `📚 School`, etc.) with active pill styling.
  - Filters the `<tbody>` table without extra network requests.
- **Expense Table**:
  - Displays `Item`, `Category` (with color badge), `Amount`, and `Action (Delete)`.
- **Add Modal (`#personalItemModal`)**:
  - Add `<div class="form-group" id="personalCategoryGroup">` with category select dropdown when `personalSubTab === 'EXPENSE'`.

---

## 5. Verification Plan
1. **Automated Test Suite**:
   - Create `tests/test-personal-expense-donut-analytics.js` verifying:
     - SVG donut calculation and rendering logic in `public/js/dashboard.js`.
     - Category select input presence in `#personalItemModal` in `public/dashboard.html`.
     - Analytics grid CSS and dark mode support in `public/css/style.css`.
     - Filtering interaction by category.
   - Run `node tests/test-localhost.js` (all 41 suites passing).
2. **Manual Regression & Quality Checks**:
   - Add expenses in multiple categories and verify donut arcs, colors, percentages, and center total.
   - Test dark mode toggle harmony.
   - Verify empty state when no expenses exist.

