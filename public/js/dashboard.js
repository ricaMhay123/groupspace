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

    // Update Header
    document.getElementById('joinCodeBadge').style.display = 'flex';
    document.getElementById('displayJoinCode').textContent = currentGroupDetails.join_code;
    const roleBadge = document.getElementById('userRoleBadge');
    if (roleBadge) {
      roleBadge.textContent = currentGroupDetails.role;
      roleBadge.className = `status ${currentGroupDetails.role === 'leader' ? 'online' : 'pending'}`;
    }

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
    const isLeader = userRole === 'leader';
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
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Minimalist Quick Scratchpad / Personal Notes widget helper
function renderHomespaceScratchpadHtml(personalNotes, inputId) {
  const notes = Array.isArray(personalNotes) ? personalNotes.slice(0, 8) : [];
  return `
    <div class="dashboard-panel" style="border-top:3px solid var(--secondary, #10b981);">
      <div class="panel-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <h3 style="margin:0;">Quick Scratchpad</h3>
        </div>
        <button onclick="switchTab('personal')" class="btn-outline" style="padding:4px 10px; font-size:12px;">Open Space</button>
      </div>
      <div style="padding:14px 16px;">
        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <input type="text" id="${inputId}" class="form-control" placeholder="Quick personal reminder or note..." style="font-size:12px; padding:7px 10px; flex:1;" onkeydown="if(event.key==='Enter'){event.preventDefault();saveHomespaceScratchpad('${inputId}');}">
          <button type="button" class="btn-green" style="padding:7px 14px; font-size:12px; font-weight:600; white-space:nowrap;" onclick="saveHomespaceScratchpad('${inputId}')">Save</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; max-height:230px; overflow-y:auto;">
          ${notes.length === 0 ? `
            <div style="text-align:center; padding:18px 10px; color:var(--gray);">
              <p style="margin:0; font-size:12px;">Private reminders and personal notes saved here.</p>
            </div>
          ` : notes.map(n => `
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding:8px 10px; background:var(--muted, #f8fafc); border:1px solid var(--border); border-radius:8px;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:12px; font-weight:600; color:var(--text); word-break:break-word;">${escapeHtml(n.title || n.content || 'Personal Note')}</div>
                ${n.content && n.content !== n.title ? `<div style="font-size:11px; color:var(--gray); margin-top:2px; word-break:break-word;">${escapeHtml(n.content)}</div>` : ''}
                <div style="font-size:10px; color:var(--gray); margin-top:2px;">Private · ${formatDate(n.created_at)}</div>
              </div>
              <button type="button" class="btn-outline" style="padding:2px 6px; font-size:11px; color:var(--gray); border-color:var(--border); border-radius:4px; cursor:pointer;" onclick="deleteHomespaceScratchpadNote(${n.id}, event)" title="Delete reminder">
                ✕
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

async function saveHomespaceScratchpad(inputId) {
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
  if (e) e.stopPropagation();
  try {
    await apiFetch(`/api/personal/${noteId}`, { method: 'DELETE' });
    showToast('Reminder deleted.', 'success');
    loadOverview();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderLeaderHomespace(container, pendingTasks, members, activities, currentUserId, personalNotes) {
  const settings = (currentGroupDetails && currentGroupDetails.settings) ? currentGroupDetails.settings : {};
  const requireApproval = settings.requireApproval !== false; // default true
  const allowDiscussions = settings.allowMemberDiscussions !== false; // default true
  const restrictExpenses = settings.restrictExpensesToLeaders === true; // default false

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
                <span class="tag tag-${(t.priority || 'medium').toLowerCase()}" style="font-size:10px; padding:2px 6px;">${escapeHtml(t.priority || 'MEDIUM')}</span>
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

  const rosterHtml = members.map(m => {
    const isSelf = Number(m.user_id) === Number(currentUserId);
    return `
      <li style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid var(--border); gap:12px;">
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
          <div class="chat-avatar" style="width:34px; height:34px; font-size:12px; flex-shrink:0;">${escapeHtml(m.avatar_initials || 'GS')}</div>
          <div style="min-width:0;">
            <div style="font-weight:600; font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(m.full_name)} ${isSelf ? '<span style="font-size:11px; color:var(--gray); font-weight:normal;">(You)</span>' : ''}
            </div>
            <div style="color:var(--gray); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(m.email)}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
          ${isSelf ? `
            <span class="status online" style="font-size:11px; font-weight:700;">Leader</span>
          ` : `
            <select onchange="changeMemberRole(${m.user_id}, this.value)" style="font-size:11px; padding:3px 6px; border-radius:6px; border:1px solid var(--border); background:var(--card); color:var(--text); cursor:pointer;">
              <option value="leader" ${m.role === 'leader' ? 'selected' : ''}>Leader</option>
              <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option>
            </select>
            <button type="button" class="btn-outline" style="padding:3px 8px; font-size:11px; color:#dc2626; border-color:#fca5a5; border-radius:6px; cursor:pointer;" onclick="removeMemberFromWorkspace(${m.user_id}, '${escapeHtml(m.full_name).replace(/'/g, "\\'")}')" title="Remove member">
              Remove
            </button>
          `}
        </div>
      </li>
    `;
  }).join('');

  const activityFeedHtml = activities.length === 0
    ? '<p style="color:var(--gray); font-size:13px; padding:15px; text-align:center;">No recent workspace events yet.</p>'
    : activities.slice(0, 5).map(a => `
      <div class="activity-item">
        <div class="activity-icon">${getActivityIcon(a.action_type)}</div>
        <div style="flex:1;">
          <h4>${escapeHtml(a.description)}</h4>
          <p>${formatDate(a.created_at)}</p>
        </div>
      </div>
    `).join('');

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- Col 1: Pending Approvals, Leader Settings & Activity -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- Pending Task Approvals -->
        <div class="dashboard-panel" style="border-top:3px solid #f59e0b;">
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

        <!-- Leader Workspace Settings Module -->
        <div class="dashboard-panel" style="border-top:3px solid var(--primary);">
          <div class="panel-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 style="margin:0;">Workspace Settings & Controls</h3>
              <span class="status online" style="font-size:11px; font-weight:700;">LEADER</span>
            </div>
            <span style="font-size:12px; color:var(--gray);">Active Workspace</span>
          </div>
          <div style="padding:16px 18px; display:flex; flex-direction:column; gap:16px;">
            <!-- Workspace Name Change -->
            <div>
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:6px; color:var(--text);">Workspace Name</label>
              <div style="display:flex; gap:8px;">
                <input type="text" id="leaderWsNameInput" class="form-control" value="${escapeHtml(currentGroupDetails.name)}" style="font-size:13px; padding:8px 12px; flex:1;">
                <button type="button" class="btn-green" style="padding:8px 14px; font-size:12px; font-weight:600; white-space:nowrap;" onclick="saveWorkspaceName(document.getElementById('leaderWsNameInput').value)">Save Name</button>
              </div>
            </div>

            <!-- Reset Invite Code -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:var(--muted,#f8fafc); border:1px solid var(--border); border-radius:10px; gap:12px; flex-wrap:wrap;">
              <div>
                <div style="font-size:12px; font-weight:600; color:var(--text); margin-bottom:2px;">Workspace Invite Code</div>
                <div style="font-size:11px; color:var(--gray);">Share this code with teammates to grant instant access.</div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <strong style="color:var(--primary); font-size:14px; letter-spacing:1px; background:#eef2ff; padding:4px 10px; border-radius:6px; border:1px solid #c7d2fe;" id="leaderJoinCodeDisplay">${escapeHtml(currentGroupDetails.join_code)}</strong>
                <button type="button" class="btn-outline" style="padding:6px 12px; font-size:12px; font-weight:600; border-radius:6px;" onclick="resetWorkspaceInviteCode()">Reset Code</button>
              </div>
            </div>

            <!-- Member Permission Constraints -->
            <div style="border-top:1px solid var(--border); padding-top:14px;">
              <div style="font-size:12px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">
                Member Permission Constraints
              </div>
              <div style="display:flex; flex-direction:column; gap:10px;">
                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text); cursor:pointer;">
                  <input type="checkbox" id="leaderConstraintApproval" ${requireApproval ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                  <span>Require leader approval before member tasks are marked Done</span>
                </label>
                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text); cursor:pointer;">
                  <input type="checkbox" id="leaderConstraintDiscussions" ${allowDiscussions ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                  <span>Allow members to create new discussion topics</span>
                </label>
                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text); cursor:pointer;">
                  <input type="checkbox" id="leaderConstraintExpenses" ${restrictExpenses ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                  <span>Restrict expense ledger entries to workspace leaders only</span>
                </label>
              </div>
              <button type="button" class="btn-green" style="margin-top:12px; font-size:12px; padding:6px 14px; font-weight:600;" onclick="saveMemberConstraints('leaderConstraintApproval', 'leaderConstraintDiscussions', 'leaderConstraintExpenses')">
                Save Permission Constraints
              </button>
            </div>

            <!-- Discrete Danger Zone Footer -->
            <div style="border-top:1px solid var(--border); padding-top:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div>
                <span style="font-size:12px; font-weight:600; color:var(--gray);">Danger Zone</span>
                <p style="margin:2px 0 0; font-size:11px; color:var(--gray);">Permanently delete your account with double password verification.</p>
              </div>
              <button type="button" class="btn-outline open-delete-account-modal" style="padding:4px 12px; font-size:11px; font-weight:600; color:#ef4444; border-color:rgba(239,68,68,0.35); border-radius:6px; background:transparent; cursor:pointer;" onclick="openDeleteAccountModal()">
                Delete Account
              </button>
            </div>
          </div>
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

      <!-- Col 2: Workspace Roster & Roles & Quick Scratchpad -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- Workspace Roster & Roles -->
        <div class="dashboard-panel" style="border-top:3px solid var(--primary);">
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

        <!-- Minimalist Quick Scratchpad / Personal Notes -->
        ${renderHomespaceScratchpadHtml(personalNotes, 'leaderHomespaceScratchpad')}
      </div>
    </div>
  `;
}

function renderMemberHomespace(container, myAssignedDeliverables, members, activities, currentUserId, personalNotes) {
  const leaders = members.filter(m => m.role === 'leader');
  const fellowMembers = members.filter(m => m.role !== 'leader');

  const prefApprovals = localStorage.getItem(`groupspace_pref_${currentUserId}_notif_approvals`) !== 'false';
  const prefMentions = localStorage.getItem(`groupspace_pref_${currentUserId}_notif_mentions`) !== 'false';
  const prefHelp = localStorage.getItem(`groupspace_pref_${currentUserId}_notif_help`) !== 'false';
  const prefLanding = localStorage.getItem(`groupspace_pref_${currentUserId}_landing_view`) || 'overview';
  const prefCompact = localStorage.getItem(`groupspace_pref_${currentUserId}_compact_view`) === 'true';

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
                  <span class="tag tag-${(t.priority || 'medium').toLowerCase()}" style="font-size:10px; padding:2px 6px;">${escapeHtml(t.priority || 'MEDIUM')}</span>
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
    : leaders.map(l => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:rgba(79,70,229,0.06); border:1px solid rgba(79,70,229,0.18); border-radius:8px; margin-bottom:6px;">
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <div class="chat-avatar" style="width:30px; height:30px; font-size:11px; flex-shrink:0;">${escapeHtml(l.avatar_initials || 'GS')}</div>
          <div style="min-width:0;">
            <div style="font-weight:700; font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(l.full_name)}</div>
            <div style="color:var(--gray); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(l.email)}</div>
          </div>
        </div>
        <span style="font-size:11px; font-weight:700; color:var(--primary); background:#eef2ff; padding:2px 8px; border-radius:6px;">Leader</span>
      </div>
    `).join('');

  const fellowsHtml = fellowMembers.map(m => {
    const isSelf = Number(m.user_id) === Number(currentUserId);
    return `
      <li style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid var(--border); gap:8px;">
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <div class="chat-avatar" style="width:28px; height:28px; font-size:11px; flex-shrink:0;">${escapeHtml(m.avatar_initials || 'GS')}</div>
          <div style="min-width:0;">
            <div style="font-weight:600; font-size:12px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(m.full_name)} ${isSelf ? '<span style="font-size:11px; color:var(--gray); font-weight:normal;">(You)</span>' : ''}
            </div>
          </div>
        </div>
        <span class="status ${isSelf ? 'online' : 'pending'}" style="font-size:10px;">${isSelf ? 'You' : 'Member'}</span>
      </li>
    `;
  }).join('');

  const activityFeedHtml = activities.length === 0
    ? '<p style="color:var(--gray); font-size:13px; padding:15px; text-align:center;">No recent workspace events yet.</p>'
    : activities.slice(0, 5).map(a => `
      <div class="activity-item">
        <div class="activity-icon">${getActivityIcon(a.action_type)}</div>
        <div style="flex:1;">
          <h4>${escapeHtml(a.description)}</h4>
          <p>${formatDate(a.created_at)}</p>
        </div>
      </div>
    `).join('');

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- Col 1: My Assigned Deliverables, Member Settings & Activity Feed -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- My Assigned Deliverables -->
        <div class="dashboard-panel" style="border-top:3px solid var(--primary);">
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

        <!-- Member Settings & Workspace Preferences -->
        <div class="dashboard-panel" style="border-top:3px solid var(--primary);">
          <div class="panel-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 style="margin:0;">Personal Profile & Preferences</h3>
              <span class="status pending" style="font-size:11px;">MEMBER</span>
            </div>
            <span style="font-size:12px; color:var(--gray);">Account & View Controls</span>
          </div>
          <div style="padding:16px 18px; display:flex; flex-direction:column; gap:16px;">
            <!-- Profile Display -->
            <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--muted,#f8fafc); border:1px solid var(--border); border-radius:10px;">
              <div class="chat-avatar" style="width:42px; height:42px; font-size:15px; flex-shrink:0;">${currentUser ? (currentUser.avatarInitials || 'GS') : 'GS'}</div>
              <div style="min-width:0; flex:1;">
                <div style="font-weight:700; font-size:14px; color:var(--text);">${currentUser ? escapeHtml(currentUser.fullName) : 'User'}</div>
                <div style="color:var(--gray); font-size:12px;">${currentUser ? escapeHtml(currentUser.email) : ''}</div>
              </div>
              <span class="status pending" style="font-size:11px;">Member</span>
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
              <button type="button" class="btn-outline open-delete-account-modal" style="padding:4px 12px; font-size:11px; font-weight:600; color:#ef4444; border-color:rgba(239,68,68,0.35); border-radius:6px; background:transparent; cursor:pointer;" onclick="openDeleteAccountModal()">
                Delete Account
              </button>
            </div>
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

      <!-- Col 2: Workspace Teammates & Quick Scratchpad -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- Workspace Teammates (Highlighting Leader) -->
        <div class="dashboard-panel" style="border-top:3px solid var(--primary);">
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

        <!-- Minimalist Quick Scratchpad / Personal Notes -->
        ${renderHomespaceScratchpadHtml(personalNotes, 'memberHomespaceScratchpad')}
      </div>
    </div>
  `;
}

// ================= WORKSPACE SETTINGS MODAL ================= //
function openWorkspaceSettingsModal() {
  const modalBody = document.getElementById('workspaceSettingsModalBody');
  const modalTitle = document.getElementById('workspaceSettingsModalTitle');
  if (!modalBody || !currentGroupDetails) return;

  const userRole = (currentGroupDetails.role || 'member').toLowerCase();
  const isLeader = userRole === 'leader';
  const settings = currentGroupDetails.settings || {};
  const currentUserId = currentUser ? currentUser.id : null;

  if (isLeader) {
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
            <p style="margin:2px 0 0; font-size:11px; color:var(--gray);">Permanently delete your account with double password verification.</p>
          </div>
          <button type="button" class="btn-outline open-delete-account-modal" style="padding:4px 12px; font-size:11px; font-weight:600; color:#ef4444; border-color:rgba(239,68,68,0.35); border-radius:6px; background:transparent; cursor:pointer;" onclick="closeModal('workspaceSettingsModal'); openDeleteAccountModal();">
            Delete Account
          </button>
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
        <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--muted,#f8fafc); border:1px solid var(--border); border-radius:10px;">
          <div class="chat-avatar" style="width:42px; height:42px; font-size:15px; flex-shrink:0;">${currentUser ? (currentUser.avatarInitials || 'GS') : 'GS'}</div>
          <div style="min-width:0; flex:1;">
            <div style="font-weight:700; font-size:14px; color:var(--text);">${currentUser ? escapeHtml(currentUser.fullName) : 'User'}</div>
            <div style="color:var(--gray); font-size:12px;">${currentUser ? escapeHtml(currentUser.email) : ''}</div>
          </div>
          <span class="status pending" style="font-size:11px;">Member</span>
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
async function saveWorkspaceName(newName) {
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

async function resetWorkspaceInviteCode() {
  if (!confirm('Are you sure you want to regenerate the invite code? The previous invite code will immediately become invalid.')) {
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
    }
    showToast(res.message || 'Invite code regenerated successfully.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveMemberConstraints(apprId, discId, expId) {
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

function saveMemberPref(key, value) {
  const currentUserId = currentUser ? currentUser.id : 'default';
  localStorage.setItem(`groupspace_pref_${currentUserId}_${key}`, String(value));
  showToast('Preference saved.', 'success');
}

async function approveTaskInline(taskId, e) {
  if (e) e.stopPropagation();
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
  if (e) e.stopPropagation();
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

async function changeMemberRole(userId, newRole) {
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
  if (!confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) return;
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
    window.currentTasks = tasks;

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

async function handleCreateTask(e) {
  e.preventDefault();
  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDesc').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const assignedToUserId = document.getElementById('taskAssignee').value;
  const estimatedDueDate = document.getElementById('taskDueDate') ? document.getElementById('taskDueDate').value : '';

  if (!estimatedDueDate) {
    showToast('Please select an estimated deadline date.', 'error');
    return;
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
    showToast('Task added to board!', 'success');
    loadTasks();
    if (typeof calendarInstance !== 'undefined' && calendarInstance) {
      calendarInstance.refetchEvents();
    }
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
          <p style="white-space:pre-wrap;">${escapeHtml((n.content || '').replace(/^<!--GS_SHAPES_JSON:.*?-->/, '').replace(/<[^>]*>/g, '').trim())}</p>
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
          <h3 style="margin:0; font-size:16px; font-weight:700; color:var(--text,#E1E7E3);">My Feed</h3>
          <p style="margin:4px 0 0; font-size:12px; color:var(--gray,#7A8C84);">Mentions, approvals & help requests</p>
        </div>
        <button onclick="openPersonalFeedDrawer()" style="background:none; border:none; color:var(--gray,#7A8C84); font-size:18px; cursor:pointer; padding:4px 8px;">✕</button>
      </div>
      <div id="personalFeedContent" style="flex:1; overflow-y:auto; padding:16px;">
        <p style="color:var(--gray,#7A8C84); text-align:center; padding:30px 0;">Loading feed...</p>
      </div>
    </div>
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
let pendingTopicAttachments = [];
let pendingCommentAttachments = [];

function isImageAttachment(att) {
  const type = (att.file_type || '').toLowerCase();
  const name = (att.file_name || '').toLowerCase();
  return type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
}

function getDocumentBadgeIcon(name) {
  const lower = (name || '').toLowerCase();
  if (lower.endsWith('.pdf')) return '📕 PDF';
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return '📘 DOCX';
  if (lower.endsWith('.txt')) return '📄 TXT';
  return '📎 DOC';
}

function renderAttachmentsHtml(attachments) {
  let list = attachments;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch (e) { list = []; }
  }
  if (!Array.isArray(list) || list.length === 0) return '';

  const images = list.filter(isImageAttachment);
  const docs = list.filter(att => !isImageAttachment(att));

  let html = '<div class="discussion-attachments-block" style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">';

  if (images.length > 0) {
    html += '<div class="discussion-images-grid" style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">';
    images.forEach(img => {
      const fileName = escapeHtml(img.file_name || 'image');
      const fileUrl = escapeHtml(img.file_url || '');
      html += `
        <a href="${fileUrl}" target="_blank" download="${fileName}" class="attachment-image-thumb" title="${fileName}" style="display:inline-block; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0; max-width:130px; text-decoration:none; background:#f8fafc; transition:transform 0.15s ease, box-shadow 0.15s ease;">
          <img src="${fileUrl}" alt="${fileName}" style="width:130px; height:80px; object-fit:cover; display:block;" />
          <div style="font-size:10px; color:#64748b; padding:3px 6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:#ffffff; border-top:1px solid #f1f5f9;">${fileName}</div>
        </a>
      `;
    });
    html += '</div>';
  }

  if (docs.length > 0) {
    html += '<div class="discussion-docs-list" style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">';
    docs.forEach(doc => {
      const fileName = escapeHtml(doc.file_name || 'document');
      const fileUrl = escapeHtml(doc.file_url || '');
      const badgeIcon = getDocumentBadgeIcon(doc.file_name);
      html += `
        <a href="${fileUrl}" target="_blank" download="${fileName}" class="attachment-doc-badge" title="Download ${fileName}" style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:16px; font-size:11px; font-weight:600; color:#334155; text-decoration:none; transition:all 0.15s ease;">
          <span>${badgeIcon}</span>
          <span style="max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${fileName}</span>
          <span style="font-size:10px; color:#64748b;">⬇</span>
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
  const titleEl = document.getElementById('activeTopicTitle');
  if (titleEl) titleEl.textContent = title;
  const formEl = document.getElementById('postCommentForm');
  if (formEl) formEl.style.display = 'block';

  try {
    const res = await apiFetch(`/api/groups/${currentGroupId}/discussions/${topicId}`);
    const topic = res.data.topic || {};
    const comments = res.data.comments || [];
    const container = document.getElementById('commentsContainer');

    const metaEl = document.getElementById('activeTopicMeta');
    if (metaEl) {
      metaEl.textContent = `Started by ${topic.author_name || 'Member'} • ${formatDate(topic.created_at)} • Category: ${topic.category || 'General'}`;
    }
    const topicAttEl = document.getElementById('activeTopicAttachments');
    if (topicAttEl) {
      topicAttEl.innerHTML = renderAttachmentsHtml(topic.attachments);
    }

    if (comments.length === 0) {
      container.innerHTML = '<p style="color:var(--gray); text-align:center; padding:20px;">No replies yet. Be the first to reply!</p>';
      return;
    }

    const isLeader = currentGroupDetails && currentGroupDetails.role === 'leader';

    container.innerHTML = comments.map(c => {
      const isAuthor = currentUser && Number(c.user_id) === Number(currentUser.id);
      const canDelete = isLeader || isAuthor;

      return `
        <div class="chat-message" id="comment-item-${c.id}" style="position:relative; display:flex; gap:12px; padding:12px; border-radius:10px; margin-bottom:12px; background:#f8fafc; border:1px solid #f1f5f9; transition:background 0.2s ease;">
          <div class="chat-avatar" style="width:36px; height:36px; border-radius:50%; background:#4f46e5; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:13px; flex-shrink:0;">
            ${escapeHtml(c.user_initials || 'GS')}
          </div>
          <div class="chat-content" style="flex:1; min-width:0;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <h4 style="margin:0 0 4px 0; font-size:13px; font-weight:600; color:#1e293b;">${escapeHtml(c.user_name)}</h4>
              ${canDelete ? `
                <button type="button" class="comment-delete-discrete" onclick="confirmDeleteComment(${c.id})" title="Delete comment" style="background:none; border:none; color:#94a3b8; font-size:13px; cursor:pointer; padding:2px 6px; border-radius:4px; opacity:0.6; transition:all 0.15s ease;" onmouseover="this.style.opacity='1'; this.style.color='#ef4444';" onmouseout="this.style.opacity='0.6'; this.style.color='#94a3b8';">
                  🗑️
                </button>
              ` : ''}
            </div>
            ${c.content ? `<p style="margin:0 0 4px 0; font-size:13px; color:#334155; line-height:1.5; word-break:break-word;">${typeof window.highlightMentions === 'function' ? window.highlightMentions(c.content) : escapeHtml(c.content)}</p>` : ''}
            ${renderAttachmentsHtml(c.attachments)}
            <div style="font-size:11px; color:#94a3b8; margin-top:4px;">${formatDate(c.created_at)}</div>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function confirmDeleteComment(commentId) {
  if (!confirm('Are you sure you want to delete this comment?')) {
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
        el.remove();
        const container = document.getElementById('commentsContainer');
        if (container && container.children.length === 0) {
          container.innerHTML = '<p style="color:var(--gray); text-align:center; padding:20px;">No replies yet. Be the first to reply!</p>';
        }
      }, 250);
    }
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
      body: JSON.stringify({ 
        title, 
        category,
        attachments: pendingTopicAttachments
      })
    });
    pendingTopicAttachments = [];
    renderTopicAttachmentsPreview();
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
  if (!content && pendingCommentAttachments.length === 0) {
    showToast('Please enter a message or attach a file.', 'warning');
    return;
  }

  try {
    await apiFetch(`/api/groups/${currentGroupId}/discussions/${activeTopicId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ 
        content,
        attachments: pendingCommentAttachments
      })
    });
    input.value = '';
    pendingCommentAttachments = [];
    renderCommentAttachmentsPreview();
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
