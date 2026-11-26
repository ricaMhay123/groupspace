/**
 * GroupSpace — Interactive User Guide Module
 * Powers both the in-app User Guide Modal (#userGuideModal) on Dashboard/Workspaces
 * and the standalone /guide.html reference page.
 */

(function () {
  'use strict';

  const GUIDE_CATEGORIES = [
    {
      id: 'workspaces',
      title: 'Workspaces & Roles',
      shortTitle: 'Workspaces & Roles',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
      summary: 'Create or join team workspaces with invite codes and manage 3-tier role permissions.',
      dashboardAction: { label: 'Open Homespace Overview', tab: 'overview' },
      cards: [
        {
          title: 'Create or Join with a GS-XXXXXX Invite Code',
          tag: 'Onboarding',
          steps: [
            'From the Workspaces hub, click + Create Workspace to launch a space by category (School Project, Student Organization, Hackathon, Startup, or Study Group).',
            'Share your 6-character invite code (e.g. GS-MC74F9) with teammates so they can join in 1 click via Join with Code.',
            'Switch between any of your workspaces at any time using the Active Workspace dropdown in the left sidebar.'
          ],
          keywords: 'create join workspace invite code gs category switch sidebar'
        },
        {
          title: '3-Tier Role Hierarchy: Leader, Co-Leader & Member',
          tag: 'Governance',
          steps: [
            'Primary Leader: Holds full administrative authority—can promote/demote Co-Leaders, remove members, configure workspace rules, regenerate join codes, and delete the workspace.',
            'Co-Leader: Assists with day-to-day leadership—can review and approve submitted tasks, send Follow-Up nudges, and monitor the Approvals Queue.',
            'Member: Executes assigned tasks, collaborates in Notebook and Discussions, logs expenses, and can submit a Request Leadership Role application from Preferences & Account.'
          ],
          keywords: 'leader co-leader member role hierarchy promote demote request leadership permissions'
        },
        {
          title: '24-Hour Join Code Grace Period & Permission Gates',
          tag: 'Leader Controls',
          steps: [
            'Leaders can open Workspace Settings from the Homespace header to reveal, copy, or regenerate the workspace invite code.',
            'When a join code is regenerated, the previous code remains active for a 24-hour grace period so in-flight invites do not break.',
            'In the Permissions & Roles tab, Leaders can toggle 3 governance gates: require leader approval for Done tasks, restrict new discussion topics to Leaders, or restrict the expense ledger to Leaders.'
          ],
          keywords: 'grace period 24h regenerate join code settings governance constraints lock'
        }
      ]
    },
    {
      id: 'tasks',
      title: 'Tasks & Peer-Assist',
      shortTitle: 'Tasks & Kanban',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>',
      summary: 'Run a 4-column Kanban board with Dual-Approval quality gates, roadblock flags, and peer help offers.',
      dashboardAction: { label: 'Go to Tasks Board', tab: 'tasks' },
      cards: [
        {
          title: 'Multi-Assignee Tasks & 4-Column Kanban Flow',
          tag: 'Workflow',
          steps: [
            'Create tasks with priority levels (Low, Medium, High, Urgent), due date/time, and 1 or more assignees (or select Assign to All Members).',
            'Tasks progress through 4 columns: To Do -> In Progress -> Awaiting Approval -> Done.',
            'All task deadlines automatically appear on the Team Calendar tab.'
          ],
          keywords: 'kanban tasks priority due date multi assignee assign all columns'
        },
        {
          title: 'Dual-Approval Quality Gate & Leader Follow-Up',
          tag: 'Quality Control',
          steps: [
            'When a member completes a task, it enters Awaiting Leader Review instead of jumping straight to Done.',
            'Leaders or Co-Leaders review the task from the Kanban board or the Homespace Pending Task Approvals queue and either Approve it or Request Revision with notes.',
            'Need a status update? Leaders can click Follow-Up on any active task card to send an instant high-priority ping to the assignees.'
          ],
          keywords: 'dual approval quality gate awaiting review approve reject revision follow-up ping nudge'
        },
        {
          title: 'Flag as Blocked & Peer-Assist ("Offer Help")',
          tag: 'Collaboration',
          steps: [
            'Stuck on a deliverable? Open the task or click Flag as Blocked and describe what is blocking progress.',
            'Blocked tasks highlight across the workspace and appear in the Homespace Notification Summary.',
            'Teammates can click Offer Help on a task to volunteer assistance; once accepted by the assignee or leader, the helper is automatically added as a co-assignee.'
          ],
          keywords: 'blocked flag roadblock offer help peer assist co-assignee volunteer'
        }
      ]
    },
    {
      id: 'notebook',
      title: 'Notebook & Word Editor',
      shortTitle: 'Notebook Editor',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
      summary: 'Write in the quick dashboard editor or launch the full 8-tab Microsoft Word-style document suite.',
      dashboardAction: { label: 'Open Team Notebook', tab: 'notebook' },
      cards: [
        {
          title: 'Folders, Multi-Sheet Pages & Granular Permissions',
          tag: 'Organization',
          steps: [
            'Organize team documents into custom Folders and filter by folder or search query.',
            'Click Share / Permissions on any note to choose whether Everyone Can Edit or set the page to Read-Only with per-member edit overrides.',
            'In the Full Editor, click + New Page at the bottom of the paper canvas to append multi-sheet pages within a single document.'
          ],
          keywords: 'folders permissions share read-only multi-sheet new page notebook'
        },
        {
          title: '8-Tab Word Ribbon, Contextual Tables & Vector Shapes',
          tag: 'Rich Authoring',
          steps: [
            'Use the File, Home, Insert, Draw, Layout, and View tabs for typography, Metallic Ink, Style Cards, Cover Pages, Equations, Symbols, Freehand Ink drawing, Margins, Orientation, and Multi-Column layouts.',
            'Click inside any table to reveal the Table Design tab (presets, cell shading, border color, row/column insertion).',
            'Insert 20+ Vector Shapes or Text Boxes and click any shape to unlock the Shape Format tab with 8-handle resize, rotation, fill/stroke controls, and text wrapping.'
          ],
          keywords: 'ribbon wordhome insert draw layout view table design shape formatink equation toc cover page'
        },
        {
          title: 'PDF Canvas Import, DOCX Import & Multi-Format Export',
          tag: 'Import & Export',
          steps: [
            'Import existing .pdf, .docx, .txt, or .md files directly into a workspace or personal notebook.',
            'Imported PDFs render each page onto high-DPI HTML5 canvases so original fonts, columns, and diagrams stay 100% preserved.',
            'Export any notebook document to PDF (.pdf), Microsoft Word (.docx), Plain Text (.txt), or Markdown (.md), or print cleanly with Ctrl+P / Cmd+P.'
          ],
          keywords: 'import export pdf canvas docx word txt markdown print'
        }
      ]
    },
    {
      id: 'expenses',
      title: 'Expenses & Settlements',
      shortTitle: 'Expenses',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
      summary: 'Split group purchases equally or by exact shares and settle balances in minimal transfers.',
      dashboardAction: { label: 'Open Expenses Ledger', tab: 'expenses' },
      cards: [
        {
          title: 'Equal Split vs. Exact Custom Shares + Receipts',
          tag: 'Expense Logging',
          steps: [
            'Log any team purchase with a title, amount (₱), payer, and participating members.',
            'Choose Equal Split to divide costs automatically, or Exact Amounts to specify custom per-person shares with live sum validation.',
            'Attach a photo of the receipt so any member can inspect it in the full-screen image lightbox.'
          ],
          keywords: 'expenses split equal exact custom receipt lightbox peso amount'
        },
        {
          title: 'Smart Debt Simplification & Settle Up Proof',
          tag: 'Settlements',
          steps: [
            'GroupSpace automatically computes each member\'s net balance and simplifies circular debts into the fewest possible payments.',
            'Click Settle Up on any balance card to record a Full or Partial payment.',
            'Tag the payment method (GCash, Maya, Bank Transfer, or Cash), enter a reference number, and attach a proof-of-payment screenshot.'
          ],
          keywords: 'settle up debt simplification algorithm gcash maya bank transfer cash proof reference'
        }
      ]
    },
    {
      id: 'discussions',
      title: 'Discussions, @/# Mentions & Chat',
      shortTitle: 'Discussions & Mentions',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      summary: 'Cross-reference people, tasks, topics, and notebook pages with live autocomplete pills.',
      dashboardAction: { label: 'Open Discussions', tab: 'discussions' },
      cards: [
        {
          title: 'Interactive @Member and #Artifact Mention Pills',
          tag: 'Power Feature',
          steps: [
            'Inside any Discussion post or reply, type @ to open live autocomplete for team members (sends an instant notification alert).',
            'Type # to cross-reference Tasks (#task), Discussion Topics (#topic), Notebook Folders (#folder), or Notebook Pages (#page).',
            'Clicking any rendered mention pill jumps straight to that item and highlights it with a green pulse beacon.'
          ],
          keywords: 'mentions @ # autocomplete pill cross-reference task topic folder page beacon'
        },
        {
          title: 'Topic Categories, Pinned Replies & 1-on-1 Direct Messages',
          tag: 'Communication',
          steps: [
            'Organize threads by category (General, Announcement, Question, Decision, Idea) and attach images or files.',
            'Pin important replies inside a discussion thread so key decisions stay anchored at the top.',
            'Click the chat icon in the top header to open the 1-on-1 Direct Messaging drawer, complete with file attachments and pinned messages.'
          ],
          keywords: 'discussions categories pin reply direct messages dm chat drawer attachments'
        }
      ]
    },
    {
      id: 'personal',
      title: 'Personal Space & Account',
      shortTitle: 'Personal Space',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
      summary: 'Manage your private notes, personal to-do checklist, expense analytics, and profile identity.',
      dashboardAction: { label: 'Open Personal Space', tab: 'personal' },
      cards: [
        {
          title: '100% Private Notes, Checklist, Scratchpad & Expense Chart',
          tag: 'Private Workspace',
          steps: [
            'Everything inside Personal Space is strictly isolated to your account—no teammate or workspace leader can view it.',
            'Keep private rich-text notes in personal folders, manage a personal To-Do checklist, or jot quick reminders in the Quick Scratchpad.',
            'Track personal spending across 6 categories with an automatic SVG Donut Chart breakdown.'
          ],
          keywords: 'personal space private notes folders checklist scratchpad expense donut chart'
        },
        {
          title: 'Custom Avatar, Status Presets & Studio Daylight / Obsidian Themes',
          tag: 'Personalization',
          steps: [
            'Click your profile bar at the bottom of the sidebar (or avatar chip in Workspaces) to upload a profile picture, pick an avatar color swatch, or set a live status message.',
            'Toggle between Studio Daylight (Light Mode) and Obsidian (Dark Mode) from the account menu or header button—your preference syncs automatically across every page.'
          ],
          keywords: 'profile avatar photo color swatch status dark mode light theme'
        }
      ]
    }
  ];

  let activeGuideCategoryId = 'workspaces';
  let currentGuideSearchQuery = '';

  function escapeGuideHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildGuideContentHtml(isDashboardContext) {
    const query = currentGuideSearchQuery.trim().toLowerCase();
    let visibleCategories = GUIDE_CATEGORIES;

    if (query) {
      visibleCategories = GUIDE_CATEGORIES.map(cat => {
        const matchingCards = cat.cards.filter(card => {
          const haystack = `${cat.title} ${card.title} ${card.tag} ${card.keywords} ${card.steps.join(' ')}`.toLowerCase();
          return haystack.includes(query);
        });
        return { ...cat, cards: matchingCards };
      }).filter(cat => cat.cards.length > 0);
    } else {
      const selected = GUIDE_CATEGORIES.find(c => c.id === activeGuideCategoryId) || GUIDE_CATEGORIES[0];
      visibleCategories = [selected];
    }

    const tabsHtml = GUIDE_CATEGORIES.map(cat => {
      const isActive = !query && cat.id === activeGuideCategoryId;
      return `
        <button
          type="button"
          class="ug-tab-btn ${isActive ? 'active' : ''}"
          onclick="window.selectUserGuideCategory('${cat.id}')"
          aria-selected="${isActive ? 'true' : 'false'}"
        >
          ${cat.icon}
          <span>${escapeGuideHtml(cat.shortTitle)}</span>
        </button>
      `;
    }).join('');

    let bodyHtml = '';
    if (visibleCategories.length === 0) {
      bodyHtml = `
        <div class="ug-empty-state">
          <div class="ug-empty-title">No matching guide topics found</div>
          <p class="ug-empty-desc">Try searching for keywords like <code>#mention</code>, <code>approval</code>, <code>PDF</code>, <code>GCash</code>, or <code>grace period</code>.</p>
          <button type="button" class="btn-outline btn-sm" onclick="window.filterUserGuide('')">Clear Search</button>
        </div>
      `;
    } else {
      bodyHtml = visibleCategories.map(cat => {
        const actionBtnHtml = isDashboardContext && cat.dashboardAction
          ? `<button type="button" class="ug-try-btn" onclick="window.jumpFromUserGuide('${cat.dashboardAction.tab}')">${escapeGuideHtml(cat.dashboardAction.label)} &rarr;</button>`
          : `<a href="/workspaces.html" class="ug-try-btn">Open Workspaces &rarr;</a>`;

        const cardsHtml = cat.cards.map(card => `
          <article class="ug-card">
            <div class="ug-card-header">
              <h4 class="ug-card-title">${escapeGuideHtml(card.title)}</h4>
              <span class="ug-card-tag">${escapeGuideHtml(card.tag)}</span>
            </div>
            <ol class="ug-steps-list">
              ${card.steps.map(step => `<li>${escapeGuideHtml(step)}</li>`).join('')}
            </ol>
          </article>
        `).join('');

        return `
          <section class="ug-category-section">
            <div class="ug-category-banner">
              <div>
                <h3 class="ug-category-heading">${cat.icon}<span>${escapeGuideHtml(cat.title)}</span></h3>
                <p class="ug-category-summary">${escapeGuideHtml(cat.summary)}</p>
              </div>
              ${actionBtnHtml}
            </div>
            <div class="ug-cards-grid">
              ${cardsHtml}
            </div>
          </section>
        `;
      }).join('');
    }

    return { tabsHtml, bodyHtml };
  }

  function renderUserGuideTargets() {
    const isDashboard = typeof window.switchTab === 'function' && !!document.getElementById('tab-overview');
    const { tabsHtml, bodyHtml } = buildGuideContentHtml(isDashboard);

    const modalTabs = document.getElementById('userGuideModalTabs');
    const modalBody = document.getElementById('userGuideModalBody');
    if (modalTabs) modalTabs.innerHTML = tabsHtml;
    if (modalBody) modalBody.innerHTML = bodyHtml;

    const pageTabs = document.getElementById('userGuidePageTabs');
    const pageBody = document.getElementById('userGuidePageBody');
    if (pageTabs) pageTabs.innerHTML = tabsHtml;
    if (pageBody) pageBody.innerHTML = bodyHtml;
  }

  function ensureUserGuideModalMounted() {
    if (document.getElementById('userGuideModal')) return;
    const modalWrap = document.createElement('div');
    modalWrap.className = 'modal-overlay';
    modalWrap.id = 'userGuideModal';
    modalWrap.setAttribute('role', 'dialog');
    modalWrap.setAttribute('aria-modal', 'true');
    modalWrap.setAttribute('aria-labelledby', 'userGuideModalTitle');
    modalWrap.innerHTML = `
      <div class="modal-card ug-modal-card">
        <div class="modal-header ug-modal-header">
          <div>
            <h3 id="userGuideModalTitle" class="ug-modal-title">GroupSpace User Guide</h3>
            <p class="ug-modal-subtitle">Workflows, role permissions, keyboard syntax, and step-by-step feature reference.</p>
          </div>
          <div class="ug-modal-header-actions">
            <a href="/guide.html" target="_blank" rel="noopener" class="btn-outline btn-sm ug-fullpage-link" title="Open full-page guide in a new tab">Full Page &nearr;</a>
            <button type="button" class="modal-close" aria-label="Close User Guide" onclick="window.closeUserGuideModal()">✕</button>
          </div>
        </div>
        <div class="ug-search-bar-wrap">
          <svg class="ug-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input
            type="search"
            id="userGuideModalSearchInput"
            class="ug-search-input"
            placeholder="Search features (e.g. #mention, approval, PDF, GCash, grace period)..."
            aria-label="Search User Guide"
            oninput="window.filterUserGuide(this.value)"
          >
        </div>
        <div id="userGuideModalTabs" class="ug-tabs-strip" role="tablist" aria-label="User Guide Categories"></div>
        <div id="userGuideModalBody" class="ug-modal-body"></div>
      </div>
    `;
    modalWrap.addEventListener('click', (e) => {
      if (e.target === modalWrap) {
        window.closeUserGuideModal();
      }
    });
    document.body.appendChild(modalWrap);
  }

  window.openUserGuideModal = function (initialCategoryId) {
    ensureUserGuideModalMounted();
    if (initialCategoryId) {
      activeGuideCategoryId = initialCategoryId;
    }
    currentGuideSearchQuery = '';
    const searchInput = document.getElementById('userGuideModalSearchInput');
    if (searchInput) searchInput.value = '';
    renderUserGuideTargets();
    if (typeof window.openModal === 'function') {
      window.openModal('userGuideModal');
    } else {
      const modal = document.getElementById('userGuideModal');
      if (modal) modal.classList.add('active');
    }
  };

  window.closeUserGuideModal = function () {
    if (typeof window.closeModal === 'function') {
      window.closeModal('userGuideModal');
    } else {
      const modal = document.getElementById('userGuideModal');
      if (modal) modal.classList.remove('active');
    }
  };

  window.selectUserGuideCategory = function (categoryId) {
    activeGuideCategoryId = categoryId;
    currentGuideSearchQuery = '';
    const modalInput = document.getElementById('userGuideModalSearchInput');
    if (modalInput) modalInput.value = '';
    const pageInput = document.getElementById('userGuidePageSearchInput');
    if (pageInput) pageInput.value = '';
    renderUserGuideTargets();
  };

  window.filterUserGuide = function (query) {
    currentGuideSearchQuery = String(query || '');
    const modalInput = document.getElementById('userGuideModalSearchInput');
    if (modalInput && modalInput.value !== currentGuideSearchQuery) {
      modalInput.value = currentGuideSearchQuery;
    }
    const pageInput = document.getElementById('userGuidePageSearchInput');
    if (pageInput && pageInput.value !== currentGuideSearchQuery) {
      pageInput.value = currentGuideSearchQuery;
    }
    renderUserGuideTargets();
  };

  window.jumpFromUserGuide = function (tabId) {
    window.closeUserGuideModal();
    if (typeof window.switchTab === 'function' && tabId) {
      window.switchTab(tabId);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderUserGuideTargets);
  } else {
    renderUserGuideTargets();
  }
})();
