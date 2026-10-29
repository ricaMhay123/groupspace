/**
 * GroupSpace Calendar Controller
 * Uses FullCalendar v6 with bespoke segmented view controls, interactive category filtering,
 * and design system token skinning.
 */

let calendarInstance = null;
let calendarGroupId = null;
let activeCalendarFilter = 'ALL';
let calendarRawEvents = [];
let calendarRawTasks = [];

// ─── Initialize Calendar View ────────────────────────────────────────────────
function initCalendar(groupId) {
  calendarGroupId = groupId;
  const el = document.getElementById('calendarView');
  if (!el) return;

  // Destroy previous instance if switching workspaces
  if (calendarInstance) {
    calendarInstance.destroy();
    calendarInstance = null;
  }

  el.innerHTML = `
    <!-- Top Calendar Bar: Title & Primary Action -->
    <div class="cal-top-bar">
      <div>
        <h2 class="cal-main-heading">Team Calendar</h2>
        <p class="cal-sub-heading">Events and estimated task deadlines for this workspace</p>
      </div>
      <div class="cal-top-actions">
        <button type="button" onclick="openAddEventModal()" class="btn-primary" style="display:inline-flex; align-items:center; gap:6px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Event
        </button>
      </div>
    </div>

    <!-- Interactive Category Filter Ribbon -->
    <div class="cal-filter-bar" role="toolbar" aria-label="Filter calendar by event type">
      <button type="button" class="cal-filter-chip ${activeCalendarFilter === 'ALL' ? 'active' : ''}" onclick="setCalendarFilter('ALL')">
        All
        <span class="cal-filter-count" id="calCountAll">0</span>
      </button>
      <button type="button" class="cal-filter-chip ${activeCalendarFilter === 'EVENT' ? 'active' : ''}" onclick="setCalendarFilter('EVENT')">
        <span class="cal-dot" style="background:#2563eb;"></span>
        Events
        <span class="cal-filter-count" id="calCountEvents">0</span>
      </button>
      <button type="button" class="cal-filter-chip ${activeCalendarFilter === 'TODO' ? 'active' : ''}" onclick="setCalendarFilter('TODO')">
        <span class="cal-dot" style="background:#f59e0b;"></span>
        To Do
        <span class="cal-filter-count" id="calCountTodo">0</span>
      </button>
      <button type="button" class="cal-filter-chip ${activeCalendarFilter === 'IN_PROGRESS' ? 'active' : ''}" onclick="setCalendarFilter('IN_PROGRESS')">
        <span class="cal-dot" style="background:#3b82f6;"></span>
        In Progress
        <span class="cal-filter-count" id="calCountInProgress">0</span>
      </button>
      <button type="button" class="cal-filter-chip ${activeCalendarFilter === 'REVIEW' ? 'active' : ''}" onclick="setCalendarFilter('REVIEW')">
        <span class="cal-dot" style="background:#8b5cf6;"></span>
        In Review
        <span class="cal-filter-count" id="calCountReview">0</span>
      </button>
      <button type="button" class="cal-filter-chip ${activeCalendarFilter === 'HIGH_PRIORITY' ? 'active' : ''}" onclick="setCalendarFilter('HIGH_PRIORITY')">
        <span class="cal-dot" style="background:#ef4444;"></span>
        High Priority
        <span class="cal-filter-count" id="calCountHighPriority">0</span>
      </button>
      <button type="button" class="cal-filter-chip ${activeCalendarFilter === 'DONE' ? 'active' : ''}" onclick="setCalendarFilter('DONE')">
        <span class="cal-dot" style="background:#10b981;"></span>
        Done
        <span class="cal-filter-count" id="calCountDone">0</span>
      </button>
    </div>

    <!-- Calendar Container Card -->
    <div id="calendarContainerCard" class="cal-card">
      <!-- Custom Toolbar with Navigation & Bespoke Segmented View Selector -->
      <div class="cal-toolbar">
        <div class="cal-toolbar-left">
          <div class="cal-nav-group" role="group" aria-label="Calendar navigation">
            <button type="button" class="cal-nav-btn" onclick="navCalendar('prev')" aria-label="Previous month/period">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button type="button" class="cal-today-btn" onclick="navCalendar('today')">
              Today
            </button>
            <button type="button" class="cal-nav-btn" onclick="navCalendar('next')" aria-label="Next month/period">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
          <h3 id="calCurrentTitle" class="cal-title">...</h3>
        </div>

        <div class="cal-toolbar-right">
          <!-- Bespoke Segmented Pill Selector -->
          <div class="cal-view-selector" role="group" aria-label="Calendar view switcher">
            <button type="button" class="cal-view-pill active" data-view="dayGridMonth" onclick="changeCalendarView('dayGridMonth')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              Month
            </button>
            <button type="button" class="cal-view-pill" data-view="timeGridWeek" onclick="changeCalendarView('timeGridWeek')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="4" x2="9" y2="22"></line>
                <line x1="15" y1="4" x2="15" y2="22"></line>
              </svg>
              Week
            </button>
            <button type="button" class="cal-view-pill" data-view="listWeek" onclick="changeCalendarView('listWeek')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              List
            </button>
          </div>
        </div>
      </div>

      <!-- Mount point for FullCalendar -->
      <div id="fcContainer" class="fc-container"></div>
    </div>
  `;

  // Initialize FullCalendar instance without stock headerToolbar
  calendarInstance = new FullCalendar.Calendar(document.getElementById('fcContainer'), {
    initialView: 'dayGridMonth',
    headerToolbar: false, // Using our bespoke GroupSpace header
    height: 'auto',
    nowIndicator: true,
    selectable: true,
    eventClick: handleEventClick,
    dateClick: handleDateClick,
    datesSet: onCalendarDatesSet,
    events: fetchAndFilterCalendarEvents,
    eventDidMount: function(info) {
      info.el.title = info.event.extendedProps.description || info.event.title;
      info.el.style.cursor = 'pointer';
    }
  });

  calendarInstance.render();
}

