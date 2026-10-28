/**
 * GroupSpace — App-level UI (app.js)
 * Notification Feed button + Personal Feed drawer.
 */

'use strict';

(function () {
  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return typeof escapeHtml === 'function' ? escapeHtml(String(value ?? '')) : String(value ?? '');
  }

  function isOpen() {
    const drawer = $('feedDrawer');
    return !!drawer && drawer.classList.contains('open');
  }

  function setDrawer(open) {
    const drawer = $('feedDrawer');
    const overlay = $('feedDrawerOverlay');
    if (!drawer || !overlay) return;
    drawer.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) loadFeed();
  }

  function section(title, items, render) {
    if (!items.length) return '';
    return `<h4>${title} (${items.length})</h4>${items.map(render).join('')}`;
  }

  function renderFeed(data) {
    const body = $('feedBody');
    if (!body) return;

    const approvals = data.pendingApprovals || [];
    const help = data.helpRequests || [];
    const mentions = data.mentions || [];

    const html =
      section('Pending Approvals', approvals, t => `
        <a class="feed-item" href="dashboard.html?groupId=${encodeURIComponent(t.group_id)}">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;">
            <span style="font-size:9.5px; font-weight:700; color:var(--warning); background:rgba(245,158,11,0.12); padding:1px 6px; border-radius:4px; text-transform:uppercase;">Review</span>
            <strong>${esc(t.title)}</strong>
          </div>
          <small>Awaiting your approval${t.assignee_name ? ' · ' + esc(t.assignee_name) : ''}</small>
        </a>`) +
      section('Help Needed', help, t => `
        <a class="feed-item" href="dashboard.html?groupId=${encodeURIComponent(t.group_id)}">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;">
            <span style="font-size:9.5px; font-weight:700; color:#ef4444; background:rgba(239,68,68,0.12); padding:1px 6px; border-radius:4px; text-transform:uppercase;">Blocked</span>
            <strong>${esc(t.title)}</strong>
          </div>
          <small>${esc(t.flagged_reason || 'Blocked')}${t.assignee_name ? ' · ' + esc(t.assignee_name) : ''}</small>
        </a>`) +
      section('Mentions', mentions, m => `
        <a class="feed-item" href="dashboard.html?groupId=${encodeURIComponent(m.group_id)}">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;">
            <span style="font-size:9.5px; font-weight:700; color:${m.type === 'follow_up' ? '#f59e0b' : 'var(--primary)'}; background:${m.type === 'follow_up' ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.12)'}; padding:1px 6px; border-radius:4px; text-transform:uppercase;">${m.type === 'follow_up' ? 'Follow-Up' : 'Mention'}</span>
            <strong>${esc(m.author_name || 'Leader')}</strong>
          </div>
          <small>${esc(String(m.content || '').slice(0, 140))}</small>
        </a>`);

    body.innerHTML = html || '<p style="color:var(--gray); text-align:center; padding:30px 0;">You\'re all caught up.</p>';

    const badge = $('feedBadge');
    if (badge) {
      const total = approvals.length + help.length + mentions.length;
      badge.textContent = total > 99 ? '99+' : String(total);
      badge.style.display = total > 0 ? 'inline-block' : 'none';
    }
  }

  async function loadFeed() {
    const body = $('feedBody');
    try {
      const activeGroupId = (typeof currentGroupId !== 'undefined' && currentGroupId)
        ? currentGroupId
        : localStorage.getItem('groupspace_active_group_id');
      const url = activeGroupId
        ? `/api/user/personal-feed?groupId=${encodeURIComponent(activeGroupId)}`
        : '/api/user/personal-feed';
      const res = await apiFetch(url);
      renderFeed(res.data || {});
    } catch (err) {
      if (body) body.innerHTML = `<p style="color:#dc2626; padding:12px 0; font-size:13px;">${esc(err.message || 'Failed to load feed.')}</p>`;
    }
  }

  window.refreshAppFeed = loadFeed;
  window.openPersonalFeedDrawer = function() {
    setDrawer(!isOpen());
  };
  window.togglePersonalFeed = function() {
    setDrawer(!isOpen());
  };

  function setupFeedListeners() {
    const btn = $('notificationFeedBtn');
    if (!btn || !$('feedDrawer')) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDrawer(!isOpen());
    });

    const closeBtn = $('feedCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setDrawer(false);
      });
    }

    const overlay = $('feedDrawerOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        setDrawer(false);
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) setDrawer(false);
    });

    // Prime the unread badge once the session is available
    if (localStorage.getItem('groupspace_token')) loadFeed();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFeedListeners);
  } else {
    setupFeedListeners();
  }
})();
