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
          📋 <strong>${esc(t.title)}</strong>
          <small>Awaiting your approval${t.assignee_name ? ' · ' + esc(t.assignee_name) : ''}</small>
        </a>`) +
      section('⚠️ Help Needed', help, t => `
        <a class="feed-item" href="dashboard.html?groupId=${encodeURIComponent(t.group_id)}">
          ⚠️ <strong>${esc(t.title)}</strong>
          <small>${esc(t.flagged_reason || 'Blocked')}${t.assignee_name ? ' · ' + esc(t.assignee_name) : ''}</small>
        </a>`) +
      section('@Mentions', mentions, m => `
        <a class="feed-item" href="dashboard.html?groupId=${encodeURIComponent(m.group_id)}">
          💬 <strong>${esc(m.author_name)}</strong>
          <small>${esc(String(m.content || '').slice(0, 140))}</small>
        </a>`);

    body.innerHTML = html || '<p style="color:var(--gray);">You\'re all caught up. 🎉</p>';

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
      const res = await apiFetch('/api/user/personal-feed');
      renderFeed(res.data || {});
    } catch (err) {
      if (body) body.innerHTML = `<p style="color:#dc2626;">${esc(err.message || 'Failed to load feed.')}</p>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = $('notificationFeedBtn');
    if (!btn || !$('feedDrawer')) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setDrawer(!isOpen());
    });

    const closeBtn = $('feedCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => setDrawer(false));

    const overlay = $('feedDrawerOverlay');
    if (overlay) overlay.addEventListener('click', () => setDrawer(false));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) setDrawer(false);
    });

    // Prime the unread badge once the session is available
    if (localStorage.getItem('groupspace_token')) loadFeed();
  });
})();
