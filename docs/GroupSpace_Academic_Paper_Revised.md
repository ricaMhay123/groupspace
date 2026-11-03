# DATAMEX COLLEGE OF SAINT ADELINE - PARAÑAQUE
### 8167 Dr. A. Santos Avenue, San Dionisio, Parañaque City
**Bachelor of Science in Information Technology**

In Partial Fulfillment of the Course Requirements in Web Development

---

# GroupSpace: A Centralized Web-Based Academic Collaboration and Group Management System for Datamex College of Saint Adeline (DCSA) Students

**Submitted By:**
- Rica Mhay M. Saturinas
- Rence Anthony De Vera
- Rachelle Izzy C. Monteron
- Kevin Smith S. Importa
- Abeizer Khenn Umpay
- Rachel Villarimo

**Instructor:**
Mr. Benjar Balbuena

---

## CHAPTER I: INTRODUCTION

### Background of the Study
The persistent reliance on fragmented, disconnected digital utilities for collaborative student coursework at higher education institutions like Datamex College of Saint Adeline (DCSA) presents a major challenge to academic efficiency and structured group coordination. Modern Information Technology (IT) curricula require students to engage continuously in team-based assignments, database practicals, network configurations, and multi-term capstone projects. These projects necessitate simultaneous coordination of technical documentation, task delegation, backlog tracking, and shared academic project funds (such as thesis document printing, domain acquisition, or hardware components). Currently, students manage these interrelated dependencies through an ad-hoc combination of consumer messaging apps (e.g., Facebook Messenger), standalone cloud document editors (e.g., Google Docs), and manual expense lists. This division of tools causes context-switching fatigue, disorganized task management, buried code instructions, and an inability to maintain clear boundaries between personal work and group deliverables.

In today’s collaborative academic setting, a centralized digital workspace is vital for maintaining productivity and meeting project milestones. When students are forced to search through long, unstructured group chat threads to retrieve critical instructions, file assets, or meeting schedules, valuable time is lost. Furthermore, commercial all-in-one workspaces like Notion introduce steep learning curves, excessive manual configuration, and lack purpose-built tools for student teams, such as integrated non-financial expense ledgers and isolated personal notebooks inside a group workspace. An academic collaboration system must balance technical utility with immediate ease of use, ensuring students can coordinate deliverables without cumbersome administrative overhead.

The need for a dedicated academic platform is further highlighted by the demands placed on IT students who balance dense academic loads with external obligations. Disconnected tools amplify communication gaps and accountability issues within teams, frequently leaving group leaders unable to track task assignments or monitor shared contributions effectively. Creating a tailored, web-based workspace solves these issues and provides a structured environment that mirrors real-world collaborative project management workflows.

To address these challenges, the development of GroupSpace provides a centralized, web-based academic collaboration and group management platform engineered specifically for DCSA students. The system leverages standard web technologies—including HTML5, vanilla CSS3, and modern client-side JavaScript for the front end—supported by an asynchronous Node.js and Express.js back-end running against a serverless PostgreSQL database hosted on Neon. In addition, a resilient three-tier email failover mechanism (Brevo REST API, Nodemailer with Gmail SMTP, and Resend API) handles automated transactional notifications. By consolidating shared notebooks, Kanban task boards, expense ledgers, and topic-based feeds into a single interface, GroupSpace establishes an accountable and accessible digital workspace for academic teams.

### Statement of the Problem
Specifically, this study seeks to answer the following questions:
1. What are the functional and architectural requirements for designing a centralized web platform that integrates a collaborative notebook, a Kanban task board, an itemized expense ledger, and structured discussion feeds?
2. How can the system support seamless context switching for students who actively belong to multiple independent academic course groups and capstone teams?
3. What mechanism can be implemented to provide private personal notebooks, individual task lists, and personal expense tracking within a group context that remain hidden from other members?
4. How can the tracking of shared project expenses be automated to calculate net summaries and balances without integrating direct financial or digital-wallet transactions?
5. How can authentication and data protection be structured across client sessions and database operations using JSON Web Tokens (JWT) and cryptographic password hashing?
6. What are the recommended software components, database drivers, and notification failover architectures needed to maintain a responsive, low-overhead system deployment?

### Objectives of the Study
The general objective of this project is to design and develop GroupSpace, a centralized web-based academic collaboration and group management system for Datamex College of Saint Adeline (DCSA) students to eliminate application fragmentation, organize coursework assets, and streamline team coordination.

