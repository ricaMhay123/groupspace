/**
 * GroupSpace API Client & Shared Utilities
 */

function getApiBaseUrl() {
  const custom = localStorage.getItem('groupspace_api_url');
  if (custom !== null) return custom;
  if (window.location.protocol === 'file:') {
    return 'https://groupspace-w50r.onrender.com';
  }
  if (window.location.port === '5500') {
    return 'https://groupspace-w50r.onrender.com';
  }
  return '';
}

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('groupspace_token');
  const baseUrl = getApiBaseUrl();
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(fullUrl, {
      credentials: 'include',
      ...options,
      headers
    });
  } catch (netErr) {
    if (window.location.hostname.includes('render.com') || window.location.protocol === 'https:') {
      throw new Error('Cannot connect to GroupSpace server. If Render was asleep on the free tier, please wait ~30 seconds and refresh.');
    }
    if (window.location.protocol === 'file:') {
      throw new Error('Cannot connect to GroupSpace. Please open https://groupspace-w50r.onrender.com in your browser.');
    }
    throw new Error('Cannot connect to the GroupSpace server. Please ensure the server is running.');
  }

  if (response.status === 401) {
    localStorage.removeItem('groupspace_token');
    localStorage.removeItem('groupspace_user');
    if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('register.html') && !window.location.pathname.endsWith('index.html')) {
      window.location.href = 'login.html';
    }
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => ({ success: false, message: 'Server response error.' }));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

// Protocol warning banner check
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.protocol === 'file:') {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff4d4f;color:#fff;padding:12px 20px;text-align:center;font-weight:600;font-size:14px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    banner.innerHTML = '⚠️ You opened this page directly as a file. API requests will fail. Please run <code>npm start</code> in terminal and navigate to <a href="http://localhost:3001" style="color:#fff;text-decoration:underline;">http://localhost:3001</a>.';
    document.body.prepend(banner);
  }
});

async function checkAuth() {
  const token = localStorage.getItem('groupspace_token');
  if (!token) {
    if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('register.html') && !window.location.pathname.endsWith('index.html')) {
      window.location.href = 'login.html';
    }
    return null;
  }

  try {
    const res = await apiFetch('/api/auth/me');
    return res.data;
  } catch (err) {
    localStorage.removeItem('groupspace_token');
    localStorage.removeItem('groupspace_user');
    window.location.href = 'login.html';
    return null;
  }
}

async function logoutUser() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // Ignore network error on logout
  }
  localStorage.removeItem('groupspace_token');
  localStorage.removeItem('groupspace_user');
  localStorage.removeItem('groupspace_active_group_id');
  window.location.href = 'login.html';
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ================= MINIMAL CENTERED CONFIRM DIALOG (replaces native confirm()) ================= */
(function () {
  if (window.gsConfirm) return;

  function injectStyles() {
    if (document.getElementById('gs-confirm-styles')) return;
    const style = document.createElement('style');
    style.id = 'gs-confirm-styles';
    style.textContent = `
      .gs-confirm-overlay {
        position: fixed; inset: 0; z-index: 100000;
        display: flex; align-items: center; justify-content: center; padding: 16px;
        background: rgba(15, 23, 42, 0.38);
        backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
        opacity: 0; transition: opacity 0.16s ease;
      }
      .gs-confirm-overlay.open { opacity: 1; }
      .gs-confirm-card {
        width: 100%; max-width: 360px; box-sizing: border-box;
        background: var(--card, #ffffff); color: var(--text, #0f172a);
        border: 1px solid var(--border, #e2e8f0); border-radius: 16px;
        padding: 22px 22px 18px; text-align: center;
        box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.35);
        transform: translateY(6px) scale(0.97); transition: transform 0.16s ease;
      }
      .gs-confirm-overlay.open .gs-confirm-card { transform: none; }
      .gs-confirm-title { margin: 0 0 6px; font-size: 16px; font-weight: 700; line-height: 1.3; }
      .gs-confirm-message {
        margin: 0 0 18px; font-size: 13.5px; line-height: 1.5; white-space: pre-line;
        color: var(--gray, #64748b); word-break: break-word;
      }
      .gs-confirm-actions { display: flex; gap: 10px; }
      .gs-confirm-actions button {
        flex: 1; min-height: 42px; padding: 9px 14px; border-radius: 10px;
        font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit;
        border: 1px solid var(--border, #cbd5e1);
        background: var(--card, #ffffff); color: var(--text, #0f172a);
      }
      .gs-confirm-actions button:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
      .gs-confirm-actions .gs-confirm-ok { background: #2563eb; border-color: #2563eb; color: #ffffff; }
      .gs-confirm-actions .gs-confirm-ok.danger { background: #dc2626; border-color: #dc2626; }
      @media (prefers-reduced-motion: reduce) {
        .gs-confirm-overlay, .gs-confirm-card { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * gsConfirm(message, { title, confirmText, cancelText, danger }) -> Promise<boolean>
   * Small centered yes/no popup. Resolves true on confirm, false on cancel / Esc / backdrop click.
   */
  window.gsConfirm = function (message, opts) {
    opts = opts || {};
    injectStyles();
    return new Promise((resolve) => {
      const previouslyFocused = document.activeElement;
      const overlay = document.createElement('div');
      overlay.className = 'gs-confirm-overlay';

      const card = document.createElement('div');
      card.className = 'gs-confirm-card';
      card.setAttribute('role', 'alertdialog');
      card.setAttribute('aria-modal', 'true');

      const title = document.createElement('h3');
      title.className = 'gs-confirm-title';
      title.textContent = opts.title || (opts.danger ? 'Are you sure?' : 'Please confirm');
      title.id = 'gsConfirmTitle';
      const msg = document.createElement('p');
      msg.className = 'gs-confirm-message';
      msg.id = 'gsConfirmMessage';
      msg.textContent = String(message || '');
      card.setAttribute('aria-labelledby', 'gsConfirmTitle');
      card.setAttribute('aria-describedby', 'gsConfirmMessage');

      const actions = document.createElement('div');
      actions.className = 'gs-confirm-actions';
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'gs-confirm-cancel';
      cancelBtn.textContent = opts.cancelText || 'Cancel';
      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'gs-confirm-ok' + (opts.danger ? ' danger' : '');
      okBtn.textContent = opts.confirmText || (opts.danger ? 'Delete' : 'Yes');
      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);

      card.appendChild(title);
      card.appendChild(msg);
      card.appendChild(actions);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('open'));

      let done = false;
      function finish(result) {
        if (done) return;
        done = true;
        document.removeEventListener('keydown', onKey, true);
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 160);
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          try { previouslyFocused.focus(); } catch (e) {}
        }
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
        else if (e.key === 'Tab') {
          e.preventDefault();
          (document.activeElement === okBtn ? cancelBtn : okBtn).focus();
        }
      }
      document.addEventListener('keydown', onKey, true);
      cancelBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); finish(false); });
      okBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); finish(true); });
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) finish(false); });
      // Destructive prompts focus Cancel first so a stray Enter never deletes.
      (opts.danger ? cancelBtn : okBtn).focus();
    });
  };
})();
