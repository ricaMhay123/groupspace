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

    const leadershipRequests = data.leadershipRequests || [];
    const approvals = data.pendingApprovals || [];
    const help = data.helpRequests || [];
    const mentions = data.mentions || [];

    const html =
      section('Leadership Requests', leadershipRequests, r => `
        <div class="feed-item" style="display:block; padding:10px 12px; border:1px solid var(--border); border-radius:10px; margin-bottom:8px; font-size:13px; color:inherit; background:var(--card, #fff);">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:9.5px; font-weight:700; color:#4f46e5; background:rgba(79,70,229,0.12); padding:1px 6px; border-radius:4px; text-transform:uppercase;">Leadership Request</span>
              <strong>${esc(r.requester_name || 'Member')}</strong>
            </div>
            <span style="font-size:11px; color:var(--gray);">${r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
          </div>
          <div style="font-size:12px; color:var(--text); margin:6px 0 8px; line-height:1.4; word-break:break-word;">
            ${esc(r.message || 'Requested leadership role.')}
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" class="btn-green" style="padding:4px 8px; font-size:11px; font-weight:600; border-radius:6px; cursor:pointer;" onclick="resolveLeadershipRequestFromFeed(${r.group_id}, ${r.id}, 'leader', event)">
              Approve as Leader
            </button>
            <button type="button" class="btn-outline" style="padding:4px 8px; font-size:11px; font-weight:600; border-radius:6px; border-color:var(--primary); color:var(--primary); cursor:pointer;" onclick="resolveLeadershipRequestFromFeed(${r.group_id}, ${r.id}, 'co_leader', event)">
              Approve as Co-Leader
            </button>
            <button type="button" class="btn-outline" style="padding:4px 8px; font-size:11px; font-weight:600; border-radius:6px; border-color:#fca5a5; color:#dc2626; cursor:pointer;" onclick="resolveLeadershipRequestFromFeed(${r.group_id}, ${r.id}, 'reject', event)">
              Reject
            </button>
          </div>
        </div>`) +
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
            <span style="font-size:9.5px; font-weight:700; color:${m.type === 'follow_up' ? '#f59e0b' : (m.type === 'leadership_decision' ? '#10b981' : 'var(--primary)')}; background:${m.type === 'follow_up' ? 'rgba(245,158,11,0.12)' : (m.type === 'leadership_decision' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)')}; padding:1px 6px; border-radius:4px; text-transform:uppercase;">${m.type === 'follow_up' ? 'Follow-Up' : (m.type === 'leadership_decision' ? 'Role Update' : 'Mention')}</span>
            <strong>${esc(m.author_name || 'Leader')}</strong>
          </div>
          <small>${esc(String(m.content || '').slice(0, 140))}</small>
        </a>`);

    body.innerHTML = html || '<p style="color:var(--gray); text-align:center; padding:30px 0;">You\'re all caught up.</p>';

    const badge = $('feedBadge');
    if (badge) {
      const total = leadershipRequests.length + approvals.length + help.length + mentions.length;
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

  window.resolveLeadershipRequestFromFeed = async function(groupId, requestId, decision, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const res = await apiFetch(`/api/groups/${groupId}/leadership-requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ decision })
      });
      if (typeof showToast === 'function') {
        showToast(res.message || 'Leadership request resolved.', 'success');
      }
      loadFeed();
      if (typeof loadOverview === 'function') {
        loadOverview();
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast(err.message || 'Failed to resolve request.', 'error');
      } else {
        alert(err.message || 'Failed to resolve request.');
      }
    }
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
