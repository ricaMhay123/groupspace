/**
 * GroupSpace Calendar Controller
 * Uses FullCalendar v6 to render workspace events + task due dates
 */

let calendarInstance = null;
let calendarGroupId = null;

// ─── Called by dashboard.js when switching to calendar tab ───────────────────
function initCalendar(groupId) {
  calendarGroupId = groupId;
  const el = document.getElementById('calendarView');
  if (!el) return;

  // Destroy old instance if switching workspaces
  if (calendarInstance) {
    calendarInstance.destroy();
    calendarInstance = null;
  }

  el.innerHTML = `
    <div style="
      display:flex; justify-content:space-between; align-items:center;
      margin-bottom:20px; flex-wrap:wrap; gap:12px;
    ">
      <div>
        <h2 style="font-size:1.25rem; font-weight:700; color:#0f172a; margin:0;">Team Calendar</h2>
        <p style="font-size:0.85rem; color:#64748b; margin:4px 0 0;">Events and estimated task deadlines for this workspace</p>
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <div style="display:flex; gap:8px; font-size:0.8rem; align-items:center;">
          <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#4f46e5;display:inline-block;"></span>Event</span>
          <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#f59e0b;display:inline-block;"></span>To Do</span>
          <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#3b82f6;display:inline-block;"></span>In Progress</span>
          <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#8b5cf6;display:inline-block;"></span>Review</span>
          <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block;"></span>High Priority</span>
          <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#10b981;display:inline-block;"></span>Done</span>
        </div>
        <button onclick="openAddEventModal()" class="btn-green" style="padding:8px 16px; font-size:0.85rem;">
          + Add Event
        </button>
      </div>
    </div>
    <div id="fcContainer" style="
      background:#ffffff; border-radius:16px; border:1px solid #e2e8f0;
      padding:20px; box-shadow:0 2px 12px rgba(0,0,0,0.04);
    "></div>
  `;

  calendarInstance = new FullCalendar.Calendar(document.getElementById('fcContainer'), {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listWeek'
    },
    height: 'auto',
    nowIndicator: true,
    selectable: true,
    eventClick: handleEventClick,
    dateClick: handleDateClick,
    events: async function(info, successCallback, failureCallback) {
      try {
        // Fetch custom workspace events
        let customEvents = [];
        try {
          const res = await apiFetch(`/api/groups/${calendarGroupId}/events`);
          if (Array.isArray(res.data)) customEvents = res.data;
        } catch (e) {
          console.warn('[Calendar] Could not load events:', e);
        }

        // Fetch active Kanban board tasks directly scoped to active groupId: GET /api/tasks?groupId=X
        let tasks = [];
        try {
          const taskRes = await apiFetch(`/api/tasks?groupId=${calendarGroupId}`);
          if (Array.isArray(taskRes.data)) tasks = taskRes.data;
        } catch (e) {
          console.warn('[Calendar] Could not fetch tasks via /api/tasks:', e);
          try {
            const fallbackRes = await apiFetch(`/api/groups/${calendarGroupId}/tasks`);
            if (Array.isArray(fallbackRes.data)) tasks = fallbackRes.data;
          } catch (err) {}
        }

        // Keep local cache synced
        if (tasks.length > 0) {
          window.currentTasks = tasks;
        }

        const formattedEvents = [];

        // Plot custom workspace events (filter out any backend task aliases to avoid duplication)
        for (const e of customEvents) {
          if (e.is_task) continue;
          formattedEvents.push({
            id: `event-${e.id}`,
            title: e.title,
            start: e.event_date,
            backgroundColor: e.color || '#4f46e5',
            borderColor: e.color || '#4f46e5',
            textColor: '#ffffff',
            extendedProps: {
              isTask: false,
              rawId: e.id,
              description: e.description || '',
              creator: e.creator_name || 'Team',
              eventType: e.event_type
            }
          });
        }

        // Plot active workspace tasks onto their respective deadline dates
        for (const t of tasks) {
          const deadline = t.estimated_due_date || t.due_date;
          if (!deadline) continue;

          let color = '#f59e0b'; // default To Do
          if (t.status === 'DONE') {
            color = '#10b981'; // Done
          } else if (t.priority === 'HIGH' || t.priority === 'URGENT') {
            color = '#ef4444'; // High Priority
          } else if (t.status === 'IN_PROGRESS') {
            color = '#3b82f6'; // In Progress
          } else if (t.status === 'PENDING_APPROVAL') {
            color = '#8b5cf6'; // Awaiting Approval
          }

          formattedEvents.push({
            id: `task-${t.id}`,
            title: t.title,
            start: deadline,
            allDay: true,
            backgroundColor: color,
            borderColor: color,
            textColor: '#ffffff',
            extendedProps: {
              isTask: true,
              taskId: t.id,
              task: t,
              taskStatus: t.status,
              priority: t.priority,
              assignee: t.assignee_name || 'Unassigned',
              description: t.description || ''
            }
          });
        }

        successCallback(formattedEvents);
      } catch (err) {
        failureCallback(err);
        showToast('Could not load calendar events.', 'error');
      }
    },
    eventDidMount: function(info) {
      info.el.title = info.event.extendedProps.description || info.event.title;
      info.el.style.cursor = 'pointer';
    }
  });

  calendarInstance.render();
}

