/**
 * GroupSpace — Tasks & Kanban Client Module (tasks.js)
 * 
 * Features:
 * 1. Streamlined 2-line minimalist Kanban task card
 * 2. Full Task Details Modal (descriptions, blockers, leader notes, peer comments/offers)
 * 3. Leader "Pending Approval" backlog badge
 * 4. Peer assistance workflow & blocker flagging
 */

'use strict';

/**
 * Render a streamlined 2-line minimalist Kanban task card
 * LINE 1: Bold Task Title (truncated with ellipsis if too long)
 * LINE 2: ONLY the assigned member's name (subtle gray: font-size: 0.8rem; color: #94a3b8;)
 * Clicking anywhere opens the complete Task Details Modal.
 */
function renderKanbanCard(task) {
  const card = document.createElement('div');
  const statusClass = task.status === 'PENDING_APPROVAL' ? 'pending-approval' : task.status === 'DONE' ? 'done' : '';
  card.className = `kanban-card ${statusClass}`.trim();
  card.setAttribute('data-task-id', task.id);
  card.onclick = () => openTaskDetailsModal(task.id);
  card.style.cssText = 'cursor:pointer; padding:12px 14px; border:1px solid var(--border); border-radius:8px; background:var(--card, #ffffff); transition:box-shadow 0.15s ease, transform 0.15s ease;';

  // LINE 1: Bold Task Title
  const titleEl = document.createElement('div');
  titleEl.className = 'kanban-card-title';
  titleEl.style.cssText = 'font-weight:700; font-size:0.92rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.35; margin-bottom:4px;';
  titleEl.textContent = task.title || 'Untitled Task';
  titleEl.title = task.title || '';

  // LINE 2: ONLY assigned member's name
  const assigneeEl = document.createElement('div');
  assigneeEl.className = 'kanban-card-assignee';
  assigneeEl.style.cssText = 'font-size:0.8rem; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2;';
  assigneeEl.textContent = task.assignee_name ? task.assignee_name : 'Unassigned';

  card.appendChild(titleEl);
  card.appendChild(assigneeEl);
  return card;
}

/**
 * Opens the complete Task Details Modal showing descriptions, blockers, and comments.
 */
