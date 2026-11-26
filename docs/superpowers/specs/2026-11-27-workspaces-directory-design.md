# Workspaces Directory Layout & Owned-First Hierarchy Design

**Size:** Small change (frontend-only: `public/workspaces.html` and `public/css/style.css`)

## Intent & Why
On `workspaces.html`, `GET /api/groups` currently sorts all groups strictly by `g.created_at DESC` (`src/modules/groups/group.model.js`), so recently joined workspaces (`role = 'member'`) appear ahead of workspaces the user created (`created_by = user.id`). Every card also shares identical visual weight, repeats 4 key-value label rows, prints placeholder noise (`N/A`, `No description provided.`), and exposes a lone centered `Workspaces` nav tab above an empty centered hero block. Separating created workspaces on top and decluttering the header/card structure ensures users notice and open their own spaces immediately.

## Goals, Non-Goals & Anti-Goals
- **Goals:**
  - Group workspaces into **Created by You** (`Number(ws.created_by) === Number(user.id)`) above **Joined Workspaces** using data already returned by `GET /api/groups` (omit either section header if empty so solo owners or join-only members see a clean single grid).
  - Compact the top bar by removing the lone centered `Workspaces` nav link and replacing the centered hero stack with a left-aligned header row (`Your Workspaces` + `Join with Code` + `+ Create Workspace`).
  - Clean card density: omit empty `N/A` / `No description provided.` lines, keep card copy to title, category, optional description (2-line clamp), single compact metadata line (`X members · Y pending`), copyable invite code pill on created/leader cards (`Copy` button with toast/feedback + `event.stopPropagation()`), and bottom-aligned `Open →` footer action using equal-height flex cards.
- **Constraints / Non-Goals:**
  - No backend API or SQL changes.
  - Preserve `#userProfileChip`, `#userProfileModal`, `#createModal`, `#joinModal`, dark mode rules, and `tests/test-user-profile-modal.js`.
- **Anti-Goals:**
  - No decorative left/top colored card stripes, no borders-around-borders, no floating KPI counters or empty placeholder boxes.

## Approaches Considered
1. **Approach A — Split into "Created by You" and "Joined Workspaces" sections (Chosen):** Renders two labeled sections (`CREATED BY YOU` above `JOINED WORKSPACES`) with a clean header action row and compact copyable invite codes on owned spaces. Prevents recently joined teams from ever crowding out created spaces.
2. **Approach B — Single flat grid sorted created-first (Rejected):** Keeps one 3-column grid sorted by `created_by`, which breaks down visually once a user joins multiple teams in the same row.

## Design Summary (Calls Made)
- **Header (`workspaces.html`):** Keep logo on the left and `#userProfileChip`, theme toggle, and `Logout` on the right; drop the redundant middle `<nav><a href="workspaces.html">Workspaces</a></nav>`.
- **Page Header Row (`style.css` + `workspaces.html`):** `.workspace-header-bar` uses `display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;` with concise subtext (`Create a workspace for your team or open one below.`) and action buttons aligned right (stacking cleanly on mobile `<= 768px`).
- **Cards (`loadWorkspaces()` + `.workspace-card`):** Display flex column (`display: flex; flex-direction: column; height: 100%;`) so card footers align regardless of description length. Show role pill cleanly in the card top row (`Category · Leader`), invite code copy control only for created/leader cards, and clean bottom link/button `Open →`.
