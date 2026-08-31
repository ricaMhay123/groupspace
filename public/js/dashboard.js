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
      // User has no groups yet, redirect to workspace creation
      window.location.href = 'workspaces.html';
      return;
    }

    // Check URL param or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const urlGroupId = urlParams.get('groupId');
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
    document.getElementById('userRoleBadge').className = `status ${currentGroupDetails.role === 'LEADER' ? 'online' : 'pending'}`;

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
  const tabNames = ['overview', 'tasks', 'notebook', 'expenses', 'discussions', 'personal'];
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
    notebook: 'Collaborative Notebook',
    expenses: 'Expense Ledger & Net Split',
    discussions: 'Topics & Discussions',
    personal: 'Isolated Personal Space'
  };

  const subtitleMap = {
    overview: `Overview for ${currentGroupDetails ? currentGroupDetails.name : 'Workspace'}`,
    tasks: 'Track progress with dual-approval quality control.',
    notebook: 'Shared project documentation and specs.',
    expenses: 'Smart ledger with automatic debt simplification.',
    discussions: 'Brainstorm, discuss ideas, and follow activity.',
    personal: 'Private to your account. No other members can view this data.'
  };

  const actionMap = {
    overview: '+ Quick Task',
    tasks: '+ Create Task',
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
  else if (currentTab === 'notebook') openModal('createNoteModal');
  else if (currentTab === 'expenses') openModal('createExpenseModal');
  else if (currentTab === 'discussions') openModal('createTopicModal');
  else if (currentTab === 'personal') openPersonalAddModal();
}

function refreshCurrentView() {
  if (!currentGroupId && currentTab !== 'personal') return;

  if (currentTab === 'overview') loadOverview();
  else if (currentTab === 'tasks') loadTasks();
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
    document.getElementById('statTotalSpent').textContent = `$${(expRes.data?.totalSpent || 0).toFixed(2)}`;
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
          <span class="status ${m.role === 'LEADER' ? 'online' : 'pending'}" style="font-size:11px;">${m.role}</span>
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
  if (type.includes('TASK')) return '📋';
  if (type.includes('EXPENSE')) return '💰';
  if (type.includes('NOTE')) return '📝';
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

    const isLeader = currentGroupDetails && currentGroupDetails.role === 'LEADER';

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

      card.innerHTML = `
        <span class="task-tag ${tagClass}">${t.priority}</span>
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

        <div class="task-actions">
          ${actionButtons}
        </div>
      `;

      targetCol.appendChild(card);
    });

    document.getElementById('count-todo').textContent = counts.TODO;
    document.getElementById('count-in_progress').textContent = counts.IN_PROGRESS;
    document.getElementById('count-pending_approval').textContent = counts.PENDING_APPROVAL;
    document.getElementById('count-done').textContent = counts.DONE;

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
  try {
    const url = query
      ? `/api/groups/${currentGroupId}/notes?search=${encodeURIComponent(query)}`
      : `/api/groups/${currentGroupId}/notes`;

    const res = await apiFetch(url);
    const notes = res.data || [];
    const container = document.getElementById('notebookGrid');

    if (notes.length === 0) {
      container.innerHTML = '<p style="color:var(--gray); padding:30px;">No notes found. Create your first page!</p>';
      return;
    }

    container.innerHTML = notes.map(n => `
      <div class="note-card ${n.is_pinned ? 'pinned' : ''}">
        <div>
          <h4>${escapeHtml(n.title)}</h4>
          <p>${escapeHtml(n.content || '')}</p>
        </div>
        <div>
          ${n.tags ? `
            <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
              ${n.tags.split(',').map(t => `<span style="font-size:11px; padding:2px 8px; background:#202522; border-radius:6px; color:var(--primary); font-weight:600;">#${escapeHtml(t.trim())}</span>`).join('')}
            </div>
          ` : ''}
          <div class="note-meta">
            <span>✍️ ${escapeHtml(n.author_name)}</span>
            <span style="cursor:pointer; color:#FF7272;" onclick="deleteNote(${n.id})">🗑️</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
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
  e.preventDefault();
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value;
  const tags = document.getElementById('noteTags').value.trim();
  const isPinned = document.getElementById('notePinned').checked;

  try {
    await apiFetch(`/api/groups/${currentGroupId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ title, content, tags, isPinned })
    });
    closeModal('createNoteModal');
    document.getElementById('createNoteForm').reset();
    showToast('Page added to notebook!', 'success');
    loadNotebook();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteNote(noteId) {
  if (!confirm('Are you sure you want to delete this notebook page?')) return;
  try {
    await apiFetch(`/api/groups/${currentGroupId}/notes/${noteId}`, { method: 'DELETE' });
    showToast('Note deleted.', 'success');
    loadNotebook();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ================= TAB 4: EXPENSES & SETTLEMENTS ================= //
async function loadExpenses() {
  try {
    const [expensesRes, summaryRes] = await Promise.all([
      apiFetch(`/api/groups/${currentGroupId}/expenses`),
      apiFetch(`/api/groups/${currentGroupId}/expenses/summary`)
    ]);

    const expenses = expensesRes.data || [];
    const summary = summaryRes.data || { totalSpent: 0, memberBalances: [], settlements: [] };

    document.getElementById('expTotalSpent').textContent = `$${summary.totalSpent.toFixed(2)}`;
    
    // Find current user balance
    const myBalance = summary.memberBalances.find(b => Number(b.userId) === Number(currentUser.id));
    const netEl = document.getElementById('expYourNet');
    if (myBalance) {
      if (myBalance.net > 0) {
        netEl.textContent = `+$${myBalance.net.toFixed(2)} (Owed to you)`;
        netEl.style.color = 'var(--primary)';
      } else if (myBalance.net < 0) {
        netEl.textContent = `-$${Math.abs(myBalance.net).toFixed(2)} (You owe)`;
        netEl.style.color = '#FF7272';
      } else {
        netEl.textContent = '$0.00 (Settled)';
        netEl.style.color = 'white';
      }
    } else {
      netEl.textContent = '$0.00';
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
          <span class="settlement-amount">$${s.amount.toFixed(2)}</span>
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
        <td style="color:var(--primary); font-weight:700;">$${Number(e.amount).toFixed(2)}</td>
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
          Total Personal Spending: $${total.toFixed(2)}
        </div>
        <table class="expense-table">
          <thead><tr><th>Item</th><th>Category</th><th>Amount</th><th>Action</th></tr></thead>
          <tbody>
            ${items.map(e => `
              <tr>
                <td><strong>${escapeHtml(e.title)}</strong></td>
                <td>${escapeHtml(e.category || 'General')}</td>
                <td style="color:var(--primary); font-weight:600;">$${Number(e.amount).toFixed(2)}</td>
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
