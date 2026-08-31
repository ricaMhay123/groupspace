# 👥 GroupSpace

> **One Workspace. Better Teamwork.**
> A modern, collaborative team workspace and project management platform built for students, organizations, and project teams.

---

## 🌟 Key Features

1. **Multi-Group Switcher & Membership**:
   - Easily switch between courses, club projects, hackathons, and personal workspaces.
   - Granular role permission checks: **Workspace Leader** (Admin) vs **Collaborator** (Member).
   - Instant 6-character invitation join codes (e.g. `GS-7X9B2K`).

2. **Kanban Task Board & Dual-Approval Workflow**:
   - Visual 4-stage Kanban columns: *To Do*, *In Progress*, *Awaiting Leader Approval*, and *Approved Done*.
   - **Dual-Approval Logic**: Assignees submit completed tasks for verification (`PENDING_APPROVAL`). Only a Workspace Leader can review and give final sign-off (`DONE`) or request revisions with notes.

3. **Collaborative Notebook**:
   - Shared documentation with markdown support, tagging, real-time live search, and note pinning.

4. **Expense Ledger & Smart Net Summary**:
   - Add workspace expenses with categories and participants.
   - Real-time balance calculations with automated debt simplification algorithm (*"Who owes whom how much"* with minimal bilateral transactions).

5. **Isolated Personal Space**:
   - Private productivity bubble strictly scoped to the logged-in user.
   - Private notes, personal to-do checklists, and personal budget tracker completely invisible to group members.

6. **Topics, Discussions & Live Activity Feed**:
   - Threaded discussion topics with comments, replies, and an audit trail of all workspace events.

---

## 📁 Directory Structure

```text
groupspace/
├── public/
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   ├── css/
│   │   └── style.css                 # Custom dark neon-green theme
│   ├── js/
│   │   ├── api.js                    # API client, auth & notifications
│   │   ├── auth.js                   # Login and register forms handler
│   │   └── dashboard.js              # Full application state & view controller
│   ├── index.html                    # Homepage & interactive preview
│   ├── about.html                    # About page
│   ├── contact.html                  # Contact form
│   ├── login.html                    # Sign-in portal
│   ├── register.html                 # Sign-up portal
│   ├── workspaces.html               # Workspace creation & join hub
│   ├── dashboard.html                # Main workspace application
│   └── favicon.ico                   # App icon
│
├── src/
│   ├── config/
│   │   ├── db.config.js              # Database connection & schema tables
│   │   └── constants.js              # Application constants & status codes
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js        # Session/JWT validation
│   │   └── role.middleware.js        # Admin (Leader) vs Member checks
│   │
│   ├── modules/                      # Core functional feature domains
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.routes.js
│   │   │
│   │   ├── groups/                   # Multi-Group Switcher & Membership
│   │   │   ├── group.controller.js
│   │   │   ├── group.service.js
│   │   │   ├── group.model.js
│   │   │   └── group.routes.js
│   │   │
│   │   ├── notebook/                 # Collaborative Notebook module
│   │   │   ├── notebook.controller.js
│   │   │   ├── notebook.service.js
│   │   │   ├── notebook.model.js
│   │   │   └── notebook.routes.js
│   │   │
│   │   ├── tasks/                    # Kanban Task Board & Dual-Approval
│   │   │   ├── task.controller.js
│   │   │   ├── task.service.js
│   │   │   ├── task.model.js
│   │   │   └── task.routes.js
│   │   │
│   │   ├── expenses/                 # Expense Ledger & Net Summary
│   │   │   ├── expense.controller.js
│   │   │   ├── expense.service.js
│   │   │   ├── expense.model.js
│   │   │   └── expense.routes.js
│   │   │
│   │   ├── personal-space/           # Isolated personal notes/tasks/expenses
│   │   │   ├── personal.controller.js
│   │   │   ├── personal.service.js
│   │   │   ├── personal.model.js
│   │   │   └── personal.routes.js
│   │   │
│   │   └── discussions/              # Topic/Sub-topic Activity Feed
│   │       ├── discussion.controller.js
│   │       ├── discussion.service.js
│   │       ├── discussion.model.js
│   │       └── discussion.routes.js
│   │
│   ├── utils/
│   │   ├── calculation.util.js       # Expense net balance split logic
│   │   └── validation.util.js        # Input sanitization and validators
│   │
│   ├── app.js                        # Express/Server configuration
│   └── server.js                     # Entry point & port listener
│
├── tests/
│   └── test-flow.js                  # Automated verification test suite
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### 1. Requirements
- Node.js (v18 or higher; Node v24 recommended)
- npm

### 2. Installation
```bash
# Navigate to the project directory
cd groupspace

