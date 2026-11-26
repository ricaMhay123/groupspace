---
target: public/dashboard.html
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Users\\ricam\\.gemini\\antigravity\\scratch\\groupspace\\public\\dashboard.html"
target_fingerprint: "sha256:647298fb10aa648d05800b6312ae80125a24e4692cba5d319919fac0b77eabea"
target_path: "C:\\Users\\ricam\\.gemini\\antigravity\\scratch\\groupspace\\public\\dashboard.html"
timestamp: 2026-11-26T10-37-36Z
slug: public-dashboard-html
closed: true
---
Method: dual-agent (A: 20496736-04db-4b2c-b1e9-45fa24bbce19 · B: e9c5004e-5a52-4369-af3a-8e303f076cab)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | `updateLeaderBacklogBadge()` (`tasks.js:456`) queries `button[onclick*="tab-tasks"]` which does not match `#sidebarMenu li[onclick="switchTab('tasks')"]` (`dashboard.html:50`), so the nav backlog badge never renders; workspace switches lack loading states. |
| 2 | Match System / Real World | 2 | Internal jargon leaks into UI: `Uncategorized (Root)` (`dashboard.html:402, 576, 802`), `Dual-approval quality gate` (`dashboard.js:617`), `Category 1 — #NB Pages (Root)` (`discussions.js:515`), `Hybrid auto-titles` (`dashboard.html:794`). |
| 3 | User Control and Freedom | 2 | No Logout button (`logoutUser()` in `api.js:96` is unreachable), no Light/Dark theme toggle in `dashboard.html` despite `theme.js` (`line 16`), 14 `.modal-overlay` modals lack `Escape`/backdrop close, and `#homespaceSettingsBtn` is hidden for Members (`dashboard.js:424`). |
| 4 | Consistency and Standards | 2 | Header `#primaryActionBtn` duplicates in-tab create buttons with mismatched labels/handlers (`+ Create Task`, `+ New Page` vs `+ New Document`, `+ Add Item` vs `+ New Note`); delete triggers use 5 different UI patterns; `openWorkspaceSettingsModal()` (`dashboard.js:1197`) is orphaned. |
| 5 | Error Prevention | 2 | `deleteHomespaceScratchpadNote` (`dashboard.js:463, 500`) deletes items in 1 click without confirmation/undo; `Delete` sits exposed on every `.note-card`; `handleCreateExpense` and `saveInlinePersonalNotebookPage` lack double-submit disable states. |
| 6 | Recognition Rather Than Recall | 2 | Header `#dmDrawerBtn` & `#notificationFeedBtn` are icon-only; `#primaryActionBtn` changes meaning per tab; `#personalNotebookToolbarContainer` uses terse/abbreviated Word controls (`Tx`, `A`, `Indent L/R`); `@`/`#` mention syntax in `#newCommentInput` (`dashboard.html:327`) disappears once typing starts. |
| 7 | Flexibility and Efficiency | 1 | No keyboard shortcuts for tab switching, search, or modals; no batch approvals or batch note moves; no search/filter/sort on Kanban Tasks or Expense Ledger. |
| 8 | Aesthetic and Minimalist Design | 1 | 7–8 controls on every shared `.note-card` (`dashboard.js:2316-2350`), 6 controls on every personal `.note-card` (`4236-4266`), 25+ MS Word controls inside `#personalQuickCaptureDrawer`, duplicate create buttons in 5 tabs, and scrapbook CSS (`style.css:5210-5639`). |
| 9 | Error Recovery | 2 | Failed tab fetches (`loadOverview`, `loadTasks`, `loadExpenses`, `loadDiscussions`, `loadPersonalItems`) leave `"Loading..."` stuck on screen with no Retry action; creation modals rely on 3.5s auto-dismissing toasts instead of inline validation. |
| 10 | Help and Documentation | 1 | No help trigger, no `@`/`#` mention reference, and no explanation of Debt Simplification or why Personal Space sits inside a workspace-scoped sidebar. |
| **Total** | | **18 / 40** | **Poor (12–19)** |

## Design Specificity Verdict

**LLM assessment**: GroupSpace's underlying domain workflows are genuinely authored for student project teams—role-aware Homespace governance (Leader/Co-Leader approvals, masked invite code with 24h grace period in `regenerateJoinCodeModal`), Philippine Peso (`₱`) multi-mode expense splits with partial GCash/Maya installments in `settleUpModal`, and `@member` / `#page` cross-linking. However, `public/dashboard.html` wraps those workflows in a generic multi-tab SaaS shell cluttered by competing create buttons, dense per-card micro-actions, emoji icons, unused Bootstrap 5.3.3 CDN assets (`dashboard.html:11, 1139`), and conflicting scrapbook CSS (`style.css:5210-5639`).