// ─── Dates & View Changed Hook ───────────────────────────────────────────────
function onCalendarDatesSet(info) {
  const titleEl = document.getElementById('calCurrentTitle');
  if (titleEl && info.view) {
    titleEl.textContent = info.view.title;
  }

  // Sync segmented selector active state
  document.querySelectorAll('.cal-view-pill').forEach(pill => {
    if (pill.getAttribute('data-view') === info.view.type) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

// ─── View Switcher Handler ───────────────────────────────────────────────────
function changeCalendarView(viewName) {
  if (!calendarInstance) return;
  calendarInstance.changeView(viewName);

  document.querySelectorAll('.cal-view-pill').forEach(pill => {
    pill.classList.toggle('active', pill.getAttribute('data-view') === viewName);
  });
}

// ─── Toolbar Navigation Handler ──────────────────────────────────────────────
function navCalendar(action) {
  if (!calendarInstance) return;
  if (action === 'prev') calendarInstance.prev();
  else if (action === 'next') calendarInstance.next();
  else if (action === 'today') calendarInstance.today();
}

// ─── Category Filtering ─────────────────────────────────────────────────────
function setCalendarFilter(filterKey) {
  activeCalendarFilter = filterKey;

  document.querySelectorAll('.cal-filter-chip').forEach(chip => {
    const isTarget = chip.getAttribute('onclick')?.includes(`'${filterKey}'`);
    chip.classList.toggle('active', !!isTarget);
  });

  if (calendarInstance) {
    calendarInstance.refetchEvents();
  }
}

// ─── Event Fetching & Dynamic Filtering ─────────────────────────────────────
async function fetchAndFilterCalendarEvents(info, successCallback, failureCallback) {
  try {
    // 1. Fetch workspace custom events
    let customEvents = [];
    try {
      const res = await apiFetch(`/api/groups/${calendarGroupId}/events`);
      if (Array.isArray(res.data)) customEvents = res.data;
    } catch (e) {
      console.warn('[Calendar] Could not load events:', e);
    }
    calendarRawEvents = customEvents;

    // 2. Fetch workspace tasks with deadlines
    let tasks = [];
    try {
      const taskRes = await apiFetch(`/api/tasks?groupId=${calendarGroupId}`);
      if (Array.isArray(taskRes.data)) tasks = taskRes.data;
    } catch (e) {
      try {
        const fallbackRes = await apiFetch(`/api/groups/${calendarGroupId}/tasks`);
        if (Array.isArray(fallbackRes.data)) tasks = fallbackRes.data;
      } catch (err) {}
    }
    calendarRawTasks = tasks;

    // Sync local task cache for details modals
    if (tasks.length > 0) {
      window.currentTasks = tasks;
    }

    // Update filter counts
    updateFilterCounts(customEvents, tasks);

    const formattedEvents = [];

    // Format custom events
    for (const e of customEvents) {
      if (e.is_task) continue;

      if (activeCalendarFilter !== 'ALL' && activeCalendarFilter !== 'EVENT') {
        continue;
      }

      const color = e.color || '#2563eb';
      formattedEvents.push({
        id: `event-${e.id}`,
        title: e.title,
        start: e.event_date,
        backgroundColor: color,
        borderColor: color,
        textColor: '#ffffff',
        extendedProps: {
          isTask: false,
          rawId: e.id,
          description: e.description || '',
          creator: e.creator_name || 'Team Member',
          eventType: e.event_type || 'EVENT',
          color: color
        }
      });
    }

    // Format tasks
    for (const t of tasks) {
      const deadline = t.estimated_due_date || t.due_date;
      if (!deadline) continue;

      let category = 'TODO';
      let color = '#f59e0b'; // default To Do amber

      if (t.status === 'DONE') {
        category = 'DONE';
        color = '#10b981'; // Green
      } else if (t.priority === 'HIGH' || t.priority === 'URGENT') {
        category = 'HIGH_PRIORITY';
        color = '#ef4444'; // Red
      } else if (t.status === 'IN_PROGRESS') {
        category = 'IN_PROGRESS';
        color = '#3b82f6'; // Blue
      } else if (t.status === 'PENDING_APPROVAL') {
        category = 'REVIEW';
        color = '#8b5cf6'; // Purple
      }

      // Filter check
      if (activeCalendarFilter !== 'ALL') {
        if (activeCalendarFilter === 'HIGH_PRIORITY') {
          if (t.priority !== 'HIGH' && t.priority !== 'URGENT') continue;
        } else if (activeCalendarFilter !== category) {
          continue;
        }
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
          description: t.description || '',
          color: color,
          category: category
        }
      });
    }

    successCallback(formattedEvents);
  } catch (err) {
    failureCallback(err);
    showToast('Could not load calendar events.', 'error');
  }
}

// ─── Update Filter Counts ───────────────────────────────────────────────────
function updateFilterCounts(customEvents, tasks) {
  let countEvents = 0;
  let countTodo = 0;
  let countInProgress = 0;
  let countReview = 0;
  let countHighPriority = 0;
  let countDone = 0;

  for (const e of customEvents) {
    if (!e.is_task) countEvents++;
  }

  for (const t of tasks) {
    const deadline = t.estimated_due_date || t.due_date;
    if (!deadline) continue;

    if (t.priority === 'HIGH' || t.priority === 'URGENT') {
      countHighPriority++;
    }

    if (t.status === 'DONE') {
      countDone++;
    } else if (t.status === 'IN_PROGRESS') {
      countInProgress++;
    } else if (t.status === 'PENDING_APPROVAL') {
      countReview++;
    } else {
      countTodo++;
    }
  }

  const total = countEvents + countTodo + countInProgress + countReview + countDone;

  const setIfExists = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  };

  setIfExists('calCountAll', total);
  setIfExists('calCountEvents', countEvents);
  setIfExists('calCountTodo', countTodo);
  setIfExists('calCountInProgress', countInProgress);
  setIfExists('calCountReview', countReview);
  setIfExists('calCountHighPriority', countHighPriority);
  setIfExists('calCountDone', countDone);
}