The specific objectives are to:
1. Design and implement a centralized relational database schema using PostgreSQL hosted on Neon to store users, groups, tasks, ledgers, notes, and discussion threads.
2. Develop an interactive front-end interface using semantic HTML5, vanilla CSS3, and JavaScript (ES6+) that enables dynamic updates and task management without framework bloat.
3. Implement a multi-group management switcher that lets students move cleanly between distinct project teams, lab groups, and capstone spaces without account switching.
4. Build isolated personal workspaces within group environments, allowing students to maintain private draft notes, task reminders, and personal expense ledgers.
5. Construct a dual-mode project expense ledger featuring both an itemized breakdown and an automated net-summary balance toggle to minimize manual calculation errors.
6. Secure user data, route endpoints, and cookie payloads using Express.js middleware, bcryptjs password encryption, and stateless jsonwebtoken (JWT) authorization.
7. Establish a multi-provider transactional email system using Brevo REST API, Nodemailer (Gmail SMTP), and Resend API to deliver invitation links and alerts reliably.

### Scope and Limitations of the Study

#### Scope
The project encompasses the design, development, and evaluation of GroupSpace, a responsive web-based collaboration platform designed for DCSA IT students and academic project teams. The system includes:
- **Centralized Academic Workspace**: A unified landing interface integrating a Collaborative Notebook for documentation, a Shared Task Board using Kanban columns (To Do, In Progress, Pending Approval, Done), and an Automated Expense Ledger.
- **Quality-Gate Task Management**: Task completion governed by Leader / Co-Leader verification before moving to Done, paired with peer-assistance "Help Needed" flags on blocked items.
- **Expense Tracking Ledger**: A non-financial ledger offering an itemized transaction log alongside an automated net-summary balance calculator.
- **Isolated Personal Spaces**: Private sub-sections inside each group workspace for personal drafts, individual checklists, and private expense tracking.
- **Multi-Group Navigation Switcher**: A contextual workspace selector allowing users to switch between multiple academic course groups seamlessly.
- **Topic-Based Discussion Feed**: An organized communication feed categorized into primary topics and sub-topics with administrative moderation options.
- **Direct Messaging Drawer**: Slide-out 1-on-1 private messaging with live presence indicators and message history.
- **Authentication and Communication Engine**: Secure session verification via JWTs and password hashing via bcryptjs, supported by a multi-provider fallback notification delivery pipeline.

#### Limitations
- **Platform Constraints**: GroupSpace is developed solely as a responsive web application for desktop and mobile web browsers; native mobile applications (iOS/Android) and offline data synchronization are outside the scope of this implementation.
- **Institutional System Integration**: The platform operates as an independent academic tool and does not link directly with institutional infrastructure, such as university registrar portals, student information systems (SIS), or Learning Management Systems (LMS).
- **Financial Processing**: The expense ledger is strictly an internal accounting tool for record-keeping and net-balance calculations; it does not process online payments, connect to banking APIs, or integrate digital wallets.
- **User Governance Hierarchy**: System administration follows a 3-tier academic collaboration model (Primary Leader, Co-Leader, and Member), allowing leaders to delegate task reviews and ledger oversight without enterprise multi-tenant configuration complexity.

### Theoretical Framework
This study is grounded in the Technology Acceptance Model (TAM), which posits that user adoption of an information system is primarily determined by its Perceived Usefulness (PU) and Perceived Ease of Use (PEOU).
- **Perceived Usefulness (PU)**: The degree to which a user believes that using a specific system will enhance their job or academic performance. For DCSA students, having documentation, task status boards, expense tracking, and academic discussion threads housed within a single web environment directly reduces context-switching and asset loss. For team leaders, built-in tracking features enhance milestone monitoring and task visibility without extra administrative effort.
- **Perceived Ease of Use (PEOU)**: The degree to which a user expects the target system to be free of cognitive and operational effort. By relying on clean, vanilla web standards (HTML5/CSS3/JavaScript) and straightforward UI components instead of heavily nested enterprise software, GroupSpace ensures that students can register, join a workspace, and contribute immediately without extensive onboarding or configuration.

### Conceptual Framework (IPO Model)