**Deterministic scan**: `impeccable detect --json public/dashboard.html` exited `0` with **25 advisory findings** (`13` `design-system-color`, `6` `design-system-font-size`, `4` `design-system-radius`, `1` `repeating-stripes-gradient`, `1` `codex-grid-background`).
- **Confirmed issues caught/corroborated**: `codex-grid-background` (and overlapping `repeating-stripes-gradient`) on `style.css:5141-5144, 5496-5499`, the decorative red left border (`rgba(239, 68, 68, 0.4)`) on `.dashboard-main` (`style.css:5221`), legacy neon-lime (`rgba(124,255,58,.25)`) and yellow (`rgba(255,193,7,.25)`) inline borders on Kanban columns (`dashboard.html:163, 172`), `#c7d2fe` / `#e2e8f0` / `#fca5a5` border drift, and `7px`/`3px` radius drift.
- **False positives filtered**: 4 intentional user-avatar swatch colors (`#4f46e5`, `#7c3aed`, `#e11d48`, `#0891b2` at `dashboard.html:988, 1014-1017`), backdrop scrim `rgba(0,0,0,.35)` (`line 831`), `11px` role text (`line 64`, allowed by `DESIGN.md:96`), `16px` note canvas (`line 413`, allowed by `DESIGN.md:95`), and `8px`/`12px` radii (`lines 41, 60`, allowed by `DESIGN.md:108-109` prose).

**Visual overlays**: No user-visible browser overlay is available. Chrome DevTools could not connect (`DevToolsActivePort` missing / remote debugging not enabled), and unauthenticated requests to `dashboard.html` redirect to `login.html` (`api.js:76-82`). Fallback signal: `impeccable detect --json` CLI output plus source/CSS inspection.

## Overall Impression

GroupSpace has thoughtful team workflows—especially expense splitting, dual-approval tasks, and private note isolation—buried under repetitive buttons, micro-action bloat on every card, and missing session exits. Consolidating redundant create buttons, collapsing card actions into a single overflow menu, and trimming the inline quick-capture toolbar will immediately cut visual noise in half.

## What's Working

1. **Role-Scoped Workspace Governance** (`dashboard.js:512-833`): Homespace adapts cleanly between Leader/Co-Leader controls (Pending Task Approvals, Roster management, masked join code with 24h grace period) and Member view (Assigned Deliverables, Leadership Request flow).
2. **Tailored Student Settlement UX** (`dashboard.html:671-737`; `dashboard.js:5172-5328`): Partial-payment fraction chips (`1/8` to `Full`), remaining-balance progress bar, and Personal Budget donut analytics solve real student group problems clearly.
3. **Custom Confirmation Dialogs & Mention Linking** (`api.js:191-400`; `discussions.js`): `gsConfirm`/`gsPrompt` handle `Escape` and safe focus defaults, while `@member` and `#page/#folder` mentions connect discussions to workspace artifacts.

## Priority Issues

- **[P0] Missing Logout, Theme Toggle, Unreachable Member Settings, & Trapped Modals**
  - **Why it matters**: Students on shared campus machines cannot log out (`logoutUser()` in `api.js:96` has no UI button); Dark Mode has no toggle despite `theme.js` (`dashboard.html:16`); regular Members cannot reach `openWorkspaceSettingsModal()` (`dashboard.js:1197`) or `Delete Account`; 14 `.modal-overlay` dialogs ignore `Escape` and backdrop clicks.
  - **Fix**: Add an account popover/menu on `#sidebarProfileCard` with `Edit Profile`, `Preferences & Account` (`openWorkspaceSettingsModal()`), `Toggle Theme`, and `Log Out`; add global `Escape` + backdrop dismissal for `.modal-overlay.active`.
  - **Suggested command**: `$impeccable harden` + `$impeccable distill`

- **[P1] Redundant, Competing Create Buttons & Duplicated Headers Across 5 Tabs**
  - **Why it matters**: Header `#primaryActionBtn` (`dashboard.html:92`) repeats the same create action as in-tab buttons (`+ Create Task` at `140`, `+ Add Event` at `calendar.js:33`, `+ New Document` at `207`, `+ Log Expense` at `254`, `+ New Topic` at `282`, `+ New Note` at `386` / `+ Add Item` at `421`) with inconsistent labels and a handler bug where `#primaryActionBtn` in Tasks bypasses `openCreateTaskModal()` (`dashboard.js:356`).
  - **Fix**: Keep **one** primary CTA per view (`#primaryActionBtn` in `.dashboard-header`), wire Tasks to `openCreateTaskModal()` and Personal Space `NOTE` to `togglePersonalQuickCapture()`, and remove all 6 duplicate in-tab create buttons and redundant `Team Calendar` / `Team Topics & Threads` sub-headings.
  - **Suggested command**: `$impeccable distill`