async function openTaskDetailsModal(taskId) {
  const modal = document.getElementById('taskDetailsModal');
  if (!modal) return;

  let task = null;
  if (Array.isArray(window.currentTasks)) {
    task = window.currentTasks.find(t => Number(t.id) === Number(taskId));
  }
  if (!task && typeof currentGroupId !== 'undefined' && currentGroupId) {
    try {
      const res = await apiFetch(`/api/groups/${currentGroupId}/tasks`);
      if (res && res.data) {
        window.currentTasks = res.data;
        task = window.currentTasks.find(t => Number(t.id) === Number(taskId));
      }
    } catch (e) {
      console.error('[Tasks] Failed to fetch task for details modal:', e);
    }
  }

  if (!task) {
    if (typeof showToast === 'function') showToast('Task details could not be found.', 'error');
    return;
  }

  const isLeader = typeof currentGroupDetails !== 'undefined' && currentGroupDetails?.role === 'leader';
  const currentUserId = typeof currentUser !== 'undefined' && currentUser?.id ? currentUser.id : null;
  const isAssignee = currentUserId && Number(task.assigned_to_user_id) === Number(currentUserId);
  const isCreator = currentUserId && Number(task.created_by_user_id) === Number(currentUserId);

  // Set modal header elements
  const priorityEl = document.getElementById('taskDetailsPriority');
  if (priorityEl) {
    const priority = (task.priority || 'MEDIUM').toUpperCase();
    priorityEl.textContent = priority;
    priorityEl.className = `task-tag tag-${priority.toLowerCase()}`;
  }

  const statusEl = document.getElementById('taskDetailsStatus');
  if (statusEl) {
    const statusText = (task.status || 'TODO').replace(/_/g, ' ');
    statusEl.textContent = statusText;
  }

  const titleEl = document.getElementById('taskDetailsTitle');
  if (titleEl) {
    titleEl.textContent = task.title || 'Untitled Task';
  }

  const bodyEl = document.getElementById('taskDetailsBody');
  if (!bodyEl) return;

  // Fetch helper assist offers / comments
  let assistOffers = [];
  try {
    const assistRes = await apiFetch(`/api/groups/${currentGroupId}/tasks/${task.id}/assist`);
    assistOffers = Array.isArray(assistRes.data) ? assistRes.data : [];
  } catch (e) {
    assistOffers = [];
  }

  // Determine available workflow action buttons
  let actionsHtml = '';
  if (task.status === 'TODO' && (isAssignee || isLeader)) {
    actionsHtml += `<button type="button" class="btn-green" style="padding:7px 16px; font-size:12px; font-weight:600;" onclick="updateTaskStatusAndClose(${task.id}, 'IN_PROGRESS')">Start Task</button>`;
  } else if (task.status === 'IN_PROGRESS' && (isAssignee || isLeader)) {
    actionsHtml += `<button type="button" class="btn-green" style="padding:7px 16px; font-size:12px; font-weight:600;" onclick="updateTaskStatusAndClose(${task.id}, 'PENDING_APPROVAL')">Submit for Review</button>`;
  } else if (task.status === 'PENDING_APPROVAL') {
    if (isLeader) {
      actionsHtml += `<button type="button" class="btn-green" style="padding:7px 16px; font-size:12px; font-weight:600;" onclick="closeModal('taskDetailsModal'); openReviewModal(${task.id}, '${escapeHtml(task.title).replace(/'/g, "\\'")}')">Review & Approve</button>`;
    } else {
      actionsHtml += `<span style="font-size:12px; color:var(--warning); font-weight:600;">Awaiting Leader Review</span>`;
    }
  }

  if (isCreator || isLeader) {
    actionsHtml += `<button type="button" class="btn-outline" style="padding:7px 14px; font-size:12px; color:#ef4444; border-color:rgba(239,68,68,0.4);" onclick="deleteTaskAndClose(${task.id})">Delete Task</button>`;
  }

  bodyEl.innerHTML = `
    <!-- Assignee & Due Date Meta -->
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--muted, #f8fafc); border:1px solid var(--border); border-radius:8px; font-size:13px; gap:12px; flex-wrap:wrap;">
      <div>
        <span style="color:var(--gray);">Assignee:</span>
        <strong style="color:var(--text); margin-left:4px;">${escapeHtml(task.assignee_name || 'Unassigned')}</strong>
      </div>
      <div>
        <span style="color:var(--gray);">Due:</span>
        <span style="color:var(--text); margin-left:4px;">${task.due_date ? formatDate(task.due_date) : 'No due date'}</span>
      </div>
    </div>

    <!-- Description -->
    <div>
      <div style="font-size:11px; font-weight:700; color:var(--gray); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Description</div>
      <div style="font-size:13.5px; color:var(--text); line-height:1.6; white-space:pre-wrap; background:var(--card, #fff); border:1px solid var(--border); border-radius:8px; padding:12px 14px;">${escapeHtml(task.description || 'No description provided.')}</div>
    </div>

    <!-- Blockers & Assistance -->
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <div style="font-size:11px; font-weight:700; color:var(--gray); text-transform:uppercase; letter-spacing:0.5px;">Blockers & Assistance</div>
        ${(isAssignee || isLeader) ? `
          <button type="button" class="btn-outline" style="padding:3px 10px; font-size:11px; border-radius:6px; color:${task.is_flagged ? '#10b981' : '#ef4444'}; border-color:${task.is_flagged ? '#10b981' : 'rgba(239,68,68,0.4)'}; cursor:pointer;" onclick="toggleTaskFlagDetails(${task.id}, ${Boolean(task.is_flagged)})">
            ${task.is_flagged ? 'Clear Help Flag' : 'Flag for Help'}
          </button>
        ` : (task.is_flagged ? `
          <button type="button" class="btn-outline" style="padding:3px 10px; font-size:11px; border-radius:6px; color:var(--primary); border-color:var(--primary); cursor:pointer;" onclick="offerTaskHelpDetails(${task.id})">
            Offer Help
          </button>
        ` : '')}
      </div>
      ${task.is_flagged ? `
        <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:10px 14px;">
          <div style="font-size:12px; font-weight:700; color:#ef4444; margin-bottom:2px;">Blocker Reported</div>
          <p style="margin:0; font-size:13px; color:var(--text);">${escapeHtml(task.flagged_reason || 'Help requested by assignee')}</p>
        </div>
      ` : `
        <div style="font-size:12px; color:var(--gray); padding:4px 0;">No active blockers reported on this task.</div>
      `}
    </div>

    <!-- Leader Review Notes -->
    ${task.approval_notes ? `
      <div>
        <div style="font-size:11px; font-weight:700; color:var(--gray); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Leader Review Notes</div>
        <div style="background:rgba(79,70,229,0.06); border-left:3px solid var(--primary); border-radius:6px; padding:10px 14px; font-size:13px; color:var(--text);">
          ${escapeHtml(task.approval_notes)}
        </div>
      </div>
    ` : ''}

    <!-- Comments & Help Offers -->
    <div>
      <div style="font-size:11px; font-weight:700; color:var(--gray); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Comments & Help Offers (${assistOffers.length})</div>
      <div style="display:flex; flex-direction:column; gap:8px; max-height:160px; overflow-y:auto;">
        ${assistOffers.length === 0 ? `
          <div style="font-size:12px; color:var(--gray); padding:4px 0;">No comments or volunteer offers on this task yet.</div>
        ` : assistOffers.map(o => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--muted, #f8fafc); border:1px solid var(--border); border-radius:6px; font-size:12px;">
            <div>
              <strong>${escapeHtml(o.helper_name || 'Teammate')}:</strong>
              <span style="color:var(--text); margin-left:4px;">${escapeHtml(o.message || 'Offered help')}</span>
              <span style="font-size:10px; color:var(--gray); margin-left:6px;">(${o.status})</span>
            </div>
            ${(isAssignee || isLeader) && o.status === 'offered' ? `
              <div style="display:flex; gap:6px;">
                <button type="button" class="btn-green" style="padding:2px 8px; font-size:10px;" onclick="respondAssistOffer(${task.id}, ${o.user_id}, 'accepted')">Accept</button>
                <button type="button" class="btn-outline" style="padding:2px 8px; font-size:10px;" onclick="respondAssistOffer(${task.id}, ${o.user_id}, 'declined')">Decline</button>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Actions Footer -->
    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:14px; margin-top:6px; gap:8px; flex-wrap:wrap;">
      <div style="display:flex; gap:8px; align-items:center;">
        ${actionsHtml}
      </div>
      <button type="button" class="btn-outline" style="padding:7px 16px; font-size:12px;" onclick="closeModal('taskDetailsModal')">Close</button>
    </div>
  `;

  if (typeof openModal === 'function') {
    openModal('taskDetailsModal');
  }
}

/**
 * Task Details Modal workflow helpers
 */
async function updateTaskStatusAndClose(taskId, status) {
  if (typeof closeModal === 'function') closeModal('taskDetailsModal');
  if (typeof updateTaskStatus === 'function') {
    await updateTaskStatus(taskId, status);
  }
}

async function deleteTaskAndClose(taskId) {
  if (typeof closeModal === 'function') closeModal('taskDetailsModal');
  if (typeof deleteTask === 'function') {
    await deleteTask(taskId);
  }
}

async function toggleTaskFlagDetails(taskId, currentlyFlagged) {
  await toggleTaskFlag(taskId, currentlyFlagged);
  if (typeof openTaskDetailsModal === 'function') {
    openTaskDetailsModal(taskId);
  }
}

async function offerTaskHelpDetails(taskId) {
  await offerTaskHelp(taskId);
  if (typeof openTaskDetailsModal === 'function') {
    openTaskDetailsModal(taskId);
  }
}

async function respondAssistOffer(taskId, helperId, status) {
  try {
    const activeGroupId = typeof currentGroupId !== 'undefined' ? currentGroupId : null;
    if (!activeGroupId) return;

    await apiFetch(`/api/groups/${activeGroupId}/tasks/${taskId}/assist/${helperId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    if (typeof showToast === 'function') showToast(`Help offer ${status}.`, 'success');
    openTaskDetailsModal(taskId);
  } catch (err) {
    console.error('Failed to respond to assist offer:', err);
    if (typeof showToast === 'function') showToast(err.message || 'Error updating offer', 'error');
  }
}

