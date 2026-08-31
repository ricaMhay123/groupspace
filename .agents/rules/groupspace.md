# GroupSpace Development Rules for Antigravity

## Project Overview
GroupSpace is an Express + Node.js collaborative workspace web application for teams, students, and organizations.

## Core Architectural Conventions
- **Modular Domains**: All feature logic lives in `src/modules/<feature>/` separated into `controller`, `service`, `model`, and `routes`.
- **Database**: SQLite using Node.js built-in `DatabaseSync` (`node:sqlite`). Zero external database installation required.
- **Task Dual-Approval Workflow**: Only workspace users with `ROLES.LEADER` can approve tasks to `DONE` via `/api/groups/:groupId/tasks/:taskId/approve`.
- **Expense Split Logic**: Balanced and settled via greedy bilateral debt simplification in `src/utils/calculation.util.js`.
- **Frontend**: Served from `public/`. Dark neon-green theme `#7CFF3A`, vanilla JavaScript client API wrappers in `public/js/`.

## Running & Testing
- Start: `npm start`
- Tests: `npm test`
