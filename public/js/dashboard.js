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

  // Start presence heartbeat polling (2-minute window)
  startPresenceHeartbeat();

  // Setup user UI if present
  const uFullNameEl = document.getElementById('userFullName');
  if (uFullNameEl) uFullNameEl.textContent = currentUser.fullName;
  const uAvatarEl = document.getElementById('userAvatar');
  if (uAvatarEl) uAvatarEl.textContent = currentUser.avatarInitials || 'GS';

  // Load workspaces list
  await loadWorkspacesDropdown();
});

function startPresenceHeartbeat() {
  const sendHeartbeat = () => {
    apiFetch('/api/auth/heartbeat', { method: 'POST' }).catch(() => {});
  };
  sendHeartbeat();
  setInterval(sendHeartbeat, 60000);
  window.addEventListener('focus', sendHeartbeat);
}

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

    window.currentGroupId = Number(selectedId);
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
        <div style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #4f46e5; margin-bottom: 12px;">GETTING STARTED</div>
        <h2 style="font-size: 1.75rem; font-weight: 800; color: #0f172a; margin-bottom: 12px; letter-spacing: -0.5px;">
          Welcome to GroupSpace
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
          ">+ Create Your First Workspace</a>
          <a href="workspaces.html" style="
            display: flex; align-items: center; justify-content: center; gap: 8px;
            padding: 13px 28px; background: transparent; color: #4f46e5;
            border: 1.5px solid #c7d2fe; border-radius: 12px;
            font-weight: 600; font-size: 0.95rem; text-decoration: none;
          ">Join with Invite Code</a>
        </div>
        <div style="
          margin-top: 36px; padding-top: 28px; border-top: 1px solid #f1f5f9;
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
        ">
          <div><div style="font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6366f1;margin-bottom:4px;">01</div><div style="font-size:0.78rem;font-weight:600;color:#475569;">Kanban Tasks</div></div>
          <div><div style="font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6366f1;margin-bottom:4px;">02</div><div style="font-size:0.78rem;font-weight:600;color:#475569;">Discussions</div></div>
          <div><div style="font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6366f1;margin-bottom:4px;">03</div><div style="font-size:0.78rem;font-weight:600;color:#475569;">Expenses</div></div>
        </div>
      </div>
    </div>
  `;
}

async function switchWorkspace(groupId) {
  if (!groupId) return;
  currentGroupId = Number(groupId);
  window.currentGroupId = currentGroupId;
  localStorage.setItem('groupspace_active_group_id', currentGroupId);

  // Reset discussions state to prevent leaking previous workspace topic/comments
  activeTopicId = null;
  const activeTopicTitle = document.getElementById('activeTopicTitle');
  if (activeTopicTitle) activeTopicTitle.textContent = 'Select a Topic';
  const activeTopicMeta = document.getElementById('activeTopicMeta');
  if (activeTopicMeta) activeTopicMeta.textContent = '';
  const activeTopicAttachments = document.getElementById('activeTopicAttachments');
  if (activeTopicAttachments) activeTopicAttachments.innerHTML = '';
  pendingTopicAttachments = [];
  pendingCommentAttachments = [];
  if (typeof renderTopicAttachmentsPreview === 'function') renderTopicAttachmentsPreview();
  if (typeof renderCommentAttachmentsPreview === 'function') renderCommentAttachmentsPreview();
  const commentsContainer = document.getElementById('commentsContainer');
  if (commentsContainer) {
    commentsContainer.innerHTML = '<p style="color:var(--gray); text-align:center; padding:30px;">Click on a topic to view its replies and thread discussion.</p>';
  }
  const postCommentForm = document.getElementById('postCommentForm');
  if (postCommentForm) postCommentForm.style.display = 'none';
  if (typeof window.resetDiscussionMentions === 'function') {
    window.resetDiscussionMentions();
  }
  if (typeof window.refreshAppFeed === 'function') {
    window.refreshAppFeed();
  }

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}`);
    currentGroupDetails = res.data;
    window.currentGroupDetails = currentGroupDetails;
    window.currentGroupId = currentGroupId;

    // Update Header
    const jcBadge = document.getElementById('joinCodeBadge');
    if (jcBadge) {
      jcBadge.style.display = 'flex';
      const djc = document.getElementById('displayJoinCode');
      if (djc) djc.textContent = currentGroupDetails.join_code;
    }
    const roleBadge = document.getElementById('userRoleBadge');
    if (roleBadge) {
      const r = String(currentGroupDetails.role || '').toLowerCase();
      roleBadge.textContent = r === 'co_leader' ? 'Co-Leader' : (r === 'leader' ? 'Leader' : 'Member');
      roleBadge.className = `status ${r === 'leader' || r === 'co_leader' ? 'online' : 'pending'}`;
    }

    // Populate dropdowns that depend on group members
    populateMemberDropdowns(currentGroupDetails.members || []);

    // Check if URL requested a specific tab (e.g. ?tab=personal)
    const urlParams = new URLSearchParams(window.location.search);
    const requestedTab = urlParams.get('tab');
    if (requestedTab && ['overview', 'tasks', 'calendar', 'notebook', 'expenses', 'discussions', 'personal'].includes(requestedTab)) {
      switchTab(requestedTab);
      return;
    }

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
  const taskNote = document.getElementById('taskAssigneeNote');

  if (taskAssignee) {
    const isLeader = currentGroupDetails && (currentGroupDetails.role === 'leader' || currentGroupDetails.role === 'co_leader');
    if (!isLeader && currentUser) {
      taskAssignee.innerHTML = `<option value="${currentUser.id}" selected>${escapeHtml(currentUser.full_name || 'Myself')} (You - Self-Assigned)</option>`;
      taskAssignee.disabled = true;
      taskAssignee.title = 'Members can only create tasks for themselves (submits to Leader Pending Approval queue).';
      if (taskNote) taskNote.style.display = 'block';
    } else {
      taskAssignee.disabled = false;
      taskAssignee.title = 'Assign to a team member or leave unassigned';
      if (taskNote) taskNote.style.display = 'none';
      taskAssignee.innerHTML = '<option value="">Unassigned</option>' + members.map(m => `
        <option value="${m.user_id}">${escapeHtml(m.full_name)} (${m.role})</option>
      `).join('');
    }
  }

  if (expPaidBy) {
    expPaidBy.innerHTML = members.map(m => `
      <option value="${m.user_id}" ${m.user_id === currentUser.id ? 'selected' : ''}>${escapeHtml(m.full_name)}</option>
    `).join('');
  }
}

function openCreateTaskModal(e = null) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const taskAssignee = document.getElementById('taskAssignee');
  const taskNote = document.getElementById('taskAssigneeNote');
  const isLeader = currentGroupDetails && (currentGroupDetails.role === 'leader' || currentGroupDetails.role === 'co_leader');

  if (taskAssignee) {
    if (!isLeader && currentUser) {
      taskAssignee.innerHTML = `<option value="${currentUser.id}" selected>${escapeHtml(currentUser.full_name || 'Myself')} (You - Self-Assigned)</option>`;
      taskAssignee.disabled = true;
      taskAssignee.title = 'Members can only create tasks for themselves (submits to Leader Pending Approval queue).';
      if (taskNote) taskNote.style.display = 'block';
    } else {
      taskAssignee.disabled = false;
      if (taskNote) taskNote.style.display = 'none';
    }
  }
  openModal('createTaskModal');
}
window.openCreateTaskModal = openCreateTaskModal;

// ================= MOBILE SIDEBAR DRAWER TOGGLE ================= //
function toggleMobileSidebar(forceState) {
  const sidebar = document.getElementById('dashboardSidebar') || document.querySelector('.dashboard-sidebar');
  const overlay = document.getElementById('sidebarDrawerOverlay');
  if (!sidebar) return;

  const isOpen = typeof forceState === 'boolean' ? forceState : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', isOpen);
  if (overlay) {
    overlay.classList.toggle('open', isOpen);
  }
}