# Install dependencies
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
PORT=3000
NODE_ENV=development
JWT_SECRET=super_secret_groupspace_jwt_key_change_in_production_2026
DATABASE_PATH=./data/groupspace.db
```

### 4. Start the Application
```bash
# Start server
npm start

# Or with live reloading in dev mode
npm run dev
```

Open your browser and navigate to:
👉 **`http://localhost:3000`**

### 5. Run Automated Tests
```bash
npm test
```

---

## 🛡️ API Endpoints Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Sign in and receive JWT token / cookie
- `GET /api/auth/me` — Retrieve profile of authenticated user
- `POST /api/auth/logout` — Invalidate session

### Workspaces (`/api/groups`)
- `GET /api/groups` — List user's workspaces
- `POST /api/groups` — Create a new workspace (creator becomes `LEADER`)
- `POST /api/groups/join` — Join a workspace using an invite code
- `GET /api/groups/:id` — Workspace details, member roster, and activity
- `PATCH /api/groups/:id/members/:userId/role` — Update member role (`LEADER` only)
- `POST /api/groups/:id/leave` — Leave workspace

### Kanban Tasks (`/api/groups/:groupId/tasks`)
- `GET /api/groups/:groupId/tasks` — List all tasks in workspace
- `POST /api/groups/:groupId/tasks` — Create task (title, priority, assignee)
- `PATCH /api/groups/:groupId/tasks/:taskId/status` — Update task status (Dual-Approval enforced)
- `POST /api/groups/:groupId/tasks/:taskId/approve` — Approve or reject task (`LEADER` only)
- `DELETE /api/groups/:groupId/tasks/:taskId` — Delete task

### Notebook (`/api/groups/:groupId/notes`)
- `GET /api/groups/:groupId/notes` — Get notebook pages (optional `?search=` query)
- `POST /api/groups/:groupId/notes` — Create note page
- `PATCH /api/groups/:groupId/notes/:noteId` — Edit note page
- `DELETE /api/groups/:groupId/notes/:noteId` — Delete note page

### Expense Ledger (`/api/groups/:groupId/expenses`)
- `GET /api/groups/:groupId/expenses` — List group expenses
- `GET /api/groups/:groupId/expenses/summary` — Net balances & simplified debt settlement
- `POST /api/groups/:groupId/expenses` — Log expense with split breakdown
- `DELETE /api/groups/:groupId/expenses/:expenseId` — Delete expense

### Discussions (`/api/groups/:groupId/discussions`)
- `GET /api/groups/:groupId/discussions` — List discussion topics
- `POST /api/groups/:groupId/discussions` — Start discussion topic
- `GET /api/groups/:groupId/discussions/:topicId` — View topic & comments
- `POST /api/groups/:groupId/discussions/:topicId/comments` — Reply to topic
- `GET /api/groups/:groupId/discussions/activity` — Live workspace activity audit trail

### Personal Space (`/api/personal`)
- `GET /api/personal?type=NOTE|TASK|EXPENSE` — Retrieve private user items
- `POST /api/personal` — Create private note, to-do, or expense
- `PATCH /api/personal/:id` — Update private item (e.g. toggle to-do completion)
- `DELETE /api/personal/:id` — Remove private item

---

## 🎨 Theme & Brand
- **Accent Primary**: `#7CFF3A` (Neon Lime Green)
- **Background**: `#0B0F0C` (Deep Black/Green)
- **Card Surfaces**: `#181C19` & `#111513`
- **Border**: `#232825`
- **Typography**: Poppins (Google Fonts)

---

## 📄 License
MIT © 2026 GroupSpace Team
