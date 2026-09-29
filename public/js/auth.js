/**
 * GroupSpace Client Authentication & Email Verification Handler
 */

// ── Password visibility toggle (used by every password field on the site) ──
const _EYE_OPEN  = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>`;
const _EYE_SLASH = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829"/><path d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12-1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z"/></svg>`;

window.togglePwd = function (inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.innerHTML = showing ? _EYE_OPEN : _EYE_SLASH;
  btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  btn.setAttribute('title',      showing ? 'Show password' : 'Hide password');
};
// ────────────────────────────────────────────────────────────────────────────

let pendingRegistrationData = null;
let resendTimerInterval = null;
let forgotResendTimerInterval = null;
let lockoutTimerInterval = null;

// ── Back-to-form from OTP modal — closes modal, restores typed credentials ──
window.backToRegForm = function () {
  // Close the Bootstrap modal
  const modalEl = document.getElementById('emailVerifyModal');
  if (modalEl && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    const bsModal = bootstrap.Modal.getInstance(modalEl);
    if (bsModal) bsModal.hide();
  }

  // Re-fill the registration form with the saved credentials
  if (pendingRegistrationData) {
    const fullNameEl = document.getElementById('fullName') || document.getElementById('regFullName');
    const emailEl    = document.getElementById('regEmail') || document.getElementById('email');
    const passEl     = document.getElementById('regPassword') || document.getElementById('password');
    const confEl     = document.getElementById('regConfirmPassword') || document.getElementById('confirmPassword');

    if (fullNameEl) fullNameEl.value = pendingRegistrationData.fullName || '';
    if (emailEl)    emailEl.value    = pendingRegistrationData.email    || '';
    if (passEl)     passEl.value     = pendingRegistrationData.password || '';
    if (confEl)     confEl.value     = pendingRegistrationData.password || '';
  }

  // Clear the OTP input so it's fresh if they re-submit
  const otpEl = document.getElementById('inputVerifyCode');
  if (otpEl) otpEl.value = '';
};
// ────────────────────────────────────────────────────────────────────────────

function getApiBaseUrl() {
  if (window.location.protocol === 'file:') {
    return 'https://groupspace-w50r.onrender.com';
  }
  return '';
}

function showAlert(el, message, type = 'error') {
  let target = el;
  if (!target) {
    target = document.getElementById('loginAlert') || document.getElementById('registerAlert');
  }
  if (!target) return;

  target.style.display = 'block';
  target.innerHTML = message;

  if (type === 'success') {
    target.style.background = '#dcfce7';
    target.style.color = '#15803d';
    target.style.border = '1px solid #bbf7d0';
  } else if (type === 'warning') {
    target.style.background = '#fef3c7';
    target.style.color = '#b45309';
    target.style.border = '1px solid #fde68a';
  } else {
    // error
    target.style.background = '#fee2e2';
    target.style.color = '#ba1a1a';
    target.style.border = '1px solid #fecaca';
  }
}

function hideAlert(el) {
  let target = el || document.getElementById('loginAlert') || document.getElementById('registerAlert');
  if (target) target.style.display = 'none';
}

function formatAuthError(err) {
  if (!err) return 'An unexpected error occurred.';
  const msg = err.message || String(err);
  if (msg === 'Failed to fetch' || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    if (window.location.hostname.includes('render.com') || window.location.protocol === 'https:') {
      return '⚠️ Cannot connect to server. If Render was asleep (free tier), please wait ~30 seconds and try again.';
    }
    if (window.location.protocol === 'file:') {
      return '⚠️ You opened this file directly. Please visit https://groupspace-w50r.onrender.com';
    }
    return '⚠️ Cannot connect to GroupSpace server. Please check your network connection.';
  }
  return msg;
}

function startLockoutCountdown(alertBox, submitBtn, totalSeconds) {
  if (lockoutTimerInterval) clearInterval(lockoutTimerInterval);
  let remaining = Math.max(1, totalSeconds || 600);

  function updateDisplay() {
    if (remaining <= 0) {
      clearInterval(lockoutTimerInterval);
      lockoutTimerInterval = null;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
      }
      showAlert(alertBox, 'Lockout period has ended. You may now attempt to log in.', 'warning');
      return;
    }

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = `Locked (${formatted})`;
    }
    showAlert(alertBox, `⛔ Incorrect password. You have reached 3 failed attempts. Your account is locked for 10 minutes. Please wait ${formatted} before trying again.`, 'error');
    remaining--;
  }

  updateDisplay();
  lockoutTimerInterval = setInterval(updateDisplay, 1000);
}

