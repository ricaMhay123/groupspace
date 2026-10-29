---
target: Expense Ledger & Net Split section
total_score: 15
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\ricam\\.gemini\\antigravity\\scratch\\groupspace\\public\\dashboard.html#tab-expenses"
timestamp: 2026-10-29T05-55-29Z
slug: public-dashboard-html-tab-expenses
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 2 | Summaries load dynamically, but active settlements lack status indicators (pending vs. settled) and sync timestamps. |
| 2 | Match System / Real World | 2 | Header displays algorithm jargon ("Calculated via net debt reduction algorithm") rather than human-friendly group settlement language. |
| 3 | User Control and Freedom | 1 | Critical workflow gap: no mechanism to "Settle Up", mark a payment complete, or record external transfers (GCash/cash). |
| 4 | Consistency and Standards | 1 | Missing CSS rules for `.summary-stat-box` and `.settlement-card`; positive balance uses brand blue (`#2563eb`) instead of financial emerald. |
| 5 | Error Prevention | 2 | Ledger "Delete" button executes immediately without modal confirmation or destructive warning state. |
| 6 | Recognition Rather Than Recall | 1 | Settlement plan uses raw user names (`Kevin Durian Smith pays → Rica Mhay Saturinas`) without "You" highlighting or avatars. |
| 7 | Flexibility and Efficiency | 1 | No search, category filtering, member filter, or CSV/ledger export capabilities. |
| 8 | Aesthetic and Minimalist Design | 1 | KPI metrics collapse vertically into raw unstyled text; settlement amounts wrap awkwardly onto a second line. |
| 9 | Error Recovery | 2 | Deleted expense records vanish permanently with no undo action or audit recovery log. |
| 10 | Help and Documentation | 2 | No tooltip or microcopy explaining how multi-party net debts are simplified or how members should pay. |
| **Total** | | **15/40** | **Severe Usability Deficits** |

---

### Design Specificity Verdict

**LLM Assessment**: The visual implementation is severely broken due to an implementation disconnect. While GroupSpace's data model includes a smart multi-party debt minimization algorithm, the frontend view is missing the CSS stylesheets required to render `.expense-summary-grid`, `.summary-stat-box`, and `.settlement-card`. As a result, the KPI cards collapse into three raw unstyled text blocks on the left edge, and settlement lines wrap numbers onto un-indented second lines. The experience feels like an abandoned raw HTML prototype rather than an intentional financial tool.

**Deterministic Scan**: 
- **Total Detected Violations**: 24 advisories across `public/dashboard.html` (9 `low-contrast`, 7 `design-system-color`, 4 `design-system-radius`, 4 `design-system-font-size`).
- **Surface-Specific Findings**:
  - The dynamic ledger delete button (`dashboard.js:2049`) violates WCAG AA with a low-contrast red (`#ef4444` on `#ffffff` = 3.76:1, requires 4.5:1) and has an undersized touch target (~16px height vs. 44px minimum).
  - Category badges (`dashboard.js:2044`) use hardcoded inline CSS rather than design system tokens.
- **False Positives**: Frontmatter token mismatches for documented secondary colors (`#047857`) and valid legibility floor micro-copy (11px).

**Visual Overlays**: Skipped (headless CLI execution mode without attached interactive browser DevTools session).

---

### Overall Impression
The underlying financial algorithm (minimizing multi-party transactions) is high utility, but the visual execution currently fails the core requirements of an *Operate* surface. Without card containers, tabular figures, ego-centric highlighting ("You"), or a "Mark as Settled" action, users cannot quickly scan what they owe or complete the settlement task.

---

### What's Working
1. **Intelligent Net Split Engine**: Circular debt minimization automatically calculates optimal minimal transactions, reducing group friction.
2. **Explicit Parenthetical Direction**: Using text cues like `(Owed to you)` and `(You owe)` prevents sign ambiguity for inexperienced users.
3. **Structured Information Hierarchy**: The layout sequence (Top KPIs $\rightarrow$ Actionable Settlement Plan $\rightarrow$ Historical Ledger) follows a logical financial workflow.