// ================= TAB NAVIGATION ================= //
function switchTab(tabName) {
  currentTab = tabName;
  toggleMobileSidebar(false);

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
    overview: 'Homespace',
    tasks: 'Kanban Task Board',
    calendar: 'Team Calendar',
    notebook: 'Collaborative Notebook',
    expenses: 'Expense Ledger & Net Split',
    discussions: 'Topics & Discussions',
    personal: 'Isolated Personal Space'
  };

  const subtitleMap = {
    overview: `Homespace for ${currentGroupDetails ? currentGroupDetails.name : 'Workspace'}`,
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

function handlePrimaryAction(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
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
  const container = document.getElementById('homespaceRoleContainer');
  if (!container || !currentGroupId) return;

  try {
    const [tasksRes, expRes, actRes, personalRes] = await Promise.all([
      apiFetch(`/api/groups/${currentGroupId}/tasks`),
      apiFetch(`/api/groups/${currentGroupId}/expenses/summary`),
      apiFetch(`/api/groups/${currentGroupId}/discussions/activity`),
      apiFetch('/api/personal?type=NOTE').catch(() => ({ data: [] }))
    ]);

    const tasks = tasksRes.data || [];
    const activeTasks = tasks.filter(t => (t.status || '').toUpperCase() !== 'DONE').length;
    const pendingTasks = tasks.filter(t => (t.status || '').toLowerCase() === 'pending_approval');
    const pendingApprovalCount = pendingTasks.length;

    const statActive = document.getElementById('statActiveTasks');
    const statPending = document.getElementById('statPendingApproval');
    const statTotal = document.getElementById('statTotalSpent');
    const statMember = document.getElementById('statMemberCount');

    if (statActive) statActive.textContent = activeTasks;
    if (statPending) statPending.textContent = pendingApprovalCount;
    if (statTotal) statTotal.textContent = `₱${(expRes.data?.totalSpent || 0).toFixed(2)}`;
    if (statMember) statMember.textContent = (currentGroupDetails && currentGroupDetails.members) ? currentGroupDetails.members.length : 1;

    const userRole = (currentGroupDetails && currentGroupDetails.role) ? currentGroupDetails.role.toLowerCase() : 'member';
    const isLeader = userRole === 'leader' || userRole === 'co_leader';
    const currentUserId = currentUser ? currentUser.id : null;
    const members = (currentGroupDetails && currentGroupDetails.members) ? currentGroupDetails.members : [];
    const activities = actRes.data || [];
    const personalNotes = personalRes && personalRes.data ? personalRes.data : [];

    if (isLeader) {
      renderLeaderHomespace(container, pendingTasks, members, activities, currentUserId, personalNotes);
    } else {
      const myAssignedDeliverables = tasks.filter(t => 
        Number(t.assigned_to_user_id) === Number(currentUserId) && 
        (t.status || '').toUpperCase() !== 'DONE'
      );
      renderMemberHomespace(container, myAssignedDeliverables, members, activities, currentUserId, personalNotes);
    }

    // Render Expandable Workspace Settings & Controls Drawer
    renderHomespaceSettingsDrawer();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Minimalist Quick Scratchpad / Personal Notes widget helper
function renderHomespaceScratchpadHtml(personalNotes, inputId) {
  const notes = Array.isArray(personalNotes) ? personalNotes.slice(0, 8) : [];
  return `
    <div class="dashboard-panel">
      <div class="panel-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <h3 style="margin:0;">Quick Scratchpad</h3>
        </div>
        <button onclick="switchTab('personal')" class="btn-outline" style="padding:6px 12px; font-size:12px; font-weight:600; border-radius:8px;">Open Space</button>
      </div>
      <div style="padding:14px 16px;">
        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <input type="text" id="${inputId}" class="form-control" placeholder="Quick personal reminder or note..." style="font-size:13px; padding:8px 12px; min-height:38px; flex:1;" onkeydown="if(event.key==='Enter'){event.preventDefault();saveHomespaceScratchpad('${inputId}');}">
          <button type="button" class="btn-green" style="padding:8px 16px; font-size:12px; font-weight:600; min-height:38px; white-space:nowrap;" onclick="saveHomespaceScratchpad('${inputId}')">Save</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; max-height:230px; overflow-y:auto;">
          ${notes.length === 0 ? `
            <div style="text-align:center; padding:18px 10px; color:var(--muted-foreground);">
              <p style="margin:0; font-size:12px;">Private reminders and personal notes saved here.</p>
            </div>
          ` : notes.map(n => `
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding:8px 10px; background:var(--muted, #f8fafc); border:1px solid var(--border); border-radius:8px;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:600; color:var(--foreground); word-break:break-word;">${escapeHtml(n.title || n.content || 'Personal Note')}</div>
                ${n.content && n.content !== n.title ? `<div style="font-size:12px; color:var(--muted-foreground); margin-top:2px; word-break:break-word;">${escapeHtml(n.content)}</div>` : ''}
                <div style="font-size:11px; color:var(--muted-foreground); margin-top:2px;">Private · ${formatDate(n.created_at)}</div>
              </div>
              <button type="button" class="btn-outline" style="padding:2px 8px; font-size:11px; color:var(--muted-foreground); border-color:var(--border); border-radius:4px; cursor:pointer;" onclick="deleteHomespaceScratchpadNote(${n.id}, event)" title="Delete reminder">
                ✕
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

async function saveHomespaceScratchpad(inputId, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const input = document.getElementById(inputId);
  if (!input) return;
  const noteText = input.value.trim();
  if (!noteText) {
    showToast('Please enter a note or reminder.', 'error');
    return;
  }
  try {
    await apiFetch('/api/personal', {
      method: 'POST',
      body: JSON.stringify({
        type: 'NOTE',
        title: noteText,
        content: noteText
      })
    });
    input.value = '';
    showToast('Personal reminder saved.', 'success');
    loadOverview();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteHomespaceScratchpadNote(noteId, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  try {
    await apiFetch(`/api/personal/${noteId}`, { method: 'DELETE' });
    showToast('Reminder deleted.', 'success');
    loadOverview();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderLeaderHomespace(container, pendingTasks, members, activities, currentUserId, personalNotes) {
  const pendingHtml = pendingTasks.length === 0
    ? `
      <div style="text-align:center; padding:28px 20px; color:var(--gray);">
        <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700; color:var(--text);">All Tasks Approved</h4>
        <p style="margin:0; font-size:12px;">There are no tasks currently awaiting review.</p>
      </div>
    `
    : `
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${pendingTasks.map(t => `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; padding:12px 14px; border:1px solid rgba(245,158,11,0.25); background:rgba(245,158,11,0.04); border-radius:10px; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span class="tag tag-${(t.priority || 'medium').toLowerCase()}" style="font-size:11px; font-weight:700; padding:2px 8px;">${escapeHtml(t.priority || 'MEDIUM')}</span>
                <strong style="font-size:14px; color:var(--text);">${escapeHtml(t.title)}</strong>
              </div>
              <div style="font-size:12px; color:var(--gray); display:flex; gap:12px; flex-wrap:wrap;">
                <span>Assignee: <strong>${escapeHtml(t.assignee_name || 'Unassigned')}</strong></span>
                <span>Due: ${t.due_date ? formatDate(t.due_date) : 'No due date'}</span>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button type="button" class="btn-green" style="padding:6px 14px; font-size:12px; font-weight:600; border-radius:8px; cursor:pointer;" onclick="approveTaskInline(${t.id}, event)">
                Approve
              </button>
              <button type="button" class="btn-outline" style="padding:6px 14px; font-size:12px; font-weight:600; color:#dc2626; border-color:#fca5a5; border-radius:8px; cursor:pointer;" onclick="rejectTaskInline(${t.id}, '${escapeHtml(t.title).replace(/'/g, "\\'")}', event)">
                Reject
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

  const isPrimaryLeader = (currentGroupDetails && currentGroupDetails.role === 'leader');
  const rosterHtml = members.map(m => {
    const isSelf = Number(m.user_id) === Number(currentUserId);
    const roleLabel = m.role === 'co_leader' ? 'Co-Leader' : (m.role === 'leader' ? 'Leader' : 'Member');
    return `
      <li style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid var(--border); gap:12px;">
        <div style="display:flex; align-items:center; gap:10px; min-width:0; cursor:${isSelf ? 'default' : 'pointer'};" ${!isSelf ? `onclick="openDirectMessageDrawer(${m.user_id}, '${escapeHtml(m.full_name).replace(/'/g, "\\'")}', '${escapeHtml(m.avatar_initials || 'GS')}', '${m.status || 'offline'}')"` : ''} title="${isSelf ? '' : `Direct message ${escapeHtml(m.full_name)}`}">
          <div class="chat-avatar" style="width:32px; height:32px; font-size:12px; flex-shrink:0;">${escapeHtml(m.avatar_initials || 'GS')}</div>
          <div style="min-width:0;">
            <div style="font-weight:600; font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(m.full_name)} ${isSelf ? '<span style="font-size:11px; color:var(--gray); font-weight:normal;">(You)</span>' : ''}
            </div>
            <div style="color:var(--gray); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(m.email)}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
          ${!isSelf ? `
            <button type="button" class="btn-outline" style="padding:4px 8px; font-size:11.5px; display:inline-flex; align-items:center; gap:4px; border-radius:6px; cursor:pointer;" onclick="openDirectMessageDrawer(${m.user_id}, '${escapeHtml(m.full_name).replace(/'/g, "\\'")}', '${escapeHtml(m.avatar_initials || 'GS')}', '${m.status || 'offline'}')" title="Direct message">
              💬
            </button>
          ` : ''}
          ${isSelf ? `
            <span class="status online" style="font-size:11px; font-weight:700;">${roleLabel}</span>
          ` : isPrimaryLeader ? `
            <select onchange="changeMemberRole(${m.user_id}, this.value)" style="font-size:11px; padding:3px 6px; border-radius:6px; border:1px solid var(--border); background:var(--card); color:var(--text); cursor:pointer;">
              <option value="leader" ${m.role === 'leader' ? 'selected' : ''}>Leader</option>
              <option value="co_leader" ${m.role === 'co_leader' ? 'selected' : ''}>Co-Leader</option>
              <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option>
            </select>
            <button type="button" class="btn-outline" style="padding:3px 8px; font-size:11px; color:#dc2626; border-color:#fca5a5; border-radius:6px; cursor:pointer;" onclick="removeMemberFromWorkspace(${m.user_id}, '${escapeHtml(m.full_name).replace(/'/g, "\\'")}')" title="Remove member">
              Remove
            </button>
          ` : `
            <span class="status ${m.role === 'leader' || m.role === 'co_leader' ? 'online' : 'pending'}" style="font-size:11px; font-weight:600;">${roleLabel}</span>
          `}
        </div>
      </li>
    `;
  }).join('');

  const activityFeedHtml = activities.length === 0
    ? '<div style="text-align:center; padding:24px 16px; color:var(--gray);"><p style="margin:0; font-size:12px;">No recent workspace events yet.</p></div>'
    : activities.slice(0, 5).map(a => `
      <div class="activity-item">
        <div class="activity-icon">${getActivityIcon(a.action_type)}</div>
        <div style="flex:1; min-width:0;">
          <div class="activity-desc">${escapeHtml(a.description)}</div>
          <div class="activity-date">${formatDate(a.created_at)}</div>
        </div>
      </div>
    `).join('');

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- Col 1: Pending Approvals & Quick Scratchpad -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- Pending Task Approvals -->
        <div class="dashboard-panel">
          <div class="panel-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 style="margin:0;">Pending Task Approvals</h3>
              <span class="col-badge" style="background:#fef3c7; color:#92400e; font-weight:700;">${pendingTasks.length}</span>
            </div>
            <span style="font-size:12px; color:var(--gray);">Dual-approval quality gate</span>
          </div>
          <div style="padding:14px 16px;">
            ${pendingHtml}
          </div>
        </div>

        <!-- Minimalist Quick Scratchpad / Personal Notes -->
        ${renderHomespaceScratchpadHtml(personalNotes, 'leaderHomespaceScratchpad')}
      </div>

      <!-- Col 2: Workspace Roster & Roles & Recent Activity Feed -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- Workspace Roster & Roles -->
        <div class="dashboard-panel">
          <div class="panel-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 style="margin:0;">Workspace Roster & Roles</h3>
              <span class="status online" style="font-size:11px; font-weight:700;">LEADER</span>
            </div>
            <span style="font-size:12px; color:var(--gray);">${members.length} members</span>
          </div>
          <ul class="task-list" style="margin:0; padding:4px 0; list-style:none;">
            ${rosterHtml}
          </ul>
        </div>

        <!-- Live Activity Feed -->
        <div class="dashboard-panel">
          <div class="panel-header">
            <h3>Recent Activity Feed</h3>
            <span style="font-size:12px; color:var(--gray);">Live workspace events</span>
          </div>
          <div class="activity-feed">
            ${activityFeedHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMemberHomespace(container, myAssignedDeliverables, members, activities, currentUserId, personalNotes) {
  const leaders = members.filter(m => m.role === 'leader' || m.role === 'co_leader');
  const fellowMembers = members.filter(m => m.role !== 'leader' && m.role !== 'co_leader');

  const deliverablesHtml = myAssignedDeliverables.length === 0
    ? `
      <div style="text-align:center; padding:28px 20px; color:var(--gray);">
        <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700; color:var(--text);">All Caught Up</h4>
        <p style="margin:0; font-size:12px;">You have no active deliverables assigned to you right now.</p>
      </div>
    `
    : `
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${myAssignedDeliverables.map(t => {
          const statusDisplay = (t.status || 'TODO').replace(/_/g, ' ');
          const isPending = (t.status || '').toLowerCase() === 'pending_approval';
          return `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; padding:12px 14px; border:1px solid ${isPending ? 'rgba(245,158,11,0.25)' : 'var(--border)'}; background:${isPending ? 'rgba(245,158,11,0.04)' : 'var(--card)'}; border-radius:10px; flex-wrap:wrap;">
              <div style="flex:1; min-width:200px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                  <span class="tag tag-${(t.priority || 'medium').toLowerCase()}" style="font-size:11px; font-weight:700; padding:2px 8px;">${escapeHtml(t.priority || 'MEDIUM')}</span>
                  <strong style="font-size:14px; color:var(--text);">${escapeHtml(t.title)}</strong>
                </div>
                <div style="font-size:12px; color:var(--gray); display:flex; gap:12px; flex-wrap:wrap;">
                  <span>Status: <strong style="color:${isPending ? '#d97706' : 'var(--text)'};">${isPending ? 'Awaiting Review' : escapeHtml(statusDisplay)}</strong></span>
                  <span>Due: ${t.due_date ? formatDate(t.due_date) : 'No due date'}</span>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <button type="button" class="btn-outline" style="padding:6px 12px; font-size:12px; font-weight:600; border-radius:8px; cursor:pointer;" onclick="switchTab('tasks')">
                  View in Tasks →
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

  const leadersHtml = leaders.length === 0
    ? '<p style="color:var(--gray); font-size:12px; margin:0;">No group leader assigned.</p>'
    : leaders.map(l => {
      const isCoLeader = l.role === 'co_leader';
      return `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:${isCoLeader ? 'rgba(99,102,241,0.05)' : 'rgba(79,70,229,0.06)'}; border:1px solid ${isCoLeader ? 'rgba(99,102,241,0.18)' : 'rgba(79,70,229,0.18)'}; border-radius:8px; margin-bottom:6px;">
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <div class="chat-avatar" style="width:32px; height:32px; font-size:12px; flex-shrink:0;">${escapeHtml(l.avatar_initials || 'GS')}</div>
          <div style="min-width:0;">
            <div style="font-weight:700; font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(l.full_name)}</div>
            <div style="color:var(--gray); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(l.email)}</div>
          </div>
        </div>
        <span style="font-size:11px; font-weight:700; color:var(--primary); background:#eef2ff; padding:2px 8px; border-radius:6px;">${isCoLeader ? 'Co-Leader' : 'Leader'}</span>
      </div>
    `;
    }).join('');

  const fellowsHtml = fellowMembers.map(m => {
    const isSelf = Number(m.user_id) === Number(currentUserId);
    return `
      <li style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid var(--border); gap:8px;">
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <div class="chat-avatar" style="width:32px; height:32px; font-size:12px; flex-shrink:0;">${escapeHtml(m.avatar_initials || 'GS')}</div>
          <div style="min-width:0;">
            <div style="font-weight:600; font-size:12px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(m.full_name)} ${isSelf ? '<span style="font-size:11px; color:var(--gray); font-weight:normal;">(You)</span>' : ''}
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          ${isSelf ? `
            <select onchange="handleMemberSelfRoleDropdown(this)" style="font-size:11px; padding:2px 6px; border-radius:6px; border:1px solid var(--border); background:var(--card); color:var(--text); cursor:pointer;" title="Role: Member (Click to request leadership)">
              <option value="member" selected>Member</option>
              <option value="leader">Leader</option>
              <option value="co_leader">Co-Leader</option>
            </select>
          ` : `
            <span class="status pending" style="font-size:11px;">Member</span>
          `}
        </div>
      </li>
    `;
  }).join('');

  const activityFeedHtml = activities.length === 0
    ? '<div style="text-align:center; padding:24px 16px; color:var(--gray);"><p style="margin:0; font-size:12px;">No recent workspace events yet.</p></div>'
    : activities.slice(0, 5).map(a => `
      <div class="activity-item">
        <div class="activity-icon">${getActivityIcon(a.action_type)}</div>
        <div style="flex:1; min-width:0;">
          <div class="activity-desc">${escapeHtml(a.description)}</div>
          <div class="activity-date">${formatDate(a.created_at)}</div>
        </div>
      </div>
    `).join('');

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- Col 1: My Assigned Deliverables & Quick Scratchpad -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- My Assigned Deliverables -->
        <div class="dashboard-panel">
          <div class="panel-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 style="margin:0;">My Assigned Deliverables</h3>
              <span class="col-badge" style="background:#e0e7ff; color:#3730a3; font-weight:700;">${myAssignedDeliverables.length}</span>
            </div>
            <span style="font-size:12px; color:var(--gray);">Active assigned deliverables</span>
          </div>
          <div style="padding:14px 16px;">
            ${deliverablesHtml}
          </div>
        </div>

        <!-- Minimalist Quick Scratchpad / Personal Notes -->
        ${renderHomespaceScratchpadHtml(personalNotes, 'memberHomespaceScratchpad')}
      </div>

      <!-- Col 2: Workspace Teammates & Recent Activity Feed -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- Workspace Teammates (Highlighting Leader) -->
        <div class="dashboard-panel">
          <div class="panel-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 style="margin:0;">Workspace Teammates</h3>
              <span class="status pending" style="font-size:11px;">MEMBER</span>
            </div>
            <span style="font-size:12px; color:var(--gray);">${members.length} members</span>
          </div>
          <div style="padding:12px 14px;">
            <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; font-weight:700; color:var(--gray); margin-bottom:8px;">
              Workspace Leader
            </div>
            ${leadersHtml}

            <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; font-weight:700; color:var(--gray); margin:14px 0 6px 0;">
              Team Members (${fellowMembers.length})
            </div>
            <ul class="task-list" style="margin:0; padding:0; list-style:none;">
              ${fellowsHtml}
            </ul>
          </div>
        </div>

        <!-- Recent Activity Feed -->
        <div class="dashboard-panel">
          <div class="panel-header">
            <h3>Recent Activity Feed</h3>
            <span style="font-size:12px; color:var(--gray);">Live workspace events</span>
          </div>
          <div class="activity-feed">
            ${activityFeedHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ================= HOMESPACE EXPANDABLE SETTINGS & CONTROLS DRAWER ================= //
let isInviteCodeRevealed = false;
let isHomespaceDrawerOpen = false;

function toggleInviteCodeVisibility() {
  isInviteCodeRevealed = !isInviteCodeRevealed;
  const display = document.getElementById('hsInviteCodeDisplay');
  const btnText = document.getElementById('hsToggleCodeText');
  const eyeIcon = document.getElementById('hsEyeIcon');
  if (!display || !currentGroupDetails) return;

  if (isInviteCodeRevealed) {
    display.textContent = currentGroupDetails.join_code;
    display.classList.add('revealed');
    if (btnText) btnText.textContent = 'Hide Code';
    if (eyeIcon) {
      eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    }
  } else {
    display.textContent = 'GS-••••••';
    display.classList.remove('revealed');
    if (btnText) btnText.textContent = 'Show Code';
    if (eyeIcon) {
      eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  }
}

function copyHomespaceInviteCode() {
  if (!currentGroupDetails || !currentGroupDetails.join_code) {
    showToast('No invite code available for this workspace.', 'error');
    return;
  }
  navigator.clipboard.writeText(currentGroupDetails.join_code);
  showToast(`Invite code ${currentGroupDetails.join_code} copied to clipboard!`, 'success');
}

function toggleHomespaceSettingsDrawer(forceOpen = null) {
  const accordion = document.getElementById('homespaceSettingsAccordion');
  const chevron = document.getElementById('hsAccordionChevron');
  const statusPill = document.getElementById('hsDrawerStatusPill');
  const header = document.getElementById('hsSettingsHeader');
  if (!accordion) return;

  if (typeof forceOpen === 'boolean') {
    isHomespaceDrawerOpen = forceOpen;
  } else {
    isHomespaceDrawerOpen = !isHomespaceDrawerOpen;
  }

  accordion.classList.toggle('open', isHomespaceDrawerOpen);
  if (header) header.setAttribute('aria-expanded', isHomespaceDrawerOpen ? 'true' : 'false');
  if (chevron) chevron.classList.toggle('rotated', isHomespaceDrawerOpen);
  if (statusPill) statusPill.textContent = isHomespaceDrawerOpen ? 'Click to collapse' : 'Click to expand';
}

function focusHomespaceSettingsDrawer() {
  if (currentTab !== 'overview') {
    switchTab('overview');
  }
  toggleHomespaceSettingsDrawer(true);
  setTimeout(() => {
    const el = document.getElementById('homespaceSettingsAccordion');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 100);
}

function renderHomespaceSettingsDrawer() {
  const container = document.getElementById('homespaceSettingsDrawerContainer');
  if (!container || !currentGroupDetails) return;

  const userRole = (currentGroupDetails.role || 'member').toLowerCase();
  const isPrimaryLeader = userRole === 'leader';
  const isCoLeader = userRole === 'co_leader';
  const settings = currentGroupDetails.settings || {};
  const currentUserId = currentUser ? currentUser.id : null;
  const requireApproval = settings.requireApproval !== false;
  const allowDiscussions = settings.allowMemberDiscussions !== false;
  const restrictExpenses = settings.restrictExpensesToLeaders === true;

  const roleLabel = isPrimaryLeader ? 'Leader' : (isCoLeader ? 'Co-Leader' : 'Member');
  const roleBadgeClass = (isPrimaryLeader || isCoLeader) ? 'online' : 'pending';

  container.innerHTML = `
    <div class="homespace-settings-accordion ${isHomespaceDrawerOpen ? 'open' : ''}" id="homespaceSettingsAccordion">
      <!-- Accordion Header Trigger -->
      <div class="hs-accordion-header" id="hsSettingsHeader" onclick="toggleHomespaceSettingsDrawer()" role="button" tabindex="0" aria-expanded="${isHomespaceDrawerOpen ? 'true' : 'false'}" aria-controls="hsSettingsContent">
        <div style="display:flex; align-items:center; gap:12px; min-width:0;">
          <div class="hs-accordion-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <div style="min-width:0;">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 class="hs-accordion-title">Workspace Settings & Controls</h3>
              <span class="hs-accordion-tag">Homespace Panel</span>
            </div>
            <p class="hs-accordion-subtitle">User profile, theme toggle, masked invite code & workspace preferences</p>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">
          <span class="hs-accordion-pill" id="hsDrawerStatusPill">${isHomespaceDrawerOpen ? 'Click to collapse' : 'Click to expand'}</span>
          <div class="hs-accordion-chevron ${isHomespaceDrawerOpen ? 'rotated' : ''}" id="hsAccordionChevron">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </div>

      <!-- Accordion Expandable Content -->
      <div class="hs-accordion-content hs-accordion-animator" id="hsSettingsContent">
        <div class="hs-accordion-animator-inner">
        <div class="hs-drawer-grid">
          <!-- Column 1: User Profile & Personal Quick Controls -->
          <div class="hs-drawer-card">
            <div class="hs-card-header">
              <h4>User Profile & Controls</h4>
              <span class="status ${roleBadgeClass}" style="font-size:11px; font-weight:700;">${roleLabel}</span>
            </div>
            <div style="display:flex; align-items:center; gap:14px; padding:12px; background:var(--secondary); border:1px solid var(--border); border-radius:12px; margin-bottom:16px;">
              <div class="chat-avatar" id="hsUserAvatar" style="width:44px; height:44px; font-size:16px; flex-shrink:0;">
                ${currentUser ? escapeHtml(currentUser.avatarInitials || 'GS') : 'GS'}
              </div>
              <div style="min-width:0; flex:1;">
                <div id="hsUserFullName" style="font-size:14px; font-weight:700; color:var(--foreground); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${currentUser ? escapeHtml(currentUser.fullName) : 'User'}
                </div>
                <div style="font-size:12px; color:var(--muted-foreground); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${currentUser ? escapeHtml(currentUser.email) : ''}
                </div>
                <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                  <span class="status online" style="font-size:11px; padding:1px 6px;">Online</span>
                  <span style="font-size:11px; color:var(--muted-foreground);">• Logged in</span>
                </div>
              </div>
            </div>

            <!-- Quick Action Buttons: Dark Mode & Sign Out -->
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button type="button" class="btn-outline hs-control-btn" data-theme-toggle aria-label="Toggle theme" title="Toggle theme" onclick="window.gsToggleTheme && window.gsToggleTheme()">
                <svg data-theme-moon width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
                <svg data-theme-sun width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                <span data-theme-moon>Dark Mode</span>
                <span data-theme-sun style="display:none">Light Mode</span>
              </button>
              <button type="button" class="btn-outline hs-control-btn" style="color:var(--destructive); border-color:var(--border);" onclick="logoutUser()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign Out
              </button>
            </div>
          </div>

          <!-- Column 2: Workspace Details & Discrete Invite Code -->
          <div class="hs-drawer-card">
            <div class="hs-card-header">
              <h4>Workspace & Discrete Invite</h4>
              <span style="font-size:12px; color:var(--muted-foreground);">Access Control</span>
            </div>

            <!-- Workspace Name Field -->
            <div style="margin-bottom:14px;">
              <label style="display:block; font-size:12px; font-weight:600; color:var(--foreground); margin-bottom:4px;">Active Workspace</label>
              ${isPrimaryLeader ? `
                <div style="display:flex; gap:8px;">
                  <input type="text" id="hsDrawerWsNameInput" class="form-control" value="${escapeHtml(currentGroupDetails.name)}" style="font-size:13px; padding:7px 12px; flex:1;">
                  <button type="button" class="btn-green" style="padding:7px 14px; font-size:12px; font-weight:600;" onclick="saveWorkspaceName(document.getElementById('hsDrawerWsNameInput').value)">Save</button>
                </div>
              ` : `
                <div style="padding:8px 12px; background:var(--secondary); border:1px solid var(--border); border-radius:8px; font-size:13px; font-weight:600; color:var(--foreground);">
                  ${escapeHtml(currentGroupDetails.name)}
                </div>
              `}
            </div>

            <!-- Discrete Masked Invite Code Display -->
            <div>
              <label style="display:block; font-size:12px; font-weight:600; color:var(--foreground); margin-bottom:4px;">Workspace Invite Code</label>
              <p style="font-size:11px; color:var(--muted-foreground); margin:0 0 8px 0;">Masked for privacy during screen sharing. Use button to reveal or copy.</p>
              
              <div class="hs-invite-code-container">
                <div class="hs-invite-code-box">
                  <span class="hs-invite-code-label">CODE:</span>
                  <strong id="hsInviteCodeDisplay" class="hs-invite-code-value">${isInviteCodeRevealed ? escapeHtml(currentGroupDetails.join_code) : 'GS-••••••'}</strong>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <button type="button" id="hsToggleCodeBtn" class="btn-outline hs-code-action-btn" onclick="toggleInviteCodeVisibility()" aria-label="Toggle invite code mask">
                    <svg id="hsEyeIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      ${isInviteCodeRevealed ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>' : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'}
                    </svg>
                    <span id="hsToggleCodeText">${isInviteCodeRevealed ? 'Hide Code' : 'Show Code'}</span>
                  </button>
                  <button type="button" class="btn-outline hs-code-action-btn" onclick="copyHomespaceInviteCode()" aria-label="Copy invite code to clipboard">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy
                  </button>
                  ${isPrimaryLeader ? `
                    <button type="button" class="btn-outline hs-code-action-btn" onclick="resetWorkspaceInviteCode()" aria-label="Reset workspace invite code">
                      Reset
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        ${isPrimaryLeader ? `
          <!-- Permission Constraints Section for Primary Leader -->
          <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">
            <div style="font-size:12px; font-weight:700; color:var(--foreground); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px;">
              Member Permission Constraints
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--foreground); cursor:pointer;">
                <input type="checkbox" id="hsConstraintApproval" ${requireApproval ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                <span>Require leader approval before member tasks are marked Done</span>
              </label>
              <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--foreground); cursor:pointer;">
                <input type="checkbox" id="hsConstraintDiscussions" ${allowDiscussions ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                <span>Allow members to create new discussion topics</span>
              </label>
              <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--foreground); cursor:pointer;">
                <input type="checkbox" id="hsConstraintExpenses" ${restrictExpenses ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                <span>Restrict expense ledger entries to workspace leaders only</span>
              </label>
            </div>
            <button type="button" class="btn-green" style="margin-top:12px; font-size:12px; padding:6px 14px; font-weight:600;" onclick="saveMemberConstraints('hsConstraintApproval', 'hsConstraintDiscussions', 'hsConstraintExpenses')">
              Save Permission Constraints
            </button>
          </div>
        ` : ''}

        <!-- Discrete Danger Zone Footer -->
        <div class="hs-danger-zone-footer">
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="status pending" style="background:rgba(239,68,68,0.12); color:#ef4444; font-size:11px; font-weight:700;">DANGER ZONE</span>
              <strong style="font-size:12px; color:var(--foreground);">Account & Workspace Safeguards</strong>
            </div>
            <p style="margin:4px 0 0; font-size:12px; color:var(--muted-foreground);">
              Permanently delete your account. Requires 2x password verification to prevent accidental deletion.
            </p>
          </div>
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <button type="button" id="hsDeleteAccountBtn" class="btn-outline open-delete-account-modal" style="padding:6px 14px; font-size:12px; font-weight:600; color:#ef4444; border-color:rgba(239,68,68,0.35); border-radius:8px; cursor:pointer;" onclick="openDeleteAccountModal()">
              Delete Account
            </button>
            ${isPrimaryLeader ? `
              <button type="button" class="btn-outline open-delete-workspace-btn" style="padding:6px 14px; font-size:12px; font-weight:600; color:#ef4444; border-color:rgba(239,68,68,0.35); border-radius:8px; cursor:pointer;" onclick="confirmDeleteWorkspace()">
                Delete Workspace
              </button>
            ` : ''}
          </div>
        </div>
        </div>
      </div>
    </div>
  `;

  // Attach keydown listener for keyboard accessibility (Space/Enter to toggle)
  const header = document.getElementById('hsSettingsHeader');
  if (header) {
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleHomespaceSettingsDrawer();
      }
    });
  }
}

// ================= WORKSPACE SETTINGS MODAL ================= //
function openWorkspaceSettingsModal() {
  const modalBody = document.getElementById('workspaceSettingsModalBody');
  const modalTitle = document.getElementById('workspaceSettingsModalTitle');
  if (!modalBody || !currentGroupDetails) return;

  const userRole = (currentGroupDetails.role || 'member').toLowerCase();
  const isPrimaryLeader = userRole === 'leader';
  const isCoLeader = userRole === 'co_leader';
  const settings = currentGroupDetails.settings || {};
  const currentUserId = currentUser ? currentUser.id : null;

  if (isPrimaryLeader) {
    if (modalTitle) modalTitle.innerHTML = 'Leader Workspace Settings';
    const requireApproval = settings.requireApproval !== false;
    const allowDiscussions = settings.allowMemberDiscussions !== false;
    const restrictExpenses = settings.restrictExpensesToLeaders === true;

    modalBody.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Workspace Name -->
        <div>
          <label style="display:block; font-size:12px; font-weight:600; margin-bottom:6px; color:var(--text);">Workspace Name</label>
          <div style="display:flex; gap:8px;">
            <input type="text" id="modalWsNameInput" class="form-control" value="${escapeHtml(currentGroupDetails.name)}" style="font-size:13px; padding:8px 12px; flex:1;">
            <button type="button" class="btn-green" style="padding:8px 14px; font-size:12px; font-weight:600;" onclick="saveWorkspaceName(document.getElementById('modalWsNameInput').value)">Save Name</button>
          </div>
        </div>

        <!-- Reset Invite Code -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:var(--muted,#f8fafc); border:1px solid var(--border); border-radius:10px; gap:12px; flex-wrap:wrap;">
          <div>
            <div style="font-size:12px; font-weight:600; color:var(--text);">Invite Code</div>
            <div style="font-size:11px; color:var(--gray);">Regenerate the team invite code if leaked.</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="color:var(--primary); font-size:14px; letter-spacing:1px; background:#eef2ff; padding:4px 10px; border-radius:6px; border:1px solid #c7d2fe;" id="modalJoinCodeDisplay">${escapeHtml(currentGroupDetails.join_code)}</strong>
            <button type="button" class="btn-outline" style="padding:6px 12px; font-size:12px; font-weight:600; border-radius:6px;" onclick="resetWorkspaceInviteCode()">Reset Code</button>
          </div>
        </div>

        <!-- Constraints -->
        <div style="border-top:1px solid var(--border); padding-top:14px;">
          <div style="font-size:12px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">
            Member Permission Constraints
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text); cursor:pointer;">
              <input type="checkbox" id="modalConstraintApproval" ${requireApproval ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
              <span>Require leader approval before member tasks are marked Done</span>
            </label>
            <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text); cursor:pointer;">
              <input type="checkbox" id="modalConstraintDiscussions" ${allowDiscussions ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
              <span>Allow members to create new discussion topics</span>
            </label>
            <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text); cursor:pointer;">
              <input type="checkbox" id="modalConstraintExpenses" ${restrictExpenses ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
              <span>Restrict expense ledger entries to workspace leaders only</span>
            </label>
          </div>
          <button type="button" class="btn-green" style="margin-top:12px; font-size:12px; padding:6px 14px; font-weight:600;" onclick="saveMemberConstraints('modalConstraintApproval', 'modalConstraintDiscussions', 'modalConstraintExpenses')">
            Save Permission Constraints
          </button>
        </div>

        <!-- Discrete Danger Zone Footer -->
        <div style="border-top:1px solid var(--border); padding-top:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <span style="font-size:12px; font-weight:600; color:var(--gray);">Danger Zone</span>
            <p style="margin:2px 0 0; font-size:11px; color:var(--gray);">Permanently delete this workspace and all its data.</p>
          </div>
          <button type="button" class="btn-outline open-delete-workspace-btn" style="padding:4px 12px; font-size:11px; font-weight:600; color:#ef4444; border-color:rgba(239,68,68,0.35); border-radius:6px; background:transparent; cursor:pointer;" onclick="closeModal('workspaceSettingsModal'); confirmDeleteWorkspace();">
            Delete Workspace
          </button>
        </div>
      </div>
    `;
  } else if (isCoLeader) {
    if (modalTitle) modalTitle.innerHTML = 'Co-Leader Workspace Settings';
    const requireApproval = settings.requireApproval !== false;
    const allowDiscussions = settings.allowMemberDiscussions !== false;
    const restrictExpenses = settings.restrictExpensesToLeaders === true;

    modalBody.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Workspace Name -->
        <div style="padding:12px 14px; background:var(--muted,#f8fafc); border:1px solid var(--border); border-radius:10px;">
          <div style="font-size:12px; font-weight:600; color:var(--text);">Workspace</div>
          <div style="font-size:14px; font-weight:700; color:var(--primary); margin-top:2px;">${escapeHtml(currentGroupDetails.name)}</div>
        </div>

        <!-- Reset Invite Code -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:var(--muted,#f8fafc); border:1px solid var(--border); border-radius:10px; gap:12px; flex-wrap:wrap;">
          <div>
            <div style="font-size:12px; font-weight:600; color:var(--text);">Invite Code</div>
            <div style="font-size:11px; color:var(--gray);">Share with teammates to join workspace.</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="color:var(--primary); font-size:14px; letter-spacing:1px; background:#eef2ff; padding:4px 10px; border-radius:6px; border:1px solid #c7d2fe;">${escapeHtml(currentGroupDetails.join_code)}</strong>
          </div>
        </div>

        <!-- Constraints Summary -->
        <div style="border-top:1px solid var(--border); padding-top:14px;">
          <div style="font-size:12px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">
            Active Permission Constraints
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; font-size:13px; color:var(--text);">
            <div>• Leader Approval Required: <strong>${requireApproval ? 'Yes' : 'No'}</strong></div>
            <div>• Member Discussion Creation: <strong>${allowDiscussions ? 'Allowed' : 'Restricted'}</strong></div>
            <div>• Expense Ledger: <strong>${restrictExpenses ? 'Leaders & Co-Leaders Only' : 'All Members'}</strong></div>
          </div>
          <p style="font-size:11px; color:var(--gray); margin-top:12px;">Primary Leader holds sole authorization to modify settings and delete workspace.</p>
        </div>
      </div>
    `;
  } else {
    if (modalTitle) modalTitle.innerHTML = 'Member Settings & Preferences';
    const prefApprovals = localStorage.getItem(`groupspace_pref_${currentUserId}_notif_approvals`) !== 'false';
    const prefMentions = localStorage.getItem(`groupspace_pref_${currentUserId}_notif_mentions`) !== 'false';
    const prefHelp = localStorage.getItem(`groupspace_pref_${currentUserId}_notif_help`) !== 'false';
    const prefLanding = localStorage.getItem(`groupspace_pref_${currentUserId}_landing_view`) || 'overview';
    const prefCompact = localStorage.getItem(`groupspace_pref_${currentUserId}_compact_view`) === 'true';

    modalBody.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Profile Display -->
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; background:var(--muted,#f8fafc); border:1px solid var(--border); border-radius:10px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:12px; min-width:0;">
            <div class="chat-avatar" style="width:42px; height:42px; font-size:15px; flex-shrink:0;">${currentUser ? (currentUser.avatarInitials || 'GS') : 'GS'}</div>
            <div style="min-width:0;">
              <div style="font-weight:700; font-size:14px; color:var(--text);">${currentUser ? escapeHtml(currentUser.fullName) : 'User'}</div>
              <div style="color:var(--gray); font-size:12px;">${currentUser ? escapeHtml(currentUser.email) : ''}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="status pending" style="font-size:11px;">Member</span>
            <button type="button" class="btn-outline" style="padding:4px 10px; font-size:11px; font-weight:600; border-radius:6px; color:var(--primary); border-color:var(--primary); background:transparent; cursor:pointer;" onclick="closeModal('workspaceSettingsModal'); openRequestLeadershipModal();">
              Request Leadership Role
            </button>
          </div>
        </div>

        <!-- Notification Drawer Toggles -->
        <div>
          <div style="font-size:12px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
            Notification Drawer Alerts
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text); cursor:pointer;">
              <input type="checkbox" ${prefApprovals ? 'checked' : ''} onchange="saveMemberPref('notif_approvals', this.checked)">
              <span>Task review & approval updates</span>
            </label>
            <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text); cursor:pointer;">
              <input type="checkbox" ${prefMentions ? 'checked' : ''} onchange="saveMemberPref('notif_mentions', this.checked)">
              <span>@Mention notifications & topic replies</span>
            </label>
            <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text); cursor:pointer;">
              <input type="checkbox" ${prefHelp ? 'checked' : ''} onchange="saveMemberPref('notif_help', this.checked)">
              <span>Peer-assist & help request alerts</span>
            </label>
          </div>
        </div>

        <!-- Personal Preferences -->
        <div style="border-top:1px solid var(--border); padding-top:14px;">
          <div style="font-size:12px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">
            Workspace Preferences
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div>
              <label style="display:block; font-size:12px; color:var(--gray); margin-bottom:4px;">Default Landing Tab</label>
              <select class="form-control" style="font-size:12px; padding:6px 10px;" onchange="saveMemberPref('landing_view', this.value)">
                <option value="overview" ${prefLanding === 'overview' ? 'selected' : ''}>Homespace</option>
                <option value="tasks" ${prefLanding === 'tasks' ? 'selected' : ''}>Tasks</option>
                <option value="calendar" ${prefLanding === 'calendar' ? 'selected' : ''}>Calendar</option>
                <option value="notebook" ${prefLanding === 'notebook' ? 'selected' : ''}>Notebook</option>
                <option value="expenses" ${prefLanding === 'expenses' ? 'selected' : ''}>Expenses</option>
                <option value="discussions" ${prefLanding === 'discussions' ? 'selected' : ''}>Discussions</option>
              </select>
            </div>
            <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text); cursor:pointer;">
              <input type="checkbox" ${prefCompact ? 'checked' : ''} onchange="saveMemberPref('compact_view', this.checked)">
              <span>Enable compact view for Kanban cards</span>
            </label>
          </div>
        </div>

        <!-- Discrete Danger Zone Footer -->
        <div style="border-top:1px solid var(--border); padding-top:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <span style="font-size:12px; font-weight:600; color:var(--gray);">Danger Zone</span>
            <p style="margin:2px 0 0; font-size:11px; color:var(--gray);">Permanently delete your account with double password verification.</p>
          </div>
          <button type="button" class="btn-outline open-delete-account-modal" style="padding:4px 12px; font-size:11px; font-weight:600; color:#ef4444; border-color:rgba(239,68,68,0.35); border-radius:6px; background:transparent; cursor:pointer;" onclick="closeModal('workspaceSettingsModal'); openDeleteAccountModal();">
            Delete Account
          </button>
        </div>
      </div>
    `;
  }

  openModal('workspaceSettingsModal');
}

// ================= WORKSPACE SETTINGS HANDLERS ================= //
async function saveWorkspaceName(newName, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const cleanName = (newName || '').trim();
  if (!cleanName || cleanName.length < 2) {
    showToast('Workspace name must be at least 2 characters.', 'error');
    return;
  }
  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({ name: cleanName })
    });
    showToast(res.message || 'Workspace name updated.', 'success');
    currentGroupDetails.name = cleanName;
    const subtitle = document.getElementById('viewSubtitle');
    if (subtitle && currentTab === 'overview') {
      subtitle.textContent = `Homespace for ${cleanName}`;
    }
    const switcher = document.getElementById('groupSwitcher');
    if (switcher) {
      const opt = switcher.querySelector(`option[value="${currentGroupId}"]`);
      if (opt) opt.textContent = `${cleanName} (${currentGroupDetails.role})`;
    }
    loadOverview();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function resetWorkspaceInviteCode(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (!(await gsConfirm('Are you sure you want to regenerate the invite code? The previous invite code will immediately become invalid.', { title: 'Regenerate invite code?', confirmText: 'Regenerate', danger: true }))) {
    return;
  }
  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/reset-join-code`, {
      method: 'POST'
    });
    const newCode = res.data?.joinCode || (res.data?.workspace?.join_code);
    if (newCode) {
      currentGroupDetails.join_code = newCode;
      const display = document.getElementById('displayJoinCode');
      if (display) display.textContent = newCode;
      const leaderDisplay = document.getElementById('leaderJoinCodeDisplay');
      if (leaderDisplay) leaderDisplay.textContent = newCode;
      const modalDisplay = document.getElementById('modalJoinCodeDisplay');
      if (modalDisplay) modalDisplay.textContent = newCode;
      const hsDisplay = document.getElementById('hsInviteCodeDisplay');
      if (hsDisplay) {
        hsDisplay.textContent = isInviteCodeRevealed ? newCode : 'GS-••••••';
      }
    }
    showToast(res.message || 'Invite code regenerated successfully.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveMemberConstraints(apprId, discId, expId, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const requireApproval = document.getElementById(apprId) ? document.getElementById(apprId).checked : true;
  const allowDiscussions = document.getElementById(discId) ? document.getElementById(discId).checked : true;
  const restrictExpenses = document.getElementById(expId) ? document.getElementById(expId).checked : false;

  const newSettings = {
    ...(currentGroupDetails.settings || {}),
    requireApproval,
    allowMemberDiscussions: allowDiscussions,
    restrictExpensesToLeaders: restrictExpenses
  };

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({ settings: newSettings })
    });
    currentGroupDetails.settings = newSettings;
    showToast(res.message || 'Permission constraints saved.', 'success');
    loadOverview();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function confirmDeleteWorkspace(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (!currentGroupId || !currentGroupDetails) return;
  const wsName = currentGroupDetails.name || 'this workspace';
  const confirmation = await gsConfirm(`Are you sure you want to permanently delete "${wsName}"?\n\nThis will permanently remove all tasks, discussions, documents, expenses, and member records for this workspace. This action cannot be undone.`, { title: 'Delete workspace?', confirmText: 'Delete', danger: true });
  if (!confirmation) return;

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}`, {
      method: 'DELETE'
    });
    showToast(res.message || `Workspace "${wsName}" deleted successfully.`, 'success');
    closeModal('workspaceSettingsModal');
    localStorage.removeItem('groupspace_active_group_id');
    currentGroupId = null;
    window.currentGroupId = null;
    currentGroupDetails = null;
    await loadWorkspacesDropdown();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function saveMemberPref(key, value) {
  const currentUserId = currentUser ? currentUser.id : 'default';
  localStorage.setItem(`groupspace_pref_${currentUserId}_${key}`, String(value));
  showToast('Preference saved.', 'success');
}

async function approveTaskInline(taskId, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/tasks/${taskId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approved: true, approvalNotes: 'Approved by workspace leader.' })
    });
    showToast(res.message || 'Task approved and marked Done.', 'success');
    loadOverview();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function rejectTaskInline(taskId, taskTitle, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const notes = prompt(`Enter rejection reason / revision notes for "${taskTitle}":`, 'Revisions required before approval.');
  if (notes === null) return; // User cancelled
  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/tasks/${taskId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approved: false, approvalNotes: notes.trim() || 'Revisions required.' })
    });
    showToast(res.message || 'Task returned to In Progress for revisions.', 'success');
    loadOverview();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleMemberSelfRoleDropdown(selectElem) {
  if (!selectElem) return;
  const chosen = selectElem.value;
  selectElem.value = 'member';
  if (chosen === 'leader' || chosen === 'co_leader') {
    openRequestLeadershipModal();
  }
}

function openRequestLeadershipModal() {
  const textarea = document.getElementById('leadershipRequestReason');
  if (textarea) textarea.value = '';
  openModal('requestLeadershipModal');
  if (textarea) setTimeout(() => textarea.focus(), 60);
}

async function submitLeadershipRequest(event) {
  if (event) {
    event.preventDefault();
  }
  const reasonInput = document.getElementById('leadershipRequestReason');
  const message = reasonInput ? reasonInput.value.trim() : '';
  if (!message) {
    showToast('Please provide a reason for requesting leadership.', 'error');
    return;
  }
  const submitBtn = document.getElementById('submitLeadershipRequestBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }
  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/leadership-requests`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    showToast(res.message || 'Leadership request sent to the workspace Leader.', 'success');
    closeModal('requestLeadershipModal');
    if (reasonInput) reasonInput.value = '';
  } catch (err) {
    showToast(err.message || 'Failed to submit leadership request.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Request';
    }
  }
}

window.handleMemberSelfRoleDropdown = handleMemberSelfRoleDropdown;
window.openRequestLeadershipModal = openRequestLeadershipModal;
window.submitLeadershipRequest = submitLeadershipRequest;

async function changeMemberRole(userId, newRole) {
  const currentUserId = currentUser ? Number(currentUser.id) : null;
  const userRole = (currentGroupDetails && currentGroupDetails.role) ? currentGroupDetails.role.toLowerCase() : 'member';
  if (userRole === 'member' || (Number(userId) === currentUserId && newRole !== 'member')) {
    openRequestLeadershipModal();
    return;
  }
  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole })
    });
    showToast(res.message || 'Member role updated successfully.', 'success');
    const gRes = await apiFetch(`/api/groups/${currentGroupId}`);
    currentGroupDetails = gRes.data;
    loadOverview();
  } catch (err) {
    showToast(err.message, 'error');
    loadOverview();
  }
}

async function removeMemberFromWorkspace(userId, memberName) {
  if (!(await gsConfirm(`Are you sure you want to remove ${memberName} from this workspace?`, { title: 'Remove member?', confirmText: 'Remove', danger: true }))) return;
  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/members/${userId}`, {
      method: 'DELETE'
    });
    showToast(res.message || `${memberName} removed from workspace.`, 'success');
    const gRes = await apiFetch(`/api/groups/${currentGroupId}`);
    currentGroupDetails = gRes.data;
    loadOverview();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function getActivityIcon(type) {
  const t = String(type || '').toUpperCase();
  if (t.includes('FLAGGED') || t.includes('BLOCKED')) {
    return `<span class="badge-act" style="font-size:11px; font-weight:600; color:#ef4444; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); padding:2px 7px; border-radius:6px; display:inline-block; line-height:1.2;">Alert</span>`;
  }
  if (t.includes('TASK')) {
    return `<span class="badge-act" style="font-size:11px; font-weight:600; color:var(--primary); background:rgba(79,70,229,0.08); border:1px solid rgba(79,70,229,0.18); padding:2px 7px; border-radius:6px; display:inline-block; line-height:1.2;">Task</span>`;
  }
  if (t.includes('EXPENSE')) {
    return `<span class="badge-act" style="font-size:11px; font-weight:600; color:#059669; background:rgba(5,150,105,0.08); border:1px solid rgba(5,150,105,0.18); padding:2px 7px; border-radius:6px; display:inline-block; line-height:1.2;">Finance</span>`;
  }
  if (t.includes('NOTE') || t.includes('NOTEBOOK')) {
    return `<span class="badge-act" style="font-size:11px; font-weight:600; color:#0284c7; background:rgba(2,132,199,0.08); border:1px solid rgba(2,132,199,0.18); padding:2px 7px; border-radius:6px; display:inline-block; line-height:1.2;">Note</span>`;
  }
  if (t.includes('TOPIC') || t.includes('COMMENT') || t.includes('MENTION')) {
    return `<span class="badge-act" style="font-size:11px; font-weight:600; color:#7c3aed; background:rgba(124,58,237,0.08); border:1px solid rgba(124,58,237,0.18); padding:2px 7px; border-radius:6px; display:inline-block; line-height:1.2;">Topic</span>`;
  }
  if (t.includes('WORKSPACE') || t.includes('MEMBER')) {
    return `<span class="badge-act" style="font-size:11px; font-weight:600; color:var(--text); background:rgba(148,163,184,0.12); border:1px solid var(--border); padding:2px 7px; border-radius:6px; display:inline-block; line-height:1.2;">Team</span>`;
  }
  return `<span class="badge-act" style="font-size:11px; font-weight:600; color:var(--muted-foreground, #64748b); background:rgba(148,163,184,0.12); border:1px solid var(--border); padding:2px 7px; border-radius:6px; display:inline-block; line-height:1.2;">Event</span>`;
}

// ================= TAB 2: KANBAN TASKS & DUAL-APPROVAL ================= //
async function loadTasks() {
  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/tasks`);
    const tasks = res.data || [];
    window.currentTasks = tasks;

    const cols = {
      TODO: document.getElementById('col-todo'),
      IN_PROGRESS: document.getElementById('col-in_progress'),
      PENDING_APPROVAL: document.getElementById('col-pending_approval'),
      DONE: document.getElementById('col-done')
    };

    const counts = { TODO: 0, IN_PROGRESS: 0, PENDING_APPROVAL: 0, DONE: 0 };
    Object.values(cols).forEach(c => c.innerHTML = '');

    const isLeader = currentGroupDetails && (currentGroupDetails.role === 'leader' || currentGroupDetails.role === 'co_leader');

    tasks.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1;
      const targetCol = cols[t.status] || cols.TODO;

      const card = typeof renderKanbanCard === 'function'
        ? renderKanbanCard(t)
        : createDefaultKanbanCard(t);

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

function createDefaultKanbanCard(task) {
  if (typeof renderKanbanCard === 'function') {
    return renderKanbanCard(task);
  }
  const card = document.createElement('div');
  const statusClass = task.status === 'PENDING_APPROVAL' ? 'pending-approval' : task.status === 'DONE' ? 'done' : '';
  card.className = `kanban-card ${statusClass}`.trim();
  card.setAttribute('data-task-id', task.id);
  card.onclick = () => {
    if (typeof openTaskDetailsModal === 'function') openTaskDetailsModal(task.id);
  };
  card.style.cssText = 'cursor:pointer; padding:12px 14px; border:1px solid var(--border); border-radius:8px; background:var(--card, #ffffff);';

  const titleEl = document.createElement('div');
  titleEl.className = 'kanban-card-title';
  titleEl.style.cssText = 'font-weight:700; font-size:0.92rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.35; margin-bottom:4px;';
  titleEl.textContent = task.title || 'Untitled Task';

  const assigneeEl = document.createElement('div');
  assigneeEl.className = 'kanban-card-assignee';
  assigneeEl.style.cssText = 'font-size:0.8rem; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2;';
  assigneeEl.textContent = task.assignee_name ? task.assignee_name : 'Unassigned';

  card.appendChild(titleEl);
  card.appendChild(assigneeEl);
  return card;
}

let isSubmittingTask = false;
window.isSubmittingTask = isSubmittingTask;

async function handleCreateTask(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  if (isSubmittingTask || window.isSubmittingTask) {
    console.warn('[Tasks] Task creation submission already in-flight; ignoring duplicate click.');
    return;
  }

  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDesc').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const isLeader = currentGroupDetails && (currentGroupDetails.role === 'leader' || currentGroupDetails.role === 'co_leader');
  
  // Force member task assignment to themselves
  const assignedToUserId = isLeader
    ? document.getElementById('taskAssignee').value
    : (currentUser ? currentUser.id : document.getElementById('taskAssignee').value);

  const estimatedDueDate = document.getElementById('taskDueDate') ? document.getElementById('taskDueDate').value : '';

  if (!title) {
    showToast('Please enter a task title.', 'error');
    return;
  }

  if (!estimatedDueDate) {
    showToast('Please select an estimated deadline date.', 'error');
    return;
  }

  const submitBtn = document.getElementById('createTaskSubmitBtn');
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Create Task';

  // Immediately lock state and disable submit button & pointer events
  isSubmittingTask = true;
  window.isSubmittingTask = true;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.pointerEvents = 'none';
    submitBtn.innerHTML = '<span class="task-btn-spinner" style="display:inline-block; width:12px; height:12px; border:2px solid #ffffff; border-top-color:transparent; border-radius:50%; animation:gs-spin 0.6s linear infinite; margin-right:6px; vertical-align:middle;"></span>Creating...';
  }

  try {
    await apiFetch(`/api/groups/${currentGroupId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        priority,
        assignedToUserId,
        estimated_due_date: estimatedDueDate,
        dueDate: estimatedDueDate
      })
    });
    closeModal('createTaskModal');
    document.getElementById('createTaskForm').reset();
    const successMsg = !isLeader
      ? 'Task created and submitted for Leader Approval!'
      : 'Task added to board!';
    showToast(successMsg, 'success');
    loadTasks();
    if (typeof calendarInstance !== 'undefined' && calendarInstance) {
      calendarInstance.refetchEvents();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    isSubmittingTask = false;
    window.isSubmittingTask = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.pointerEvents = 'auto';
      submitBtn.innerHTML = originalBtnHtml;
    }
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

async function submitReview(approved, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
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

async function deleteTask(taskId, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (!(await gsConfirm('Are you sure you want to delete this task?', { title: 'Delete task?', confirmText: 'Delete', danger: true }))) return;
  try {
    await apiFetch(`/api/groups/${currentGroupId}/tasks/${taskId}`, { method: 'DELETE' });
    showToast('Task deleted.', 'success');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ================= TAB 3: NOTEBOOK ================= //
let dashboardNotebookFolders = [];
let activeDashboardFolderFilter = 'ALL';
let dashboardNotebookNotesCache = [];
let activeShareNoteId = null;

function extractDashboardAutoTitle(rawContent = '') {
  const cleaned = String(rawContent || '')
    .replace(/^<!--GS_SHAPES_JSON:.*?-->/, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  if (!cleaned) return 'Untitled Note';
  const firstLine = cleaned.split(/\r?\n/).map(l => l.trim()).find(Boolean) || cleaned;
  const sentenceMatch = firstLine.match(/^(.+?[.!?])(?:\s|$)/);
  const candidate = (sentenceMatch ? sentenceMatch[1] : firstLine).trim();
  return (candidate.length > 65 ? candidate.slice(0, 65).trim() : candidate) || 'Untitled Note';
}

async function loadDashboardFolders() {
  if (!currentGroupId) return [];
  try {
    const res = await apiFetch(`/api/notebooks/folders/${currentGroupId}`);
    dashboardNotebookFolders = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    dashboardNotebookFolders = [];
  }
  window.dashboardNotebookFolders = dashboardNotebookFolders;
  renderDashboardFoldersBar();
  populateNoteFolderSelect();
  return dashboardNotebookFolders;
}

function populateNoteFolderSelect() {
  const select = document.getElementById('noteFolderSelect');
  if (!select) return;
  select.innerHTML = `<option value="">Uncategorized (Root)</option>` +
    dashboardNotebookFolders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
}

function renderDashboardFoldersBar() {
  const bar = document.getElementById('notebookFoldersBar');
  if (!bar) return;

  const allActive = activeDashboardFolderFilter === 'ALL';
  let html = `
    <button type="button" onclick="filterDashboardNotesByFolder('ALL')" style="padding:5px 12px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid ${allActive ? '#10b981' : 'var(--border)'}; background:${allActive ? 'rgba(16,185,129,0.15)' : 'var(--card)'}; color:${allActive ? '#10b981' : 'var(--text)'};">
      All Pages
    </button>
  `;

  dashboardNotebookFolders.forEach(f => {
    const isActive = String(activeDashboardFolderFilter) === String(f.id);
    html += `
      <div style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid ${isActive ? '#38bdf8' : 'var(--border)'}; background:${isActive ? 'rgba(56,189,248,0.15)' : 'var(--card)'}; color:${isActive ? '#38bdf8' : 'var(--text)'};">
        <span style="cursor:pointer;" onclick="filterDashboardNotesByFolder(${f.id})">${escapeHtml(f.name)}</span>
        <button type="button" title="Delete Folder" onclick="deleteDashboardFolder(${f.id}, event)" style="background:transparent; border:none; color:#ef4444; font-size:11px; cursor:pointer; padding:0 2px; line-height:1;">✕</button>
      </div>
    `;
  });

  bar.innerHTML = html;
}

function filterDashboardNotesByFolder(folderId) {
  activeDashboardFolderFilter = folderId;
  renderDashboardFoldersBar();
  renderDashboardNotesGrid(dashboardNotebookNotesCache);
}
window.filterDashboardNotesByFolder = filterDashboardNotesByFolder;

async function promptCreateDashboardFolder() {
  const name = window.prompt('Enter new folder name:');
  if (!name || !name.trim()) return;
  try {
    await apiFetch('/api/notebooks/folders', {
      method: 'POST',
      body: JSON.stringify({ groupId: currentGroupId, name: name.trim() })
    });
    showToast('Folder created!', 'success');
    await loadDashboardFolders();
  } catch (err) {
    showToast(err.message || 'Failed to create folder.', 'error');
  }
}

async function deleteDashboardFolder(folderId, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const confirmed = await gsConfirm('Are you sure you want to delete this folder and all notes inside it? This action cannot be undone.', { title: 'Delete folder?', confirmText: 'Delete', danger: true });
  if (!confirmed) return;

  try {
    await apiFetch(`/api/notebooks/folders/${folderId}?groupId=${currentGroupId}`, {
      method: 'DELETE'
    });
    if (String(activeDashboardFolderFilter) === String(folderId)) {
      activeDashboardFolderFilter = 'ALL';
    }
    showToast('Folder and its notes deleted.', 'success');
    await loadNotebook();
  } catch (err) {
    showToast(err.message || 'Failed to delete folder.', 'error');
  }
}

function openCreateNoteModal() {
  populateNoteFolderSelect();
  const select = document.getElementById('noteFolderSelect');
  if (select && activeDashboardFolderFilter !== 'ALL') {
    select.value = String(activeDashboardFolderFilter);
  }
  openModal('createNoteModal');
}

async function parseUploadedDocument(file) {
  if (!file) throw new Error('No file selected.');
  const nameParts = file.name.split('.');
  const ext = (nameParts.length > 1 ? nameParts.pop() : '').toLowerCase();

  // 1. Microsoft Word Document (.docx)
  if (ext === 'docx') {
    if (typeof mammoth === 'undefined' || !mammoth.convertToHtml) {
      throw new Error('Mammoth.js library is not loaded. Cannot parse .docx document.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return {
      html: result.value || '<p>(Empty Document)</p>',
      messages: result.messages || []
    };
  }

  // 2. Adobe PDF Document (.pdf)
  if (ext === 'pdf') {
    if (typeof pdfjsLib === 'undefined' || !pdfjsLib.getDocument) {
      throw new Error('PDF.js library is not loaded. Cannot parse .pdf document.');
    }
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    let fullHtml = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      let pageText = '';
      let currentLine = '';
      for (const item of textContent.items) {
        if (item.hasEOL) {
          currentLine += item.str;
          if (currentLine.trim()) {
            pageText += `<p>${escapeHtml(currentLine.trim())}</p>`;
          }
          currentLine = '';
        } else {
          currentLine += (currentLine ? ' ' : '') + item.str;
        }
      }
      if (currentLine.trim()) {
        pageText += `<p>${escapeHtml(currentLine.trim())}</p>`;
      }
      if (!pageText && textContent.items.length > 0) {
        pageText = `<p>${escapeHtml(textContent.items.map(it => it.str).join(' ').trim())}</p>`;
      }
      fullHtml += pageText || '<p><br></p>';
    }

    return {
      html: fullHtml || '<p>(Empty PDF Document)</p>'
    };
  }

  // 3. Fallback for .txt, .md, .markdown
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = String(e.target.result || '');
      const paragraphs = raw.split(/\r?\n\r?\n/).map(para => {
        const trimmed = para.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('### ')) return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
        if (trimmed.startsWith('## ')) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
        if (trimmed.startsWith('# ')) return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
        return `<p>${escapeHtml(trimmed).replace(/\r?\n/g, '<br>')}</p>`;
      }).filter(Boolean).join('');
      resolve({
        html: paragraphs || `<p>${escapeHtml(raw)}</p>`,
        rawText: raw
      });
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function handleDashboardImportDocument(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    showToast(`Parsing "${file.name}"...`, 'info');
    const parsed = await parseUploadedDocument(file);
    const content = parsed.html || '<p>(Empty Document)</p>';
    const baseTitle = file.name.replace(/\.[^/.]+$/, '').trim() || 'Imported Document';
    const autoTitle = extractDashboardAutoTitle(content) || baseTitle;
    const folderId = activeDashboardFolderFilter !== 'ALL' ? Number(activeDashboardFolderFilter) : null;

    const res = await apiFetch(`/api/groups/${currentGroupId}/notes`, {
      method: 'POST',
      body: JSON.stringify({
        title: autoTitle,
        content: content,
        folderId,
        tags: 'imported'
      })
    });
    showToast(`Imported "${autoTitle}"!`, 'success');
    event.target.value = '';
    await loadNotebook();
    if (res && res.data && res.data.id) {
      window.location.href = `/notebook.html?groupId=${currentGroupId}&noteId=${res.data.id}`;
    }
  } catch (err) {
    console.error('[DashboardImport] Error:', err);
    showToast(err.message || 'Failed to import document.', 'error');
  } finally {
    event.target.value = '';
  }
}

async function moveDashboardNoteToFolder(noteId, folderIdValue) {
  const note = dashboardNotebookNotesCache.find(n => Number(n.id) === Number(noteId));
  if (!note) return;
  const folderId = folderIdValue ? Number(folderIdValue) : null;
  try {
    await apiFetch(`/api/groups/${currentGroupId}/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: note.title,
        content: note.content,
        tags: note.tags || '',
        isPinned: Boolean(note.is_pinned),
        folderId
      })
    });
    showToast('Moved page to folder.', 'success');
    await loadNotebook();
  } catch (err) {
    showToast(err.message || 'Failed to move page.', 'error');
  }
}