```
+--------------------------------------------------------------------------+
|                                INPUTS                                    |
| • User Credentials (Name, Email, Password)                              |
| • Workspace & Group Configurations (Course Teams, Capstone Spaces)       |
| • Collaborative Content (Kanban Tasks, Shared Notes, Private Drafts)     |
| • Expense Records (Descriptions, Payers, Amounts, Splits)                |
| • Discussion Posts (Topics and Sub-Topics)                              |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
|                               PROCESS                                    |
| • User Authentication & Security (bcryptjs Hashing, JWT Verification)   |
| • Database Operations (PostgreSQL on Neon via @neondatabase/serverless)  |
| • Request Handling & API Routing (Express.js & Node.js Middleware)       |
| • System Business Logic:                                                 |
|   - Quality-Gate Approval Workflow (Assignee Submission -> Leader Done)  |
|   - "Help Needed" Peer-Assistance Flag Dispatching                       |
|   - Automated Net-Summary Expense Computations                           |
|   - Multi-Group Context Switching & Workspace Data Isolation             |
| • Multi-Tier Email Failover Dispatch (Brevo -> Gmail SMTP -> Resend)    |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
|                               OUTPUTS                                    |
| • Authenticated User Session & Role Access (Leader, Co-Leader, Member)  |
| • Multi-Group Workspace Selector Dashboard                               |
| • Dynamic Kanban Task Board & Approval Quality Gate                     |
| • Shared Collaborative Notebook & Isolated Private Personal Tabs        |
| • Itemized Expense Ledger with Automated Net Balance Summaries           |
| • Structured Topic-Based Discussion Activity Feed & Direct Messaging     |
| • Automated Transactional Emails (Invites and Notifications)             |
+--------------------------------------------------------------------------+
```

---

## CHAPTER II: REVIEW OF RELATED LITERATURE AND STUDIES

*(Full academic citations and comparative reviews of AnimoSpace, UST Cloud Campus, Trello, Notion, Reyes & Bautista [2022], Santos & Lim [2023], Cruz et al. [2021], Sharma et al. [2021], Mark & Voida [2020], and Harwood & Miller [2020] preserved exactly as reviewed).*

---

## CHAPTER III: RESEARCH METHODOLOGY / SYSTEM ANALYSIS AND DESIGN

### 3.1 Research Design
This study uses a descriptive and developmental research approach for the analysis, development, and evaluation of GroupSpace. The developmental approach follows the **Iterative Development Model (SDLC)** across 6 cyclical stages: Requirements Review, System Analysis, System Design and Improvement Planning, Implementation, Testing and Evaluation, and Revision and Iteration.

### 3.2 Research Locale
The study is conducted at **Datamex College of Saint Adeline (DCSA) – Parañaque Campus**, located at 8167 Dr. A. Santos Avenue, San Dionisio, Parañaque City, Philippines.

### 3.3 Respondents / Participants & Sampling Technique
The target participants include DCSA BSIT students, academic group leaders/coordinators, and group members.
- **Sampling Technique**: The study employs **Purposive Sampling** (non-probability sampling), intentionally selecting BSIT students actively enrolled in coursework requiring collaborative group deliverables, laboratory exercises, and software projects.

### 3.4 Data Gathering Techniques
A structured 3-part survey questionnaire gathers quantitative feedback based on the Technology Acceptance Model (TAM):
- **Figure 3.1**: GroupSpace System Evaluation Survey – Part 1 (Demographics and Baseline Tools)
- **Figure 3.2**: GroupSpace System Evaluation Survey – Part 2 (Perceived Usefulness and System Evaluation)
- **Figure 3.3**: GroupSpace System Evaluation Survey – Part 3 (Open Feedback and Recommendations)

#### Likert Scale Weighted Mean Interpretation Table

| Scale | Range / Weighted Mean | Verbal Interpretation | Qualitative Description |
| :---: | :---: | :--- | :--- |
| **5** | 4.21 – 5.00 | Strongly Agree | Outstanding / Highly Acceptable |
| **4** | 3.41 – 4.20 | Agree | Very Satisfactory / Acceptable |
| **3** | 2.61 – 3.40 | Neutral (Neither Agree nor Disagree) | Moderate / Fair |
| **2** | 1.81 – 2.60 | Disagree | Poor / Needs Improvement |
| **1** | 1.00 – 1.80 | Strongly Disagree | Very Poor / Unacceptable |

### 3.5 Existing System Analysis
- **Figure 3.4**: Existing Academic Group Collaboration Process (Flowchart showing application toggling between Facebook Messenger, Google Docs, and manual expense lists).

### 3.6 Proposed System
GroupSpace provides a centralized, authenticated platform implementing a 3-tier academic role hierarchy:
1. **Primary Leader (Group Creator)**: Initializes workspace, manages team settings, approves task deliverables, and holds full governance privileges.
2. **Co-Leader**: A delegated coordinator who assists with reviewing pending task deliverables and monitoring the group expense ledger.
3. **Group Member**: Student participant who contributes to shared notes, moves assigned tasks, logs expense items, and participates in discussion topics.

### 3.7 Functional Requirements Table

