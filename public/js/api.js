/**
 * GroupSpace API Client & Shared Utilities
 */

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('groupspace_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers
    });
  } catch (netErr) {
    if (window.location.protocol === 'file:') {
      throw new Error('You are opening the HTML file directly (file://). Please start the Node.js server with "npm start" and visit http://localhost:3001');
    }
    throw new Error('Cannot connect to the GroupSpace server. Please ensure the backend server is running with "npm start" at http://localhost:3001');
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
