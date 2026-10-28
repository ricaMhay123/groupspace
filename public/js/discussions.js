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
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        max-height: 250px;
        overflow-y: auto;
        z-index: 1050;
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
    `;
    document.head.appendChild(style);
  }

  function getDropdown() {
    if (!dropdownEl) {
      dropdownEl = document.createElement('div');
      dropdownEl.className = 'mention-dropdown';
      dropdownEl.id = 'mentionDropdown';
      
      const form = document.getElementById('postCommentForm');
      if (form) {
        form.style.position = 'relative';
        form.insertBefore(dropdownEl, form.firstChild);
      } else {
        document.body.appendChild(dropdownEl);
      }
    }
    return dropdownEl;
  }

  function hideDropdown() {
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

    return {
      type: triggerType,
      query,
      startPos: triggerIdx,
      endPos: cursorPos
    };
  }

  async function fetchSuggestions(trigger) {
    const groupId = typeof currentGroupId !== 'undefined' && currentGroupId 
      ? currentGroupId 
      : localStorage.getItem('groupspace_active_group_id');
      
    if (!groupId) return [];

    try {
      if (trigger.type === '@') {
        const res = await apiFetch(`/api/groups/${groupId}/discussions/mentions/users?q=${encodeURIComponent(trigger.query)}`);
        return (res.data || []).map(u => ({
          type: 'user',
          id: u.id,
          name: u.name,
          initials: u.avatar_initials || (u.name ? u.name.slice(0, 2).toUpperCase() : 'U')
        }));
      } else if (trigger.type === '#') {
        // Query both topics and tasks concurrently
        const [topicsRes, tasksRes] = await Promise.all([
          apiFetch(`/api/groups/${groupId}/discussions/mentions/topics?q=${encodeURIComponent(trigger.query)}`).catch(() => ({ data: [] })),
          apiFetch(`/api/groups/${groupId}/discussions/mentions/tasks?q=${encodeURIComponent(trigger.query)}`).catch(() => ({ data: [] }))
        ]);

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

        return [...topics, ...tasks];
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
      hideDropdown();
      return;
    }

    suggestions = items;
    selectedIndex = 0;

    const title = trigger.type === '@' ? 'Workspace Members' : 'Workspace Topics & Tasks';
    let html = `<div class="mention-dropdown-header">${title}</div>`;

    items.forEach((item, idx) => {
      if (item.type === 'user') {
        html += `
          <div class="mention-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
            <div class="mention-item-avatar">${escapeHtml(item.initials)}</div>
            <span>${escapeHtml(item.name)}</span>
            <span class="mention-item-tag">Member</span>
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
      } else {
        html += `
          <div class="mention-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
            <div class="mention-item-avatar task">#</div>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              <strong>#${item.id}</strong> ${escapeHtml(item.name)}
            </span>
            <span class="mention-item-tag">Task</span>
          </div>
        `;
      }
    });

    dd.innerHTML = html;
    dd.style.display = 'block';

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

    const input = document.getElementById('newCommentInput');
    if (!input) return;

    const text = input.value;
    let replacement = '';
    if (item.type === 'user') {
      replacement = `@${item.name} `;
    } else if (item.type === 'topic') {
      replacement = `#[${item.name}] `;
    } else {
      replacement = `#${item.id} `;
    }

    const before = text.slice(0, activeTrigger.startPos);
    const after = text.slice(activeTrigger.endPos);

    input.value = before + replacement + after;
    const newCursor = activeTrigger.startPos + replacement.length;
    input.setSelectionRange(newCursor, newCursor);
    input.focus();

    hideDropdown();
  }

  function setupMentionInput() {
    const input = document.getElementById('newCommentInput');
    if (!input) return;

    let debounceTimer = null;

    input.addEventListener('input', () => {
      const trigger = detectTrigger(input);
      if (!trigger) {
        hideDropdown();
        return;
      }

      activeTrigger = trigger;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const items = await fetchSuggestions(trigger);
        // Ensure activeTrigger still matches current trigger
        if (activeTrigger && activeTrigger.startPos === trigger.startPos) {
          renderDropdown(items, trigger);
        }
      }, 120);
    });

    input.addEventListener('keydown', (e) => {
      const dd = getDropdown();
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
      // Delay to let click event on suggestion item fire first
      setTimeout(hideDropdown, 200);
    });
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
  // Supports multiple members, mentioned topics, and mentioned tasks
  function highlightMentions(text) {
    if (!text) return '';
    let escaped = typeof escapeHtml === 'function' ? escapeHtml(text) : text;

    // 1. Replace bracketed topics: #[Topic Title]
    escaped = escaped.replace(/#\[([^\]\r\n]{1,60})\]/g, (match, title) => {
      return `<span class="mention-pill topic-mention-pill">#${title.trim()}</span>`;
    });

    // 2. Replace topic IDs: #topic:12 or #topic-12
    escaped = escaped.replace(/#topic[:\-](\d+)\b/gi, (match, id) => {
      return `<span class="mention-pill topic-mention-pill">#topic-${id}</span>`;
    });

    // 3. Replace task IDs: #123 (numeric)
    escaped = escaped.replace(/#(\d+)\b/g, (match, id) => {
      return `<span class="mention-pill task-mention-pill">#task-${id}</span>`;
    });

    // 4. Replace bracketed user mentions: @[John Doe]
    escaped = escaped.replace(/@\[([^\]\r\n]{1,50})\]/g, (match, name) => {
      return `<span class="mention-pill user-mention-pill">@${name.trim()}</span>`;
    });

    // 5. Replace inline user mentions: @FirstName or @FirstName LastName (supports multiple in a row)
    escaped = escaped.replace(/@([A-Za-z0-9_.-]+(?:\s[A-Za-z0-9_.-]+)?)(?=[.,!?:;]?(\s|$))/g, (match, name) => {
      return `<span class="mention-pill user-mention-pill">@${name.trim()}</span>`;
    });

    return escaped;
  }

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

      const activeGid = (typeof currentGroupId !== 'undefined' && currentGroupId)
        ? currentGroupId
        : localStorage.getItem('groupspace_active_group_id');

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

      const topicId = typeof activeTopicId !== 'undefined' ? activeTopicId : null;
      const activeGid = (typeof currentGroupId !== 'undefined' && currentGroupId)
        ? currentGroupId
        : localStorage.getItem('groupspace_active_group_id');

      if (!topicId || !activeGid) return;

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
  }

  // Export functions to window
  window.resetDiscussionMentions = hideDropdown;
  window.highlightMentions = highlightMentions;
  window.setupDiscussionBoardListeners = setupDiscussionBoardListeners;
  window.handleCreateTopic = handleTopicSubmit;
  window.handlePostComment = handleCommentSubmit;

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