| No. | Functional Requirement | Description |
| :---: | :--- | :--- |
| 1 | User Registration | Allows new students to create an account with email verification. |
| 2 | User Login | Authenticates registered users via bcryptjs and JWT tokens. |
| 3 | User Authorization | Restricts feature access according to Primary Leader, Co-Leader, or Member roles. |
| 4 | Group Workspace Management | Provides unified team workspaces for assignments and capstones. |
| 5 | Multi-Group Navigation | Enables fast switching across different course teams without relogging. |
| 6 | Collaborative Notebook | Shared multi-tab rich text documentation with MS Word style formatting. |
| 7 | Task Management | Interactive Kanban task board (To Do, In Progress, Pending Approval, Done). |
| 8 | Quality-Gate Task Approval | Supports leader review on completed tasks and "Help Needed" peer flags. |
| 9 | Expense Recording | Itemized ledger logging project disbursements, payers, and categories. |
| 10 | Expense Summary | Automated net-summary balance engine computing debt settlements without real money transfers. |
| 11 | Private Personal Space | Isolated personal workspace for private drafts, personal tasks, and personal spend analytics. |
| 12 | Discussion Feed | Topic-based communication threads with @mentions and #tagging. |
| 13 | Discussion Moderation | Pinned announcements and moderation controls for team leaders. |
| 14 | Email Notifications | Multi-provider transactional email delivery for invites and notifications. |
| 15 | Team Calendar & Deadlines | Provides day, week, month, and agenda list views of milestone deadlines. |
| 16 | Direct Messaging Drawer | Slide-out 1-on-1 private messaging with online status presence indicators. |
| 17 | Document Export Engine | Exports collaborative notes into formatted PDF and Microsoft Word (.docx) documents. |

### 3.8 Non-Functional Requirements
- **Security**: JWT stateless sessions, bcryptjs salt rounds, HTTPS, and strict SQL user isolation.
- **Reliability**: Three-tier email failover (Brevo -> Gmail SMTP -> Resend) and database connection resilience.
- **Usability**: Accessible touch targets ($\ge 44\times 44\text{px}$) and WCAG AA contrast.
- **Compatibility**: Responsive layout across desktops, tablets, and smartphones ($\le 768\text{px}$ and $\le 480\text{px}$).

### 3.9 System Development Methodology
- **Figure 3.5**: Iterative Development Model (SDLC) diagram illustrating the 6-stage continuous improvement cycle.

### 3.10 System Analysis Models
- **Figure 3.6**: Context Diagram of GroupSpace.
- **Figure 3.7**: Data Flow Diagram – Level 0 of GroupSpace.
- **Figure 3.8**: Data Flow Diagram – Level 1 of GroupSpace.
- **Figure 3.9**: Use Case Diagram of GroupSpace.
- **Figure 3.10**: Verified Entity Relationship Diagram (ERD) of GroupSpace.
- **Figure 3.11**: System Architecture of GroupSpace.

### 3.11 Verified Relational Database Schema (Neon PostgreSQL)

| Table Name | Primary Key | Foreign Keys | Key Attributes & Purpose |
| :--- | :--- | :--- | :--- |
| `users` | `id` | - | `full_name`, `email`, `password_hash`, `avatar_initials`, `status`, `avatar_color`, `status_message`, `avatar_url`, `created_at` |
| `groups` | `id` | `created_by_user_id` | `name`, `description`, `join_code`, `category`, `privacy`, `theme`, `settings` (JSONB for grace codes & permissions), `created_at` |
| `group_members` | `id` | `group_id`, `user_id` | `role` ('leader', 'co_leader', 'member'), `joined_at` |
| `tasks` | `id` | `group_id`, `assigned_to_user_id`, `created_by_user_id` | `title`, `description`, `priority`, `status` ('TO_DO', 'IN_PROGRESS', 'PENDING_APPROVAL', 'DONE'), `due_date`, `flag`, `approval_notes` |
| `expenses` | `id` | `group_id`, `payer_id` | `title`, `amount`, `category`, `split_type`, `created_at` |
| `expense_splits`| `id` | `expense_id`, `user_id` | `share_amount`, `is_settled`, `settled_at` |
| `direct_messages` | `id` | `group_id`, `sender_id`, `receiver_id` | `message`, `is_read`, `created_at` |
| `notebooks` | `id` | `group_id`, `user_id` | `title`, `content`, `is_personal`, `created_at` |
| `leadership_requests`| `id`| `group_id`, `user_id` | `message`, `status` ('pending', 'approved', 'rejected'), `created_at` |
| `activity_logs` | `id` | `group_id`, `user_id` | `action_type`, `description`, `created_at` |

---

