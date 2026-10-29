---
target: Team Calendar
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "file:C:\\Users\\ricam\\.gemini\\antigravity\\scratch\\groupspace\\public\\dashboard.html#tab-calendar"
timestamp: 2026-10-29T08-25-00Z
slug: public-dashboard-html-tab-calendar
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 3 | Calendar dates and basic event pills are visible, but the current "Today" cell relies on default pale yellow with no crisp active indicator; task vs. event distinction is ambiguous. |
| 2 | Match System / Real World | 2 | Raw FullCalendar labels (`dayGridMonth`, `timeGridWeek`, `listWeek`) and dated button clusters feel like an unskinned open-source widget rather than an integrated modern workspace scheduler. |
| 3 | User Control and Freedom | 2 | The view switcher (`month`, `week`, `list`) is a rigid FullCalendar button group without intuitive segment controls, view selection persistence, or quick date jumping. |
| 4 | Consistency and Standards | 1 | **Severe design token isolation**: FullCalendar uses raw `#2c3e50` dark slate buttons, `#ffffff` hardcoded container, and browser default table lines, completely ignoring GroupSpace's design tokens and theme variables. |
| 5 | Error Prevention | 2 | Clicking an event instantly triggers a destructive `window.confirm()` delete prompt without an intermediate inspection state or clear non-destructive view. |
| 6 | Recognition Rather Than Recall | 3 | 6 tiny colored dots crowd the top right with non-interactive color swatches that violate WCAG 1.4.1 (color as only visual cue) and offer no filter capability. |
| 7 | Flexibility and Efficiency | 2 | Lack of interactive filtering (e.g. toggling Events vs Tasks vs Priorities) forces users to parse a dense grid manually; mobile touch targets fall below 44px. |
| 8 | Aesthetic and Minimalist Design | 2 | Harsh default navy toolbar, crowded inline legend, and double-header clutter detract from GroupSpace's clean, modern SaaS aesthetic. |
| 9 | Error Recovery | 4 | Cancelling the event deletion dialog leaves calendar state intact. |
| 10 | Help and Documentation | 4 | Add Event modal provides clear inputs for title, category, date, and description. |
| **Total** | | **25/40** | **Needs Work** |

---

### Design Specificity Verdict

**LLM Assessment**: The Team Calendar currently exhibits **Default Library Embed Syndrome**. While FullCalendar v6 is a robust scheduling engine, it is injected into GroupSpace almost completely unskinned. The toolbar buttons render in FullCalendar's harsh default navy (`#2c3e50`), the container is hardcoded to a glaring `#ffffff` box that breaks dark mode, and the view switcher (`month`, `week`, `list`) lacks the refined segmented pill aesthetic established throughout the rest of GroupSpace. Clicking an event immediately opens a native browser `confirm()` popup offering only deletion, which creates high user anxiety when the user simply wanted to inspect meeting or task details.

**Deterministic Scan**: 
- **DOM Inspection**: `#calendarView` contains hardcoded inline `#ffffff` background and `#0f172a` text in `public/js/calendar.js`, leading to a complete 1:1 text contrast blackout when switching to dark mode.
- **CSS Coverage**: Zero `.fc` rules in `public/css/style.css`. Table borders default to `#ddd`, today cell defaults to `#fff9db`, and link colors default to browser blue.
- **Touch Target Violations**: FullCalendar toolbar navigation arrows, view buttons (~32px), and event pills (~20px) all fail the 44px mobile touch target guideline.

---

### Overall Impression
The calendar has strong foundational mechanics (FullCalendar v6 + event store sync + task deadline overlay), but visually it feels like a third-party plugin pasted onto the app. By elevating the view switcher into a modern segmented selector, skinning FullCalendar with GroupSpace design tokens, transforming the 6-dot legend into an interactive filter bar, and replacing `window.confirm` with a clean Event Inspector modal, this surface will instantly match the tier of Linear and Notion calendars.

---

### Priority Issues (P0–P3)

#### [P0] Total Dark Mode Breakdown & Inverted Contrast Blackout
- **What**: `public/js/calendar.js` injects inline `background:#ffffff;` and `color:#0f172a;` onto the container and header. In dark mode, `#fcContainer` remains a blinding white rectangle with un-themed `#ddd` grid lines, while header text becomes unreadable.
- **Why it matters**: Breaks dark mode completely for any user navigating to the Calendar tab.
- **Fix**: Remove inline colors and map `#fcContainer` and all FullCalendar elements (`.fc-theme-standard`, `.fc-daygrid`, `.fc-col-header-cell`, `.fc-list`) to semantic CSS variables (`var(--card)`, `var(--border)`, `var(--foreground)`, `var(--muted-foreground)`).

#### [P0] Raw FullCalendar Button Styling & Lack of Design System Skinning
- **What**: FullCalendar's default navy buttons (`#2c3e50`) and pale yellow "Today" cell clash harshly with GroupSpace's brand colors.
- **Why it matters**: Signals an unpolished, prototype aesthetic.
- **Fix**: Add a comprehensive FullCalendar theme block to `public/css/style.css` styling the calendar with GroupSpace's card radii, subtle borders, modern pill events, and indigo/blue active states.

#### [P1] Primitive View Switcher (`month | week | list`) Needs Bespoke Selection UX
- **What**: The user explicitly pointed out that the `month`, `week`, `list` toggle needs revision to allow users to select how their calendar looks. Currently, it's just raw FullCalendar buttons with no icons, no active state animation, and no clear visual hierarchy.
- **Why it matters**: Switching views is the primary mode of calendar interaction; having a clunky toggle impairs navigation and aesthetic polish.
- **Fix**: Replace or restyle the view switcher into a bespoke GroupSpace segmented control with icons and clear labels (`[ ▦ Month | ☷ Week | ☰ List ]`) or an accessible dropdown selector.

#### [P1] Crammed 6-Dot Non-Interactive Header Legend
- **What**: 6 micro-dots (`● Event ● To Do ● In Progress ● Review ● High Priority ● Done`) are squeezed horizontally next to the `+ Add Event` button. They wrap awkwardly on laptops, rely solely on color (WCAG 1.4.1), and cannot be clicked to filter.
- **Why it matters**: Creates visual clutter and missed utility.
- **Fix**: Convert the legend into an interactive category filter bar beneath the calendar toolbar with badge chips that let users toggle visibility of specific categories (e.g., show only Events or only High Priority deadlines).

#### [P1] Destructive Native `window.confirm()` on Event Click
- **What**: Clicking an event on the calendar fires `confirm("... Delete this event?")`.
- **Why it matters**: If a user clicks an event simply to read the description or verify the meeting link/time, they are confronted with a scary deletion modal.
- **Fix**: Replace native `confirm()` with a clean Event Details Popover/Modal showing event title, category badge, date/time, description, and separate "Close" and "Delete" actions.

---

### Persona Red Flags
- **Maya (Product Manager reviewing weekly deadlines)**: Wants to switch between a high-level monthly roadmap and a detailed weekly schedule. The raw FullCalendar buttons feel clunky and don't indicate clearly which mode is currently active.
- **Kenji (Night-owl Developer in Dark Mode)**: Opens the Calendar at 11 PM and gets blinded by an un-themed `#ffffff` box with black text and pale yellow highlights.
- **Sarah (Team Member checking meeting details)**: Clicks on a meeting on the calendar to see who is attending or what room it's in, and is shocked by a browser alert asking if she wants to delete it.