/**
 * Toggle task flagged status (Assignee or Leader only)
 */
async function toggleTaskFlag(taskId, currentlyFlagged) {
  try {
    const activeGroupId = typeof currentGroupId !== 'undefined' ? currentGroupId : null;
    if (!activeGroupId) return;

    if (currentlyFlagged) {
      await apiFetch(`/api/groups/${activeGroupId}/tasks/${taskId}/unflag`, {
        method: 'PATCH'
      });
      if (typeof showToast === 'function') showToast('Task flag cleared.', 'success');
    } else {
      const reason = prompt('What is blocking this task or what help do you need?', 'Need assistance on implementation');
      if (reason === null) return;

      await apiFetch(`/api/groups/${activeGroupId}/tasks/${taskId}/flag`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: reason || 'Help needed' })
      });
      if (typeof showToast === 'function') showToast('Task flagged for peer help!', 'success');
    }

    if (typeof loadTasks === 'function') await loadTasks();
  } catch (err) {
    console.error('Failed to toggle task flag:', err);
    if (typeof showToast === 'function') showToast(err.message || 'Error updating task flag', 'error');
  }
}

/**
 * Offer peer help on a flagged task
 */
async function offerTaskHelp(taskId) {
  try {
    const activeGroupId = typeof currentGroupId !== 'undefined' ? currentGroupId : null;
    if (!activeGroupId) return;

    const message = prompt('Leave a brief note on how you can assist (optional):', 'I can help review or pair program!');
    if (message === null) return;

    await apiFetch(`/api/groups/${activeGroupId}/tasks/${taskId}/assist`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });

    if (typeof showToast === 'function') showToast('Help offer submitted to assignee!', 'success');
    if (typeof loadTasks === 'function') await loadTasks();
  } catch (err) {
    console.error('Failed to offer help:', err);
    if (typeof showToast === 'function') showToast(err.message || 'Error submitting help offer', 'error');
  }
}

