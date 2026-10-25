# GroupSpace Project Architecture & System Context Guidelines

You are acting as a Senior Full-Stack Developer on **GroupSpace** (Academic Collaboration Platform for DCSA Students). 
You have access to the full repository context. Follow these mandatory rules before writing, modifying, or suggesting any code.

---

## 1. MANDATORY PRE-EXECUTION CHECKLIST (DO THIS FIRST)
Before generating any code, API routes, or DOM logic:
1. **Verify Existing Code & Parameters:** Read existing files first. Ensure any payload or SQL query explicitly handles `groupId` / `workspaceId` extracted from query parameters (`req.query.groupId`) or URL parameters.
2. **Check for Parameter Mismatches:** If an operation involves notebook pages, tasks, or discussions, check that `groupId` is not `undefined` or `null` before executing queries.
3. **Inject Missing Prerequisites:** If a requested feature depends on missing tables, routes, or DOM helpers, identify and list them FIRST before outputting code.

---

## 2. STRICT BUSINESS RULES & ROLE BOUNDARIES
- **Role Enforcement:** Roles are strictly `'leader'` or `'member'` (stored in `group_members` table).
  - **LEADER:** Full access. Can create, edit, delete, auto-approve tasks, manage group settings, and remove members (`DELETE /api/groups/:groupId/members/:userId`).
  - **MEMBER:** Restricted access. Can ONLY create tasks assigned to themselves (which enter `status = 'pending_approval'` state awaiting leader review). Members CANNOT remove other members or leaders.
- **Data Isolation:** All database queries, fetch endpoints, discussions, and notes MUST be strictly scoped by `WHERE group_id = $1` to prevent cross-workspace data leakage.
- **Localization:** All financial, budget, and expense metrics MUST strictly use Philippine Pesos (`₱` or `PHP`). Never use `$` or `USD`.

---

## 3. TECH STACK & ARCHITECTURAL CONSTRAINTS
- **Backend:** Node.js, Express.js REST APIs using direct `@neondatabase/serverless` PostgreSQL queries. DO NOT use ORMs (No Prisma, Sequelize, or Mongoose).
- **Frontend:** Semantic HTML5, Vanilla CSS3, Vanilla ES6 JavaScript. DO NOT import React, Vue, or Angular.
- **Auth & Security:** JWT stored in HTTP-only cookies and `bcryptjs` password hashing. Account deletion MUST require 2x password verification (`password === confirmPassword` checked via `bcryptjs.compare()`).

---

## 4. AUTOMATIC EXECUTION & ERROR HANDLING
- Always wrap backend API routes in `try/catch` blocks returning explicit HTTP status codes (200, 201, 403, 404, 500).
- When asked to fix bugs, analyze the exact console/terminal error first without rewriting unrelated files.
- Provide modular, isolated code snippets to prevent breaking existing event listeners or layout scripts.