// ─── Click on existing event ────────────────────────────────────────────────
function handleEventClick(info) {
  const ev = info.event;
  const props = ev.extendedProps;

  // Clicking a task entry on the calendar opens that task's detail modal
  if (props.isTask) {
    const rawTaskId = props.taskId || (String(ev.id).startsWith('task-') ? ev.id.replace('task-', '') : ev.id);
    const taskIdNum = Number(rawTaskId);

    if (props.task) {
      if (!Array.isArray(window.currentTasks)) window.currentTasks = [];
      const existingIdx = window.currentTasks.findIndex(t => Number(t.id) === taskIdNum);
      if (existingIdx >= 0) window.currentTasks[existingIdx] = props.task;
      else window.currentTasks.push(props.task);
    }

    if (typeof openTaskDetailsModal === 'function') {
      openTaskDetailsModal(taskIdNum);
    } else if (typeof window.openTaskDetailsModal === 'function') {
      window.openTaskDetailsModal(taskIdNum);
    } else {
      showToast(`Task: "${ev.title}" — Status: ${props.taskStatus || 'Unknown'}`, 'info');
    }
    return;
  }

  const eventId = props.rawId || (String(ev.id).startsWith('event-') ? ev.id.replace('event-', '') : ev.id);
  const confirmed = confirm(
    `"${ev.title}"\n` +
    `Date: ${new Date(ev.start).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}\n` +
    (props.description ? `Description: ${props.description}\n` : '') +
    `Added by: ${props.creator}\n\n` +
    `Delete this event?`
  );

  if (confirmed) {
    deleteCalendarEvent(eventId);
  }
}

// ─── Click on empty date → prefill Add Event modal ──────────────────────────
function handleDateClick(info) {
  openAddEventModal(info.dateStr);
}

// ─── Add Event Modal ─────────────────────────────────────────────────────────
function openAddEventModal(prefillDate) {
  // Remove old modal if exists
  const existing = document.getElementById('addEventModal');
  if (existing) existing.remove();

  const today = prefillDate || new Date().toISOString().split('T')[0];

  const modal = document.createElement('div');
  modal.id = 'addEventModal';
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:440px;">
      <div class="modal-header">
        <h3>Add Calendar Event</h3>
        <button class="modal-close" onclick="document.getElementById('addEventModal').remove()">✕</button>
      </div>
      <form id="addEventForm">
        <div class="form-group">
          <label>Event Title *</label>
          <input type="text" id="evTitle" class="form-control" placeholder="e.g. Team Meeting" required autofocus>
        </div>
        <div class="form-group">
          <label>Date & Time *</label>
          <input type="datetime-local" id="evDate" class="form-control" value="${today}T09:00" required>
        </div>
        <div class="form-group">
          <label>Event Type</label>
          <select id="evType" class="form-control">
            <option value="EVENT">General Event</option>
            <option value="MEETING">Meeting</option>
            <option value="DEADLINE">Deadline</option>
            <option value="MILESTONE">Milestone</option>
            <option value="REMINDER">Reminder</option>
          </select>
        </div>
        <div class="form-group">
          <label>Color</label>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
            ${[
              ['#4f46e5','Indigo'],['#10b981','Green'],['#ef4444','Red'],
              ['#f59e0b','Amber'],['#3b82f6','Blue'],['#8b5cf6','Purple'],
              ['#ec4899','Pink'],['#14b8a6','Teal']
            ].map(([c,n]) => `
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px;font-size:0.8rem;">
                <input type="radio" name="evColor" value="${c}" ${c === '#4f46e5' ? 'checked' : ''} style="accent-color:${c};">
                <span style="width:14px;height:14px;border-radius:50%;background:${c};display:inline-block;"></span> ${n}
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Description (optional)</label>
          <textarea id="evDesc" class="form-control" rows="2" placeholder="Any extra details..."></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-outline" onclick="document.getElementById('addEventModal').remove()">Cancel</button>
          <button type="submit" class="btn-green" id="evSubmitBtn">Add to Calendar</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Close on backdrop click
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  document.getElementById('addEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('evSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const title = document.getElementById('evTitle').value.trim();
    const eventDate = document.getElementById('evDate').value;
    const eventType = document.getElementById('evType').value;
    const color = document.querySelector('input[name="evColor"]:checked')?.value || '#4f46e5';
    const description = document.getElementById('evDesc').value.trim();

    try {
      await apiFetch(`/api/groups/${calendarGroupId}/events`, {
        method: 'POST',
        body: JSON.stringify({ title, eventDate, eventType, color, description })
      });

      modal.remove();
      showToast('Event added to calendar! 📅', 'success');

      // Refresh the calendar
      if (calendarInstance) calendarInstance.refetchEvents();
    } catch (err) {
      showToast(err.message || 'Failed to add event.', 'error');
      btn.disabled = false;
      btn.textContent = 'Add to Calendar';
    }
  });
}

// ─── Delete event ────────────────────────────────────────────────────────────
async function deleteCalendarEvent(eventId) {
  try {
    await apiFetch(`/api/groups/${calendarGroupId}/events/${eventId}`, { method: 'DELETE' });
    showToast('Event deleted.', 'success');
    if (calendarInstance) calendarInstance.refetchEvents();
  } catch (err) {
    showToast(err.message || 'Could not delete event.', 'error');
  }
}