function openDashboardShareModal(noteId) {
  const note = dashboardNotebookNotesCache.find(n => Number(n.id) === Number(noteId));
  if (!note) return;
  activeShareNoteId = note.id;

  const titleLabel = document.getElementById('shareNoteTitleLabel');
  if (titleLabel) titleLabel.textContent = note.title || extractDashboardAutoTitle(note.content);

  let permitted = [];
  if (Array.isArray(note.permitted_editors)) {
    permitted = note.permitted_editors.map(Number);
  } else if (typeof note.permitted_editors === 'string') {
    try { permitted = JSON.parse(note.permitted_editors).map(Number); } catch (e) {}
  }

  const creatorId = Number(note.created_by || note.author_user_id || 0);
  const members = (currentGroupDetails && Array.isArray(currentGroupDetails.members)) ? currentGroupDetails.members : [];
  const listEl = document.getElementById('shareNoteMembersList');
  if (listEl) {
    if (members.length === 0) {
      listEl.innerHTML = '<p style="color:var(--gray); font-size:12px;">No workspace members found.</p>';
    } else {
      listEl.innerHTML = members.map(m => {
        const uid = Number(m.user_id || m.id);
        const isCreator = uid === creatorId;
        const roleLower = String(m.role || '').toLowerCase();
        const isLeader = roleLower === 'leader' || roleLower === 'co_leader';
        const isAlwaysAllowed = isCreator || isLeader;
        const checked = isAlwaysAllowed || permitted.includes(uid);
        return `
          <label style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border:1px solid var(--border); border-radius:8px; cursor:${isAlwaysAllowed ? 'default' : 'pointer'}; background:var(--card);">
            <div>
              <div style="font-size:13px; font-weight:600; color:var(--text);">${escapeHtml(m.full_name || m.email || 'Member')}</div>
              <div style="font-size:11px; color:var(--gray);">${isCreator ? 'Page Creator (Owner)' : (isLeader ? (roleLower === 'co_leader' ? 'Workspace Co-Leader' : 'Workspace Leader') : 'Member')}</div>
            </div>
            <input type="checkbox" class="share-note-member-cb" value="${uid}" ${checked ? 'checked' : ''} ${isAlwaysAllowed ? 'disabled' : ''}>
          </label>
        `;
      }).join('');
    }
  }
  openModal('shareNotePermissionsModal');
}