// ─── Click on Event ─────────────────────────────────────────────────────────
function handleEventClick(info) {
  const ev = info.event;
  const props = ev.extendedProps;

  // Task click -> open task details modal
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
      showToast(`Task: "${ev.title}" — Status: ${props.taskStatus || 'Active'}`, 'info');
    }
    return;
  }

  // Workspace event click -> open clean Event Details Modal (non-destructive inspection)
  openEventDetailsModal(ev);
}

// ─── Non-Destructive Event Details Modal ─────────────────────────────────────
function openEventDetailsModal(ev) {
  closeEventDetailsModal();

  const props = ev.extendedProps || {};
  const eventId = props.rawId || (String(ev.id).startsWith('event-') ? ev.id.replace('event-', '') : ev.id);
  const color = props.color || '#2563eb';
  const typeLabel = (props.eventType || 'Event').toUpperCase();

  const dateObj = new Date(ev.start);
  const dateFormatted = !isNaN(dateObj)
    ? dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : String(ev.start);

  const modal = document.createElement('div');
  modal.id = 'eventDetailsModal';
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal-card" style="max-width: 460px; padding: 24px;">
      <div class="modal-header" style="align-items: flex-start; margin-bottom: 16px;">
        <div style="flex:1;">
          <div style="display:inline-flex; align-items:center; gap:6px; padding:3px 10px; border-radius:9999px; background:${color}18; color:${color}; font-size:11px; font-weight:700; letter-spacing:0.04em; margin-bottom:8px;">
            <span style="width:7px; height:7px; border-radius:50%; background:${color};"></span>
            ${escapeHtml(typeLabel)}
          </div>
          <h3 style="font-size:1.25rem; font-weight:700; color:var(--foreground); margin:0; line-height:1.3;">
            ${escapeHtml(ev.title)}
          </h3>
        </div>
        <button class="modal-close" onclick="closeEventDetailsModal()" aria-label="Close modal">✕</button>
      </div>

      <div class="modal-body" style="display:flex; flex-direction:column; gap:16px;">
        <!-- Date & Time Row -->
        <div style="display:flex; align-items:flex-start; gap:10px; font-size:13px; color:var(--foreground);">
          <div style="width:32px; height:32px; border-radius:8px; background:var(--secondary); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--primary);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div>
            <div style="font-weight:600;">Scheduled Date & Time</div>
            <div style="color:var(--muted-foreground); margin-top:2px;">${dateFormatted}</div>
          </div>
        </div>

        <!-- Description Row -->
        <div style="display:flex; align-items:flex-start; gap:10px; font-size:13px; color:var(--foreground);">
          <div style="width:32px; height:32px; border-radius:8px; background:var(--secondary); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--muted-foreground);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <div style="flex:1;">
            <div style="font-weight:600;">Description</div>
            <div style="color:var(--muted-foreground); margin-top:2px; line-height:1.45; white-space:pre-wrap;">
              ${props.description ? escapeHtml(props.description) : '<span style="font-style:italic;">No description provided.</span>'}
            </div>
          </div>
        </div>

        <!-- Creator Row -->
        <div style="font-size:12px; color:var(--muted-foreground); padding-top:4px; border-top:1px solid var(--border);">
          Organized by <strong>${escapeHtml(props.creator || 'Team Member')}</strong>
        </div>
      </div>

      <!-- Action Footer -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:16px; border-top:1px solid var(--border);">
        <button type="button" class="btn-outline" style="color:var(--destructive); border-color:var(--border);" onclick="confirmDeleteCalendarEvent('${eventId}', '${escapeHtml(ev.title)}')">
          Delete Event
        </button>
        <button type="button" class="btn-primary" onclick="closeEventDetailsModal()">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close on backdrop click
  modal.addEventListener('click', e => {
    if (e.target === modal) closeEventDetailsModal();
  });
}