---

### Priority Issues (P0–P3)

#### [P0] Missing Card Containers & Unstyled Metric Grid
- **What**: `.expense-summary-grid`, `.summary-stat-box`, `.settlement-card`, `.settlement-payer`, `.settlement-arrow`, `.settlement-receiver`, and `.settlement-amount` have no CSS definitions in `public/css/style.css`.
- **Why it matters**: Desktop users see a vertical dump of unstyled raw text instead of a 3-column financial metric strip; settlement amounts wrap awkwardly underneath payer names.
- **Fix**: Implement desktop 3-column CSS Grid for `.expense-summary-grid`, bordered cards with subtle surface backgrounds for `.summary-stat-box`, and horizontal flex alignment with `font-variant-numeric: tabular-nums` for `.settlement-card`.
- **Suggested command**: `$impeccable layout`

#### [P1] Missing "Mark Settled" / Resolution Workflow
- **What**: There is no button, modal, or action to mark a settlement as paid.
- **Why it matters**: Violates task completion in Operate mode. Once expenses are logged, settlements remain on screen indefinitely unless an entire expense is deleted.
- **Fix**: Add a secondary action button ("Mark Settled" / "Record Payment") to each `.settlement-card` that marks the balance settled in the database or records a balancing payment.
- **Suggested command**: `$impeccable shape`

#### [P2] Impersonal Settlement Perspective (No "You" Highlighting)
- **What**: The list outputs full database names (`Kevin Durian Smith pays → Rica Mhay Saturinas`) with no visual cues for the currently logged-in user.
- **Why it matters**: Rica has to read through all names to confirm whether she is paying or receiving.
- **Fix**: Format transactions relative to the active user (e.g., `Kevin Durian Smith pays → You ₱62.50`) with avatar initials and direction-colored badges (emerald for receiving, rose for paying).
- **Suggested command**: `$impeccable clarify`

#### [P3] Non-Standard Financial Colors & Undersized Touch Targets
- **What**: Positive balances use brand blue (`#2563eb`), negative debts use un-tokenized `#FF7272`, and ledger "Delete" buttons have low contrast and a ~16px touch height.
- **Why it matters**: Users confuse financial credit with interactive navigation links, and mobile users struggle to tap small inline actions.
- **Fix**: Standardize on semantic tokens (`var(--success, #047857)` for credit, `var(--destructive, #dc2626)` for debt), and wrap table actions in minimum 44px touch targets.
- **Suggested command**: `$impeccable polish`

---

### Persona Red Flags
- **Alex (Power User)**: Cannot filter ledger records by member or category, cannot search expenses, and has no option to export CSV data for spreadsheet bookkeeping.
- **Jordan (First-Timer)**: Intimidated by the subtitle *"Calculated via net debt reduction algorithm"*, uncertain whether clicking anything will auto-charge a card or if external cash/GCash transfers are needed.
- **Morgan (Group Payer)**: Fronted ₱250.00 for workspace supplies but has no way to send payment reminders or mark friends as paid when they reimburse in cash.

---

### Minor Observations
- **Duplicate Action**: A "+ Log Expense" button exists both in the top global navigation and inside the ledger card header.
- **Hardcoded Peso Symbol**: Currency strings hardcode `₱` instead of utilizing `Intl.NumberFormat` with workspace currency preferences.
- **Arrow Whitespace**: `pays →` relies on raw text spacing rather than an aligned directional SVG icon.

---

### Questions to Consider
- *What if the top metric bar prioritized the user's personal net status first, before the workspace total expenditure?*
- *How might we allow members to attach digital payment QR codes (e.g., GCash, Venmo) directly to their settlement profile?*
- *Could the settlement card offer a 1-click "Send Reminder" ping directly to that member's Personal Feed Drawer?*
