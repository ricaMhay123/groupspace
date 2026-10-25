/**
 * GroupSpace Dashboard Controller
 * Full client-side application state and view manager.
 */

let currentUser = null;
let currentGroupId = null;
let currentGroupDetails = null;
let currentTab = 'overview';
let personalSubTab = 'NOTE';
let activeTopicId = null;
let reviewTaskId = null;
let searchDebounceTimer = null;

// ================= INITIALIZATION ================= //
document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  if (!currentUser) return;

  // Setup user UI
  document.getElementById('userFullName').textContent = currentUser.fullName;
  document.getElementById('userAvatar').textContent = currentUser.avatarInitials || 'GS';

  // Load workspaces list
  await loadWorkspacesDropdown();
});

// ================= WORKSPACE SWITCHER ================= //
async function loadWorkspacesDropdown() {
  try {
    const res = await apiFetch('/api/groups');
    const switcher = document.getElementById('groupSwitcher');
    switcher.innerHTML = '';

    if (!res.data || res.data.length === 0) {
      // Show empty state inside dashboard instead of redirecting
      showDashboardEmptyState();
      return;
    }

    // Check URL param or localStorage (support groupId, workspaceId, workspace_id)
    const urlParams = new URLSearchParams(window.location.search);
    const urlGroupId = urlParams.get('groupId') || urlParams.get('workspaceId') || urlParams.get('workspace_id');
    const storedGroupId = localStorage.getItem('groupspace_active_group_id');

    let selectedId = urlGroupId || storedGroupId;
    const exists = res.data.find(g => String(g.id) === String(selectedId));
    if (!exists) {
      selectedId = res.data[0].id;
    }

    res.data.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = `${g.name} (${g.role})`;
      if (String(g.id) === String(selectedId)) {
        opt.selected = true;
      }
      switcher.appendChild(opt);
    });

    switchWorkspace(selectedId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showDashboardEmptyState() {
  // Update sidebar switcher to show placeholder
  const switcher = document.getElementById('groupSwitcher');
  if (switcher) {
    switcher.innerHTML = '<option value="">No workspaces yet</option>';
    switcher.disabled = true;
  }

  // Hide action button & join code badge
  const actionBtn = document.getElementById('primaryActionBtn');
  const joinBadge = document.getElementById('joinCodeBadge');
  if (actionBtn) actionBtn.style.display = 'none';
  if (joinBadge) joinBadge.style.display = 'none';

  // Replace main content with a beautiful empty state
  const main = document.querySelector('.dashboard-main');
  if (!main) return;

  main.innerHTML = `
    <div style="
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 100vh; padding: 40px 24px;
      text-align: center; background: #f1f5f9;
    ">
      <div style="
        background: #ffffff; border-radius: 24px; padding: 56px 48px;
        max-width: 520px; width: 100%;
        box-shadow: 0 8px 40px rgba(79,70,229,0.10);
        border: 1.5px solid #e2e8f0;
      ">
        <div style="font-size: 4rem; margin-bottom: 20px; line-height: 1;">🚀</div>
        <h2 style="font-size: 1.75rem; font-weight: 800; color: #0f172a; margin-bottom: 12px; letter-spacing: -0.5px;">
          Welcome to GroupSpace!
        </h2>
        <p style="color: #64748b; font-size: 1rem; line-height: 1.7; margin-bottom: 32px; max-width: 360px; margin-left: auto; margin-right: auto;">
          You're all set! Create your first workspace to start collaborating with your team on tasks, notes, expenses, and discussions.
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <a href="workspaces.html" style="
            display: flex; align-items: center; justify-content: center; gap: 8px;
            padding: 14px 28px; background: #4f46e5; color: #ffffff;
            border-radius: 12px; font-weight: 700; font-size: 0.95rem;
            text-decoration: none; box-shadow: 0 4px 14px rgba(79,70,229,0.35);
          ">✨ Create Your First Workspace</a>
          <a href="workspaces.html" style="
            display: flex; align-items: center; justify-content: center; gap: 8px;
            padding: 13px 28px; background: transparent; color: #4f46e5;
            border: 1.5px solid #c7d2fe; border-radius: 12px;
            font-weight: 600; font-size: 0.95rem; text-decoration: none;
          ">🔗 Join with Invite Code</a>
        </div>
        <div style="
          margin-top: 36px; padding-top: 28px; border-top: 1px solid #f1f5f9;
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
        ">
          <div><div style="font-size:1.5rem;margin-bottom:6px;">📋</div><div style="font-size:0.78rem;font-weight:600;color:#475569;">Kanban Tasks</div></div>
          <div><div style="font-size:1.5rem;margin-bottom:6px;">💬</div><div style="font-size:0.78rem;font-weight:600;color:#475569;">Discussions</div></div>
          <div><div style="font-size:1.5rem;margin-bottom:6px;">💰</div><div style="font-size:0.78rem;font-weight:600;color:#475569;">Expenses</div></div>
        </div>
      </div>
    </div>
  `;
}

async function switchWorkspace(groupId) {
  if (!groupId) return;
  currentGroupId = Number(groupId);
  localStorage.setItem('groupspace_active_group_id', currentGroupId);

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}`);
    currentGroupDetails = res.data;

    // Update Header
    document.getElementById('joinCodeBadge').style.display = 'flex';
    document.getElementById('displayJoinCode').textContent = currentGroupDetails.join_code;
    document.getElementById('userRoleBadge').textContent = currentGroupDetails.role;
    document.getElementById('userRoleBadge').className = `status ${currentGroupDetails.role === 'leader' ? 'online' : 'pending'}`;

    // Populate dropdowns that depend on group members
    populateMemberDropdowns(currentGroupDetails.members || []);

    // Refresh active view
    refreshCurrentView();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function copyJoinCode() {
  if (!currentGroupDetails) return;
  navigator.clipboard.writeText(currentGroupDetails.join_code);
  showToast(`Invite code ${currentGroupDetails.join_code} copied to clipboard!`, 'success');
}

function populateMemberDropdowns(members) {
  const taskAssignee = document.getElementById('taskAssignee');
  const expPaidBy = document.getElementById('expPaidBy');

  if (taskAssignee) {
    taskAssignee.innerHTML = '<option value="">Unassigned</option>' + members.map(m => `
      <option value="${m.user_id}">${escapeHtml(m.full_name)} (${m.role})</option>
    `).join('');
  }

  if (expPaidBy) {
    expPaidBy.innerHTML = members.map(m => `
      <option value="${m.user_id}" ${m.user_id === currentUser.id ? 'selected' : ''}>${escapeHtml(m.full_name)}</option>
    `).join('');
  }
}

// ================= TAB NAVIGATION ================= //
function switchTab(tabName) {
  currentTab = tabName;

  // Update sidebar menu active state
  const menuItems = document.querySelectorAll('#sidebarMenu li');
  const tabNames = ['overview', 'tasks', 'calendar', 'notebook', 'expenses', 'discussions', 'personal'];
  menuItems.forEach((li, idx) => {
    if (tabNames[idx] === tabName) {
      li.classList.add('active');
    } else {
      li.classList.remove('active');
    }
  });

  // Hide all views, show selected
  document.querySelectorAll('.tab-view').forEach(view => {
    view.style.display = 'none';
  });

  const target = document.getElementById(`tab-${tabName}`);
  if (target) target.style.display = 'block';

  // Update header text and primary action button
  const titleMap = {
    overview: 'Workspace Overview',
    tasks: 'Kanban Task Board',
    calendar: 'Team Calendar',
    notebook: 'Collaborative Notebook',
    expenses: 'Expense Ledger & Net Split',
    discussions: 'Topics & Discussions',
    personal: 'Isolated Personal Space'
  };

  const subtitleMap = {
    overview: `Overview for ${currentGroupDetails ? currentGroupDetails.name : 'Workspace'}`,
    tasks: 'Track progress with dual-approval quality control.',
    calendar: 'View events, deadlines, and task due dates.',
    notebook: 'Shared project documentation and specs.',
    expenses: 'Smart ledger with automatic debt simplification.',
    discussions: 'Brainstorm, discuss ideas, and follow activity.',
    personal: 'Private to your account. No other members can view this data.'
  };

  const actionMap = {
    overview: '+ Quick Task',
    tasks: '+ Create Task',
    calendar: '+ Add Event',
    notebook: '+ New Page',
    expenses: '+ Log Expense',
    discussions: '+ New Topic',
    personal: '+ Add Item'
  };

  document.getElementById('viewTitle').textContent = titleMap[tabName] || 'Dashboard';
  document.getElementById('viewSubtitle').textContent = subtitleMap[tabName] || '';
  document.getElementById('primaryActionBtn').textContent = actionMap[tabName] || '+ Action';

  refreshCurrentView();
}

function handlePrimaryAction() {
  if (currentTab === 'tasks' || currentTab === 'overview') openModal('createTaskModal');
  else if (currentTab === 'calendar') openAddEventModal();
  else if (currentTab === 'notebook') openModal('createNoteModal');
  else if (currentTab === 'expenses') openModal('createExpenseModal');
  else if (currentTab === 'discussions') openModal('createTopicModal');
  else if (currentTab === 'personal') openPersonalAddModal();
}

function refreshCurrentView() {
  if (!currentGroupId && currentTab !== 'personal') return;

  if (currentTab === 'overview') loadOverview();
  else if (currentTab === 'tasks') loadTasks();
  else if (currentTab === 'calendar') { if (typeof initCalendar === 'function') initCalendar(currentGroupId); }
  else if (currentTab === 'notebook') loadNotebook();
  else if (currentTab === 'expenses') loadExpenses();
  else if (currentTab === 'discussions') loadDiscussions();
  else if (currentTab === 'personal') loadPersonalItems();
}

// ================= TAB 1: OVERVIEW ================= //
async function loadOverview() {
  try {
    const [tasksRes, expRes, actRes] = await Promise.all([
      apiFetch(`/api/groups/${currentGroupId}/tasks`),
      apiFetch(`/api/groups/${currentGroupId}/expenses/summary`),
      apiFetch(`/api/groups/${currentGroupId}/discussions/activity`)
    ]);

    const tasks = tasksRes.data || [];
    const activeTasks = tasks.filter(t => t.status !== 'DONE').length;
    const pendingApproval = tasks.filter(t => t.status === 'PENDING_APPROVAL').length;

    document.getElementById('statActiveTasks').textContent = activeTasks;
    document.getElementById('statPendingApproval').textContent = pendingApproval;
    document.getElementById('statTotalSpent').textContent = `₱${(expRes.data?.totalSpent || 0).toFixed(2)}`;
    document.getElementById('statMemberCount').textContent = currentGroupDetails.members ? currentGroupDetails.members.length : 1;

    // Roster list
    const rosterEl = document.getElementById('overviewMemberList');
    if (currentGroupDetails.members) {
      rosterEl.innerHTML = currentGroupDetails.members.map(m => `
        <li style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="chat-avatar" style="width:34px; height:34px; font-size:13px;">${m.avatar_initials || 'GS'}</div>
            <div>
              <div style="font-weight:600; font-size:14px;">${escapeHtml(m.full_name)}</div>
              <div style="color:var(--gray); font-size:11px;">${escapeHtml(m.email)}</div>
            </div>
          </div>
          <span class="status ${m.role === 'leader' ? 'online' : 'pending'}" style="font-size:11px;">${m.role}</span>
        </li>
      `).join('');
    }

    // Activity feed
    const activityEl = document.getElementById('overviewActivityList');
    const activities = actRes.data || [];
    if (activities.length === 0) {
      activityEl.innerHTML = '<p style="color:var(--gray); font-size:14px; padding:15px;">No activity logged yet.</p>';
    } else {
      activityEl.innerHTML = activities.slice(0, 7).map(a => `
        <div class="activity-item">
          <div class="activity-icon">${getActivityIcon(a.action_type)}</div>
          <div style="flex:1;">
            <h4>${escapeHtml(a.description)}</h4>
            <p>${formatDate(a.created_at)}</p>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function getActivityIcon(type) {
  if (type.includes('FLAGGED') || type.includes('BLOCKED')) return '⚠️';
  if (type.includes('TASK')) return '📋';
  if (type.includes('EXPENSE')) return '💰';
  if (type.includes('NOTE') || type.includes('NOTEBOOK')) return '📝';
  if (type.includes('TOPIC') || type.includes('COMMENT')) return '💬';
  if (type.includes('WORKSPACE') || type.includes('MEMBER')) return '👥';
  return '⚡';
}

// ================= TAB 2: KANBAN TASKS & DUAL-APPROVAL ================= //
async function loadTasks() {
  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/tasks`);
    const tasks = res.data || [];

    const cols = {
      TODO: document.getElementById('col-todo'),
      IN_PROGRESS: document.getElementById('col-in_progress'),
      PENDING_APPROVAL: document.getElementById('col-pending_approval'),
      DONE: document.getElementById('col-done')
    };

    const counts = { TODO: 0, IN_PROGRESS: 0, PENDING_APPROVAL: 0, DONE: 0 };
    Object.values(cols).forEach(c => c.innerHTML = '');

    const isLeader = currentGroupDetails && currentGroupDetails.role === 'leader';

    tasks.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1;
      const targetCol = cols[t.status] || cols.TODO;

      const card = document.createElement('div');
      card.className = `kanban-card ${t.status === 'PENDING_APPROVAL' ? 'pending-approval' : t.status === 'DONE' ? 'done' : ''}`;
      
      const tagClass = `tag-${(t.priority || 'medium').toLowerCase()}`;
      
      let actionButtons = '';
      if (t.status === 'TODO') {
        actionButtons = `<button class="btn-task-action" onclick="updateTaskStatus(${t.id}, 'IN_PROGRESS')">▶ Start Task</button>`;
      } else if (t.status === 'IN_PROGRESS') {
        actionButtons = `<button class="btn-task-action btn-approve" onclick="updateTaskStatus(${t.id}, 'PENDING_APPROVAL')">🛡️ Submit for Review</button>`;
      } else if (t.status === 'PENDING_APPROVAL') {
        if (isLeader) {
          actionButtons = `<button class="btn-task-action btn-approve" onclick="openReviewModal(${t.id}, '${escapeHtml(t.title)}')">👑 Review & Approve</button>`;
        } else {
          actionButtons = `<span style="font-size:11px; color:var(--warning);">Awaiting Leader Review</span>`;
        }
      }

      // Enhance with peer help flag & assist controls if tasks.js is loaded
      const { flagHtml, actionExtra } = typeof enhanceTaskCardUI === 'function'
        ? enhanceTaskCardUI(t, isLeader, currentUser?.id)
        : { flagHtml: '', actionExtra: '' };

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
          <span class="task-tag ${tagClass}">${t.priority}</span>
          ${t.is_flagged ? '<span style="font-size:11px; color:#FF5252; font-weight:700;">⚠️ Blocked</span>' : ''}
        </div>
        ${flagHtml}
        <h4>${escapeHtml(t.title)}</h4>
        <p>${escapeHtml(t.description || 'No description.')}</p>
        
        ${t.approval_notes ? `
          <div style="font-size:12px; padding:6px 10px; background:#1C221F; border-radius:8px; border-left:3px solid var(--primary); margin-bottom:8px;">
            <strong>Leader Note:</strong> ${escapeHtml(t.approval_notes)}
          </div>
        ` : ''}

        <div class="task-meta">
          <span>👤 ${t.assignee_name ? escapeHtml(t.assignee_name) : 'Unassigned'}</span>
          <span style="cursor:pointer; color:#FF7272;" onclick="deleteTask(${t.id})">🗑️</span>
        </div>

        <div class="task-actions" style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
          ${actionButtons}
          ${actionExtra}
        </div>
      `;

      targetCol.appendChild(card);
    });

    document.getElementById('count-todo').textContent = counts.TODO;
    document.getElementById('count-in_progress').textContent = counts.IN_PROGRESS;
    document.getElementById('count-pending_approval').textContent = counts.PENDING_APPROVAL;
    document.getElementById('count-done').textContent = counts.DONE;

    if (typeof updateLeaderBacklogBadge === 'function') {
      updateLeaderBacklogBadge(counts.PENDING_APPROVAL, isLeader);
    }

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCreateTask(e) {
  e.preventDefault();
  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDesc').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const assignedToUserId = document.getElementById('taskAssignee').value;

  try {
    await apiFetch(`/api/groups/${currentGroupId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title, description, priority, assignedToUserId })
    });
    closeModal('createTaskModal');
    document.getElementById('createTaskForm').reset();
    showToast('Task added to board!', 'success');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateTaskStatus(taskId, status) {
  try {
    await apiFetch(`/api/groups/${currentGroupId}/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    showToast(`Task status updated.`, 'success');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openReviewModal(taskId, title) {
  reviewTaskId = taskId;
  document.getElementById('reviewTaskTitle').textContent = title;
  document.getElementById('reviewNotes').value = '';
  openModal('reviewTaskModal');
}

async function submitReview(approved) {
  if (!reviewTaskId) return;
  const approvalNotes = document.getElementById('reviewNotes').value.trim();

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/tasks/${reviewTaskId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved, approvalNotes })
    });
    closeModal('reviewTaskModal');
    showToast(res.message, 'success');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    await apiFetch(`/api/groups/${currentGroupId}/tasks/${taskId}`, { method: 'DELETE' });
    showToast('Task deleted.', 'success');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ================= TAB 3: NOTEBOOK ================= //
async function loadNotebook(query = '') {
  const container = document.getElementById('notebookGrid');
  if (!container || !currentGroupId) return;

  container.innerHTML = '<p style="color:var(--gray); padding:30px;">Loading notebook pages...</p>';

  try {
    // Primary: legacy flat notes endpoint
    const url = query
      ? `/api/groups/${currentGroupId}/notes?search=${encodeURIComponent(query)}`
      : `/api/groups/${currentGroupId}/notes`;

    let notes = [];
    try {
      const res = await apiFetch(url);
      notes = Array.isArray(res.data) ? res.data : [];
    } catch (primaryErr) {
      console.warn('[Notebook] Primary notes endpoint failed:', primaryErr.message);
    }

    // Fallback: collaborative notebooks endpoint
    if (notes.length === 0) {
      try {
        const nbRes = await apiFetch(`/api/notebooks/${currentGroupId}`);
        // Try flat notes from response
        if (Array.isArray(nbRes.notes) && nbRes.notes.length > 0) {
          notes = nbRes.notes;
        } else if (Array.isArray(nbRes.data) && nbRes.data.length > 0) {
          // nbRes.data are notebook objects — fetch pages from first one
          const primaryNotebook = nbRes.data[0];
          try {
            const pagesRes = await apiFetch(`/api/notebooks/${primaryNotebook.id}/pages`);
            const pagesData = pagesRes.data;
            if (pagesData && Array.isArray(pagesData.pages)) {
              notes = pagesData.pages.map(p => ({
                id: p.id,
                title: p.title,
                content: p.content || '',
                tags: '',
                is_pinned: false,
                author_name: p.author_name || 'Member'
              }));
            }
          } catch (pagesErr) {
            console.warn('[Notebook] Pages fetch failed:', pagesErr.message);
          }
        }
      } catch (nbErr) {
        console.warn('[Notebook] Collaborative notebooks endpoint failed:', nbErr.message);
      }
    }

    if (!notes || notes.length === 0) {
      container.innerHTML = '<p style="color:var(--gray); padding:30px;">No notebook pages yet. Click <strong>+ New Page</strong> to create one!</p>';
      return;
    }

    container.innerHTML = notes.map(n => `
      <div class="note-card ${n.is_pinned ? 'pinned' : ''}" style="cursor:pointer;" onclick="window.location.href='/notebook.html?groupId=' + currentGroupId + '&noteId=' + ${n.id}" title="Click to open in Full Editor">
        <div>
          <h4 style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            ${escapeHtml(n.title || 'Untitled')}
            <span style="font-size:11px; padding:2px 8px; background:rgba(82,214,138,0.15); color:#52D68A; border-radius:12px; font-weight:600; white-space:nowrap;">↗ Edit</span>
          </h4>
          <p style="white-space:pre-wrap;">${escapeHtml(n.content || '')}</p>
        </div>
        <div onclick="event.stopPropagation();">
          ${n.tags ? `
            <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
              ${n.tags.split(',').filter(t => t.trim()).map(t => `<span style="font-size:11px; padding:2px 8px; background:#202522; border-radius:6px; color:var(--primary); font-weight:600;">#${escapeHtml(t.trim())}</span>`).join('')}
            </div>
          ` : ''}
          <div class="note-meta" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:12px;">
            <span>✍️ ${escapeHtml(n.author_name || 'Member')}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <button type="button" title="Download Plain Text (.txt)" class="btn-export-badge" onclick="exportNotebook('txt', ${n.id}, '${escapeHtml(n.title)}', '${escapeHtml(n.content || '')}')" style="background:#1B231E; border:1px solid #2B342F; color:#E1E7E3; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">📄 .txt</button>
              <button type="button" title="Download PDF (.pdf)" class="btn-export-badge" onclick="exportNotebook('pdf', ${n.id}, '${escapeHtml(n.title)}', '${escapeHtml(n.content || '')}')" style="background:#1B231E; border:1px solid #2B342F; color:#E1E7E3; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">📕 .pdf</button>
              <button type="button" title="Download Word (.docx)" class="btn-export-badge" onclick="exportNotebook('docx', ${n.id}, '${escapeHtml(n.title)}', '${escapeHtml(n.content || '')}')" style="background:#1B231E; border:1px solid #2B342F; color:#E1E7E3; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">📘 .docx</button>
              <span style="cursor:pointer; color:#FF7272; margin-left:4px;" title="Delete Note" onclick="deleteNote(${n.id})">🗑️</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('[Notebook] loadNotebook error:', err);
    container.innerHTML = '<p style="color:var(--danger,#ff6b6b); padding:30px;">Error loading notebook. Please try again.</p>';
  }
}

function debounceNotesSearch() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    const q = document.getElementById('noteSearchInput').value.trim();
    loadNotebook(q);
  }, 300);
}

async function handleCreateNote(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }

  const titleEl   = document.getElementById('noteTitle');
  const contentEl = document.getElementById('noteContent');
  const tagsEl    = document.getElementById('noteTags');
  const pinnedEl  = document.getElementById('notePinned');

  const title    = titleEl ? titleEl.value.trim() : '';
  const content  = contentEl ? contentEl.value : '';
  const tags     = tagsEl ? tagsEl.value.trim() : '';
  const isPinned = pinnedEl ? pinnedEl.checked : false;

  if (!title) {
    showToast('Page title is required.', 'error');
    if (titleEl) titleEl.focus();
    return;
  }

  // Find submit button to toggle loading state and prevent duplicate submissions
  const submitBtn = e && e.target ? e.target.querySelector('button[type="submit"]') : null;
  const originalText = submitBtn ? submitBtn.textContent : 'Save Page';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ title, content, tags, isPinned })
    });

    closeModal('createNoteModal');

    const form = document.getElementById('createNoteForm');
    if (form) form.reset();

    showToast('Page added! Opening in editor...', 'success');
    await loadNotebook();

    const newNoteId = res && res.data ? res.data.id : null;
    if (newNoteId) {
      window.location.href = `/notebook.html?groupId=${currentGroupId}&noteId=${newNoteId}`;
    }
  } catch (err) {
    console.error('Error saving notebook page:', err);
    showToast(err.message || 'Failed to save notebook page.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

async function deleteNote(noteId) {
  if (!confirm('Are you sure you want to delete this notebook page?')) return;
  try {
    await apiFetch(`/api/groups/${currentGroupId}/notes/${noteId}`, { method: 'DELETE' });
    showToast('Note deleted.', 'success');
    loadNotebook();
  } catch (err) {
    // Fallback: try notebook pages delete endpoint
    try {
      await apiFetch(`/api/notebooks/${noteId}/pages/${noteId}`, { method: 'DELETE' });
      showToast('Note deleted.', 'success');
      loadNotebook();
    } catch (e2) {
      showToast(err.message || 'Failed to delete note.', 'error');
    }
  }
}

// ================= PERSONAL FEED DRAWER ================= //
let personalFeedOpen = false;

async function openPersonalFeedDrawer() {
  const drawer = document.getElementById('personalFeedDrawer');
  if (!drawer) { injectPersonalFeedDrawer(); return openPersonalFeedDrawer(); }

  personalFeedOpen = !personalFeedOpen;
  drawer.style.transform = personalFeedOpen ? 'translateX(0)' : 'translateX(100%)';

  if (personalFeedOpen) {
    await renderPersonalFeed();
  }
}

function injectPersonalFeedDrawer() {
  if (document.getElementById('personalFeedDrawer')) return;

  const drawerHtml = `
    <div id="personalFeedDrawer" style="
      position:fixed; top:0; right:0; width:340px; height:100vh;
      background:var(--sidebar-bg,#0f1613); border-left:1px solid var(--border,#2B342F);
      z-index:9999; transform:translateX(100%); transition:transform 0.3s cubic-bezier(.4,0,.2,1);
      display:flex; flex-direction:column; overflow:hidden;
      box-shadow:-8px 0 32px rgba(0,0,0,0.35);
    ">
      <div style="padding:20px 18px 14px; border-bottom:1px solid var(--border,#2B342F); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:700; color:var(--text,#E1E7E3);">🔔 My Feed</h3>
          <p style="margin:4px 0 0; font-size:12px; color:var(--gray,#7A8C84);">Mentions, approvals & help requests</p>
        </div>
        <button onclick="openPersonalFeedDrawer()" style="background:none; border:none; color:var(--gray,#7A8C84); font-size:18px; cursor:pointer; padding:4px 8px;">✕</button>
      </div>
      <div id="personalFeedContent" style="flex:1; overflow-y:auto; padding:16px;">
        <p style="color:var(--gray,#7A8C84); text-align:center; padding:30px 0;">Loading feed...</p>
      </div>
    </div>
    <button id="feedBellBtn" onclick="openPersonalFeedDrawer()" title="Open Personal Feed" style="
      position:fixed; bottom:24px; right:24px; z-index:9998;
      width:48px; height:48px; border-radius:50%; border:none;
      background:var(--primary,#52D68A); color:#fff; font-size:20px;
      cursor:pointer; box-shadow:0 4px 16px rgba(82,214,138,0.4);
      display:flex; align-items:center; justify-content:center;
      transition:transform 0.2s; animation: feedPulse 2.5s infinite;
    ">🔔</button>
    <style>
      @keyframes feedPulse {
        0%,100%{box-shadow:0 4px 16px rgba(82,214,138,0.4);}
        50%{box-shadow:0 4px 28px rgba(82,214,138,0.75);}
      }
    </style>
  `;
  document.body.insertAdjacentHTML('beforeend', drawerHtml);
}

async function renderPersonalFeed() {
  const content = document.getElementById('personalFeedContent');
  if (!content) return;
  content.innerHTML = '<p style="color:var(--gray,#7A8C84); text-align:center; padding:30px 0;">Loading feed...</p>';

  try {
    const res = await apiFetch('/api/user/personal-feed');
    const data = res.data || {};
    const mentions = data.mentions || [];
    const pendingApprovals = data.pendingApprovals || [];
    const helpRequests = data.helpRequests || [];

    const total = mentions.length + pendingApprovals.length + helpRequests.length;

    // Update bell badge
    const bellBtn = document.getElementById('feedBellBtn');
    if (bellBtn) {
      bellBtn.innerHTML = total > 0 ? `🔔<span style="position:absolute;top:6px;right:6px;background:#FF5252;color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;">${total > 9 ? '9+' : total}</span>` : '🔔';
      if (total > 0) bellBtn.style.position = 'fixed';
    }

    if (total === 0) {
      content.innerHTML = `
        <div style="text-align:center; padding:40px 20px;">
          <div style="font-size:3rem; margin-bottom:12px;">✅</div>
          <h4 style="color:var(--text,#E1E7E3); margin-bottom:6px;">You're all caught up!</h4>
          <p style="color:var(--gray,#7A8C84); font-size:13px;">No pending mentions, approvals or help requests.</p>
        </div>
      `;
      return;
    }

    let html = '';

    if (pendingApprovals.length > 0) {
      html += `<div style="margin-bottom:20px;">
        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--warning,#FFB347); margin-bottom:10px;">⏳ Pending Approvals (${pendingApprovals.length})</h4>
        ${pendingApprovals.map(t => `
          <div style="background:#1C2A22; border:1px solid #2B4028; border-radius:10px; padding:12px 14px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div style="font-weight:600; font-size:13px; color:#E1E7E3;">${escapeHtml(t.title)}</div>
              <span style="font-size:10px; padding:2px 8px; background:#FFB34722; color:#FFB347; border-radius:20px; font-weight:700; white-space:nowrap; margin-left:8px;">PENDING</span>
            </div>
            <div style="font-size:11px; color:var(--gray,#7A8C84); margin-top:4px;">Requested by: ${escapeHtml(t.creator_name || 'Member')}</div>
            <div style="display:flex; gap:8px; margin-top:10px;">
              <button onclick="approveTask(${t.id}, true); renderPersonalFeed();" style="flex:1; padding:6px; background:#52D68A; border:none; color:#0a1610; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">✅ Approve</button>
              <button onclick="approveTask(${t.id}, false); renderPersonalFeed();" style="flex:1; padding:6px; background:#2B342F; border:1px solid #3D5045; color:#E1E7E3; border-radius:6px; font-size:12px; cursor:pointer;">🔄 Revise</button>
            </div>
          </div>
        `).join('')}
      </div>`;
    }

    if (helpRequests.length > 0) {
      html += `<div style="margin-bottom:20px;">
        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#FF7272; margin-bottom:10px;">⚠️ Help Needed (${helpRequests.length})</h4>
        ${helpRequests.map(t => `
          <div style="background:#2A1C1C; border:1px solid #3D2828; border-radius:10px; padding:12px 14px; margin-bottom:8px;">
            <div style="font-weight:600; font-size:13px; color:#E1E7E3;">${escapeHtml(t.title)}</div>
            <div style="font-size:11px; color:var(--gray,#7A8C84); margin-top:4px;">
              ${t.flagged_reason ? `Blocked: ${escapeHtml(t.flagged_reason)}` : 'Member needs peer assistance'}
            </div>
            <div style="font-size:11px; color:#7A8C84; margin-top:2px;">Assigned to: ${escapeHtml(t.assignee_name || 'Member')}</div>
            <button onclick="switchTab('tasks'); openPersonalFeedDrawer();" style="width:100%; margin-top:10px; padding:6px; background:#2B342F; border:1px solid #FF727244; color:#FF9999; border-radius:6px; font-size:12px; cursor:pointer;">🙋 View in Tasks</button>
          </div>
        `).join('')}
      </div>`;
    }

    if (mentions.length > 0) {
      html += `<div style="margin-bottom:20px;">
        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--primary,#52D68A); margin-bottom:10px;">💬 Mentions (${mentions.length})</h4>
        ${mentions.map(m => `
          <div style="background:#1C221F; border:1px solid #2B342F; border-radius:10px; padding:12px 14px; margin-bottom:8px;">
            <div style="font-size:13px; color:#E1E7E3;">${escapeHtml(m.content || '')}</div>
            <div style="font-size:11px; color:var(--gray,#7A8C84); margin-top:6px;">— ${escapeHtml(m.author_name || 'Member')} · ${formatDate(m.created_at)}</div>
          </div>
        `).join('')}
      </div>`;
    }

    content.innerHTML = html;
  } catch (err) {
    console.warn('[PersonalFeed] Error:', err);
    content.innerHTML = `<p style="color:var(--gray,#7A8C84); text-align:center; padding:30px;">Feed unavailable — check back later.</p>`;
  }
}

// Auto-inject drawer when dashboard loads
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(injectPersonalFeedDrawer, 500);
});

// ================= TAB 4: EXPENSES & SETTLEMENTS ================= //
async function loadExpenses() {
  try {
    const [expensesRes, summaryRes] = await Promise.all([
      apiFetch(`/api/groups/${currentGroupId}/expenses`),
      apiFetch(`/api/groups/${currentGroupId}/expenses/summary`)
    ]);

    const expenses = expensesRes.data || [];
    const summary = summaryRes.data || { totalSpent: 0, memberBalances: [], settlements: [] };

    document.getElementById('expTotalSpent').textContent = `₱${summary.totalSpent.toFixed(2)}`;
    
    // Find current user balance
    const myBalance = summary.memberBalances.find(b => Number(b.userId) === Number(currentUser.id));
    const netEl = document.getElementById('expYourNet');
    if (myBalance) {
      if (myBalance.net > 0) {
        netEl.textContent = `+₱${myBalance.net.toFixed(2)} (Owed to you)`;
        netEl.style.color = 'var(--primary)';
      } else if (myBalance.net < 0) {
        netEl.textContent = `-₱${Math.abs(myBalance.net).toFixed(2)} (You owe)`;
        netEl.style.color = '#FF7272';
      } else {
        netEl.textContent = '₱0.00 (Settled)';
        netEl.style.color = 'white';
      }
    } else {
      netEl.textContent = '₱0.00';
    }

    // Settlements plan
    const settlementsEl = document.getElementById('settlementList');
    const settlements = summary.settlements || [];
    document.getElementById('expSettlementCount').textContent = settlements.length;

    if (settlements.length === 0) {
      settlementsEl.innerHTML = '<p style="color:var(--gray); padding:10px 0;">All balances settled! Nobody owes anything right now.</p>';
    } else {
      settlementsEl.innerHTML = settlements.map(s => `
        <div class="settlement-card">
          <div style="display:flex; align-items:center; gap:12px;">
            <span class="settlement-payer">👤 ${escapeHtml(s.fromName)}</span>
            <span class="settlement-arrow">pays →</span>
            <span class="settlement-receiver">👤 ${escapeHtml(s.toName)}</span>
          </div>
          <span class="settlement-amount">₱${s.amount.toFixed(2)}</span>
        </div>
      `).join('');
    }

    // Ledger table
    const tableBody = document.getElementById('expenseTableBody');
    if (expenses.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="color:var(--gray); text-align:center; padding:20px;">No expenses logged yet.</td></tr>';
      return;
    }

    tableBody.innerHTML = expenses.map(e => `
      <tr>
        <td>${escapeHtml(e.date || '')}</td>
        <td><strong>${escapeHtml(e.title)}</strong></td>
        <td><span style="padding:3px 8px; background:#202522; border-radius:6px; font-size:12px;">${escapeHtml(e.category)}</span></td>
        <td>${escapeHtml(e.payer_name)}</td>
        <td>${e.splits ? `${e.splits.length} members` : 'Equal'}</td>
        <td style="color:var(--primary); font-weight:700;">₱${Number(e.amount).toFixed(2)}</td>
        <td>
          <button style="background:transparent; border:none; color:#FF7272; cursor:pointer;" onclick="deleteExpense(${e.id})">🗑️</button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCreateExpense(e) {
  e.preventDefault();
  const title = document.getElementById('expTitle').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  const category = document.getElementById('expCategory').value;
  const paidByUserId = document.getElementById('expPaidBy').value;
  const splitType = document.getElementById('expSplitType').value;

  try {
    await apiFetch(`/api/groups/${currentGroupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify({ title, amount, category, paidByUserId, splitType })
    });
    closeModal('createExpenseModal');
    document.getElementById('createExpenseForm').reset();
    showToast('Expense added to ledger!', 'success');
    loadExpenses();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteExpense(expenseId) {
  if (!confirm('Are you sure you want to delete this expense?')) return;
  try {
    await apiFetch(`/api/groups/${currentGroupId}/expenses/${expenseId}`, { method: 'DELETE' });
    showToast('Expense removed.', 'success');
    loadExpenses();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ================= TAB 5: DISCUSSIONS ================= //
async function loadDiscussions() {
  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/discussions`);
    const topics = res.data || [];
    const container = document.getElementById('topicsList');

    if (topics.length === 0) {
      container.innerHTML = '<p style="color:var(--gray); padding:20px;">No topics started yet. Create one!</p>';
      return;
    }

    container.innerHTML = topics.map(t => `
      <div class="file-item" onclick="selectTopic(${t.id}, '${escapeHtml(t.title)}')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="margin-bottom:4px;">${escapeHtml(t.title)}</h4>
          <span style="font-size:12px; color:var(--primary);">${t.comment_count || 0} 💬</span>
        </div>
        <div style="font-size:12px; color:var(--gray);">Started by ${escapeHtml(t.author_name)} • ${formatDate(t.created_at)}</div>
      </div>
    `).join('');

    // If no topic selected, select the first one automatically
    if (!activeTopicId && topics.length > 0) {
      selectTopic(topics[0].id, topics[0].title);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function selectTopic(topicId, title) {
  activeTopicId = topicId;
  document.getElementById('activeTopicTitle').textContent = title;
  document.getElementById('postCommentForm').style.display = 'block';

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/discussions/${topicId}`);
    const comments = res.data.comments || [];
    const container = document.getElementById('commentsContainer');

    if (comments.length === 0) {
      container.innerHTML = '<p style="color:var(--gray); text-align:center; padding:20px;">No replies yet. Be the first to reply!</p>';
      return;
    }

    container.innerHTML = comments.map(c => `
      <div class="chat-message">
        <div class="chat-avatar">${c.user_initials || 'GS'}</div>
        <div class="chat-content">
          <h4>${escapeHtml(c.user_name)}</h4>
          <p>${escapeHtml(c.content)}</p>
          <span>${formatDate(c.created_at)}</span>
        </div>
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCreateTopic(e) {
  e.preventDefault();
  const title = document.getElementById('topicTitle').value.trim();
  const category = document.getElementById('topicCategory').value;

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/discussions`, {
      method: 'POST',
      body: JSON.stringify({ title, category })
    });
    closeModal('createTopicModal');
    document.getElementById('createTopicForm').reset();
    showToast('Topic created!', 'success');
    loadDiscussions();
    selectTopic(res.data.id, res.data.title);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handlePostComment(e) {
  e.preventDefault();
  if (!activeTopicId) return;

  const input = document.getElementById('newCommentInput');
  const content = input.value.trim();
  if (!content) return;

  try {
    await apiFetch(`/api/groups/${currentGroupId}/discussions/${activeTopicId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    input.value = '';
    selectTopic(activeTopicId, document.getElementById('activeTopicTitle').textContent);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ================= TAB 6: ISOLATED PERSONAL SPACE ================= //
function switchPersonalSubTab(type) {
  personalSubTab = type;
  document.querySelectorAll('.personal-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(type === 'NOTE' ? 'Notes' : type === 'TASK' ? 'To-Dos' : 'Budget'));
  });

  const headingMap = {
    NOTE: 'Private Notes',
    TASK: 'Personal To-Dos',
    EXPENSE: 'Personal Budget & Expenses'
  };
  document.getElementById('personalSubTabTitle').textContent = headingMap[type];
  loadPersonalItems();
}

function openPersonalAddModal() {
  const headingMap = {
    NOTE: 'Add Private Note',
    TASK: 'Add Personal To-Do',
    EXPENSE: 'Log Personal Expense'
  };
  document.getElementById('personalModalHeading').textContent = headingMap[personalSubTab];
  document.getElementById('personalAmountGroup').style.display = personalSubTab === 'EXPENSE' ? 'block' : 'none';
  document.getElementById('personalItemTitle').placeholder = personalSubTab === 'EXPENSE' ? 'Item name (e.g. Textbook)' : 'Title';
  openModal('personalItemModal');
}

async function loadPersonalItems() {
  try {
    const res = await apiFetch(`/api/personal?type=${personalSubTab}`);
    const items = res.data || [];
    const container = document.getElementById('personalItemsContainer');

    if (items.length === 0) {
      container.innerHTML = '<p style="color:var(--gray); padding:30px;">Your private space is empty for this category. Click "+ Add Item" to store private notes or tasks!</p>';
      return;
    }

    if (personalSubTab === 'NOTE') {
      container.innerHTML = `
        <div class="notebook-grid">
          ${items.map(n => `
            <div class="note-card">
              <h4>${escapeHtml(n.title)}</h4>
              <p>${escapeHtml(n.content || '')}</p>
              <div class="note-meta">
                <span>🔒 Private</span>
                <span style="cursor:pointer; color:#FF7272;" onclick="deletePersonalItem(${n.id})">🗑️</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (personalSubTab === 'TASK') {
      container.innerHTML = `
        <ul class="task-list">
          ${items.map(t => `
            <li style="display:flex; justify-content:space-between; align-items:center;">
              <label style="display:flex; align-items:center; gap:12px; cursor:pointer; flex:1;">
                <input type="checkbox" ${t.status === 'COMPLETED' ? 'checked' : ''} onchange="togglePersonalTask(${t.id}, this.checked)">
                <span style="${t.status === 'COMPLETED' ? 'text-decoration:line-through; color:var(--gray);' : ''}">${escapeHtml(t.title)}</span>
              </label>
              <span style="cursor:pointer; color:#FF7272;" onclick="deletePersonalItem(${t.id})">🗑️</span>
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      // Expense
      const total = items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      container.innerHTML = `
        <div style="margin-bottom:18px; font-size:18px; color:var(--primary); font-weight:700;">
          Total Personal Spending: ₱${total.toFixed(2)}
        </div>
        <table class="expense-table">
          <thead><tr><th>Item</th><th>Category</th><th>Amount</th><th>Action</th></tr></thead>
          <tbody>
            ${items.map(e => `
              <tr>
                <td><strong>${escapeHtml(e.title)}</strong></td>
                <td>${escapeHtml(e.category || 'General')}</td>
                <td style="color:var(--primary); font-weight:600;">₱${Number(e.amount).toFixed(2)}</td>
                <td><span style="cursor:pointer; color:#FF7272;" onclick="deletePersonalItem(${e.id})">🗑️</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSavePersonalItem(e) {
  e.preventDefault();
  const title = document.getElementById('personalItemTitle').value.trim();
  const content = document.getElementById('personalItemContent').value;
  const amount = parseFloat(document.getElementById('personalItemAmount').value) || 0;

  try {
    await apiFetch('/api/personal', {
      method: 'POST',
      body: JSON.stringify({
        type: personalSubTab,
        title,
        content,
        amount
      })
    });
    closeModal('personalItemModal');
    document.getElementById('personalItemForm').reset();
    showToast('Saved to your private space!', 'success');
    loadPersonalItems();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function togglePersonalTask(id, checked) {
  try {
    await apiFetch(`/api/personal/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: checked ? 'COMPLETED' : 'PENDING' })
    });
    loadPersonalItems();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deletePersonalItem(id) {
  if (!confirm('Remove item from your personal space?')) return;
  try {
    await apiFetch(`/api/personal/${id}`, { method: 'DELETE' });
    showToast('Item deleted.', 'success');
    loadPersonalItems();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ================= MODAL HELPERS ================= //
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
