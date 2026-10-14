/**
 * GroupSpace — Tasks & Kanban Client Module (tasks.js)
 * 
 * Features:
 * 1. Leader "Pending Approval" backlog badge
 * 2. Task card "⚠️ Help Needed" flag button & indicator
 * 3. Peer assistance workflow (offer help / accept / decline)
 */

'use strict';

/**
 * 4. RENDER LEADER/MEMBER TASK CONTROLS:
 * Updates the Kanban board with leader badges, help-needed flags, and peer assist buttons.
 */
function enhanceTaskCardUI(task, isLeader, currentUserId) {
  const isAssignee = currentUserId && Number(task.assigned_to_user_id) === Number(currentUserId);
  const isFlagged = Boolean(task.is_flagged);

  // 1. Help Needed Badge / Flag toggle
  let flagHtml = '';
  if (isFlagged) {
    flagHtml = `
      <div style="display:inline-flex; align-items:center; gap:4px; background:rgba(255, 82, 82, 0.15); border:1px solid #FF5252; color:#FF7272; border-radius:6px; padding:2px 8px; font-size:11px; font-weight:700; margin-bottom:8px;">
        ⚠️ Help Needed: ${escapeHtml(task.flagged_reason || 'Blocked')}
      </div>
    `;
  }

  // 2. Peer help or Flag toggle buttons
  let actionExtra = '';
  if (isAssignee || isLeader) {
    actionExtra += `
      <button type="button" class="btn-flag-toggle" style="background:transparent; border:1px dashed ${isFlagged ? '#FF5252' : '#888'}; color:${isFlagged ? '#FF5252' : '#aaa'}; font-size:11px; padding:3px 8px; border-radius:4px; cursor:pointer;" onclick="toggleTaskFlag(${task.id}, ${isFlagged})">
        ${isFlagged ? '✅ Clear Help Flag' : '🚩 Flag for Help'}
      </button>
    `;
  } else if (isFlagged) {
    actionExtra += `
      <button type="button" class="btn-offer-help" style="background:#1B3D2F; border:1px solid var(--primary); color:var(--primary); font-size:11px; padding:3px 8px; border-radius:4px; cursor:pointer; font-weight:600;" onclick="offerTaskHelp(${task.id})">
        🤝 Offer Help
      </button>
    `;
  }

  return { flagHtml, actionExtra };
}

/**
 * Toggle task flagged status (Assignee or Leader only)
 */
async function toggleTaskFlag(taskId, currentlyFlagged) {
  try {
    const activeGroupId = typeof currentGroupId !== 'undefined' ? currentGroupId : null;
    if (!activeGroupId) return;

    if (currentlyFlagged) {
      // Unflag
      await apiFetch(`/api/groups/${activeGroupId}/tasks/${taskId}/unflag`, {
        method: 'PATCH'
      });
      if (typeof showToast === 'function') showToast('Task flag cleared.', 'success');
    } else {
      // Flag
      const reason = prompt('What is blocking this task or what help do you need?', 'Need assistance on implementation');
      if (reason === null) return; // user cancelled

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
    if (message === null) return; // cancelled

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
  // Update header or tab badge
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

  // Update Kanban column header badge
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