- **[P1] Severe Card Action Bloat on Shared & Personal Notebook Cards**
  - **Why it matters**: Every shared `.note-card` (`dashboard.js:2316-2350`, duplicated in `notebook.js:93-119`) renders 7–8 controls (`Edit/Read-Only`, Folder `<select>`, `Share`, `.txt`, `.pdf`, `.docx`, `Delete`), and every personal `.note-card` (`dashboard.js:4236-4266`) renders 6 controls—turning scannable note grids into walls of tiny buttons with `Delete` exposed on every card.
  - **Fix**: Show only Title, Folder/Status pill, Snippet, and Author on the card surface, and move `Move to Folder`, `Share / Permissions`, `Export (.pdf / .docx / .txt)`, and `Delete` into one `⋯` menu per card (reusing `.actions-dropdown-container`).
  - **Suggested command**: `$impeccable distill`

- **[P1] 25+ Control Inline Word Ribbon in Quick Capture & Conflicting Scrapbook CSS**
  - **Why it matters**: `#personalQuickCaptureDrawer` (`dashboard.html:394-415`) injects a 5-tab, 25+ control Word ribbon above a 180px quick-note box, while `style.css:5210-5639` applies card rotations (`±0.8deg`), red margin stripes, push-pins, washi tape, and grid backgrounds that violate `DESIGN.md` and trigger `impeccable detect` slop rules.
  - **Fix**: Replace `#personalNotebookToolbarContainer` in `dashboard.html` with a minimal 4-control bar (`Bold`, `Italic`, `Bullet List`, `Open Full Editor`) and remove the scrapbook card tilt/pin/tape/grid overrides in `style.css:5125-5639` (plus inline `rgba(124,255,58,.25)` / `rgba(255,193,7,.25)` Kanban borders at `dashboard.html:163, 172`).
  - **Suggested command**: `$impeccable distill` + `$impeccable quieter`

- **[P2] Broken Leader Backlog Badge, Non-Focusable Click Targets, & Stuck Loading States**
  - **Why it matters**: `updateLeaderBacklogBadge()` (`tasks.js:456`) queries a non-existent selector (`button[onclick*="tab-tasks"]`), clickable `<li>`/`<span>`/`<div>` items (`#sidebarMenu li`, `.note-card`, `.kanban-card`, `Delete` spans) break keyboard navigation, and failed API loads leave `"Loading..."` stuck without a Retry control.
  - **Fix**: Fix selector to `#sidebarMenu li[onclick*="tasks"]`, convert clickable items/delete spans to `<button>` elements, and add inline error + Retry fallbacks.
  - **Suggested command**: `$impeccable harden`

## Persona Red Flags

- **Alex (Impatient Power User / Team Lead)**: No keyboard shortcuts (`Esc` fails on 14 modals, no `/` search or tab shortcuts); no batch approval in Homespace or batch note actions; no filters/sort on Kanban Tasks or Expense Ledger; forced to scan past duplicate `+ Create` buttons and 7–8 controls per note card.
- **Jordan (First-Timer / Student Member)**: Cannot find Logout, Dark Mode, or Member Settings (`#homespaceSettingsBtn` is `display:none` for Members at `dashboard.js:424`); sees conflicting `+ New Page` vs `+ New Document` and `+ Add Item` vs `+ New Note`; hits jargon (`Uncategorized (Root)`, `Dual-approval quality gate`) and vanishing `@/#` hints (`dashboard.html:327`).
- **Sam (Accessibility-Dependent User)**: Primary nav (`#sidebarMenu li`), profile card, note cards, and Kanban cards are non-focusable `<li>`/`<div>`/`<span>` elements; `#groupSwitcher` and search inputs lack `<label>`/`aria-label`; `10px`/`10.5px` micro-text and `#94a3b8`/`#52D68A`/`#38bdf8` low-contrast labels break `DESIGN.md` WCAG AA rules.

## Minor Observations

- `handleSaveUserProfile` (`dashboard.js:5132`) calls non-existent `loadOverviewData()` instead of `loadOverview()`.
- `discussions.js:48-162` injects hardcoded light-mode colors for `.mention-dropdown` in dark mode.
- `dashboard.html` jumps from `h1#viewTitle` straight to `h3` in Overview, Expenses, and Discussions (skipping `h2`), and loads unused Bootstrap 5.3.3 CDN CSS/JS (`lines 11, 1139`).

## Questions to Consider

1. If `#primaryActionBtn` in the header already adapts to every tab, why do 5 tabs render a second competing `+ Create` button in the page body?
2. How much calmer would Notebook and Personal Space feel if every note card moved Move, Share, `.txt/.pdf/.docx` Export, and Delete into one `⋯` menu?
3. Does Personal Space's quick capture need a 25-button Word ribbon when the full editor (`notebook.html`) is already in the `More` menu?
4. What happens when a student finishes on a shared campus PC and looks for Logout, Dark Mode, or Member Preferences?
