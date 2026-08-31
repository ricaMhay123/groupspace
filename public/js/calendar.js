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
        <h2 style="font-size:1.25rem; font-weight:700; color:#0f172a; margin:0;">📅 Team Calendar</h2>
        <p style="font-size:0.85rem; color:#64748b; margin:4px 0 0;">Events and task due dates for this workspace</p>
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <div style="display:flex; gap:8px; font-size:0.8rem; align-items:center;">
          <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#4f46e5;display:inline-block;"></span>Event</span>
          <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#f59e0b;display:inline-block;"></span>Task Due</span>
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
        const res = await apiFetch(`/api/groups/${calendarGroupId}/events`);
        const events = (res.data || []).map(e => ({
          id: String(e.id),
          title: e.is_task ? `📋 ${e.title}` : `📌 ${e.title}`,
          start: e.event_date,
          backgroundColor: e.color || '#4f46e5',
          borderColor: e.color || '#4f46e5',
          textColor: '#ffffff',
          extendedProps: {
            description: e.description || '',
            creator: e.creator_name || 'Team',
            isTask: e.is_task,
            taskStatus: e.task_status,
            eventType: e.event_type
          }
        }));
        successCallback(events);
      } catch (err) {
        failureCallback(err);
        showToast('Could not load calendar events.', 'error');
      }
    },
    eventDidMount: function(info) {
      info.el.title = info.event.extendedProps.description || info.event.title;
    }
  });

  calendarInstance.render();
}

// ─── Click on existing event ────────────────────────────────────────────────
function handleEventClick(info) {
  const ev = info.event;
  const props = ev.extendedProps;

  if (props.isTask) {
    showToast(`📋 Task: "${ev.title.replace('📋 ', '')}" — Status: ${props.taskStatus || 'Unknown'}`, 'info');
    return;
  }

  const confirmed = confirm(
    `📌 "${ev.title.replace('📌 ', '')}"\n` +
    `📅 ${new Date(ev.start).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}\n` +
    (props.description ? `📝 ${props.description}\n` : '') +
    `👤 Added by: ${props.creator}\n\n` +
    `Delete this event?`
  );

  if (confirmed) {
    deleteCalendarEvent(ev.id);
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
        <h3>📅 Add Calendar Event</h3>
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
            <option value="EVENT">📌 General Event</option>
            <option value="MEETING">🤝 Meeting</option>
            <option value="DEADLINE">⚠️ Deadline</option>
            <option value="MILESTONE">🏆 Milestone</option>
            <option value="REMINDER">🔔 Reminder</option>
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
