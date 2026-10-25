/**
 * GroupSpace — Account Settings (account.js)
 * Delete Account flow with double password confirmation.
 */

'use strict';

(function () {
  function $(id) { return document.getElementById(id); }

  function showError(msg) {
    const el = $('deleteAccountError');
    if (el) el.textContent = msg || '';
  }

  function openDeleteModal() {
    $('deleteAccountForm').reset();
    showError('');
    $('deleteAccountModal').classList.add('active');
    $('deletePassword').focus();
  }

  function closeDeleteModal() {
    $('deleteAccountModal').classList.remove('active');
    $('deleteAccountForm').reset();
    showError('');
  }

  async function submitDeleteAccount(event) {
    event.preventDefault();
    const password = $('deletePassword').value;
    const confirmPassword = $('deleteConfirmPassword').value;

    // Client-side validation — nothing is sent unless it passes
    if (!password || !confirmPassword) {
      showError('Please fill in both password fields.');
      return;
    }
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    showError('');

    const btn = $('deleteAccountSubmitBtn');
    btn.disabled = true;

    try {
      // Raw fetch: apiFetch would sign the user out on a 401 (wrong password).
      const token = localStorage.getItem('groupspace_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const base = typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : '';
      const res = await fetch(`${base}/api/user/account`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
        body: JSON.stringify({ password, confirmPassword })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showError(data.message || 'Could not delete account.');
        return;
      }

      localStorage.removeItem('groupspace_token');
      localStorage.removeItem('groupspace_user');
      localStorage.removeItem('groupspace_active_group_id');
      window.location.href = data.redirect || '/login.html';
    } catch (err) {
      showError('Cannot reach the server. Please try again.');
    } finally {
      btn.disabled = false;
    }
  }

  window.openDeleteAccountModal = openDeleteModal;
  window.closeDeleteAccountModal = closeDeleteModal;

  document.addEventListener('DOMContentLoaded', () => {
    const openBtn = $('deleteAccountBtn');
    if (openBtn && $('deleteAccountModal')) {
      openBtn.addEventListener('click', openDeleteModal);
    }

    document.addEventListener('click', (e) => {
      if (e.target && (e.target.id === 'settingsDeleteAccountBtn' || e.target.classList.contains('open-delete-account-modal'))) {
        e.preventDefault();
        openDeleteModal();
      }
    });

    if ($('deleteAccountCloseBtn')) $('deleteAccountCloseBtn').addEventListener('click', closeDeleteModal);
    if ($('deleteAccountCancelBtn')) $('deleteAccountCancelBtn').addEventListener('click', closeDeleteModal);
    if ($('deleteAccountForm')) $('deleteAccountForm').addEventListener('submit', submitDeleteAccount);
  });
})();
