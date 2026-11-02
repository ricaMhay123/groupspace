/**
 * GroupSpace — Discussions & Workspace-Scoped Mentions
 * Provides @mention (workspace members) and #mention (workspace topics & tasks)
 * autocomplete for discussions, strictly scoped to the active workspace.
 * Supports multiple member mentions and topic mentions in a single comment.
 */

'use strict';

(function () {
  let activeTrigger = null; // { type: '@' | '#', query: string, startPos: number, endPos: number }
  let suggestions = [];
  let selectedIndex = -1;
  let dropdownEl = null;
  let activeInputEl = null;
  let lastRootSuggestions = [];
  const knownMemberNames = new Set();

  // Helper to accurately resolve the active workspace groupId across DOM, window, and storage
  function getActiveGroupId() {
    if (typeof window.currentGroupId !== 'undefined' && window.currentGroupId && !isNaN(Number(window.currentGroupId))) {
      return Number(window.currentGroupId);
    }
    try {
      if (typeof currentGroupId !== 'undefined' && currentGroupId && !isNaN(Number(currentGroupId))) {
        return Number(currentGroupId);
      }
    } catch (e) {}
    const switcher = document.getElementById('groupSwitcher');
    if (switcher && switcher.value && !isNaN(Number(switcher.value)) && Number(switcher.value) > 0) {
      return Number(switcher.value);
    }
    const stored = localStorage.getItem('groupspace_active_group_id');
    if (stored && !isNaN(Number(stored)) && Number(stored) > 0) {
      return Number(stored);
    }
    const urlParams = new URLSearchParams(window.location.search);
    const urlGid = urlParams.get('groupId') || urlParams.get('workspaceId') || urlParams.get('workspace_id');
    if (urlGid && !isNaN(Number(urlGid)) && Number(urlGid) > 0) {
      return Number(urlGid);
    }
    return null;
  }

  // Inject styles for mention pills and dropdown
  function injectMentionStyles() {
    if (document.getElementById('discussion-mention-styles')) return;
    const style = document.createElement('style');
    style.id = 'discussion-mention-styles';
    style.textContent = `
      .mention-dropdown {
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        margin-bottom: 8px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 12px 28px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        max-height: 250px;
        overflow-y: auto;
        z-index: 99999;
        display: none;
      }
      .mention-dropdown-header {
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
        background: #f8fafc;
        border-bottom: 1px solid #f1f5f9;
        border-radius: 12px 12px 0 0;
      }
      .mention-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        cursor: pointer;
        transition: background 0.15s ease;
        font-size: 13px;
        color: #1e293b;
      }
      .mention-item:hover, .mention-item.active {
        background: #eef2ff;
        color: #3730a3;
      }
      .mention-item-avatar {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #6366f1;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .mention-item-avatar.topic {
        background: #3b82f6;
        border-radius: 6px;
      }
      .mention-item-avatar.task {
        background: #f59e0b;
        border-radius: 6px;
      }
      .mention-item-avatar.notebook {
        background: #10b981;
        border-radius: 6px;
      }
      .mention-item-avatar.folder {
        background: #0ea5e9;
        border-radius: 6px;
      }
      .mention-item-tag {
        font-size: 11px;
        color: #64748b;
        margin-left: auto;
        flex-shrink: 0;
      }
      .mention-pill {
        display: inline-block;
        padding: 2px 7px;
        border-radius: 6px;
        font-size: 0.88em;
        font-weight: 600;
        line-height: 1.2;
        margin: 0 2px;
        vertical-align: baseline;
      }
      .user-mention-pill {
        background: #e0e7ff;
        color: #3730a3;
        border: 1px solid #c7d2fe;
      }
      .topic-mention-pill {
        background: #dbeafe;
        color: #1e40af;
        border: 1px solid #bfdbfe;
      }
      .task-mention-pill {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
      }
      .notebook-mention-pill, .page-mention-pill {
        background: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
      }
      .folder-mention-pill {
        background: #eff6ff;
        color: #1e3a8a;
        border: 1px solid #bfdbfe;
      }
    `;
    document.head.appendChild(style);
  }

  function getDropdown() {
    if (!dropdownEl) {
      dropdownEl = document.createElement('div');
      dropdownEl.className = 'mention-dropdown';
      dropdownEl.id = 'mentionDropdown';
      dropdownEl.setAttribute('role', 'listbox');
      dropdownEl.setAttribute('aria-label', 'Autocomplete Suggestions');
      
      dropdownEl.addEventListener('mousedown', (e) => {
        // Prevent input from losing focus when clicking dropdown items
        e.preventDefault();
        e.stopPropagation();
        handleDropdownItemEvent(e);
      });

      dropdownEl.addEventListener('pointerdown', (e) => {
        // Stop propagation so document outside-click listener doesn't close before selection,
        // but do NOT call preventDefault() on pointerdown unless handling selection, as pointerdown.preventDefault() cancels mousedown/click in Chromium
        e.stopPropagation();
      });

      dropdownEl.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDropdownItemEvent(e);
      });

      // Floating overlay: always mounted on <body> so it is never clipped and can sit at the caret
      document.body.appendChild(dropdownEl);
    }
    return dropdownEl;
  }

  function handleDropdownItemEvent(e) {
    const backBtn = e.target && e.target.closest ? e.target.closest('#mentionBackBtn') : null;
    if (backBtn) {
      if (lastRootSuggestions && lastRootSuggestions.length > 0 && activeTrigger) {
        renderDropdown(lastRootSuggestions, activeTrigger);
      }
      return;
    }
    const subEl = e.target && e.target.closest ? e.target.closest('.mention-sub-item') : null;
    if (subEl && activeTrigger) {
      const subType = subEl.getAttribute('data-sub-type');
      const subName = subEl.getAttribute('data-sub-name');
      const input = activeInputEl || document.getElementById('newCommentInput') || document.querySelector('.inline-reply-input') || document.getElementById('topicTitle');
      if (input && subName) {
        const text = input.value;
        const replacement = subType === 'folder_select' ? `#[Folder: ${subName}] ` : `#[Page: ${subName}] `;
        input.value = text.slice(0, activeTrigger.startPos) + replacement + text.slice(activeTrigger.endPos);
        const newCursor = activeTrigger.startPos + replacement.length;
        input.setSelectionRange(newCursor, newCursor);
        input.focus();
        hideDropdown();
      }
      return;
    }
    const itemEl = e.target && e.target.closest ? e.target.closest('.mention-item') : null;
    if (itemEl && activeTrigger) {
      const idx = Number(itemEl.getAttribute('data-idx'));
      if (!isNaN(idx)) {
        applySuggestion(idx);
      }
    }
  }

  /** Measure caret viewport coordinates inside a textarea / input via a hidden mirror element. */
  function getCaretCoordinates(input) {
    const rect = input.getBoundingClientRect();
    try {
      const cs = window.getComputedStyle(input);
      const mirror = document.createElement('div');
      const props = ['boxSizing', 'width', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
        'textTransform', 'wordSpacing', 'textIndent', 'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom',
        'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'];
      props.forEach(p => { mirror.style[p] = cs[p]; });
      mirror.style.position = 'absolute';
      mirror.style.visibility = 'hidden';
      mirror.style.top = '0';
      mirror.style.left = '-9999px';
      mirror.style.whiteSpace = input.tagName === 'TEXTAREA' ? 'pre-wrap' : 'pre';
      mirror.style.wordWrap = 'break-word';
      mirror.textContent = input.value.substring(0, input.selectionStart || 0);
      const marker = document.createElement('span');
      marker.textContent = '\u200b';
      mirror.appendChild(marker);
      document.body.appendChild(mirror);
      const lineH = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) * 1.3) || 18;
      let left = marker.offsetLeft - (input.scrollLeft || 0);
      let top = marker.offsetTop - (input.scrollTop || 0);
      document.body.removeChild(mirror);
      left = Math.max(0, Math.min(left, rect.width - 20));
      top = Math.max(0, Math.min(top, rect.height));
      return { left: rect.left + left, top: rect.top + top, height: lineH };
    } catch (e) {
      return { left: rect.left + 12, top: rect.top, height: rect.height || 20 };
    }
  }

  function positionDropdown(input) {
    const dd = getDropdown();
    if (!dd || !input) return;
    const caret = getCaretCoordinates(input);
    const ddWidth = Math.min(340, window.innerWidth - 16);
    const left = Math.max(8, Math.min(caret.left, window.innerWidth - ddWidth - 8));
    dd.style.position = 'fixed';
    dd.style.right = 'auto';
    dd.style.left = left + 'px';
    dd.style.width = ddWidth + 'px';
    dd.style.marginTop = '0';
    dd.style.marginBottom = '0';
    const rect = input.getBoundingClientRect();
    const spaceAbove = caret.top;
    const spaceBelow = window.innerHeight - (caret.top + caret.height);
    if (rect.top < 220 || (caret.top < 220 && spaceBelow > spaceAbove)) {
      // Not enough room above - show NEAR the caret, just below
      dd.style.bottom = 'auto';
      dd.style.top = (caret.top + caret.height + 6) + 'px';
      dd.style.maxHeight = Math.max(120, Math.min(250, spaceBelow - 14)) + 'px';
    } else {
      // Show ABOVE the caret line (grows upward)
      dd.style.top = 'auto';
      dd.style.bottom = Math.max(8, window.innerHeight - caret.top + 6) + 'px';
      dd.style.maxHeight = Math.max(120, Math.min(250, spaceAbove - 14)) + 'px';
    }
  }

  function hideDropdown() {
    if (activeInputEl) {
      try { activeInputEl.setAttribute('aria-expanded', 'false'); } catch (e) {}
    }
    const dd = getDropdown();
    if (dd) {
      dd.style.display = 'none';
      dd.innerHTML = '';
    }
    activeTrigger = null;
    suggestions = [];
    selectedIndex = -1;
  }

  function detectTrigger(input) {
    const cursorPos = input.selectionStart;
    const text = input.value.slice(0, cursorPos);

    // Look backwards from cursor for @ or #
    const lastAt = text.lastIndexOf('@');
    const lastHash = text.lastIndexOf('#');

    let triggerIdx = -1;
    let triggerType = null;

    if (lastAt >= 0 && lastAt > lastHash) {
      triggerIdx = lastAt;
      triggerType = '@';
    } else if (lastHash >= 0 && lastHash > lastAt) {
      triggerIdx = lastHash;
      triggerType = '#';
    }

    if (triggerIdx === -1) return null;

    // Trigger must be preceded by start of string, whitespace, or punctuation
    if (triggerIdx > 0 && !/[\s([{]/.test(text[triggerIdx - 1])) {
      return null;
    }

    const query = text.slice(triggerIdx + 1);
    // Don't autocomplete if query contains newline or multiple words beyond 25 chars
    if (/\n/.test(query) || query.length > 25) {
      return null;
    }
    // If a bracketed tag #[Page: ...] or #[Folder: ...] was already closed, or #123 task tag completed, do not re-trigger
    if (triggerType === '#' && (query.includes(']') || /^\d+\s/.test(query))) {
      return null;
    }
    // If an @mention was already completed (matches a known member name followed by a space), do not re-trigger
    if (triggerType === '@') {
      const qLower = query.toLowerCase();
      for (const mName of knownMemberNames) {
        if (mName && qLower.startsWith(mName + ' ')) {
          return null;
        }
      }
      if (/\s$/.test(query)) {
        return null;
      }
    }

    return {
      type: triggerType,
      query,
      startPos: triggerIdx,
      endPos: cursorPos
    };
  }

  async function fetchSuggestions(trigger) {
    const groupId = getActiveGroupId();
      
    if (!groupId) {
      console.warn('[Discussions] Active workspace ID not resolved for mentions.');
      return [];
    }

    try {
      if (trigger.type === '@') {
        let members = [];
        try {
          const res = await apiFetch(`/api/groups/${groupId}/discussions/mentions/users?q=${encodeURIComponent(trigger.query)}`);
          if (res && Array.isArray(res.data) && res.data.length > 0) {
            members = res.data.map(u => ({
              type: 'user',
              id: u.id,
              name: u.name,
              initials: u.avatar_initials || (u.name ? u.name.slice(0, 2).toUpperCase() : 'U')
            }));
          }
        } catch (fetchErr) {
          // Fall through to in-memory workspace members
        }

        // Resilient in-memory fallback: pull from active workspace members loaded on dashboard
        if (members.length === 0) {
          const groupDetails = window.currentGroupDetails || (typeof currentGroupDetails !== 'undefined' ? currentGroupDetails : null);
          const cachedMembers = (groupDetails && Array.isArray(groupDetails.members)) ? groupDetails.members : [];
          const qLower = (trigger.query || '').toLowerCase().trim();
          members = cachedMembers
            .filter(m => {
              const name = (m.full_name || m.name || '').toLowerCase();
              return !qLower || name.includes(qLower);
            })
            .map(m => ({
              type: 'user',
              id: m.id || m.user_id,
              name: m.full_name || m.name,
              initials: m.avatar_initials || (m.full_name ? m.full_name.slice(0, 2).toUpperCase() : 'U')
            }));
        }

        members.forEach(m => {
          if (m && m.name) knownMemberNames.add(String(m.name).trim().toLowerCase());
        });
        return members;
      } else if (trigger.type === '#') {
        // Query Category 1 (#NB Pages: folder_id IS NULL), Category 2 (#NB Folders), topics, tasks, and notebooks
        const [pagesRes, foldersRes, topicsRes, tasksRes, notebooksRes] = await Promise.all([
          apiFetch(`/api/groups/${groupId}/discussions/mentions/pages?q=${encodeURIComponent(trigger.query)}`).catch(() => ({ data: [] })),
          apiFetch(`/api/groups/${groupId}/discussions/mentions/folders?q=${encodeURIComponent(trigger.query)}`).catch(() => ({ data: [] })),
          apiFetch(`/api/groups/${groupId}/discussions/mentions/topics?q=${encodeURIComponent(trigger.query)}`).catch(() => ({ data: [] })),
          apiFetch(`/api/groups/${groupId}/discussions/mentions/tasks?q=${encodeURIComponent(trigger.query)}`).catch(() => ({ data: [] })),
          apiFetch(`/api/groups/${groupId}/discussions/mentions/notebooks?q=${encodeURIComponent(trigger.query)}`).catch(() => ({ data: [] }))
        ]);

        const folders = (foldersRes.data || []).map(f => ({
          type: 'folder',
          id: f.id,
          name: f.name
        }));

        const pages = (pagesRes.data || []).map(p => ({
          type: 'page',
          id: p.id,
          name: p.title
        }));

        const notebooks = (notebooksRes.data || []).map(nb => ({
          type: 'notebook',
          id: nb.id,
          name: nb.title
        }));

        const topics = (topicsRes.data || []).map(t => ({
          type: 'topic',
          id: t.id,
          name: t.title,
          category: t.category || 'Topic'
        }));

        const tasks = (tasksRes.data || []).map(t => ({
          type: 'task',
          id: t.id,
          name: t.title
        }));

        // Resilient in-memory fallback for topics from DOM topicsList if API is offline
        if (topics.length === 0) {
          const domTopics = document.querySelectorAll('#topicsList .file-item');
          const qLower = (trigger.query || '').toLowerCase().trim();
          domTopics.forEach(el => {
            const h4 = el.querySelector('h4');
            const title = h4 ? h4.textContent.trim() : '';
            if (title && (!qLower || title.toLowerCase().includes(qLower))) {
              topics.push({
                type: 'topic',
                id: el.getAttribute('data-topic-id') || 0,
                name: title,
                category: 'Topic'
              });
            }
          });
        }

        // Present folders first, then pages, topics, tasks, notebooks
        return [...folders, ...pages, ...topics, ...tasks, ...notebooks];
      }
    } catch (err) {
      console.warn('[Discussions] Mention fetch failed:', err.message);
      return [];
    }
    return [];
  }

  function renderDropdown(items, trigger) {
    const dd = getDropdown();
    if (!dd) return;

    if (!items || items.length === 0) {
      lastRootSuggestions = [];
      suggestions = [];
      selectedIndex = -1;
      const title = trigger.type === '@' ? 'Workspace Members' : 'Workspace Pages & Folders';
      const emptyMsg = trigger.query
        ? `No results matching "${escapeHtml(trigger.query)}"`
        : (trigger.type === '@' ? 'No members found in this workspace' : 'No notebook pages, folders, or topics found');
      dd.innerHTML = `
        <div class="mention-dropdown-header">${title}</div>
        <div style="padding:12px 14px; font-size:12px; color:var(--gray, #64748b); text-align:center;">
          ${emptyMsg}
        </div>
      `;
      dd.style.display = 'block';
      if (activeInputEl) {
        try { activeInputEl.setAttribute('aria-expanded', 'true'); } catch (e) {}
      }
      return;
    }

    lastRootSuggestions = items;
    suggestions = items;
    selectedIndex = 0;

    const title = trigger.type === '@' ? 'Workspace Members' : 'Workspace #NB Pages & #NB Folders';
    let html = `<div class="mention-dropdown-header">${title}</div>`;
    let shownPagesHeader = false;
    let shownFoldersHeader = false;

    items.forEach((item, idx) => {
      if (trigger.type === '#' && item.type === 'page' && !shownPagesHeader) {
        shownPagesHeader = true;
        html += `<div class="mention-category-label" style="padding:4px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; background:#f8fafc; border-top:1px solid #f1f5f9;">Category 1 — #NB Pages (Root)</div>`;
      }
      if (trigger.type === '#' && item.type === 'folder' && !shownFoldersHeader) {
        shownFoldersHeader = true;
        html += `<div class="mention-category-label" style="padding:4px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; background:#f8fafc; border-top:1px solid #f1f5f9;">Category 2 — #NB Folders (Hover or Click to Expand)</div>`;
      }
      if (item.type === 'user') {
        html += `
          <div class="mention-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
            <div class="mention-item-avatar">${escapeHtml(item.initials)}</div>
            <span>${escapeHtml(item.name)}</span>
            <span class="mention-item-tag">Member</span>
          </div>
        `;
      } else if (item.type === 'folder') {
        html += `
          <div class="mention-item mention-folder-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}" data-folder-id="${item.id}" data-folder-name="${escapeHtml(item.name)}">
            <div class="mention-item-avatar folder">📁</div>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
              ${escapeHtml(item.name)}
            </span>
            <span class="mention-item-tag">#NB Folder ▾</span>
          </div>
          <div class="mention-folder-accordion" id="mention-folder-acc-${item.id}" style="display:none; padding-left:18px; background:#f8fafc; border-bottom:1px solid #e2e8f0;"></div>
        `;
      } else if (item.type === 'page') {
        html += `
          <div class="mention-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
            <div class="mention-item-avatar notebook">📄</div>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
              ${escapeHtml(item.name)}
            </span>
            <span class="mention-item-tag">#NB Page</span>
          </div>
        `;
      } else if (item.type === 'topic') {
        html += `
          <div class="mention-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
            <div class="mention-item-avatar topic">T</div>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${escapeHtml(item.name)}
            </span>
            <span class="mention-item-tag">Topic (${escapeHtml(item.category)})</span>
          </div>
        `;
      } else if (item.type === 'task') {
        html += `
          <div class="mention-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
            <div class="mention-item-avatar task">#</div>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              <strong>#${item.id}</strong> ${escapeHtml(item.name)}
            </span>
            <span class="mention-item-tag">Task</span>
          </div>
        `;
      } else if (item.type === 'notebook') {
        html += `
          <div class="mention-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
            <div class="mention-item-avatar notebook">📖</div>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${escapeHtml(item.name)}
            </span>
            <span class="mention-item-tag">Notebook</span>
          </div>
        `;
      }
    });

    dd.innerHTML = html;
    dd.style.display = 'block';
    if (activeInputEl) positionDropdown(activeInputEl);
      if (activeInputEl) {
        try { activeInputEl.setAttribute('aria-expanded', 'true'); } catch (e) {}
      }

    dd.querySelectorAll('.mention-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = Number(el.getAttribute('data-idx'));
        applySuggestion(idx);
      });
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = Number(el.getAttribute('data-idx'));
        applySuggestion(idx);
      });
      if (el.classList.contains('mention-folder-item')) {
        el.addEventListener('mouseenter', () => {
          const fId = el.getAttribute('data-folder-id');
          const fName = el.getAttribute('data-folder-name');
          if (fId) expandFolderAccordionInline({ id: fId, name: fName });
        });
      }
    });
  }

  const folderSubPagesCache = new Map();
  async function expandFolderAccordionInline(folderItem) {
    const accEl = document.getElementById('mention-folder-acc-' + folderItem.id);
    if (!accEl) return;
    if (accEl.getAttribute('data-loaded') === 'true') {
      accEl.style.display = 'block';
      return;
    }
    const groupId = getActiveGroupId();
    if (!groupId) return;
    accEl.setAttribute('data-loaded', 'true');
    accEl.style.display = 'block';
    accEl.innerHTML = '<div style="padding:6px 10px; font-size:11px; color:#64748b;">Loading sub-pages...</div>';
    let subPages = folderSubPagesCache.get(String(folderItem.id));
    if (!subPages) {
      try {
        const res = await apiFetch(`/api/groups/${groupId}/discussions/mentions/folders/${folderItem.id}/pages`);
        subPages = Array.isArray(res.data) ? res.data : [];
        folderSubPagesCache.set(String(folderItem.id), subPages);
      } catch (e) {
        subPages = [];
      }
    }
    let accHtml = `
      <div class="mention-sub-item" data-sub-type="folder_select" data-sub-name="${escapeHtml(folderItem.name)}" style="display:flex; align-items:center; gap:8px; padding:6px 10px; font-size:12px; cursor:pointer; font-weight:600; color:var(--primary, #2563eb);">
        <span>📁 Mention Folder: #Folder: ${escapeHtml(folderItem.name)}</span>
      </div>
    `;
    subPages.forEach(sp => {
      accHtml += `
        <div class="mention-sub-item" data-sub-type="page" data-sub-name="${escapeHtml(sp.title)}" style="display:flex; align-items:center; gap:8px; padding:6px 10px; font-size:12px; cursor:pointer; color:#0f172a;">
          <span>📄 #Page: ${escapeHtml(sp.title)}</span>
        </div>
      `;
    });
    accEl.innerHTML = accHtml;
    accEl.querySelectorAll('.mention-sub-item').forEach(subEl => {
      subEl.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const subType = subEl.getAttribute('data-sub-type');
        const subName = subEl.getAttribute('data-sub-name');
        if (!activeTrigger) return;
        const input = activeInputEl || document.getElementById('newCommentInput') || document.querySelector('.inline-reply-input') || document.getElementById('topicTitle');
        if (!input) return;
        const text = input.value;
        const replacement = subType === 'folder_select' ? `#[Folder: ${subName}] ` : `#[Page: ${subName}] `;
        input.value = text.slice(0, activeTrigger.startPos) + replacement + text.slice(activeTrigger.endPos);
        const newCursor = activeTrigger.startPos + replacement.length;
        input.setSelectionRange(newCursor, newCursor);
        input.focus();
        hideDropdown();
      });
    });
  }

  async function openFolderSubPagesView(folderItem) {
    const dd = getDropdown();
    if (!dd) return;

    const groupId = getActiveGroupId();
    if (!groupId) return;

    let subPages = [];
    try {
      const res = await apiFetch(`/api/groups/${groupId}/discussions/mentions/folders/${folderItem.id}/pages`);
      subPages = Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      subPages = [];
    }

    const folderSuggestions = [
      { type: 'folder_select', id: folderItem.id, name: folderItem.name }
    ];
    subPages.forEach(sp => {
      folderSuggestions.push({
        type: 'page',
        id: sp.id,
        name: sp.title,
        folderName: folderItem.name
      });
    });

    suggestions = folderSuggestions;
    selectedIndex = 0;

    let html = `
      <div class="mention-dropdown-header" style="display:flex; justify-content:space-between; align-items:center;">
        <button type="button" class="mention-back-btn" id="mentionBackBtn" style="background:none; border:none; color:var(--primary, #4f46e5); font-weight:700; cursor:pointer; font-size:11px; padding:2px 4px; border-radius:4px; display:inline-flex; align-items:center; gap:3px;">
          ← Back
        </button>
        <span style="font-weight:600; color:var(--text); font-size:11.5px;">📁 ${escapeHtml(folderItem.name)} (${subPages.length} pages)</span>
      </div>
    `;

    folderSuggestions.forEach((item, idx) => {
      if (item.type === 'folder_select') {
        html += `
          <div class="mention-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}" style="background:rgba(79, 70, 229, 0.05); border-bottom:1px solid #e2e8f0;">
            <div class="mention-item-avatar folder">📁</div>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; font-weight:600;">
              Mention entire folder: #[Folder: ${escapeHtml(item.name)}]
            </span>
            <span class="mention-item-tag">Mention Folder</span>
          </div>
        `;
      } else if (item.type === 'page') {
        html += `
          <div class="mention-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
            <div class="mention-item-avatar notebook">📄</div>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
              ${escapeHtml(item.name)}
            </span>
            <span class="mention-item-tag">#Page</span>
          </div>
        `;
      }
    });

    if (subPages.length === 0) {
      html += `
        <div style="padding:10px 14px; font-size:12px; color:var(--gray); text-align:center;">
          No sub-pages in this folder. You can mention the folder itself above.
        </div>
      `;
    }

    dd.innerHTML = html;
    dd.style.display = 'block';
      if (activeInputEl) {
        try { activeInputEl.setAttribute('aria-expanded', 'true'); } catch (e) {}
      }

    const backBtn = document.getElementById('mentionBackBtn');
    if (backBtn) {
      backBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (lastRootSuggestions && lastRootSuggestions.length > 0) {
          renderDropdown(lastRootSuggestions, activeTrigger);
        }
      });
    }

    dd.querySelectorAll('.mention-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = Number(el.getAttribute('data-idx'));
        applySuggestion(idx);
      });
    });
  }

  function applySuggestion(idx) {
    const item = suggestions[idx];
    if (!item || !activeTrigger) return;

    if (item.type === 'folder') {
      openFolderSubPagesView(item);
      return;
    }

    const input = activeInputEl || document.getElementById('newCommentInput') || document.getElementById('topicTitle');
    if (!input) return;

    const text = input.value;
    let replacement = '';
    if (item.type === 'user') {
      if (item.name) knownMemberNames.add(String(item.name).trim().toLowerCase());
      replacement = `@${item.name} `;
    } else if (item.type === 'topic') {
      replacement = `#[${item.name}] `;
    } else if (item.type === 'task') {
      replacement = `#${item.id} `;
    } else if (item.type === 'page') {
      replacement = `#[Page: ${item.name}] `;
    } else if (item.type === 'notebook') {
      replacement = `#[Notebook: ${item.name}] `;
    } else if (item.type === 'folder' || item.type === 'folder_select') {
      replacement = `#[Folder: ${item.name}] `;
    }

    const before = text.slice(0, activeTrigger.startPos);
    const after = text.slice(activeTrigger.endPos);

    input.value = before + replacement + after;
    const newCursor = activeTrigger.startPos + replacement.length;
    input.setSelectionRange(newCursor, newCursor);
    input.focus();

    hideDropdown();
  }

  function attachMentionListeners(input) {
    if (!input || input._hasMentionListeners) return;
    input._hasMentionListeners = true;

    // Suppress browser native writing suggestions / Edge AI prompts ("Sino? Ano? Paano? Bakit?")
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-controls', 'mentionDropdown');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('data-ms-editor', 'false');
    input.setAttribute('data-gramm', 'false');
    input.setAttribute('data-enable-grammarly', 'false');

    let debounceTimer = null;

    input.addEventListener('focus', () => {
      activeInputEl = input;
    });

    input.addEventListener('input', () => {
      activeInputEl = input;
      const trigger = detectTrigger(input);
      if (!trigger) {
        hideDropdown();
        return;
      }

      activeTrigger = trigger;
      positionDropdown(input);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const items = await fetchSuggestions(trigger);
        // Ensure activeTrigger still matches current trigger
        if (activeTrigger && activeTrigger.startPos === trigger.startPos) {
          renderDropdown(items, trigger);
        }
      }, 90);
    });

    input.addEventListener('keydown', (e) => {
      const dd = getDropdown();
      if (e.key === 'Escape' && dd && dd.style.display === 'block') {
        e.preventDefault();
        e.stopPropagation();
        hideDropdown();
        return;
      }
      if (!dd || dd.style.display !== 'block' || suggestions.length === 0) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % suggestions.length;
        updateActiveItem();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
        updateActiveItem();
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          e.stopPropagation();
          applySuggestion(selectedIndex);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideDropdown();
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        const dd = getDropdown();
        if (dd && dd.contains(document.activeElement)) return;
        if (document.activeElement !== input) {
          hideDropdown();
        }
      }, 300);
    });
  }

  // Close dropdown on outside click
  document.addEventListener('pointerdown', (e) => {
    const dd = getDropdown();
    if (!dd || dd.style.display !== 'block') return;
    if (dd.contains(e.target) || (activeInputEl && activeInputEl === e.target)) {
      return;
    }
    hideDropdown();
  });

  // Attach mention autocomplete to dynamically-rendered inline reply inputs
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('inline-reply-input')) attachMentionListeners(t);
  });

  // Hide overlay if the page scrolls/resizes (it is fixed-position)
  window.addEventListener('resize', () => { hideDropdown(); });
  document.addEventListener('scroll', () => {
    const dd = dropdownEl;
    if (dd && dd.style.display === 'block' && activeInputEl) positionDropdown(activeInputEl);
  }, true);

  function setupMentionInput() {
    const commentInput = document.getElementById('newCommentInput');
    const topicTitle = document.getElementById('topicTitle');
    if (commentInput) attachMentionListeners(commentInput);
    if (topicTitle) attachMentionListeners(topicTitle);
  }

  function updateActiveItem() {
    const dd = getDropdown();
    if (!dd) return;
    const items = dd.querySelectorAll('.mention-item');
    items.forEach((el, idx) => {
      el.classList.toggle('active', idx === selectedIndex);
    });
  }

  // Helper to format comment text with highlighted pills
  // Supports multiple members, mentioned topics, tasks, notebooks, and folders
  function highlightMentions(text) {
    if (!text) return '';
    let escaped = typeof escapeHtml === 'function' ? escapeHtml(text) : text;

    // 1a. Replace bracketed Page mentions: #[Page: Spec Sheet]
    escaped = escaped.replace(/#\[Page:\s*([^\]\r\n]{1,80})\]/gi, (match, title) => {
      const cleanTitle = title.trim();
      const enc = encodeURIComponent(cleanTitle);
      return `<span class="mention-pill page-mention-pill clickable-tag" onclick="window.handlePageTagClick(decodeURIComponent('${enc}'))" role="button" tabindex="0" title="Open Page: ${cleanTitle}">📄 #Page: ${cleanTitle}</span>`;
    });

    // 1b. Replace unbracketed Page mentions: #Page:Spec
    escaped = escaped.replace(/#Page:\s*([A-Za-z0-9_.\-]+(?:\s[A-Za-z0-9_.\-]+)?)/gi, (match, title) => {
      const cleanTitle = title.trim();
      const enc = encodeURIComponent(cleanTitle);
      return `<span class="mention-pill page-mention-pill clickable-tag" onclick="window.handlePageTagClick(decodeURIComponent('${enc}'))" role="button" tabindex="0" title="Open Page: ${cleanTitle}">📄 #Page: ${cleanTitle}</span>`;
    });

    // 1. Replace bracketed Notebook mentions: #[Notebook: Spec]
    escaped = escaped.replace(/#\[Notebook:\s*([^\]\r\n]{1,80})\]/gi, (match, title) => {
      const cleanTitle = title.trim();
      const enc = encodeURIComponent(cleanTitle);
      return `<span class="mention-pill notebook-mention-pill clickable-tag" onclick="window.handleNotebookTagClick(decodeURIComponent('${enc}'))" role="button" tabindex="0" title="Open Notebook: ${cleanTitle}">📖 #Notebook: ${cleanTitle}</span>`;
    });

    // 2. Replace unbracketed Notebook mentions: #Notebook:Spec
    escaped = escaped.replace(/#Notebook:\s*([A-Za-z0-9_.\-]+(?:\s[A-Za-z0-9_.\-]+)?)/gi, (match, title) => {
      const cleanTitle = title.trim();
      const enc = encodeURIComponent(cleanTitle);
      return `<span class="mention-pill notebook-mention-pill clickable-tag" onclick="window.handleNotebookTagClick(decodeURIComponent('${enc}'))" role="button" tabindex="0" title="Open Notebook: ${cleanTitle}">📖 #Notebook: ${cleanTitle}</span>`;
    });

    // 3. Replace bracketed Folder mentions: #[Folder: Design Assets]
    escaped = escaped.replace(/#\[Folder:\s*([^\]\r\n]{1,80})\]/gi, (match, folderName) => {
      const cleanName = folderName.trim();
      const enc = encodeURIComponent(cleanName);
      return `<span class="mention-pill folder-mention-pill clickable-tag" onclick="window.handleFolderTagClick(decodeURIComponent('${enc}'))" role="button" tabindex="0" title="Filter by Folder: ${cleanName}">📁 #Folder: ${cleanName}</span>`;
    });

    // 4. Replace unbracketed Folder mentions: #Folder:Assets
    escaped = escaped.replace(/#Folder:\s*([A-Za-z0-9_.\-]+(?:\s[A-Za-z0-9_.\-]+)?)/gi, (match, folderName) => {
      const cleanName = folderName.trim();
      const enc = encodeURIComponent(cleanName);
      return `<span class="mention-pill folder-mention-pill clickable-tag" onclick="window.handleFolderTagClick(decodeURIComponent('${enc}'))" role="button" tabindex="0" title="Filter by Folder: ${cleanName}">📁 #Folder: ${cleanName}</span>`;
    });

    // 5. Replace bracketed topics: #[Topic Title]
    escaped = escaped.replace(/#\[([^\]\r\n]{1,60})\]/g, (match, title) => {
      return `<span class="mention-pill topic-mention-pill">#${title.trim()}</span>`;
    });

    // 6. Replace topic IDs: #topic:12 or #topic-12
    escaped = escaped.replace(/#topic[:\-](\d+)\b/gi, (match, id) => {
      return `<span class="mention-pill topic-mention-pill">#topic-${id}</span>`;
    });

    // 7. Replace task IDs: #123 (numeric)
    escaped = escaped.replace(/#(\d+)\b/g, (match, id) => {
      return `<span class="mention-pill task-mention-pill clickable-tag" onclick="window.handleTaskTagClick(${id})" role="button" tabindex="0" title="Go to Task #${id}">#task-${id}</span>`;
    });

    // 8. Replace bracketed user mentions: @[John Doe]
    escaped = escaped.replace(/@\[([^\]\r\n]{1,50})\]/g, (match, name) => {
      return `<span class="mention-pill user-mention-pill">@${name.trim()}</span>`;
    });

    // 8b. Replace known workspace member full names (including 3-4 word names) first
    const groupDetails = window.currentGroupDetails || (typeof currentGroupDetails !== 'undefined' ? currentGroupDetails : null);
    if (groupDetails && Array.isArray(groupDetails.members)) {
      groupDetails.members.forEach(m => {
        const nm = (m.full_name || m.name || '').trim();
        if (nm) knownMemberNames.add(nm.toLowerCase());
      });
    }
    const sortedNames = Array.from(knownMemberNames).filter(Boolean).sort((a, b) => b.length - a.length);
    sortedNames.forEach(lowerName => {
      const escRegex = lowerName.replace(/[.*+?^${}()|[\]\\]/g, c => '\\' + c);
      const re = new RegExp('@(' + escRegex + ')(?=[.,!?:;]?(\\s|$))', 'gi');
      escaped = escaped.replace(re, (m, matchedName) => `<span class="mention-pill user-mention-pill">@${matchedName.trim()}</span>`);
    });

    // 9. Replace remaining inline user mentions (1-2 word names not yet wrapped)
    escaped = escaped.replace(/(^|[\s(>])@([A-Za-z0-9_.-]+(?:\s[A-Za-z0-9_.-]+)?)(?=[.,!?:;]?(\s|$))/g, (match, prefix, name) => {
      return `${prefix}<span class="mention-pill user-mention-pill">@${name.trim()}</span>`;
    });

    return escaped;
  }

  async function handleNotebookTagClick(rawTitle) {
    if (!rawTitle) return;
    const title = String(rawTitle).trim();

    // 1. Switch to notebook tab
    if (typeof switchTab === 'function') {
      switchTab('notebook');
    } else if (typeof window.switchTab === 'function') {
      window.switchTab('notebook');
    }

    // 2. Filter the grid
    const searchInput = document.getElementById('noteSearchInput');
    if (searchInput) {
      searchInput.value = title;
    }
    if (typeof loadNotebook === 'function') {
      await loadNotebook(title);
    } else if (typeof window.loadNotebook === 'function') {
      await window.loadNotebook(title);
    }

    // 3. Highlight and scroll the note card with pulse animation
    setTimeout(() => {
      const grid = document.getElementById('notebookGrid');
      if (!grid) return;
      const cards = grid.querySelectorAll('.note-card');
      let targetCard = null;
      const lowerTitle = title.toLowerCase();

      for (const card of cards) {
        const cardTitle = card.getAttribute('data-note-title') || card.querySelector('h4 span')?.textContent || '';
        if (cardTitle.toLowerCase().includes(lowerTitle)) {
          targetCard = card;
          break;
        }
      }

      if (!targetCard && cards.length > 0) {
        targetCard = cards[0];
      }

      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.classList.remove('card-highlight-pulse');
        const existingBeacon = targetCard.querySelector('.mentioned-beacon-tag');
        if (existingBeacon) existingBeacon.remove();

        const beacon = document.createElement('span');
        beacon.className = 'mentioned-beacon-tag';
        beacon.innerHTML = '📌 Mentioned Document';
        targetCard.appendChild(beacon);

        void targetCard.offsetWidth; // Force reflow
        targetCard.classList.add('card-highlight-pulse');

        setTimeout(() => {
          targetCard.classList.remove('card-highlight-pulse');
          if (beacon.parentNode) beacon.remove();
        }, 3600);
      }
    }, 350);
  }

  async function handleFolderTagClick(rawFolderName) {
    if (!rawFolderName) return;
    const folderName = String(rawFolderName).trim().toLowerCase();

    // 1. Switch to notebook tab
    if (typeof switchTab === 'function') {
      switchTab('notebook');
    } else if (typeof window.switchTab === 'function') {
      window.switchTab('notebook');
    }

    // Clear search input if present
    const searchInput = document.getElementById('noteSearchInput');
    if (searchInput) searchInput.value = '';

    // 2. Look up folder in window.dashboardNotebookFolders
    let folders = window.dashboardNotebookFolders || (typeof dashboardNotebookFolders !== 'undefined' ? dashboardNotebookFolders : []);
    if (!folders || folders.length === 0) {
      if (typeof loadDashboardFolders === 'function') {
        folders = await loadDashboardFolders();
      } else if (typeof window.loadDashboardFolders === 'function') {
        folders = await window.loadDashboardFolders();
      }
    }

    const matched = (folders || []).find(f => (f.name || '').trim().toLowerCase() === folderName);
    if (matched) {
      if (typeof filterDashboardNotesByFolder === 'function') {
        filterDashboardNotesByFolder(matched.id);
      } else if (typeof window.filterDashboardNotesByFolder === 'function') {
        window.filterDashboardNotesByFolder(matched.id);
      }
    } else {
      if (typeof filterDashboardNotesByFolder === 'function') {
        filterDashboardNotesByFolder('ALL');
      } else if (typeof window.filterDashboardNotesByFolder === 'function') {
        window.filterDashboardNotesByFolder('ALL');
      }
    }

    // Highlight the active folder pill in the folder bar
    setTimeout(() => {
      const bar = document.getElementById('dashboardFoldersBar');
      if (bar) {
        const pills = bar.querySelectorAll('div, button');
        for (const pill of pills) {
          if (pill.textContent.toLowerCase().includes(folderName)) {
            pill.classList.remove('card-highlight-pulse');
            const existingBeacon = pill.querySelector('.mentioned-beacon-tag');
            if (existingBeacon) existingBeacon.remove();

            const beacon = document.createElement('span');
            beacon.className = 'mentioned-beacon-tag';
            beacon.style.top = '-14px';
            beacon.style.right = '4px';
            beacon.innerHTML = '📁 Mentioned Folder';
            pill.style.position = 'relative';
            pill.appendChild(beacon);

            void pill.offsetWidth;
            pill.classList.add('card-highlight-pulse');
            setTimeout(() => {
              pill.classList.remove('card-highlight-pulse');
              if (beacon.parentNode) beacon.remove();
            }, 3600);
            break;
          }
        }
      }
    }, 400);
  }

  function handleTaskTagClick(taskId) {
    if (!taskId) return;
    if (typeof switchTab === 'function') {
      switchTab('tasks');
    } else if (typeof window.switchTab === 'function') {
      window.switchTab('tasks');
    }

    setTimeout(() => {
      const card = document.getElementById(`task-card-${taskId}`) || document.querySelector(`[data-task-id="${taskId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.remove('card-highlight-pulse');
        const existingBeacon = card.querySelector('.mentioned-beacon-tag');
        if (existingBeacon) existingBeacon.remove();

        const beacon = document.createElement('span');
        beacon.className = 'mentioned-beacon-tag';
        beacon.innerHTML = '📌 Mentioned Task';
        card.appendChild(beacon);

        void card.offsetWidth; // Force reflow
        card.classList.add('card-highlight-pulse');

        setTimeout(() => {
          card.classList.remove('card-highlight-pulse');
          if (beacon.parentNode) beacon.remove();
        }, 3600);
      }
    }, 350);
  }

  // ─── Threaded Replies (Reply-to-Reply) Renderer & Inline Reply Handlers ────
  function renderThreadedComments(comments, options = {}) {
    if (!Array.isArray(comments) || comments.length === 0) {
      return '<p style="color:var(--gray); text-align:center; padding:20px;">No replies yet. Be the first to reply!</p>';
    }
    const currUser = options.currentUser || (typeof currentUser !== 'undefined' ? currentUser : window.currentUser);
    const groupDetails = options.currentGroupDetails || (typeof currentGroupDetails !== 'undefined' ? currentGroupDetails : window.currentGroupDetails);
    const topic = options.topic || {};
    const threadImages = options.threadImages || window.__activeThreadImages || [];

    const isLeader = groupDetails && (groupDetails.role === 'leader' || groupDetails.role === 'co_leader');
    const isThreadCreator = currUser && (Number(topic.author_user_id) === Number(currUser.id) || Number(topic.created_by) === Number(currUser.id));
    const canPin = typeof options.canPin === 'boolean' ? options.canPin : Boolean(isLeader || isThreadCreator);
    window.__canPinCurrentThread = canPin;

    const esc = typeof escapeHtml === 'function' ? escapeHtml : (str => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
    const fmtDate = typeof formatDate === 'function' ? formatDate : (d => d ? new Date(d).toLocaleString() : '');
    const renderAtts = typeof renderAttachmentsHtml === 'function' ? renderAttachmentsHtml : (() => '');

    const renderOne = (c, level, replyToName) => {
      const isAuthor = currUser && Number(c.user_id) === Number(currUser.id);
      const handleTag = replyToName ? `<span class="reply-handle" style="display:inline-block; font-size:11px; font-weight:700; color:var(--primary, #2563eb); background:rgba(37,99,235,0.1); border-radius:10px; padding:1px 8px; margin-right:6px;">@${esc(replyToName)}</span>` : '';
      const canDelete = isLeader || isAuthor;
      const isPinned = Boolean(c.is_pinned);

      return `
        <div class="chat-message" id="comment-item-${c.id}" style="position:relative; display:flex; gap:12px; padding:12px; border-radius:10px; margin-bottom:12px; background:var(--muted, #f8fafc); border:1px solid ${isPinned ? 'rgba(245, 158, 11, 0.45)' : 'var(--border)'}; transition:background 0.2s ease;">
          <div class="chat-avatar" style="width:36px; height:36px; border-radius:50%; background:var(--primary, #4f46e5); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:13px; flex-shrink:0; cursor:${isAuthor ? 'default' : 'pointer'};" ${!isAuthor ? `onclick="openDirectMessageDrawer(${c.user_id}, '${esc(c.user_name).replace(/'/g, "\\'")}', '${esc(c.user_initials || 'GS')}')"` : ''} title="${isAuthor ? '' : `Direct message ${esc(c.user_name)}`}">
            ${esc(c.user_initials || 'GS')}
          </div>
          <div class="chat-content" style="flex:1; min-width:0;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <h4 style="margin:0 0 4px 0; font-size:13px; font-weight:600; color:var(--text); cursor:${isAuthor ? 'default' : 'pointer'};" ${!isAuthor ? `onclick="openDirectMessageDrawer(${c.user_id}, '${esc(c.user_name).replace(/'/g, "\\'")}', '${esc(c.user_initials || 'GS')}')"` : ''}>${esc(c.user_name)}</h4>
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
                  <button type="button" class="comment-delete-discrete" onclick="confirmDeleteComment(${c.id}, event)" title="Delete comment" style="background:none; border:none; color:var(--gray); font-size:13px; cursor:pointer; padding:2px 6px; border-radius:4px; opacity:0.7; transition:all 0.15s ease; display:inline-flex; align-items:center; justify-content:center;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                ` : ''}
              </div>
            </div>
            ${isPinned ? `<div style="display:inline-flex; align-items:center; gap:4px; font-size:11px; color:var(--warning, #f59e0b); font-weight:600; margin-bottom:4px;">📌 Pinned in Thread</div>` : ''}
            ${c.content ? `<p style="margin:0 0 4px 0; font-size:13px; color:var(--text); line-height:1.5; word-break:break-word;">${handleTag}${highlightMentions(c.content)}</p>` : ''}
            ${renderAtts(c.attachments, threadImages)}
            <div style="display:flex; align-items:center; gap:10px; margin-top:4px;">
              <span style="font-size:11px; color:var(--gray);">${fmtDate(c.created_at)}</span>
              <button type="button" class="comment-reply-btn" onclick="toggleInlineReply(${c.id}, event)" title="Reply to ${esc(c.user_name)}" style="background:none; border:none; color:var(--primary, #2563eb); font-size:12px; font-weight:600; cursor:pointer; padding:2px 4px; border-radius:4px;">Reply</button>
            </div>
            <div class="inline-reply-slot" id="inline-reply-slot-${c.id}" style="display:none; margin-top:8px;"></div>
          </div>
        </div>
      `;
    };

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
        if (kids.length > 1 || total > 1) {
          html += '<button type="button" class="comment-collapse-btn" data-count="' + total + '" onclick="toggleCommentReplies(' + c.id + ', event)" style="background:none; border:none; color:var(--gray); font-size:11px; font-weight:600; cursor:pointer; margin:-4px 0 6px 16px; padding:2px 4px;">Hide ' + total + ' replies</button>';
        }
        if (level < MAX_INDENT_LEVEL) {
          html += '<div class="comment-children" id="comment-children-' + c.id + '" style="border-left: 2px solid #cbd5e1; margin-left: 16px; padding-left: 12px;">' +
            kids.map(k => renderBranch(k, level + 1, null)).join('') + '</div>';
        } else {
          html += '<div class="comment-children" id="comment-children-' + c.id + '">' +
            kids.map(k => renderBranch(k, level, c.user_name || 'Member')).join('') + '</div>';
        }
      }
      return html + '</div>';
    };

    return (byParent.get(0) || []).map(c => renderBranch(c, 1, null)).join('');
  }

  let handleTopicSubmitRef = null;
  let handleCommentSubmitRef = null;

  // Explicit event listener and button click repairs for Discussion Board
  function setupDiscussionBoardListeners() {
    const submitTopicBtn = document.getElementById('submitTopicBtn');
    const createTopicForm = document.getElementById('createTopicForm');

    async function handleTopicSubmit(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const titleInput = document.getElementById('topicTitle');
      const categoryInput = document.getElementById('topicCategory');
      const title = titleInput ? titleInput.value.trim() : '';
      const category = categoryInput ? categoryInput.value : 'General';

      // Empty state validation
      if (!title) {
        if (typeof showToast === 'function') {
          showToast('Please enter a topic title.', 'warning');
        } else {
          alert('Please enter a topic title.');
        }
        if (titleInput) titleInput.focus();
        return;
      }

      const activeGid = getActiveGroupId();

      if (!activeGid) {
        if (typeof showToast === 'function') showToast('No active workspace selected.', 'error');
        return;
      }

      const attachments = (typeof pendingTopicAttachments !== 'undefined' && Array.isArray(pendingTopicAttachments))
        ? pendingTopicAttachments
        : (window.pendingTopicAttachments || []);

      if (submitTopicBtn) submitTopicBtn.disabled = true;

      try {
        const res = await apiFetch(`/api/groups/${activeGid}/discussions`, {
          method: 'POST',
          body: JSON.stringify({ title, category, attachments })
        });

        if (typeof pendingTopicAttachments !== 'undefined') pendingTopicAttachments.length = 0;
        if (window.pendingTopicAttachments) window.pendingTopicAttachments = [];
        if (typeof renderTopicAttachmentsPreview === 'function') renderTopicAttachmentsPreview();

        if (typeof closeModal === 'function') closeModal('createTopicModal');
        if (createTopicForm) createTopicForm.reset();

        if (typeof showToast === 'function') showToast('Topic created successfully!', 'success');

        if (typeof loadDiscussions === 'function') {
          await loadDiscussions();
        }

        if (res && res.data && typeof selectTopic === 'function') {
          selectTopic(res.data.id, res.data.title);
        }
      } catch (err) {
        if (typeof showToast === 'function') {
          showToast(err.message || 'Failed to create discussion topic.', 'error');
        }
      } finally {
        if (submitTopicBtn) submitTopicBtn.disabled = false;
      }
    }

    if (createTopicForm) {
      createTopicForm.removeEventListener('submit', handleTopicSubmit);
      createTopicForm.addEventListener('submit', handleTopicSubmit);
    }
    if (submitTopicBtn) {
      submitTopicBtn.removeEventListener('click', handleTopicSubmit);
      submitTopicBtn.addEventListener('click', (e) => {
        if (!createTopicForm) handleTopicSubmit(e);
      });
    }

    const postDiscussionBtn = document.getElementById('postDiscussionBtn');
    const postCommentForm = document.getElementById('postCommentForm');

    async function handleCommentSubmit(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const input = document.getElementById('newCommentInput');
      const content = input ? input.value.trim() : '';
      const attachments = (typeof pendingCommentAttachments !== 'undefined' && Array.isArray(pendingCommentAttachments))
        ? pendingCommentAttachments
        : (window.pendingCommentAttachments || []);

      if (!content && attachments.length === 0) {
        if (typeof showToast === 'function') {
          showToast('Please write a reply or attach a file before posting.', 'warning');
        }
        if (input) input.focus();
        return;
      }

      const topicId = (typeof window.activeTopicId !== 'undefined' && window.activeTopicId)
        ? window.activeTopicId
        : (typeof activeTopicId !== 'undefined' ? activeTopicId : null);
      const activeGid = getActiveGroupId();

      if (!topicId || !activeGid || window.__isSubmittingDiscussionComment) return;
      window.__isSubmittingDiscussionComment = true;

      if (postDiscussionBtn) postDiscussionBtn.disabled = true;

      try {
        await apiFetch(`/api/groups/${activeGid}/discussions/${topicId}/comments`, {
          method: 'POST',
          body: JSON.stringify({ content, attachments })
        });

        if (input) input.value = '';
        if (typeof pendingCommentAttachments !== 'undefined') pendingCommentAttachments.length = 0;
        if (window.pendingCommentAttachments) window.pendingCommentAttachments = [];
        if (typeof renderCommentAttachmentsPreview === 'function') renderCommentAttachmentsPreview();

        const titleEl = document.getElementById('activeTopicTitle');
        if (typeof selectTopic === 'function') {
          selectTopic(topicId, titleEl ? titleEl.textContent : '');
        }
      } catch (err) {
        if (typeof showToast === 'function') {
          showToast(err.message || 'Failed to post reply.', 'error');
        }
      } finally {
        window.__isSubmittingDiscussionComment = false;
        if (postDiscussionBtn) postDiscussionBtn.disabled = false;
      }
    }

    if (postCommentForm) {
      postCommentForm.removeEventListener('submit', handleCommentSubmit);
      postCommentForm.addEventListener('submit', handleCommentSubmit);
    }
    if (postDiscussionBtn) {
      postDiscussionBtn.removeEventListener('click', handleCommentSubmit);
      postDiscussionBtn.addEventListener('click', (e) => {
        if (!postCommentForm) handleCommentSubmit(e);
      });
    }
    handleTopicSubmitRef = handleTopicSubmit;
    handleCommentSubmitRef = handleCommentSubmit;
    window.handleCreateTopic = handleTopicSubmit;
    window.handlePostComment = handleCommentSubmit;
  }

  async function handlePageTagClick(rawTitle) {
    return handleNotebookTagClick(rawTitle);
  }

  // Export functions to window
  window.resetDiscussionMentions = hideDropdown;
  window.highlightMentions = highlightMentions;
  window.setupDiscussionBoardListeners = setupDiscussionBoardListeners;
  window.renderThreadedComments = renderThreadedComments;
  window.handleCreateTopic = function (e) { return handleTopicSubmitRef ? handleTopicSubmitRef(e) : undefined; };
  window.handlePostComment = function (e) { return handleCommentSubmitRef ? handleCommentSubmitRef(e) : undefined; };
  window.handleNotebookTagClick = handleNotebookTagClick;
  window.handlePageTagClick = handlePageTagClick;
  window.handleFolderTagClick = handleFolderTagClick;
  window.handleTaskTagClick = handleTaskTagClick;
  window.setupMentionInput = setupMentionInput;

  function initDiscussions() {
    injectMentionStyles();
    setupMentionInput();
    setupDiscussionBoardListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiscussions);
  } else {
    initDiscussions();
  }
})();