async function saveDashboardNotePermissions() {
  if (!activeShareNoteId) return;
  const checkboxes = document.querySelectorAll('.share-note-member-cb:not(:disabled)');
  const permittedEditors = [];
  checkboxes.forEach(cb => {
    if (cb.checked) permittedEditors.push(Number(cb.value));
  });

  try {
    await apiFetch(`/api/groups/${currentGroupId}/notes/${activeShareNoteId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permittedEditors })
    });
    closeModal('shareNotePermissionsModal');
    showToast('Page edit permissions updated!', 'success');
    await loadNotebook();
  } catch (err) {
    showToast(err.message || 'Failed to update permissions.', 'error');
  }
}

function renderDashboardNotesGrid(notes) {
  const container = document.getElementById('notebookGrid');
  if (!container) return;

  const filtered = activeDashboardFolderFilter === 'ALL'
    ? notes
    : notes.filter(n => String(n.folder_id || '') === String(activeDashboardFolderFilter));

  if (!filtered || filtered.length === 0) {
    container.innerHTML = '<p style="color:var(--gray); padding:30px;">No notebook pages in this view. Click <strong>+ New Page</strong> or <strong>Import Document</strong> to add one!</p>';
    return;
  }

  const currUid = currentUser ? Number(currentUser.id) : 0;
  const isLeaderRole = currentGroupDetails && ['leader', 'co_leader'].includes(String(currentGroupDetails.role || '').toLowerCase());

  container.innerHTML = filtered.map(n => {
    const displayTitle = n.title || extractDashboardAutoTitle(n.content || '');
    const cleanPreview = (n.content || '').replace(/^<!--GS_SHAPES_JSON:.*?-->/, '').replace(/<[^>]*>/g, '').trim();
    const creatorId = Number(n.created_by || n.author_user_id || 0);
    let permitted = [];
    if (Array.isArray(n.permitted_editors)) permitted = n.permitted_editors.map(Number);
    const canEdit = isLeaderRole || creatorId === currUid || permitted.includes(currUid);
    const canManagePerms = isLeaderRole || creatorId === currUid;

    return `
      <div id="note-card-${n.id}" data-note-id="${n.id}" data-note-title="${escapeHtml(displayTitle)}" class="note-card ${n.is_pinned ? 'pinned' : ''}" style="cursor:pointer;" onclick="window.location.href='/notebook.html?groupId=' + currentGroupId + '&noteId=' + ${n.id}" title="Click to open in Full Editor">
        <div>
          <h4 style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <span>${escapeHtml(displayTitle)}</span>
            <span style="font-size:11px; padding:2px 8px; background:${canEdit ? 'rgba(82,214,138,0.15)' : 'rgba(148,163,184,0.18)'}; color:${canEdit ? '#52D68A' : '#94a3b8'}; border-radius:12px; font-weight:600; white-space:nowrap;">
              ${canEdit ? 'Edit' : 'Read-Only'}
            </span>
          </h4>
          <p style="white-space:pre-wrap;">${escapeHtml(cleanPreview.slice(0, 220))}${cleanPreview.length > 220 ? '…' : ''}</p>
        </div>
        <div onclick="event.stopPropagation();">
          <div style="margin-top:8px; display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:wrap;">
            <select onchange="moveDashboardNoteToFolder(${n.id}, this.value)" style="font-size:11px; padding:2px 6px; border-radius:6px; background:var(--card); color:var(--text); border:1px solid var(--border); cursor:pointer;" title="Move to folder">
              <option value="">Uncategorized</option>
              ${dashboardNotebookFolders.map(f => `<option value="${f.id}" ${Number(n.folder_id) === Number(f.id) ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}
            </select>
            ${canManagePerms ? `<button type="button" class="btn-outline" onclick="openDashboardShareModal(${n.id})" style="background:var(--card); color:var(--text); border:1px solid var(--border); border-radius:6px; padding:3px 8px; font-size:11px; font-weight:600; cursor:pointer;" title="Share / Page Permissions">Share / Permissions</button>` : ''}
          </div>
          ${n.tags ? `
            <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
              ${n.tags.split(',').filter(t => t.trim()).map(t => `<span style="font-size:11px; padding:2px 8px; background:var(--muted, #f1f5f9); border:1px solid var(--border); border-radius:6px; color:var(--primary); font-weight:600;">#${escapeHtml(t.trim())}</span>`).join('')}
            </div>
          ` : ''}
          <div class="note-meta" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:12px;">
            <span>By ${escapeHtml(n.author_name || 'Member')}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <button type="button" title="Download Plain Text (.txt)" class="btn-export-badge" onclick="exportNotebook('txt', ${n.id}, '${escapeHtml(displayTitle)}', '${escapeHtml(n.content || '')}')" style="background:var(--muted, #f1f5f9); border:1px solid var(--border); color:var(--text); border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">.txt</button>
              <button type="button" title="Download PDF (.pdf)" class="btn-export-badge" onclick="exportNotebook('pdf', ${n.id}, '${escapeHtml(displayTitle)}', '${escapeHtml(n.content || '')}')" style="background:var(--muted, #f1f5f9); border:1px solid var(--border); color:var(--text); border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">.pdf</button>
              <button type="button" title="Download Word (.docx)" class="btn-export-badge" onclick="exportNotebook('docx', ${n.id}, '${escapeHtml(displayTitle)}', '${escapeHtml(n.content || '')}')" style="background:var(--muted, #f1f5f9); border:1px solid var(--border); color:var(--text); border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">.docx</button>
              ${canManagePerms ? `<span style="cursor:pointer; color:#ef4444; margin-left:4px; font-size:11px; font-weight:600;" title="Delete Note" onclick="deleteNote(${n.id}, event)">Delete</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadNotebook(query = '') {
  const container = document.getElementById('notebookGrid');
  if (!container || !currentGroupId) return;

  container.innerHTML = '<p style="color:var(--gray); padding:30px;">Loading notebook pages...</p>';

  try {
    await loadDashboardFolders();

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
        if (Array.isArray(nbRes.notes) && nbRes.notes.length > 0) {
          notes = nbRes.notes;
        } else if (Array.isArray(nbRes.data) && nbRes.data.length > 0) {
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
                folder_id: p.folder_id || null,
                folder_name: p.folder_name || null,
                created_by: p.created_by || p.author_user_id,
                permitted_editors: p.permitted_editors || [],
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

    dashboardNotebookNotesCache = notes;
    renderDashboardNotesGrid(notes);
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
  const folderEl  = document.getElementById('noteFolderSelect');

  const content  = contentEl ? contentEl.value : '';
  const manualTitle = titleEl ? titleEl.value.trim() : '';
  const title    = manualTitle || extractDashboardAutoTitle(content);
  const tags     = tagsEl ? tagsEl.value.trim() : '';
  const isPinned = pinnedEl ? pinnedEl.checked : false;
  const folderId = (folderEl && folderEl.value) ? Number(folderEl.value) : null;

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
      body: JSON.stringify({ title, content, tags, isPinned, folderId })
    });

    closeModal('createNoteModal');

    const form = document.getElementById('createNoteForm');
    if (form) form.reset();

    showToast(`Page "${title}" saved! Opening in editor...`, 'success');
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

async function deleteNote(noteId, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (!(await gsConfirm('Are you sure you want to delete this notebook page?', { title: 'Delete page?', confirmText: 'Delete', danger: true }))) return;
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
async function openPersonalFeedDrawer() {
  if (typeof window.togglePersonalFeed === 'function') {
    return window.togglePersonalFeed();
  }
  const drawer = document.getElementById('feedDrawer');
  const overlay = document.getElementById('feedDrawerOverlay');
  if (drawer && overlay) {
    const willOpen = !drawer.classList.contains('open');
    drawer.classList.toggle('open', willOpen);
    overlay.classList.toggle('open', willOpen);
    drawer.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
    if (willOpen && typeof window.refreshAppFeed === 'function') {
      window.refreshAppFeed();
    }
  }
}

// Clean up any lingering floating bell button if present in DOM
document.addEventListener('DOMContentLoaded', () => {
  const legacyBell = document.getElementById('feedBellBtn');
  if (legacyBell) legacyBell.remove();
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
        netEl.style.color = '#047857';
      } else if (myBalance.net < 0) {
        netEl.textContent = `-₱${Math.abs(myBalance.net).toFixed(2)} (You owe)`;
        netEl.style.color = '#dc2626';
      } else {
        netEl.textContent = '₱0.00 (Settled)';
        netEl.style.color = 'var(--foreground)';
      }
    } else {
      netEl.textContent = '₱0.00';
      netEl.style.color = 'var(--foreground)';
    }

    // Settlements plan
    const settlementsEl = document.getElementById('settlementList');
    const settlements = summary.settlements || [];
    document.getElementById('expSettlementCount').textContent = settlements.length;

    if (settlements.length === 0) {
      settlementsEl.innerHTML = '<p style="color:var(--gray); padding:10px 0;">All balances settled! Nobody owes anything right now.</p>';
    } else {
      settlementsEl.innerHTML = settlements.map(s => {
        const isFromMe = currentUser && Number(s.fromUserId) === Number(currentUser.id);
        const isToMe = currentUser && Number(s.toUserId) === Number(currentUser.id);
        const fromInitial = (s.fromName || 'U').charAt(0).toUpperCase();
        const toInitial = (s.toName || 'U').charAt(0).toUpperCase();

        const fromLabel = isFromMe ? 'You' : escapeHtml(s.fromName);
        const toLabel = isToMe ? 'You' : escapeHtml(s.toName);

        let badgeHtml = '';
        if (isToMe) {
          badgeHtml = '<span class="settlement-badge badge-incoming">You receive</span>';
        } else if (isFromMe) {
          badgeHtml = '<span class="settlement-badge badge-outgoing">You owe</span>';
        }

        const canSettle = isFromMe || isToMe || (typeof currentGroupRole === 'string' && ['ADMIN', 'LEADER', 'CO_LEADER', 'COLEADER'].includes(currentGroupRole.toUpperCase()));
        const actionButtonHtml = canSettle
          ? `<button type="button" class="btn-settle-action" onclick="recordDirectSettlement(${s.fromUserId}, '${escapeHtml(s.fromName).replace(/'/g, "\\'")}', ${s.toUserId}, '${escapeHtml(s.toName).replace(/'/g, "\\'")}', ${s.amount}, event)">
               Mark Settled ✓
             </button>`
          : '';

        return `
          <div class="settlement-card">
            <div class="settlement-main">
              <span class="settlement-avatar" title="${escapeHtml(s.fromName)}">${fromInitial}</span>
              <span class="settlement-user-chip ${isFromMe ? 'is-you' : ''}">${fromLabel}</span>
              <span class="settlement-arrow-icon" aria-label="pays">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </span>
              <span class="settlement-avatar" title="${escapeHtml(s.toName)}">${toInitial}</span>
              <span class="settlement-user-chip ${isToMe ? 'is-you' : ''}">${toLabel}</span>
              ${badgeHtml}
            </div>
            <div class="settlement-details-col">
              <span class="settlement-amount">₱${s.amount.toFixed(2)}</span>
              ${actionButtonHtml}
            </div>
          </div>
        `;
      }).join('');
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
        <td><span class="expense-cat-badge">${escapeHtml(e.category)}</span></td>
        <td>${escapeHtml(e.payer_name)}</td>
        <td>${e.splits ? `${e.splits.length} members` : 'Equal'}</td>
        <td style="color:var(--foreground); font-weight:700; font-variant-numeric:tabular-nums;">₱${Number(e.amount).toFixed(2)}</td>
        <td>
          <button type="button" class="btn-table-action-delete" onclick="deleteExpense(${e.id}, event)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Delete
          </button>
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

async function deleteExpense(expenseId, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (!(await gsConfirm('Are you sure you want to delete this expense?', { title: 'Delete expense?', confirmText: 'Delete', danger: true }))) return;
  try {
    await apiFetch(`/api/groups/${currentGroupId}/expenses/${expenseId}`, { method: 'DELETE' });
    showToast('Expense removed.', 'success');
    loadExpenses();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function recordDirectSettlement(fromUserId, fromName, toUserId, toName, amount, event) {
  if (event && typeof event.preventDefault === 'function') event.preventDefault();
  const btn = event ? event.currentTarget : null;
  const originalText = btn ? btn.innerHTML : '';

  const confirmMsg = `Record settlement payment of ₱${Number(amount).toFixed(2)} from ${fromName} to ${toName}?`;
  if (!(await gsConfirm(confirmMsg, { title: 'Record settlement?', confirmText: 'Record' }))) return;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'Settling...';
  }

  try {
    await apiFetch(`/api/groups/${currentGroupId}/expenses/settle`, {
      method: 'POST',
      body: JSON.stringify({
        fromUserId,
        toUserId,
        amount
      })
    });

    if (btn) {
      btn.innerHTML = 'Settled ✓';
      btn.style.background = '#047857';
      btn.style.color = '#ffffff';
    }

    showToast(`Settlement of ₱${Number(amount).toFixed(2)} recorded!`, 'success');
    setTimeout(() => {
      loadExpenses();
    }, 600);
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
    showToast(err.message || 'Failed to record settlement', 'error');
  }
}

// ================= TAB 5: DISCUSSIONS ================= //
let pendingTopicAttachments = [];
let pendingCommentAttachments = [];

function isImageAttachment(att) {
  const type = (att.file_type || '').toLowerCase();
  const name = (att.file_name || '').toLowerCase();
  return type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
}

function getDocumentBadgeIcon(name) {
  const lower = (name || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'DOCX';
  if (lower.endsWith('.txt')) return 'TXT';
  return 'FILE';
}

function getDocumentBadgeType(name) {
  const lower = (name || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'doc-pdf';
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'doc-word';
  if (lower.endsWith('.txt')) return 'doc-txt';
  return 'doc-generic';
}

// ================= ATTACHMENT LIGHTBOX CONTROLLER ================= //
let currentLightboxImages = [];
let currentLightboxIndex = 0;

function openAttachmentLightbox(url, fileName, index = 0, threadImages = []) {
  if (Array.isArray(threadImages) && threadImages.length > 0) {
    currentLightboxImages = threadImages;
    currentLightboxIndex = (index >= 0 && index < threadImages.length) ? index : 0;
  } else {
    currentLightboxImages = [{ file_url: url, file_name: fileName || 'image' }];
    currentLightboxIndex = 0;
  }

  updateLightboxView();

  const modal = document.getElementById('attachmentLightboxModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
  }

  document.removeEventListener('keydown', handleLightboxKeydown);
  document.addEventListener('keydown', handleLightboxKeydown);
}

function updateLightboxView() {
  const current = currentLightboxImages[currentLightboxIndex];
  if (!current) return;

  const imgEl = document.getElementById('lightboxImg');
  const nameEl = document.getElementById('lightboxFileName');
  const counterEl = document.getElementById('lightboxCounter');
  const downloadBtn = document.getElementById('lightboxDownloadBtn');
  const prevBtn = document.getElementById('lightboxPrevBtn');
  const nextBtn = document.getElementById('lightboxNextBtn');

  if (imgEl) {
    imgEl.src = current.file_url;
    imgEl.alt = current.file_name || 'Attachment preview';
  }
  if (nameEl) nameEl.textContent = current.file_name || 'attachment';
  if (downloadBtn) {
    downloadBtn.href = current.file_url;
    downloadBtn.setAttribute('download', current.file_name || 'attachment');
  }

  const total = currentLightboxImages.length;
  if (counterEl) {
    counterEl.textContent = total > 1 ? `${currentLightboxIndex + 1} of ${total}` : '1 image';
  }

  if (prevBtn) prevBtn.style.display = total > 1 ? 'flex' : 'none';
  if (nextBtn) nextBtn.style.display = total > 1 ? 'flex' : 'none';
}

function prevLightboxImage(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (currentLightboxImages.length <= 1) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
  updateLightboxView();
}

function nextLightboxImage(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (currentLightboxImages.length <= 1) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxImages.length;
  updateLightboxView();
}

function closeAttachmentLightbox() {
  const modal = document.getElementById('attachmentLightboxModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
  document.removeEventListener('keydown', handleLightboxKeydown);
}

function handleLightboxBackdropClick(e) {
  if (e.target && (e.target.id === 'attachmentLightboxModal' || e.target.id === 'lightboxStage')) {
    closeAttachmentLightbox();
  }
}

function handleLightboxKeydown(e) {
  const modal = document.getElementById('attachmentLightboxModal');
  if (!modal || modal.style.display === 'none') return;

  if (e.key === 'Escape') {
    e.preventDefault();
    closeAttachmentLightbox();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prevLightboxImage();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    nextLightboxImage();
  }
}

function renderAttachmentsHtml(attachments, allThreadImages = []) {
  let list = attachments;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch (e) { list = []; }
  }
  if (!Array.isArray(list) || list.length === 0) return '';

  const threadList = Array.isArray(allThreadImages) && allThreadImages.length > 0 
    ? allThreadImages 
    : (window.__activeThreadImages || []);

  const images = list.filter(isImageAttachment);
  const docs = list.filter(att => !isImageAttachment(att));

  let html = '<div class="discussion-attachments-block" style="margin-top:8px; display:flex; flex-direction:column; gap:8px;">';

  if (images.length > 0) {
    html += '<div class="discussion-images-grid" style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">';
    images.forEach(img => {
      const fileName = escapeHtml(img.file_name || 'image');
      const fileUrl = escapeHtml(img.file_url || '');
      
      const globalIdx = threadList.findIndex(x => x.file_url === img.file_url);
      const clickIdx = globalIdx >= 0 ? globalIdx : 0;

      html += `
        <button type="button" class="attachment-image-thumb" onclick="openAttachmentLightbox(this.dataset.url, this.dataset.name, ${clickIdx}, window.__activeThreadImages)" data-url="${fileUrl}" data-name="${fileName}" title="Click to enlarge ${fileName}" aria-label="View ${fileName} in Lightbox">
          <img src="${fileUrl}" alt="${fileName}" style="width:130px; height:80px; object-fit:cover; display:block;" />
          <div class="attachment-thumb-caption">
            <span class="attachment-thumb-name">${fileName}</span>
            <span class="attachment-thumb-action">🔍 View</span>
          </div>
        </button>
      `;
    });
    html += '</div>';
  }

  if (docs.length > 0) {
    html += '<div class="discussion-docs-list" style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">';
    docs.forEach(doc => {
      const fileName = escapeHtml(doc.file_name || 'document');
      const fileUrl = escapeHtml(doc.file_url || '');
      const badgeIcon = getDocumentBadgeIcon(doc.file_name);
      const badgeType = getDocumentBadgeType(doc.file_name);
      html += `
        <a href="${fileUrl}" target="_blank" download="${fileName}" class="attachment-doc-badge" title="Download ${fileName}" aria-label="Download ${fileName}">
          <span class="attachment-badge-pill ${badgeType}">${badgeIcon}</span>
          <span class="attachment-doc-name">${fileName}</span>
          <span class="attachment-doc-action">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </span>
        </a>
      `;
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      file_name: file.name,
      file_url: reader.result,
      file_type: file.type || ''
    });
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function handleTopicFileSelection(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) {
      showToast(`"${f.name}" is too large (max 5MB).`, 'warning');
      continue;
    }
    try {
      const att = await readFileAsDataUrl(f);
      pendingTopicAttachments.push(att);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
  renderTopicAttachmentsPreview();
  event.target.value = '';
}

function renderTopicAttachmentsPreview() {
  const container = document.getElementById('topicAttachmentsPreview');
  const countEl = document.getElementById('topicFilesCount');
  if (countEl) {
    countEl.textContent = pendingTopicAttachments.length 
      ? `${pendingTopicAttachments.length} file(s) attached` 
      : 'No files attached';
  }
  if (!container) return;
  container.innerHTML = pendingTopicAttachments.map((att, idx) => `
    <div style="display:inline-flex; align-items:center; gap:6px; padding:3px 8px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:12px; font-size:11px;">
      <span style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">📎 ${escapeHtml(att.file_name)}</span>
      <button type="button" onclick="removePendingTopicAttachment(${idx})" style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:11px; padding:0 2px;">✕</button>
    </div>
  `).join('');
}

function removePendingTopicAttachment(idx) {
  pendingTopicAttachments.splice(idx, 1);
  renderTopicAttachmentsPreview();
}

async function handleCommentFileSelection(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) {
      showToast(`"${f.name}" is too large (max 5MB).`, 'warning');
      continue;
    }
    try {
      const att = await readFileAsDataUrl(f);
      pendingCommentAttachments.push(att);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
  renderCommentAttachmentsPreview();
  event.target.value = '';
}

function renderCommentAttachmentsPreview() {
  const container = document.getElementById('commentAttachmentsPreview');
  if (!container) return;
  container.innerHTML = pendingCommentAttachments.map((att, idx) => `
    <div style="display:inline-flex; align-items:center; gap:6px; padding:3px 8px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:12px; font-size:11px;">
      <span style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">📎 ${escapeHtml(att.file_name)}</span>
      <button type="button" onclick="removePendingCommentAttachment(${idx})" style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:11px; padding:0 2px;">✕</button>
    </div>
  `).join('');
}

function removePendingCommentAttachment(idx) {
  pendingCommentAttachments.splice(idx, 1);
  renderCommentAttachmentsPreview();
}

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
          <span style="font-size:11px; font-weight:600; color:var(--text-muted, #64748b); background:var(--muted, #f1f5f9); padding:2px 8px; border-radius:12px;">${t.comment_count || 0} replies</span>
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
  window.activeTopicId = topicId;
  const titleEl = document.getElementById('activeTopicTitle');
  if (titleEl) titleEl.textContent = title;
  const formEl = document.getElementById('postCommentForm');
  if (formEl) formEl.style.display = 'block';
  if (typeof window.setupMentionInput === 'function') {
    window.setupMentionInput();
  }

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/discussions/${topicId}`);
    const topic = res.data.topic || res.data || {};
    const comments = res.data.comments || [];
    const container = document.getElementById('commentsContainer');

    // Collect all image attachments in this entire thread for seamless lightbox cycling
    const topicAtts = Array.isArray(topic.attachments) ? topic.attachments : [];
    const threadImages = [];
    topicAtts.filter(isImageAttachment).forEach(img => {
      threadImages.push({
        file_url: img.file_url,
        file_name: img.file_name || 'image'
      });
    });
    comments.forEach(c => {
      const cAtts = Array.isArray(c.attachments) ? c.attachments : [];
      cAtts.filter(isImageAttachment).forEach(img => {
        threadImages.push({
          file_url: img.file_url,
          file_name: img.file_name || 'image'
        });
      });
    });
    window.__activeThreadImages = threadImages;

    const metaEl = document.getElementById('activeTopicMeta');
    if (metaEl) {
      metaEl.textContent = `Started by ${topic.author_name || 'Member'} • ${formatDate(topic.created_at)} • Category: ${topic.category || 'General'}`;
    }
    const topicAttEl = document.getElementById('activeTopicAttachments');
    if (topicAttEl) {
      topicAttEl.innerHTML = renderAttachmentsHtml(topic.attachments, threadImages);
    }

    // Render pinned comments tray in active thread
    const pinnedComments = comments.filter(c => c.is_pinned);
    renderTopicPinnedTray(pinnedComments);

    if (comments.length === 0) {
      container.innerHTML = '<p style="color:var(--gray); text-align:center; padding:20px;">No replies yet. Be the first to reply!</p>';
      return;
    }

    const isLeader = currentGroupDetails && (currentGroupDetails.role === 'leader' || currentGroupDetails.role === 'co_leader');
    const isThreadCreator = currentUser && (Number(topic.author_user_id) === Number(currentUser.id) || Number(topic.created_by) === Number(currentUser.id));
    const canPin = Boolean(isLeader || isThreadCreator);
    window.__canPinCurrentThread = canPin;

    const renderOne = (c, level, replyToName) => {
      const isAuthor = currentUser && Number(c.user_id) === Number(currentUser.id);
      const handleTag = replyToName ? `<span class="reply-handle" style="display:inline-block; font-size:11px; font-weight:700; color:var(--primary, #2563eb); background:rgba(37,99,235,0.1); border-radius:10px; padding:1px 8px; margin-right:6px;">@${escapeHtml(replyToName)}</span>` : '';
      const canDelete = isLeader || isAuthor;
      const isPinned = Boolean(c.is_pinned);

      return `
        <div class="chat-message" id="comment-item-${c.id}" style="position:relative; display:flex; gap:12px; padding:12px; border-radius:10px; margin-bottom:12px; background:var(--muted, #f8fafc); border:1px solid ${isPinned ? 'rgba(245, 158, 11, 0.45)' : 'var(--border)'}; transition:background 0.2s ease;">
          <div class="chat-avatar" style="width:36px; height:36px; border-radius:50%; background:var(--primary, #4f46e5); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:13px; flex-shrink:0; cursor:${isAuthor ? 'default' : 'pointer'};" ${!isAuthor ? `onclick="openDirectMessageDrawer(${c.user_id}, '${escapeHtml(c.user_name).replace(/'/g, "\\'")}', '${escapeHtml(c.user_initials || 'GS')}')"` : ''} title="${isAuthor ? '' : `Direct message ${escapeHtml(c.user_name)}`}">
            ${escapeHtml(c.user_initials || 'GS')}
          </div>
          <div class="chat-content" style="flex:1; min-width:0;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <h4 style="margin:0 0 4px 0; font-size:13px; font-weight:600; color:var(--text); cursor:${isAuthor ? 'default' : 'pointer'};" ${!isAuthor ? `onclick="openDirectMessageDrawer(${c.user_id}, '${escapeHtml(c.user_name).replace(/'/g, "\\'")}', '${escapeHtml(c.user_initials || 'GS')}')"` : ''}>${escapeHtml(c.user_name)}</h4>
              <div style="display:flex; align-items:center; gap:4px;">
                ${canPin ? `
                  <button type="button" class="comment-pin-btn" onclick="togglePinDiscussionComment(${c.id}, event)" title="${isPinned ? 'Unpin comment' : 'Pin comment'}" style="background:none; border:none; color:${isPinned ? 'var(--warning, #f59e0b)' : 'var(--gray)'}; font-size:13px; cursor:pointer; padding:2px 6px; border-radius:4px; opacity:${isPinned ? '1' : '0.7'}; transition:all 0.15s ease; display:inline-flex; align-items:center; justify-content:center;">
                    📌
                  </button>
                ` : (isPinned ? `
                  <span class="comment-pin-badge" title="Pinned in Thread" style="font-size:12px; opacity:0.8; padding:2px 4px; display:inline-flex; align-items:center; color:var(--warning, #f59e0b);">
                    📌
                  </span>
                ` : '')}
                ${canDelete ? `
                  <button type="button" class="comment-delete-discrete" onclick="confirmDeleteComment(${c.id}, event)" title="Delete comment" style="background:none; border:none; color:var(--gray); font-size:13px; cursor:pointer; padding:2px 6px; border-radius:4px; opacity:0.7; transition:all 0.15s ease; display:inline-flex; align-items:center; justify-content:center;" onmouseover="this.style.opacity='1'; this.style.color='#ef4444';" onmouseout="this.style.opacity='0.7'; this.style.color='var(--gray)';">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                ` : ''}
              </div>
            </div>
            ${isPinned ? `<div style="display:inline-flex; align-items:center; gap:4px; font-size:11px; color:var(--warning, #f59e0b); font-weight:600; margin-bottom:4px;">📌 Pinned in Thread</div>` : ''}
            ${c.content ? `<p style="margin:0 0 4px 0; font-size:13px; color:var(--text); line-height:1.5; word-break:break-word;">${handleTag}${typeof window.highlightMentions === 'function' ? window.highlightMentions(c.content) : escapeHtml(c.content)}</p>` : ''}
            ${renderAttachmentsHtml(c.attachments, threadImages)}
            <div style="display:flex; align-items:center; gap:10px; margin-top:4px;">
              <span style="font-size:11px; color:var(--gray);">${formatDate(c.created_at)}</span>
              <button type="button" class="comment-reply-btn" onclick="toggleInlineReply(${c.id}, event)" title="Reply to ${escapeHtml(c.user_name)}" style="background:none; border:none; color:var(--primary, #2563eb); font-size:12px; font-weight:600; cursor:pointer; padding:2px 4px; border-radius:4px;">Reply</button>
            </div>
            <div class="inline-reply-slot" id="inline-reply-slot-${c.id}" style="display:none; margin-top:8px;"></div>
          </div>
        </div>
      `;
    };

    // ---- Threaded tree: replies nest under their parent; indentation capped at 3 levels ----
    const byParent = new Map();
    const knownIds = new Set(comments.map(c => Number(c.id)));
    comments.forEach(c => {
      const pid = c.parent_comment_id && knownIds.has(Number(c.parent_comment_id)) ? Number(c.parent_comment_id) : 0;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(c);
    });
    const countDescendants = (id) => (byParent.get(Number(id)) || []).reduce((n, ch) => n + 1 + countDescendants(ch.id), 0);
    const MAX_INDENT_LEVEL = 3;

    const renderBranch = (c, level, replyToName) => {
      const kids = byParent.get(Number(c.id)) || [];
      let html = '<div class="comment-thread" data-comment-id="' + c.id + '">' + renderOne(c, level, replyToName);
      if (kids.length) {
        const total = countDescendants(c.id);
        const collapsible = kids.length > 1 || total > 1;
        if (collapsible) {
          html += '<button type="button" class="comment-collapse-btn" data-count="' + total + '" onclick="toggleCommentReplies(' + c.id + ', event)" style="background:none; border:none; color:var(--gray); font-size:11px; font-weight:600; cursor:pointer; margin:-4px 0 6px 16px; padding:2px 4px;">Hide ' + total + ' replies</button>';
        }
        if (level < MAX_INDENT_LEVEL) {
          html += '<div class="comment-children" id="comment-children-' + c.id + '" style="border-left:2px solid #cbd5e1; margin-left:16px; padding-left:12px;">' +
            kids.map(k => renderBranch(k, level + 1, null)).join('') + '</div>';
        } else {
          // Max depth reached: keep indentation flat and show an @AuthorName handle instead
          html += '<div class="comment-children" id="comment-children-' + c.id + '">' +
            kids.map(k => renderBranch(k, level, c.user_name || 'Member')).join('') + '</div>';
        }
      }
      return html + '</div>';
    };

    container.innerHTML = (byParent.get(0) || []).map(c => renderBranch(c, 1, null)).join('');

    container.scrollTop = container.scrollHeight;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

let isTopicPinnedTrayOpen = false;

function toggleTopicPinnedTray(forceState) {
  const tray = document.getElementById('topicPinnedTray');
  if (!tray) return;
  if (typeof forceState === 'boolean') {
    isTopicPinnedTrayOpen = forceState;
  } else {
    isTopicPinnedTrayOpen = !isTopicPinnedTrayOpen;
  }
  tray.style.display = isTopicPinnedTrayOpen ? 'block' : 'none';
}

function renderTopicPinnedTray(pinnedComments) {
  const listEl = document.getElementById('topicPinnedList');
  const countEl = document.getElementById('topicPinnedCount');
  const toggleBtn = document.getElementById('topicPinTrayToggleBtn');
  if (!listEl) return;

  const count = pinnedComments ? pinnedComments.length : 0;
  if (countEl) countEl.textContent = `${count} Pinned`;
  if (toggleBtn) toggleBtn.style.display = count > 0 ? 'inline-flex' : 'none';

  if (!pinnedComments || pinnedComments.length === 0) {
    listEl.innerHTML = '<p style="color:var(--gray); font-size:12px; margin:0; padding:8px 0; text-align:center;">No pinned comments in this thread.</p>';
    if (isTopicPinnedTrayOpen && count === 0) {
      toggleTopicPinnedTray(false);
    }
    return;
  }

  const canPin = window.__canPinCurrentThread !== false;

  listEl.innerHTML = pinnedComments.map(c => {
    const textSnippet = c.content ? escapeHtml(c.content).slice(0, 60) : (c.attachments && c.attachments.length ? '📎 Attachment' : 'Comment');
    return `
      <div class="pinned-tray-item" onclick="scrollToDiscussionComment(${c.id})">
        <span class="pinned-tray-item-text">
          <strong>${escapeHtml(c.user_name || 'Member')}:</strong> ${textSnippet}
        </span>
        ${canPin ? `
          <button type="button" class="pinned-tray-item-unpin" onclick="togglePinDiscussionComment(${c.id}, event)" title="Unpin comment" aria-label="Unpin comment">
            ✕
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

function scrollToDiscussionComment(commentId) {
  const el = document.getElementById(`comment-item-${commentId}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.outline = '2px solid var(--warning, #f59e0b)';
    setTimeout(() => { if (el) el.style.outline = ''; }, 2000);
  }
}

function toggleCommentReplies(commentId, e) {
  if (e && e.preventDefault) e.preventDefault();
  const box = document.getElementById('comment-children-' + commentId);
  const btn = e && e.currentTarget ? e.currentTarget : null;
  if (!box) return;
  const hidden = box.style.display === 'none';
  box.style.display = hidden ? '' : 'none';
  if (btn) btn.textContent = (hidden ? 'Hide ' : 'Show ') + (btn.getAttribute('data-count') || '') + ' replies';
}

function toggleInlineReply(commentId, e) {
  if (e && e.preventDefault) e.preventDefault();
  const slot = document.getElementById('inline-reply-slot-' + commentId);
  if (!slot) return;
  const opening = slot.style.display === 'none';
  document.querySelectorAll('.inline-reply-slot').forEach(el => { el.style.display = 'none'; el.innerHTML = ''; });
  if (!opening) return;
  slot.style.display = 'flex';
  slot.style.gap = '6px';
  slot.innerHTML =
    '<input type="text" class="inline-reply-input" id="inline-reply-input-' + commentId + '" placeholder="Write a reply... (@ to mention, # to tag)" maxlength="2000" ' +
    'style="flex:1; min-width:0; padding:6px 10px; font-size:12px; border:1px solid var(--border, #cbd5e1); border-radius:8px; background:var(--card, #fff); color:var(--text, #0f172a);">' +
    '<button type="button" class="btn-primary inline-reply-send" style="padding:6px 12px; font-size:12px; border-radius:8px;" onclick="submitInlineReply(' + commentId + ', event)">Reply</button>';
  const input = document.getElementById('inline-reply-input-' + commentId);
  if (input) {
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.defaultPrevented) { ev.preventDefault(); submitInlineReply(commentId, ev); }
    });
    input.focus();
  }
}

let isSubmittingInlineReply = false;
async function submitInlineReply(parentCommentId, e) {
  if (e && e.preventDefault) e.preventDefault();
  if (isSubmittingInlineReply || !activeTopicId || !currentGroupId) return;
  const input = document.getElementById('inline-reply-input-' + parentCommentId);
  const content = input ? input.value.trim() : '';
  if (!content) {
    if (input) input.focus();
    return;
  }
  isSubmittingInlineReply = true;
  const sendBtn = input ? input.parentElement.querySelector('.inline-reply-send') : null;
  if (sendBtn) sendBtn.disabled = true;
  try {
    await apiFetch('/api/groups/' + currentGroupId + '/discussions/' + activeTopicId + '/comments', {
      method: 'POST',
      body: JSON.stringify({ content, parentCommentId, attachments: [] })
    });
    if (typeof window.resetDiscussionMentions === 'function') window.resetDiscussionMentions();
    const titleEl = document.getElementById('activeTopicTitle');
    await selectTopic(activeTopicId, titleEl ? titleEl.textContent : '');
  } catch (err) {
    showToast(err.message || 'Failed to post reply', 'error');
  } finally {
    isSubmittingInlineReply = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}
window.toggleInlineReply = toggleInlineReply;
window.toggleCommentReplies = toggleCommentReplies;
window.submitInlineReply = submitInlineReply;

async function togglePinDiscussionComment(commentId, e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (!activeTopicId || !currentGroupId) return;

  if (window.__canPinCurrentThread === false) {
    if (typeof showToast === 'function') {
      showToast('Only the Group Leader or Thread Creator can pin or unpin comments in discussions.', 'error');
    }
    return;
  }

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/discussions/${activeTopicId}/comments/${commentId}/pin`, {
      method: 'PUT'
    });
    if (res && res.success) {
      if (typeof showToast === 'function') {
        showToast(res.message || 'Updated pin status.', 'info');
      }
      const titleEl = document.getElementById('activeTopicTitle');
      await selectTopic(activeTopicId, titleEl ? titleEl.textContent : 'Topic');
    }
  } catch (err) {
    console.error('[Discussion Pin] Error:', err);
    if (typeof showToast === 'function') {
      showToast(err.message || 'Failed to toggle pin.', 'error');
    }
  }
}

async function confirmDeleteComment(commentId, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (!(await gsConfirm('Are you sure you want to delete this comment?', { title: 'Delete comment?', confirmText: 'Delete', danger: true }))) {
    return;
  }
  try {
    await apiFetch(`/api/discussions/comments/${commentId}`, {
      method: 'DELETE'
    });
    showToast('Comment deleted.', 'success');
    const el = document.getElementById(`comment-item-${commentId}`);
    if (el) {
      el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.95)';
      setTimeout(() => {
        const titleEl = document.getElementById('activeTopicTitle');
        selectTopic(activeTopicId, titleEl ? titleEl.textContent : '');
      }, 250);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCreateTopic(e) {
  if (e && e.preventDefault) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (typeof window.handleCreateTopic === 'function' && window.handleCreateTopic !== handleCreateTopic) {
    return window.handleCreateTopic(e);
  }
  const titleInput = document.getElementById('topicTitle');
  const title = titleInput ? titleInput.value.trim() : '';
  const categoryEl = document.getElementById('topicCategory');
  const category = categoryEl ? categoryEl.value : 'General';

  if (!title) {
    showToast('Topic title cannot be empty.', 'warning');
    if (titleInput) titleInput.focus();
    return;
  }

  const submitBtn = document.getElementById('submitTopicBtn');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/discussions`, {
      method: 'POST',
      body: JSON.stringify({ 
        title, 
        category,
        attachments: pendingTopicAttachments
      })
    });
    pendingTopicAttachments = [];
    renderTopicAttachmentsPreview();
    closeModal('createTopicModal');
    const form = document.getElementById('createTopicForm');
    if (form) form.reset();
    showToast('Topic created successfully!', 'success');
    await loadDiscussions();
    selectTopic(res.data.id, res.data.title);
  } catch (err) {
    showToast(err.message || 'Failed to create topic', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handlePostComment(e) {
  if (e && e.preventDefault) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (typeof window.handlePostComment === 'function' && window.handlePostComment !== handlePostComment) {
    return window.handlePostComment(e);
  }
  if (!activeTopicId || window.__isSubmittingDiscussionComment) return;

  const input = document.getElementById('newCommentInput');
  const content = input ? input.value.trim() : '';
  if (!content && pendingCommentAttachments.length === 0) {
    showToast('Please enter a message or attach a file.', 'warning');
    if (input) input.focus();
    return;
  }

  window.__isSubmittingDiscussionComment = true;
  const postBtn = document.getElementById('postDiscussionBtn');
  if (postBtn) postBtn.disabled = true;

  try {
    await apiFetch(`/api/groups/${currentGroupId}/discussions/${activeTopicId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ 
        content,
        attachments: pendingCommentAttachments
      })
    });
    if (input) input.value = '';
    pendingCommentAttachments = [];
    renderCommentAttachmentsPreview();
    const titleEl = document.getElementById('activeTopicTitle');
    selectTopic(activeTopicId, titleEl ? titleEl.textContent : '');
  } catch (err) {
    showToast(err.message || 'Failed to post reply', 'error');
  } finally {
    window.__isSubmittingDiscussionComment = false;
    if (postBtn) postBtn.disabled = false;
  }
}

// ================= TAB 6: ISOLATED PERSONAL SPACE ================= //
let personalNotebookFolders = [];
let personalNotebookNotesCache = [];
let activePersonalFolderFilter = 'ALL';
let personalSearchDebounceTimer = null;

function ensurePersonalNotebookToolbars() {
  if (typeof renderNotebookRichTextToolbar === 'function') {
    if (document.getElementById('personalNotebookToolbarContainer')) {
      renderNotebookRichTextToolbar('personalNotebookToolbarContainer', 'personalNotebookCanvas');
    }
    const modalToolbar = document.getElementById('personalModalToolbarContainer');
    if (modalToolbar) {
      if (personalSubTab === 'NOTE') {
        renderNotebookRichTextToolbar('personalModalToolbarContainer', 'personalItemContent');
      } else {
        modalToolbar.innerHTML = '';
      }
    }
  }
}

function switchPersonalSubTab(type) {
  personalSubTab = type;
  document.querySelectorAll('.personal-tab-btn, .personal-tab').forEach(btn => {
    const isMatch = (type === 'NOTE' && (btn.textContent.includes('Note') || btn.textContent.includes('Notebook'))) ||
      (type === 'TASK' && btn.textContent.includes('To-Dos')) ||
      (type === 'EXPENSE' && btn.textContent.includes('Budget'));
    btn.classList.toggle('active', isMatch);
  });

  const wsEl = document.getElementById('personalNotebookWorkspace');
  if (wsEl) {
    wsEl.style.display = type === 'NOTE' ? 'block' : 'none';
  }

  const addBtn = document.getElementById('personalAddBtn');
  if (addBtn) {
    if (type === 'NOTE') {
      addBtn.style.display = 'none';
    } else {
      addBtn.style.display = 'inline-flex';
      addBtn.textContent = type === 'TASK' ? '+ Add To-Do' : '+ Log Expense';
    }
  }

  const headingMap = {
    NOTE: 'Private Notebook Library',
    TASK: 'Personal To-Dos',
    EXPENSE: 'Personal Budget & Expenses'
  };
  const titleEl = document.getElementById('personalSubTabTitle');
  if (titleEl) titleEl.textContent = headingMap[type];

  if (type === 'NOTE') {
    ensurePersonalNotebookToolbars();
  } else {
    togglePersonalQuickCapture(false);
  }
  loadPersonalItems();
}

function openPersonalAddModal() {
  const headingMap = {
    NOTE: 'Create Private Notebook Page (Auto-Titled)',
    TASK: 'Add Personal To-Do',
    EXPENSE: 'Log Personal Expense'
  };
  const headingEl = document.getElementById('personalModalHeading');
  if (headingEl) headingEl.textContent = headingMap[personalSubTab];

  const titleGroup = document.getElementById('personalTitleGroup');
  const titleLabel = document.getElementById('personalItemTitleLabel');
  const titleInput = document.getElementById('personalItemTitle');
  const folderGroup = document.getElementById('personalFolderGroup');
  const amountGroup = document.getElementById('personalAmountGroup');
  const contentGroup = document.getElementById('personalContentGroup');
  // Only full notebook pages get the rich-text canvas; To-Dos and Expenses stay simple.
  if (contentGroup) contentGroup.style.display = personalSubTab === 'NOTE' ? 'block' : 'none';
  const form = document.getElementById('personalItemForm');
  if (form) form.reset();

  if (personalSubTab === 'NOTE') {
    if (titleGroup) titleGroup.style.display = 'block';
    if (titleLabel) titleLabel.textContent = 'Page Title (Optional — leave blank to auto-title)';
    if (titleInput) {
      titleInput.required = false;
      titleInput.placeholder = 'Enter custom title, or leave blank to auto-title from canvas...';
      titleInput.value = '';
    }
    if (folderGroup) folderGroup.style.display = 'block';
    if (amountGroup) amountGroup.style.display = 'none';
    populatePersonalFolderSelects();
    ensurePersonalNotebookToolbars();
  } else {
    if (titleGroup) titleGroup.style.display = 'block';
    if (titleLabel) titleLabel.textContent = 'Title *';
    if (titleInput) {
      titleInput.required = true;
      titleInput.placeholder = personalSubTab === 'EXPENSE' ? 'Item name (e.g. Textbook)' : 'Task title';
    }
    if (folderGroup) folderGroup.style.display = 'none';
    if (amountGroup) amountGroup.style.display = personalSubTab === 'EXPENSE' ? 'block' : 'none';
    const toolbarBox = document.getElementById('personalModalToolbarContainer');
    if (toolbarBox) toolbarBox.innerHTML = '';
  }

  openModal('personalItemModal');
  if (personalSubTab !== 'NOTE' && titleInput) setTimeout(() => titleInput.focus(), 60);
}

async function loadPersonalFolders() {
  try {
    const res = await apiFetch('/api/personal/folders');
    personalNotebookFolders = (res && Array.isArray(res.data)) ? res.data : [];
  } catch (e) {
    personalNotebookFolders = [];
  }
  renderPersonalFoldersBar();
  populatePersonalFolderSelects();
}

function renderPersonalFoldersBar() {
  const bar = document.getElementById('personalNotebookFoldersBar');
  if (!bar) return;

  let html = `
    <button type="button" onclick="filterPersonalNotesByFolder('ALL')"
      style="padding:5px 12px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid ${activePersonalFolderFilter === 'ALL' ? '#38bdf8' : 'var(--border)'}; background:${activePersonalFolderFilter === 'ALL' ? 'rgba(56,189,248,0.15)' : 'var(--card)'}; color:${activePersonalFolderFilter === 'ALL' ? '#0284c7' : 'var(--text)'};">
      All Private Pages
    </button>
  `;

  personalNotebookFolders.forEach(f => {
    const isActive = String(activePersonalFolderFilter) === String(f.id);
    html += `
      <div style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid ${isActive ? '#38bdf8' : 'var(--border)'}; background:${isActive ? 'rgba(56,189,248,0.15)' : 'var(--card)'}; color:${isActive ? '#0284c7' : 'var(--text)'};">
        <span style="cursor:pointer;" onclick="filterPersonalNotesByFolder(${f.id})">${escapeHtml(f.name)}</span>
        <span style="cursor:pointer; color:#ef4444; font-size:11px; margin-left:4px;" title="Delete Private Folder" onclick="deletePersonalFolder(${f.id}, event)">✕</span>
      </div>
    `;
  });

  bar.innerHTML = html;
}

function populatePersonalFolderSelects() {
  const optionsHtml = '<option value="">Uncategorized (Root)</option>' +
    personalNotebookFolders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');

  const modalSelect = document.getElementById('personalItemFolderSelect');
  if (modalSelect) {
    modalSelect.innerHTML = optionsHtml;
    if (activePersonalFolderFilter !== 'ALL') modalSelect.value = String(activePersonalFolderFilter);
  }

  const inlineSelect = document.getElementById('personalInlineFolderSelect');
  if (inlineSelect) {
    inlineSelect.innerHTML = optionsHtml;
    if (activePersonalFolderFilter !== 'ALL') inlineSelect.value = String(activePersonalFolderFilter);
  }
}

function filterPersonalNotesByFolder(folderId) {
  activePersonalFolderFilter = folderId;
  renderPersonalFoldersBar();
  renderPersonalNotesGrid(personalNotebookNotesCache);
}

async function promptCreatePersonalFolder() {
  const name = window.prompt('Enter new private folder name:');
  if (!name || !name.trim()) return;
  try {
    await apiFetch('/api/personal/folders', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), is_private: true })
    });
    showToast('Private folder created!', 'success');
    await loadPersonalFolders();
  } catch (err) {
    showToast(err.message || 'Failed to create private folder.', 'error');
  }
}

async function deletePersonalFolder(folderId, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const confirmed = await gsConfirm('Are you sure you want to delete this folder and all notes inside it? This action cannot be undone.', { title: 'Delete folder?', confirmText: 'Delete', danger: true });
  if (!confirmed) return;

  try {
    await apiFetch(`/api/personal/folders/${folderId}`, { method: 'DELETE' });
    if (String(activePersonalFolderFilter) === String(folderId)) {
      activePersonalFolderFilter = 'ALL';
    }
    showToast('Private folder and its notes deleted.', 'success');
    await loadPersonalItems();
  } catch (err) {
    showToast(err.message || 'Failed to delete private folder.', 'error');
  }
}

function debouncePersonalNotesSearch() {
  clearTimeout(personalSearchDebounceTimer);
  personalSearchDebounceTimer = setTimeout(() => {
    const q = document.getElementById('personalNoteSearchInput')?.value.trim() || '';
    loadPersonalItems(q);
  }, 300);
}

async function handlePersonalImportDocument(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    showToast(`Parsing "${file.name}"...`, 'info');
    const parsed = await parseUploadedDocument(file);
    const content = parsed.html || '<p>(Empty Document)</p>';
    const baseTitle = file.name.replace(/\.[^/.]+$/, '').trim() || 'Private Note';
    const autoTitle = extractDashboardAutoTitle(content) || baseTitle;
    const folderId = activePersonalFolderFilter !== 'ALL' ? Number(activePersonalFolderFilter) : null;

    const res = await apiFetch('/api/personal', {
      method: 'POST',
      body: JSON.stringify({
        type: 'NOTE',
        title: autoTitle,
        content: content,
        folder_id: folderId,
        tags: 'imported,private',
        is_private: true
      })
    });
    showToast(`Imported private note "${autoTitle}"!`, 'success');
    event.target.value = '';
    await loadPersonalItems();
    if (res && res.data && res.data.id) {
      window.location.href = `/notebook.html?personal=1${currentGroupId ? '&groupId=' + currentGroupId : ''}&noteId=${res.data.id}`;
    }
  } catch (err) {
    console.error('[PersonalImport] Error:', err);
    showToast(err.message || 'Failed to import private document.', 'error');
  } finally {
    event.target.value = '';
  }
}

function togglePersonalQuickCapture(forceState) {
  const drawer = document.getElementById('personalQuickCaptureDrawer');
  const btn = document.getElementById('togglePersonalQuickCaptureBtn');
  if (!drawer) return;

  const shouldOpen = (typeof forceState === 'boolean') ? forceState : (drawer.style.display === 'none' || !drawer.style.display);
  if (shouldOpen) {
    drawer.style.display = 'block';
    if (btn) {
      btn.innerHTML = '✕ Close Drawer';
      btn.classList.remove('btn-green');
      btn.classList.add('btn-outline');
    }
    ensurePersonalNotebookToolbars();
    const titleInput = document.getElementById('personalNotebookTitleInput');
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 100);
    }
  } else {
    drawer.style.display = 'none';
    if (btn) {
      btn.innerHTML = '+ New Note';
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-green');
    }
  }
}

async function saveInlinePersonalNotebookPage(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const canvasEl = document.getElementById('personalNotebookCanvas');
  if (!canvasEl) return;
  const titleInput = document.getElementById('personalNotebookTitleInput');
  const manualTitle = titleInput ? titleInput.value.trim() : '';
  const htmlContent = (canvasEl.innerHTML || '').trim();
  const textContent = (canvasEl.innerText || canvasEl.textContent || '').trim();

  const resolvedTitle = manualTitle || extractDashboardAutoTitle(textContent || htmlContent);
  const folderEl = document.getElementById('personalInlineFolderSelect');
  const folderId = (folderEl && folderEl.value) ? Number(folderEl.value) : null;

  try {
    const res = await apiFetch('/api/personal', {
      method: 'POST',
      body: JSON.stringify({
        type: 'NOTE',
        title: resolvedTitle,
        content: htmlContent,
        folder_id: folderId,
        is_private: true
      })
    });
    if (titleInput) titleInput.value = '';
    canvasEl.innerHTML = '';
    togglePersonalQuickCapture(false);
    showToast(`Private note "${resolvedTitle}" saved to library!`, 'success');
    await loadPersonalItems();
  } catch (err) {
    showToast(err.message || 'Failed to save private page.', 'error');
  }
}

async function movePersonalNoteToFolder(noteId, folderIdValue) {
  const folderId = folderIdValue ? Number(folderIdValue) : null;
  try {
    await apiFetch(`/api/personal/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ folder_id: folderId, is_private: true })
    });
    showToast('Moved private page to folder.', 'success');
    await loadPersonalItems();
  } catch (err) {
    showToast(err.message || 'Failed to move private page.', 'error');
  }
}

function renderPersonalNotesGrid(items) {
  const container = document.getElementById('personalItemsContainer');
  if (!container) return;

  const filtered = activePersonalFolderFilter === 'ALL'
    ? items
    : items.filter(n => String(n.folder_id || '') === String(activePersonalFolderFilter));

  if (!filtered || filtered.length === 0) {
    container.innerHTML = '<p style="color:var(--muted-foreground); padding:36px; text-align:center;">Your private library has no notes in this folder. Click <strong>+ New Note</strong> to start drafting!</p>';
    return;
  }

  container.innerHTML = filtered.map(n => {
    const displayTitle = n.title || extractDashboardAutoTitle(n.content || '');
    const cleanPreview = (n.content || '').replace(/^<!--GS_SHAPES_JSON:.*?-->/, '').replace(/<[^>]*>/g, '').trim();
    const fullEditorUrl = `/notebook.html?personal=1${currentGroupId ? '&groupId=' + currentGroupId : ''}&noteId=${n.id}`;
    const folderObj = personalNotebookFolders.find(f => Number(f.id) === Number(n.folder_id));
    const folderName = folderObj ? folderObj.name : 'Uncategorized';

    return `
      <div class="note-card ${n.is_pinned ? 'pinned' : ''}" style="cursor:pointer;" onclick="window.location.href='${fullEditorUrl}'" title="Click to open in Isolated Personal Full Editor">
        <div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px;">
            <span class="note-card-folder-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              ${escapeHtml(folderName)}
            </span>
            <select onchange="movePersonalNoteToFolder(${n.id}, this.value)" onclick="event.stopPropagation();" style="font-size:11px; padding:2px 6px; border-radius:6px; background:var(--card); color:var(--text); border:1px solid var(--border); cursor:pointer;" title="Move to private folder">
              <option value="">Move...</option>
              <option value="">Uncategorized</option>
              ${personalNotebookFolders.map(f => `<option value="${f.id}" ${Number(n.folder_id) === Number(f.id) ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}
            </select>
          </div>
          <h4 style="margin:0 0 8px 0; font-size:1.05rem; font-weight:700; color:var(--foreground);">
            ${escapeHtml(displayTitle)}
          </h4>
          <p style="white-space:pre-wrap; color:var(--muted-foreground); font-size:0.88rem; line-height:1.5;">${escapeHtml(cleanPreview.slice(0, 180))}${cleanPreview.length > 180 ? '…' : ''}</p>
        </div>
        <div onclick="event.stopPropagation();" class="note-card-actions-bar">
          <div class="note-export-group">
            <span style="font-size:0.72rem; color:var(--muted-foreground); margin-right:4px;">Export:</span>
            <button type="button" title="Download Plain Text (.txt)" class="btn-export-badge" onclick="exportNotebook('txt', ${n.id}, '${escapeHtml(displayTitle).replace(/'/g, "\\'")}', '${escapeHtml(n.content || '').replace(/'/g, "\\'")}')">TXT</button>
            <button type="button" title="Download PDF (.pdf)" class="btn-export-badge" onclick="exportNotebook('pdf', ${n.id}, '${escapeHtml(displayTitle).replace(/'/g, "\\'")}', '${escapeHtml(n.content || '').replace(/'/g, "\\'")}')">PDF</button>
            <button type="button" title="Download Word (.docx)" class="btn-export-badge" onclick="exportNotebook('docx', ${n.id}, '${escapeHtml(displayTitle).replace(/'/g, "\\'")}', '${escapeHtml(n.content || '').replace(/'/g, "\\'")}')">DOCX</button>
          </div>
          <button type="button" class="btn-note-delete" title="Delete Private Note" onclick="deletePersonalItem(${n.id}, event)">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function loadPersonalItems(searchQuery = '') {
  try {
    ensurePersonalNotebookToolbars();
    if (personalSubTab === 'NOTE') {
      await loadPersonalFolders();
    }

    const qParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
    const res = await apiFetch(`/api/personal?type=${personalSubTab}${qParam}`);
    const items = res.data || [];
    const container = document.getElementById('personalItemsContainer');
    if (!container) return;

    if (personalSubTab === 'NOTE') {
      container.className = 'notebook-grid';
      personalNotebookNotesCache = items;
      renderPersonalNotesGrid(items);
      return;
    }

    container.className = '';
    if (items.length === 0) {
      container.innerHTML = '<p style="color:var(--gray); padding:30px;">Your private space is empty for this category. Click "+ Add" to store private tasks or budget items!</p>';
      return;
    }

    if (personalSubTab === 'TASK') {
      container.innerHTML = `
        <ul class="task-list">
          ${items.map(t => `
            <li style="display:flex; justify-content:space-between; align-items:center;">
              <label style="display:flex; align-items:center; gap:12px; cursor:pointer; flex:1;">
                <input type="checkbox" ${t.status === 'COMPLETED' ? 'checked' : ''} onchange="togglePersonalTask(${t.id}, this.checked)">
                <span style="${t.status === 'COMPLETED' ? 'text-decoration:line-through; color:var(--gray);' : ''}">${escapeHtml(t.title)}</span>
              </label>
              <span style="cursor:pointer; color:#FF7272; font-size:11px; font-weight:600;" onclick="deletePersonalItem(${t.id})">Delete</span>
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
                <td><span style="cursor:pointer; color:#FF7272; font-size:11px; font-weight:600;" onclick="deletePersonalItem(${e.id})">Delete</span></td>
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
  const rawTitle = document.getElementById('personalItemTitle')?.value.trim() || '';
  const content = personalSubTab === 'NOTE' ? (document.getElementById('personalItemContent')?.value || '') : '';
  const amount = parseFloat(document.getElementById('personalItemAmount')?.value) || 0;

  if (personalSubTab !== 'NOTE' && !rawTitle) {
    showToast(personalSubTab === 'EXPENSE' ? 'Please enter an item name.' : 'Please enter a task title.', 'warning');
    return;
  }
  if (personalSubTab === 'EXPENSE' && !(amount > 0)) {
    showToast('Please enter an amount greater than 0.', 'warning');
    return;
  }
  const folderEl = document.getElementById('personalItemFolderSelect');
  const folderId = (folderEl && folderEl.value) ? Number(folderEl.value) : null;

  // Hybrid Auto-Titling System for Notes: use manual title if provided, else extract from canvas, else "Untitled Note"
  const title = personalSubTab === 'NOTE'
    ? (rawTitle || extractDashboardAutoTitle(content))
    : rawTitle;

  try {
    const res = await apiFetch('/api/personal', {
      method: 'POST',
      body: JSON.stringify({
        type: personalSubTab,
        title,
        content,
        amount,
        folder_id: folderId,
        is_private: true
      })
    });
    closeModal('personalItemModal');
    document.getElementById('personalItemForm').reset();
    showToast('Saved to your isolated private space!', 'success');
    await loadPersonalItems();

    if (personalSubTab === 'NOTE' && res && res.data && res.data.id) {
      window.location.href = `/notebook.html?personal=1${currentGroupId ? '&groupId=' + currentGroupId : ''}&noteId=${res.data.id}`;
    }
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

async function deletePersonalItem(id, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (!(await gsConfirm('Remove item from your personal space?', { title: 'Remove item?', confirmText: 'Remove', danger: true }))) return;
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


/* ==========================================================================
   GLOBAL SLIDE-OUT DIRECT MESSAGING DRAWER (1-on-1 Persistent PMs)
   ========================================================================== */

let isDmDrawerOpen = false;
let activeDmOtherUser = null; // { id, full_name, avatar_initials, status }
let dmConversationsList = [];
let dmPollInterval = null;
let stagedDmAttachments = [];
let isDmPinnedTrayOpen = false;

function toggleDmDrawer(forceState) {
  const overlay = document.getElementById('dmDrawerOverlay');
  const drawer = document.getElementById('dmDrawer');
  if (!overlay || !drawer) return;

  if (typeof forceState === 'boolean') {
    isDmDrawerOpen = forceState;
  } else {
    isDmDrawerOpen = !isDmDrawerOpen;
  }

  if (isDmDrawerOpen) {
    overlay.classList.add('open');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');

    // Update active workspace label
    const pill = document.getElementById('dmWorkspacePill');
    if (pill && currentGroupDetails && currentGroupDetails.name) {
      pill.textContent = `Workspace: ${currentGroupDetails.name}`;
    }

    if (!activeDmOtherUser) {
      backToDmList();
    } else {
      loadDmThread(activeDmOtherUser.id);
    }

    // Start polling every 5s while open
    clearInterval(dmPollInterval);
    dmPollInterval = setInterval(() => {
      if (!isDmDrawerOpen) return;
      if (activeDmOtherUser) {
        loadDmThread(activeDmOtherUser.id, true);
      } else {
        loadDmConversations(true);
      }
    }, 5000);
  } else {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    clearInterval(dmPollInterval);
  }
}

async function loadDmConversations(silent = false) {
  if (!currentGroupId) return;
  const listEl = document.getElementById('dmTeammatesList');
  if (!listEl) return;

  if (!silent && dmConversationsList.length === 0) {
    listEl.innerHTML = '<p style="color:var(--gray); text-align:center; padding:24px 0; font-size:13px;">Loading teammates...</p>';
  }

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/messages/conversations`);
    if (!res || !Array.isArray(res.data)) return;

    dmConversationsList = res.data;

    // Calculate total unread messages across all teammates
    const totalUnread = dmConversationsList.reduce((acc, c) => acc + (Number(c.unread_count) || 0), 0);
    const badge = document.getElementById('dmUnreadBadge');
    if (badge) {
      if (totalUnread > 0) {
        badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    renderDmTeammatesList(dmConversationsList);
  } catch (err) {
    console.warn('[DM] Failed to load conversations:', err.message);
    if (!silent) {
      listEl.innerHTML = '<p style="color:var(--gray); text-align:center; padding:20px 0; font-size:13px;">Could not load teammates.</p>';
    }
  }
}

function renderDmTeammatesList(items) {
  const listEl = document.getElementById('dmTeammatesList');
  if (!listEl) return;

  if (!items || items.length === 0) {
    listEl.innerHTML = '<p style="color:var(--gray); text-align:center; padding:24px 0; font-size:13px;">No other members in this workspace yet.</p>';
    return;
  }

  listEl.innerHTML = items.map(m => {
    const isOnline = m.status === 'online';
    const lastSnippet = m.last_message ? escapeHtml(m.last_message) : 'No messages yet';
    const unread = Number(m.unread_count) || 0;
    const timeStr = m.last_message_at ? formatTimeAgo(m.last_message_at) : '';

    return `
      <div class="dm-teammate-item" onclick="openDirectMessageDrawer(${m.user_id}, '${escapeHtml(m.full_name).replace(/'/g, "\\'")}', '${escapeHtml(m.avatar_initials || 'GS')}', '${m.status}')">
        <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
          <div class="dm-avatar-wrap" style="position:relative; flex-shrink:0;">
            <div class="chat-avatar" style="width:36px; height:36px; font-size:13px;">${escapeHtml(m.avatar_initials || 'GS')}</div>
            <span class="dm-presence-dot ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Online' : 'Offline'}"></span>
          </div>
          <div style="min-width:0; flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:600; font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(m.full_name)}
              </span>
              ${timeStr ? `<span style="font-size:10px; color:var(--gray); margin-left:6px; flex-shrink:0;">${timeStr}</span>` : ''}
            </div>
            <div style="font-size:11.5px; color:${unread > 0 ? 'var(--text)' : 'var(--gray)'}; font-weight:${unread > 0 ? '700' : 'normal'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px;">
              ${lastSnippet}
            </div>
          </div>
        </div>
        ${unread > 0 ? `<span class="dm-unread-badge" style="margin-left:8px;">${unread}</span>` : ''}
      </div>
    `;
  }).join('');
}

function filterDmTeammates(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    renderDmTeammatesList(dmConversationsList);
    return;
  }
  const filtered = dmConversationsList.filter(m =>
    (m.full_name && m.full_name.toLowerCase().includes(q)) ||
    (m.email && m.email.toLowerCase().includes(q))
  );
  renderDmTeammatesList(filtered);
}

function openDirectMessageDrawer(otherUserId, otherUserName, otherAvatar = 'GS', otherStatus = 'offline') {
  activeDmOtherUser = {
    id: Number(otherUserId),
    full_name: otherUserName || 'Teammate',
    avatar_initials: otherAvatar || 'GS',
    status: otherStatus || 'offline'
  };

  toggleDmDrawer(true);

  // Switch to Thread View
  const listView = document.getElementById('dmListView');
  const threadView = document.getElementById('dmThreadView');
  if (listView) listView.style.display = 'none';
  if (threadView) threadView.style.display = 'flex';

  // Set thread header details
  const nameEl = document.getElementById('dmThreadTargetName');
  if (nameEl) nameEl.textContent = activeDmOtherUser.full_name;

  const avatarEl = document.getElementById('dmThreadTargetAvatar');
  if (avatarEl) avatarEl.textContent = activeDmOtherUser.avatar_initials;

  const statusEl = document.getElementById('dmThreadTargetStatus');
  const presenceEl = document.getElementById('dmThreadTargetPresence');
  const isOnline = activeDmOtherUser.status === 'online';

  if (statusEl) statusEl.textContent = isOnline ? 'online' : 'offline';
  if (presenceEl) {
    presenceEl.className = `dm-presence-dot ${isOnline ? 'online' : 'offline'}`;
  }

  stagedDmAttachments = [];
  renderDmAttachmentStaging();

  loadDmThread(activeDmOtherUser.id);

  setTimeout(() => {
    const input = document.getElementById('dmMessageInput');
    if (input) input.focus();
  }, 100);
}

function backToDmList() {
  activeDmOtherUser = null;
  stagedDmAttachments = [];
  renderDmAttachmentStaging();

  const listView = document.getElementById('dmListView');
  const threadView = document.getElementById('dmThreadView');
  if (listView) listView.style.display = 'flex';
  if (threadView) threadView.style.display = 'none';

  loadDmConversations();
}

function handleDmFileSelection(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const fileList = Array.from(files);
  let pending = fileList.length;

  fileList.forEach(file => {
    if (file.size > 10 * 1024 * 1024) {
      if (typeof showToast === 'function') showToast(`File ${file.name} exceeds 10MB limit.`, 'warning');
      pending--;
      if (pending === 0) renderDmAttachmentStaging();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      stagedDmAttachments.push({
        file_name: file.name,
        file_url: e.target.result,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size
      });
      pending--;
      if (pending === 0) renderDmAttachmentStaging();
    };
    reader.onerror = () => {
      pending--;
      if (pending === 0) renderDmAttachmentStaging();
    };
    reader.readAsDataURL(file);
  });

  event.target.value = '';
}

function removeDmStagedAttachment(index) {
  stagedDmAttachments.splice(index, 1);
  renderDmAttachmentStaging();
}

function renderDmAttachmentStaging() {
  const stagingEl = document.getElementById('dmAttachmentStaging');
  if (!stagingEl) return;

  if (stagedDmAttachments.length === 0) {
    stagingEl.style.display = 'none';
    stagingEl.innerHTML = '';
    return;
  }

  stagingEl.style.display = 'flex';
  stagingEl.innerHTML = stagedDmAttachments.map((att, idx) => `
    <div class="dm-stage-chip">
      <span class="dm-stage-chip-name" title="${escapeHtml(att.file_name)}">${escapeHtml(att.file_name)}</span>
      <button type="button" class="dm-stage-chip-remove" onclick="removeDmStagedAttachment(${idx})" aria-label="Remove ${escapeHtml(att.file_name)}">✕</button>
    </div>
  `).join('');
}

function toggleDmPinnedTray(forceState) {
  const tray = document.getElementById('dmPinnedTray');
  if (!tray) return;
  if (typeof forceState === 'boolean') {
    isDmPinnedTrayOpen = forceState;
  } else {
    isDmPinnedTrayOpen = !isDmPinnedTrayOpen;
  }
  tray.style.display = isDmPinnedTrayOpen ? 'block' : 'none';
}

function renderDmPinnedTray(messages) {
  const listEl = document.getElementById('dmPinnedList');
  const countEl = document.getElementById('dmPinnedCount');
  const badgeEl = document.getElementById('dmPinBadge');
  if (!listEl) return;

  const pinned = (messages || []).filter(m => m.is_pinned);
  const count = pinned.length;

  if (countEl) countEl.textContent = `${count} Pinned`;
  if (badgeEl) {
    if (count > 0) {
      badgeEl.textContent = count > 99 ? '99+' : count;
      badgeEl.style.display = 'inline-block';
    } else {
      badgeEl.style.display = 'none';
    }
  }

  if (count === 0) {
    listEl.innerHTML = '<p style="color:var(--gray); font-size:12px; margin:0; padding:8px 0; text-align:center;">No pinned messages in this chat.</p>';
    return;
  }

  listEl.innerHTML = pinned.map(m => {
    let previewText = m.message ? escapeHtml(m.message).slice(0, 50) : '';
    const atts = Array.isArray(m.attachments) ? m.attachments : [];
    if (!previewText && atts.length > 0) {
      previewText = `📎 ${escapeHtml(atts[0].file_name || 'Attachment')}`;
    }
    return `
      <div class="pinned-tray-item" onclick="scrollToDmMessage(${m.id})">
        <span class="pinned-tray-item-text">
          <strong>${escapeHtml(m.sender_name || 'Teammate')}:</strong> ${previewText}
        </span>
        <button type="button" class="pinned-tray-item-unpin" onclick="togglePinDmMessage(${m.id}, event)" title="Unpin message" aria-label="Unpin message">
          ✕
        </button>
      </div>
    `;
  }).join('');
}

function scrollToDmMessage(messageId) {
  const el = document.getElementById(`dm-msg-${messageId}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.outline = '2px solid var(--warning, #f59e0b)';
    setTimeout(() => { if (el) el.style.outline = ''; }, 2000);
  }
}

async function togglePinDmMessage(messageId, e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (!currentGroupId || !messageId) return;

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/messages/${messageId}/pin`, {
      method: 'PUT'
    });
    if (res && res.success) {
      if (typeof showToast === 'function') {
        showToast(res.message || 'Updated pin status.', 'info');
      }
      if (activeDmOtherUser) {
        await loadDmThread(activeDmOtherUser.id, true);
      }
    }
  } catch (err) {
    console.error('[DM Pin] Error:', err);
    if (typeof showToast === 'function') {
      showToast(err.message || 'Failed to toggle pin.', 'error');
    }
  }
}

async function loadDmThread(otherUserId, silent = false) {
  if (!currentGroupId || !otherUserId) return;
  const container = document.getElementById('dmMessagesContainer');
  if (!container) return;

  if (!silent && container.children.length <= 1) {
    container.innerHTML = '<p style="color:var(--gray); text-align:center; padding:30px 10px; font-size:13px;">Loading conversation...</p>';
  }

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/messages/direct/${otherUserId}`);
    if (!res || !Array.isArray(res.data)) return;

    const messages = res.data;
    if (messages.length === 0) {
      container.innerHTML = '<p style="color:var(--gray); text-align:center; padding:40px 10px; font-size:13px;">No messages yet. Send a direct note or file to start the conversation!</p>';
      renderDmPinnedTray([]);
      return;
    }

    // Collect thread images for lightbox cycling
    const threadImages = [];
    messages.forEach(m => {
      const atts = Array.isArray(m.attachments) ? m.attachments : [];
      atts.filter(isImageAttachment).forEach(img => {
        threadImages.push({
          file_url: img.file_url,
          file_name: img.file_name || 'image'
        });
      });
    });
    window.__activeDmImages = threadImages;

    const currentUid = currentUser ? Number(currentUser.id) : 0;
    container.innerHTML = messages.map(m => {
      const isSent = Number(m.sender_id) === currentUid;
      const isPinned = Boolean(m.is_pinned);
      const timeStr = m.created_at ? formatTimeOfDay(m.created_at) : '';
      const atts = Array.isArray(m.attachments) ? m.attachments : [];

      return `
        <div class="dm-bubble ${isSent ? 'sent' : 'received'} ${isPinned ? 'pinned' : ''}" id="dm-msg-${m.id}">
          ${isPinned ? `<div class="dm-pinned-indicator">📌 Pinned</div>` : ''}
          ${m.message ? `<div>${escapeHtml(m.message)}</div>` : ''}
          ${atts.length > 0 ? renderAttachmentsHtml(atts, window.__activeDmImages) : ''}
          <div class="dm-bubble-meta">
            <span>${timeStr}</span>
            ${isSent ? `<span>${m.is_read ? '✓✓' : '✓'}</span>` : ''}
            <button type="button" class="dm-msg-pin-btn" onclick="togglePinDmMessage(${m.id}, event)" title="${isPinned ? 'Unpin message' : 'Pin message'}" aria-label="${isPinned ? 'Unpin message' : 'Pin message'}">
              ${isPinned ? '📌' : '📍'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    renderDmPinnedTray(messages);

    container.scrollTop = container.scrollHeight;

    // Refresh unread counts in background
    loadDmConversations(true);
  } catch (err) {
    console.warn('[DM] Failed to load messages:', err.message);
    if (!silent) {
      container.innerHTML = '<p style="color:var(--gray); text-align:center; padding:30px 10px; font-size:13px;">Could not load messages.</p>';
    }
  }
}

async function handleSendDirectMessage(event) {
  if (event && event.preventDefault) event.preventDefault();
  if (!activeDmOtherUser || !currentGroupId) return;

  const input = document.getElementById('dmMessageInput');
  if (!input) return;

  const text = input.value.trim();
  const attachmentsToSend = [...stagedDmAttachments];

  if (!text && attachmentsToSend.length === 0) return;

  input.value = '';
  stagedDmAttachments = [];
  renderDmAttachmentStaging();

  const container = document.getElementById('dmMessagesContainer');
  if (container) {
    const optimisticBubble = document.createElement('div');
    optimisticBubble.className = 'dm-bubble sent';
    optimisticBubble.innerHTML = `
      ${text ? `<div>${escapeHtml(text)}</div>` : ''}
      ${attachmentsToSend.length > 0 ? `<div style="font-size:11px; opacity:0.85; margin-top:2px;">📎 Sending ${attachmentsToSend.length} file(s)...</div>` : ''}
      <div class="dm-bubble-meta">
        <span>Just now</span>
        <span>•</span>
      </div>
    `;
    container.appendChild(optimisticBubble);
    container.scrollTop = container.scrollHeight;
  }

  try {
    await apiFetch(`/api/groups/${currentGroupId}/messages/direct`, {
      method: 'POST',
      body: JSON.stringify({
        receiverId: activeDmOtherUser.id,
        message: text,
        attachments: attachmentsToSend
      })
    });

    await loadDmThread(activeDmOtherUser.id, true);
  } catch (err) {
    console.error('[DM] Failed to send message:', err);
    if (typeof showToast === 'function') {
      showToast(err.message || 'Failed to send message.', 'error');
    }
  }
}

function sendDirectMessage(event) {
  return handleSendDirectMessage(event);
}

function formatTimeAgo(dateStr) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return '';
  }
}

function formatTimeOfDay(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}