/**
 * Update the Leader "Pending Approval" Backlog Badge
 */
function updateLeaderBacklogBadge(pendingCount, isLeader) {
  const tabBtn = document.querySelector('button[onclick*="tab-tasks"]');
  if (tabBtn) {
    let badge = tabBtn.querySelector('.pending-backlog-badge');
    if (isLeader && pendingCount > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'pending-backlog-badge';
        badge.style.cssText = 'background:var(--warning); color:#111; font-size:10px; font-weight:800; padding:1px 6px; border-radius:10px; margin-left:6px;';
        tabBtn.appendChild(badge);
      }
      badge.textContent = `${pendingCount} review`;
    } else if (badge) {
      badge.remove();
    }
  }

  const colBadge = document.getElementById('count-pending_approval');
  if (colBadge) {
    colBadge.textContent = pendingCount;
    if (isLeader && pendingCount > 0) {
      colBadge.style.background = 'rgba(255,193,7,.25)';
      colBadge.style.padding = '2px 8px';
      colBadge.style.borderRadius = '8px';
    }
  }
}

// Global exports
window.renderKanbanCard = renderKanbanCard;
window.openTaskDetailsModal = openTaskDetailsModal;
window.updateTaskStatusAndClose = updateTaskStatusAndClose;
window.deleteTaskAndClose = deleteTaskAndClose;
window.toggleTaskFlagDetails = toggleTaskFlagDetails;
window.offerTaskHelpDetails = offerTaskHelpDetails;
window.respondAssistOffer = respondAssistOffer;
window.toggleTaskFlag = toggleTaskFlag;
window.offerTaskHelp = offerTaskHelp;
window.updateLeaderBacklogBadge = updateLeaderBacklogBadge;