function closeEventDetailsModal() {
  const existing = document.getElementById('eventDetailsModal');
  if (existing) existing.remove();
}

function confirmDeleteCalendarEvent(eventId, title) {
  if (confirm(`Are you sure you want to delete the event "${title}"?`)) {
    closeEventDetailsModal();
    deleteCalendarEvent(eventId);
  }
}

// ─── Click on Empty Date ────────────────────────────────────────────────────
function handleDateClick(info) {
  openAddEventModal(info.dateStr);
}

// ─── Add Event Modal ─────────────────────────────────────────────────────────
function openAddEventModal(prefillDate) {
  const existing = document.getElementById('addEventModal');
  if (existing) existing.remove();

  const today = prefillDate || new Date().toISOString().split('T')[0];

  const modal = document.createElement('div');
  modal.id = 'addEventModal';
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:460px; padding: 24px;">
      <div class="modal-header">
        <h3 style="font-size:1.25rem; font-weight:700; color:var(--foreground); margin:0;">Add Calendar Event</h3>
        <button class="modal-close" onclick="document.getElementById('addEventModal').remove()" aria-label="Close modal">✕</button>
      </div>
      <form id="addEventForm" style="margin-top:16px;">
        <div class="form-group" style="margin-bottom:16px;">
          <label style="display:block; font-size:13px; font-weight:600; color:var(--foreground); margin-bottom:6px;">Event Title *</label>
          <input type="text" id="evTitle" class="form-control" placeholder="e.g. Sprint Planning or Design Review" required autofocus>
        </div>
        <div class="form-group" style="margin-bottom:16px;">
          <label style="display:block; font-size:13px; font-weight:600; color:var(--foreground); margin-bottom:6px;">Date & Time *</label>
          <input type="datetime-local" id="evDate" class="form-control" value="${today}T09:00" required>
        </div>
        <div class="form-group" style="margin-bottom:16px;">
          <label style="display:block; font-size:13px; font-weight:600; color:var(--foreground); margin-bottom:6px;">Event Type</label>
          <select id="evType" class="form-control">
            <option value="EVENT">General Event</option>
            <option value="MEETING">Meeting</option>
            <option value="DEADLINE">Milestone Deadline</option>
            <option value="REMINDER">Reminder</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:16px;">
          <label style="display:block; font-size:13px; font-weight:600; color:var(--foreground); margin-bottom:8px;">Theme Accent</label>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            ${[
              ['#2563eb','Blue'],['#10b981','Green'],['#ef4444','Red'],
              ['#f59e0b','Amber'],['#8b5cf6','Purple'],['#ec4899','Pink'],
              ['#14b8a6','Teal'],['#6366f1','Indigo']
            ].map(([c,n]) => `
              <label style="cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--foreground);">
                <input type="radio" name="evColor" value="${c}" ${c === '#2563eb' ? 'checked' : ''} style="accent-color:${c};">
                <span style="width:12px; height:12px; border-radius:50%; background:${c}; display:inline-block;"></span> ${n}
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-group" style="margin-bottom:20px;">
          <label style="display:block; font-size:13px; font-weight:600; color:var(--foreground); margin-bottom:6px;">Description (optional)</label>
          <textarea id="evDesc" class="form-control" rows="2" placeholder="Meeting link, agenda, or key notes..."></textarea>
        </div>
        <div class="form-actions" style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn-outline" onclick="document.getElementById('addEventModal').remove()">Cancel</button>
          <button type="submit" class="btn-primary" id="evSubmitBtn">Save Event</button>
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
    const color = document.querySelector('input[name="evColor"]:checked')?.value || '#2563eb';
    const description = document.getElementById('evDesc').value.trim();

    try {
      await apiFetch(`/api/groups/${calendarGroupId}/events`, {
        method: 'POST',
        body: JSON.stringify({ title, eventDate, eventType, color, description })
      });

      modal.remove();
      showToast('Event added to calendar! 📅', 'success');

      if (calendarInstance) calendarInstance.refetchEvents();
    } catch (err) {
      showToast(err.message || 'Failed to add event.', 'error');
      btn.disabled = false;
      btn.textContent = 'Save Event';
    }
  });
}

// ─── Delete Event ────────────────────────────────────────────────────────────
async function deleteCalendarEvent(eventId) {
  try {
    await apiFetch(`/api/groups/${calendarGroupId}/events/${eventId}`, { method: 'DELETE' });
    showToast('Event deleted.', 'success');
    if (calendarInstance) calendarInstance.refetchEvents();
  } catch (err) {
    showToast(err.message || 'Could not delete event.', 'error');
  }
}
