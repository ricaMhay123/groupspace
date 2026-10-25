/**
 * GroupSpace — Discussions & Workspace-Scoped Mentions
 * Provides @mention (workspace members) and #mention (workspace tasks)
 * autocomplete for discussions, strictly scoped to the active workspace.
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
        max-height: 220px;
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
      .mention-item-tag {
        font-size: 11px;
        color: #64748b;
        margin-left: auto;
      }
      .mention-pill {
        display: inline-block;
        padding: 2px 7px;
        border-radius: 6px;
        font-size: 0.88em;
        font-weight: 600;
        line-height: 1.2;
      }
      .user-mention-pill {
        background: #e0e7ff;
        color: #3730a3;
      }
      .task-mention-pill {
        background: #fef3c7;
        color: #92400e;
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

    // Trigger must be preceded by start of string or whitespace
    if (triggerIdx > 0 && !/\s/.test(text[triggerIdx - 1])) {
      return null;
    }

    const query = text.slice(triggerIdx + 1);
    // Don't autocomplete if query contains newline or multiple words beyond 20 chars
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
        const res = await apiFetch(`/api/groups/${groupId}/discussions/mentions/tasks?q=${encodeURIComponent(trigger.query)}`);
        return (res.data || []).map(t => ({
          type: 'task',
          id: t.id,
          name: t.title
        }));
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

    const title = trigger.type === '@' ? 'Workspace Members' : 'Active Tasks';
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
      } else {
        html += `
          <div class="mention-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
            <div class="mention-item-avatar" style="background:#f59e0b;">#</div>
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
    const replacement = item.type === 'user' 
      ? `@${item.name} ` 
      : `#${item.id} `;

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
  function highlightMentions(text) {
    if (!text) return '';
    let escaped = typeof escapeHtml === 'function' ? escapeHtml(text) : text;
    // Replace @mentions
    escaped = escaped.replace(/@([a-zA-Z0-9_\s]{2,30}?)(?=[.,!?]?(\s|$))/g, (match, name) => {
      return `<span class="mention-pill user-mention-pill">@${name.trim()}</span>`;
    });
    // Replace #tasks
    escaped = escaped.replace(/#(\d+)\b/g, (match, id) => {
      return `<span class="mention-pill task-mention-pill">#${id}</span>`;
    });
    return escaped;
  }

  // Export functions to window
  window.resetDiscussionMentions = hideDropdown;
  window.highlightMentions = highlightMentions;

  document.addEventListener('DOMContentLoaded', () => {
    injectMentionStyles();
    setupMentionInput();
  });
})();