function openForgotPasswordModal() {
  const modalEl = document.getElementById('resetPasswordModal') || document.getElementById('forgotModal');
  if (modalEl) {
    const step1 = document.getElementById('forgotStep1Form');
    const step2 = document.getElementById('forgotStep2Form');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    const alertBox = document.getElementById('forgotAlert');
    hideAlert(alertBox);
    const emailInput = document.getElementById('forgotEmail');
    const loginEmail = document.getElementById('email');
    if (emailInput && loginEmail && loginEmail.value) {
      emailInput.value = loginEmail.value.trim();
    }
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
      bsModal.show();
    } else {
      modalEl.classList.add('active');
    }
    if (emailInput) setTimeout(() => emailInput.focus(), 150);
  }
}

function closeForgotPasswordModal() {
  const modalEl = document.getElementById('resetPasswordModal') || document.getElementById('forgotModal');
  if (modalEl) {
    modalEl.classList.remove('active');
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
    }
  }
  if (forgotResendTimerInterval) clearInterval(forgotResendTimerInterval);
}

function backToForgotStep1() {
  const step1 = document.getElementById('forgotStep1Form');
  const step2 = document.getElementById('forgotStep2Form');
  const alertBox = document.getElementById('forgotAlert');
  if (step1) step1.style.display = 'block';
  if (step2) step2.style.display = 'none';
  if (alertBox) hideAlert(alertBox);
  if (forgotResendTimerInterval) clearInterval(forgotResendTimerInterval);
}

window.openForgotPasswordModal = openForgotPasswordModal;
window.closeForgotPasswordModal = closeForgotPasswordModal;
window.backToForgotStep1 = backToForgotStep1;

document.addEventListener('DOMContentLoaded', () => {
  // NOTE: The file:// protocol banner is already added by api.js — no duplicate needed here.

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const verifyCodeForm = document.getElementById('verifyCodeForm');
  const resendBtn = document.getElementById('resendCodeBtn');
  const forgotStep1Form = document.getElementById('forgotStep1Form') || document.getElementById('resetPasswordForm');
  const forgotStep2Form = document.getElementById('forgotStep2Form');
  const forgotResendBtn = document.getElementById('forgotResendBtn');

  // ==========================================
  // 1. LOGIN HANDLER
  // ==========================================
  const GMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i;

  // Show an error for a specific field
  // fields: 'email'    → #emailError above email input,   email is-invalid only
  //         'password' → #passwordError below password,  password is-invalid only
  function showLoginError(message, fields) {
    const emailErr = document.getElementById('emailError');
    const passErr  = document.getElementById('passwordError');
    const emailEl  = document.getElementById('email');
    const passEl   = document.getElementById('password');

    if (fields === 'email') {
      if (emailErr) { emailErr.textContent = message; emailErr.classList.remove('d-none'); }
      if (passErr)  { passErr.textContent  = '';      passErr.classList.add('d-none');     }
      if (emailEl)  emailEl.classList.add('is-invalid');
      if (passEl)   passEl.classList.remove('is-invalid');
    } else {
      // 'password'
      if (emailErr) { emailErr.textContent = ''; emailErr.classList.add('d-none'); }
      if (passErr)  { passErr.textContent  = message; passErr.classList.remove('d-none'); }
      if (emailEl)  emailEl.classList.remove('is-invalid');
      if (passEl)   passEl.classList.add('is-invalid');
    }
  }

  function clearAllLoginErrors() {
    const emailErr = document.getElementById('emailError');
    const passErr  = document.getElementById('passwordError');
    const emailEl  = document.getElementById('email');
    const passEl   = document.getElementById('password');
    if (emailErr) { emailErr.textContent = ''; emailErr.classList.add('d-none'); }
    if (passErr)  { passErr.textContent  = ''; passErr.classList.add('d-none');  }
    if (emailEl)  emailEl.classList.remove('is-invalid');
    if (passEl)   passEl.classList.remove('is-invalid');
  }

  if (loginForm) {
    const emailEl = document.getElementById('email');
    const passEl  = document.getElementById('password');

    // Typing in EITHER field clears ALL errors and is-invalid from BOTH fields
    if (emailEl) emailEl.addEventListener('input', clearAllLoginErrors);
    if (passEl)  passEl.addEventListener('input',  clearAllLoginErrors);

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = emailEl ? emailEl.value.trim() : '';
      const password = passEl  ? passEl.value : '';
      const alertBox = document.getElementById('loginAlert');
      const submitBtn = document.getElementById('loginBtn') || loginForm.querySelector('button[type="submit"]');

      // Clear all previous errors
      clearAllLoginErrors();
      hideAlert(alertBox);

      // Frontend Gmail validation
      if (!GMAIL_REGEX.test(email)) {
        showLoginError('Only @gmail.com email addresses are accepted.', 'email');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
      }

      try {
        const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.isLocked || res.status === 429) {
            const seconds = data.remainingSeconds || 600;
            startLockoutCountdown(alertBox, submitBtn, seconds);
            return;
          }
          // Route to the correct field
          if (data.field === 'email') {
            showLoginError(data.message || 'No account found with this Gmail address.', 'email');
          } else if (data.field === 'password') {
            showLoginError(data.message || 'Incorrect password. Please try again.', 'password');
          } else {
            // Generic failure — show in the general alert box
            showAlert(alertBox, data.message || 'Login failed. Please try again.', 'error');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
          }
          return;
        }

        if (lockoutTimerInterval) {
          clearInterval(lockoutTimerInterval);
          lockoutTimerInterval = null;
        }

        localStorage.setItem('groupspace_token', data.data.token);
        localStorage.setItem('groupspace_user', JSON.stringify(data.data.user));

        showAlert(alertBox, 'Login successful! Redirecting...', 'success');

        setTimeout(() => {
          window.location.href = 'workspaces.html';
        }, 500);
      } catch (err) {
        const alertType = (typeof err.attemptsLeft === 'number') ? 'warning' : 'error';
        showAlert(alertBox, formatAuthError(err), alertType);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Login';
        }
      }
    });
  }

  // ==========================================
  // 2. REGISTRATION STEP 1: SEND VERIFICATION CODE
  // ==========================================
  const REG_GMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i;

  // Registration field-error helpers
  function showRegFieldError(fieldId, message) {
    const errEl = document.getElementById(fieldId + 'Error');
    const inputEl = document.getElementById(fieldId);
    if (errEl) {
      errEl.textContent = message;
      errEl.classList.remove('d-none');
    }
    if (inputEl) inputEl.classList.add('is-invalid');
  }

  function clearRegFieldError(fieldId) {
    const errEl = document.getElementById(fieldId + 'Error');
    const inputEl = document.getElementById(fieldId);
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.add('d-none');
    }
    if (inputEl) inputEl.classList.remove('is-invalid');
  }

  if (registerForm) {
    const regEmailEl    = document.getElementById('email');
    const regPassEl     = document.getElementById('password');
    const regConfirmEl  = document.getElementById('confirmPassword');
    const emailStatusEl = document.getElementById('emailStatus');

    // ── Live email checker ─────────────────────────────────────────────────
    let _emailDebounce = null;

    function setEmailStatus(type, msg) {
      if (!emailStatusEl) return;
      emailStatusEl.className = 'fs-7 mt-1';
      if (type === 'hidden') { emailStatusEl.classList.add('d-none'); emailStatusEl.innerHTML = ''; return; }
      if (type === 'checking') { emailStatusEl.innerHTML = '<span class="text-muted">⏳ Checking availability...</span>'; }
      if (type === 'available') { emailStatusEl.innerHTML = '<span class="text-success fw-semibold">✓ Email is available</span>'; }
      if (type === 'taken')    { emailStatusEl.innerHTML = '<span class="text-danger fw-semibold">✕ This Gmail is already registered — <a href="/login.html" class="text-primary fw-semibold">Login instead</a></span>'; }
      if (type === 'invalid')  { emailStatusEl.innerHTML = `<span class="text-danger fw-semibold">✕ ${msg || 'Only @gmail.com addresses are accepted.'}</span>`; }
      if (type === 'error')    { emailStatusEl.innerHTML = '<span class="text-muted">Could not check — will verify on submit.</span>'; }
    }

    if (regEmailEl) {
      regEmailEl.addEventListener('input', () => {
        clearRegFieldError('email');
        const val = regEmailEl.value.trim();

        // Clear debounce
        clearTimeout(_emailDebounce);

        if (!val) { setEmailStatus('hidden'); regEmailEl.classList.remove('is-valid'); return; }

        // Instant format check
        if (!REG_GMAIL_REGEX.test(val)) {
          setEmailStatus('invalid');
          regEmailEl.classList.remove('is-valid');
          regEmailEl.classList.add('is-invalid');
          return;
        }

        // Format OK — remove invalid class, show checking after short pause
        regEmailEl.classList.remove('is-invalid', 'is-valid');
        setEmailStatus('checking');

        _emailDebounce = setTimeout(async () => {
          try {
            const res = await fetch(`${getApiBaseUrl()}/api/auth/check-email?email=${encodeURIComponent(val)}`);
            const data = await res.json();
            if (data.status === 'available') {
              regEmailEl.classList.add('is-valid');
              regEmailEl.classList.remove('is-invalid');
              setEmailStatus('available');
            } else if (data.status === 'taken') {
              regEmailEl.classList.add('is-invalid');
              regEmailEl.classList.remove('is-valid');
              setEmailStatus('taken');
            } else {
              setEmailStatus('error');
            }
          } catch (_) { setEmailStatus('error'); }
        }, 700);
      });

      // Also clear on focus-out if field is cleared
      regEmailEl.addEventListener('blur', () => {
        if (!regEmailEl.value.trim()) {
          setEmailStatus('hidden');
          regEmailEl.classList.remove('is-valid', 'is-invalid');
        }
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    // Clear-on-type listeners for other fields
    if (regPassEl)    regPassEl.addEventListener('input',    () => clearRegFieldError('password'));
    if (regConfirmEl) regConfirmEl.addEventListener('input', () => clearRegFieldError('confirmPassword'));

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullNameEl = document.getElementById('fullName') || document.getElementById('regFullName');
      const fullName = fullNameEl ? fullNameEl.value.trim() : '';
      const emailEl = document.getElementById('regEmail') || document.getElementById('email');
      const email = emailEl ? emailEl.value.trim() : '';
      const passEl = document.getElementById('regPassword') || document.getElementById('password');
      const password = passEl ? passEl.value : '';
      const confirmPasswordEl = document.getElementById('regConfirmPassword') || document.getElementById('confirmPassword');
      const confirmPassword = confirmPasswordEl ? confirmPasswordEl.value : password;
      const alertBox = document.getElementById('registerAlert');
      const submitBtn = document.getElementById('regBtn') || registerForm.querySelector('button[type="submit"]');

      hideAlert(alertBox);
      clearRegFieldError('email');
      clearRegFieldError('password');
      clearRegFieldError('confirmPassword');

      if (!fullName || fullName.length < 2) {
        showAlert(alertBox, 'Full name must be at least 2 characters.', 'error');
        return;
      }

      // Frontend Gmail validation
      if (!REG_GMAIL_REGEX.test(email)) {
        showRegFieldError('email', 'Only @gmail.com email addresses are accepted.');
        return;
      }

      if (password.length < 6) {
        showAlert(alertBox, 'Password must be at least 6 characters.', 'error');
        return;
      }

      if (password !== confirmPassword) {
        showRegFieldError('confirmPassword', 'Passwords do not match.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending Verification Code...';
      }

      try {
        // Request 6-digit OTP code to the email address
        const res = await fetch(`${getApiBaseUrl()}/api/auth/send-verification-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, type: 'SIGNUP' })
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.field === 'email') {
            showRegFieldError('email', data.message || 'This Gmail is already registered. Please login instead.');
          } else {
            showAlert(alertBox, data.message || 'Could not send verification code.', 'error');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
          }
          return;
        }

        // Save pending registration payload in memory
        pendingRegistrationData = { fullName, email, password };

        // Open verification modal
        const verifyModal = document.getElementById('emailVerifyModal');
        const targetEmailEl = document.getElementById('verifyTargetEmail');
        const verifyAlert = document.getElementById('verifyAlert');
        const inputCode = document.getElementById('inputVerifyCode');

        if (targetEmailEl) targetEmailEl.textContent = email;
        showAlert(verifyAlert, '✉️ Verification code sent! Please check your inbox.', 'success');

        if (verifyModal) {
          verifyModal.classList.add('active');
          // If Bootstrap modal exists
          if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const bsModal = bootstrap.Modal.getOrCreateInstance(verifyModal);
            bsModal.show();
          }
        }
        if (inputCode) setTimeout(() => inputCode.focus(), 150);

        startResendTimer();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
      } catch (err) {
        showAlert(alertBox, formatAuthError(err), 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
      }
    });
  }

  // ==========================================
  // 3. REGISTRATION STEP 2: VERIFY CODE & CREATE ACCOUNT
  // ==========================================
  if (verifyCodeForm) {
    verifyCodeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!pendingRegistrationData) {
        alert('Please complete the registration form first.');
        return;
      }

      const inputCode = document.getElementById('inputVerifyCode');
      const verifyAlert = document.getElementById('verifyAlert');
      const confirmBtn = document.getElementById('confirmVerifyBtn') || verifyCodeForm.querySelector('button[type="submit"]');
      const otpCode = (inputCode ? inputCode.value : '').replace(/\s+/g, '').trim();

      hideAlert(verifyAlert);
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Verifying & Creating Account...';
      }

      try {
        const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: pendingRegistrationData.fullName,
            email: pendingRegistrationData.email,
            password: pendingRegistrationData.password,
            otpCode
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Verification failed.');

        localStorage.setItem('groupspace_token', data.data.token);
        localStorage.setItem('groupspace_user', JSON.stringify(data.data.user));

        if (verifyAlert) {
          showAlert(verifyAlert, '🎉 Account verified! Welcome email sent. Redirecting...', 'success');
        }

        setTimeout(() => {
          window.location.href = 'workspaces.html';
        }, 700);
      } catch (err) {
        if (verifyAlert) {
          showAlert(verifyAlert, formatAuthError(err), 'error');
        }
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Verify & Finish Sign Up';
        }
      }
    });
  }

  // Resend Verification Code for Signup
  if (resendBtn) {
    resendBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const targetEmailEl = document.getElementById('verifyTargetEmail');
      const email = (pendingRegistrationData && pendingRegistrationData.email) || (targetEmailEl ? targetEmailEl.textContent.trim() : '');
      if (!email) {
        alert('Please enter your email and try registering again.');
        return;
      }

      const verifyAlert = document.getElementById('verifyAlert');
      resendBtn.style.pointerEvents = 'none';
      resendBtn.textContent = 'Sending...';

      try {
        const res = await fetch(`${getApiBaseUrl()}/api/auth/send-verification-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, type: 'SIGNUP' })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to resend.');

        if (verifyAlert) {
          showAlert(verifyAlert, '✅ New code sent! Please check your inbox.', 'success');
        }
        startResendTimer();
      } catch (err) {
        if (verifyAlert) {
          showAlert(verifyAlert, formatAuthError(err), 'error');
        }
        resendBtn.style.pointerEvents = 'auto';
        resendBtn.textContent = 'Resend Code';
      }
    });
  }

  function startResendTimer() {
    if (!resendBtn) return;
    clearInterval(resendTimerInterval);
    let secondsLeft = 30;
    resendBtn.style.pointerEvents = 'none';
    resendBtn.textContent = `Resend in ${secondsLeft}s`;

    resendTimerInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(resendTimerInterval);
        resendBtn.style.pointerEvents = 'auto';
        resendBtn.textContent = 'Resend Code';
      } else {
        resendBtn.textContent = `Resend in ${secondsLeft}s`;
      }
    }, 1000);
  }

  function startForgotResendTimer() {
    if (!forgotResendBtn) return;
    clearInterval(forgotResendTimerInterval);
    let secondsLeft = 30;
    forgotResendBtn.style.pointerEvents = 'none';
    forgotResendBtn.textContent = `Resend in ${secondsLeft}s`;

    forgotResendTimerInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(forgotResendTimerInterval);
        forgotResendBtn.style.pointerEvents = 'auto';
        forgotResendBtn.textContent = 'Resend Code';
      } else {
        forgotResendBtn.textContent = `Resend in ${secondsLeft}s`;
      }
    }, 1000);
  }

  // ==========================================
  // 4. FORGOT PASSWORD STEP 1: REQUEST RESET CODE
  // ==========================================
  if (forgotStep1Form) {
    forgotStep1Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgotEmail').value.trim();
      const alertBox = document.getElementById('forgotAlert');
      const submitBtn = document.getElementById('sendForgotBtn') || forgotStep1Form.querySelector('button[type="submit"]');

      hideAlert(alertBox);
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending Code...';
      }

      try {
        const res = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Could not send reset code.');

        // Transition to Step 2 if step2 exists
        const step2 = document.getElementById('forgotStep2Form');
        const targetEmail = document.getElementById('forgotTargetEmail');
        if (targetEmail) targetEmail.textContent = email;
        if (step2) {
          forgotStep1Form.style.display = 'none';
          step2.style.display = 'block';
        }

        const otpInput = document.getElementById('forgotOtpCode');
        if (otpInput) {
          otpInput.value = '';
          setTimeout(() => otpInput.focus(), 150);
        }
        const newPassEl = document.getElementById('forgotNewPass');
        if (newPassEl) newPassEl.value = '';
        const confirmPassEl = document.getElementById('forgotConfirmPass');
        if (confirmPassEl) confirmPassEl.value = '';

        showAlert(alertBox, `✉️ Reset code sent to ${email}! Please check your inbox.`, 'success');
        startForgotResendTimer();
      } catch (err) {
        showAlert(alertBox, formatAuthError(err), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Verification Code';
        }
      }
    });
  }

  // Resend code in Forgot Password Step 2
  if (forgotResendBtn) {
    forgotResendBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const targetEmailEl = document.getElementById('forgotTargetEmail');
      const email = targetEmailEl ? targetEmailEl.textContent.trim() : (document.getElementById('forgotEmail') || {}).value?.trim();
      const alertBox = document.getElementById('forgotAlert');
      if (!email) return;

      forgotResendBtn.style.pointerEvents = 'none';
      forgotResendBtn.textContent = 'Sending...';

      try {
        const res = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to resend reset code.');

        showAlert(alertBox, `✅ New reset code sent to ${email}! Please check your inbox.`, 'success');
        startForgotResendTimer();
      } catch (err) {
        showAlert(alertBox, formatAuthError(err), 'error');
        forgotResendBtn.style.pointerEvents = 'auto';
        forgotResendBtn.textContent = 'Resend Code';
      }
    });
  }

  // ==========================================
  // 5. FORGOT PASSWORD STEP 2: SUBMIT NEW PASSWORD
  // ==========================================
  if (forgotStep2Form) {
    forgotStep2Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetEmailEl = document.getElementById('forgotTargetEmail');
      const email = (targetEmailEl ? targetEmailEl.textContent.trim() : '') || (document.getElementById('forgotEmail') || {}).value?.trim();
      const otpCode = ((document.getElementById('forgotOtpCode') || {}).value || '').replace(/\s+/g, '').trim();
      const newPassword = (document.getElementById('forgotNewPass') || {}).value || '';
      const confirmPass = (document.getElementById('forgotConfirmPass') || {}).value || '';
      const alertBox = document.getElementById('forgotAlert');
      const submitBtn = document.getElementById('resetPassBtn') || forgotStep2Form.querySelector('button[type="submit"]');

      hideAlert(alertBox);

      if (newPassword !== confirmPass) {
        showAlert(alertBox, 'New passwords do not match. Please re-enter.', 'error');
        return;
      }

      if (newPassword.length < 6) {
        showAlert(alertBox, 'Password must be at least 6 characters.', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating Password...';
      }

      try {
        const res = await fetch(`${getApiBaseUrl()}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otpCode, newPassword })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Password reset failed.');

        showAlert(alertBox, '✅ Password reset successfully! You can now log in.', 'success');

        setTimeout(() => {
          closeForgotPasswordModal();
          const emailInput = document.getElementById('email');
          if (emailInput) emailInput.value = email;
          const passInput = document.getElementById('password');
          if (passInput) {
            passInput.value = '';
            passInput.focus();
          }
        }, 1500);
      } catch (err) {
        showAlert(alertBox, formatAuthError(err), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update Password';
        }
      }
    });
  }
});
