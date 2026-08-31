/**
 * GroupSpace Client Authentication & Email Verification Handler
 */

let pendingRegistrationData = null;
let resendTimerInterval = null;
let forgotResendTimerInterval = null;
let lockoutTimerInterval = null;

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
  target.textContent = message;

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
  if (window.location.protocol === 'file:') {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ba1a1a;color:#fff;padding:12px 20px;text-align:center;font-weight:600;font-size:14px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    banner.innerHTML = '⚠️ You opened this page directly as a local file (file://). API requests will fail. Please run <code>npm start</code> in terminal and visit <a href="http://localhost:3001" style="color:#fff;text-decoration:underline;">http://localhost:3001</a>.';
    document.body.prepend(banner);
  }

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
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailEl = document.getElementById('email') || document.getElementById('loginEmail');
      const email = emailEl ? emailEl.value.trim() : '';
      const passEl = document.getElementById('password') || document.getElementById('loginPassword');
      const password = passEl ? passEl.value : '';
      const alertBox = document.getElementById('loginAlert');
      const submitBtn = document.getElementById('loginBtn') || loginForm.querySelector('button[type="submit"]');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
      }
      hideAlert(alertBox);

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
          const err = new Error(data.message || 'Login failed.');
          err.attemptsLeft = data.attemptsLeft;
          throw err;
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
  if (registerForm) {
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

      if (password !== confirmPassword) {
        showAlert(alertBox, 'Passwords do not match. Please re-enter.', 'error');
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
        if (!res.ok) throw new Error(data.message || 'Could not send verification code.');

        // Save pending registration payload in memory
        pendingRegistrationData = { fullName, email, password };

        // Open verification modal
        const verifyModal = document.getElementById('emailVerifyModal');
        const targetEmailEl = document.getElementById('verifyTargetEmail');
        const verifyAlert = document.getElementById('verifyAlert');
        const inputCode = document.getElementById('inputVerifyCode');

        if (targetEmailEl) targetEmailEl.textContent = email;
        const codeHint = data.code || data.devCode;
        if (inputCode) inputCode.value = codeHint || '';
        if (codeHint) {
          showAlert(verifyAlert, `✉️ Verification code: <strong>${codeHint}</strong><br><small class="text-muted">Also sent to your email (check Spam folder if needed).</small>`, 'success');
        } else {
          showAlert(verifyAlert, '✉️ Verification code sent! Please check your Inbox and Spam/Junk folder.', 'success');
        }

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

        const codeHint = data.code || data.devCode;
        const inputCode = document.getElementById('inputVerifyCode');
        if (inputCode && codeHint) inputCode.value = codeHint;
        if (verifyAlert) {
          if (codeHint) {
            showAlert(verifyAlert, `✅ New code: <strong>${codeHint}</strong><br><small class="text-muted">Also sent to your email (check Spam folder if needed).</small>`, 'success');
          } else {
            showAlert(verifyAlert, '✅ New code sent! Please check your Inbox and Spam/Junk folder.', 'success');
          }
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

        const codeHint = data.code || data.devCode;
        if (otpInput && codeHint) otpInput.value = codeHint;
        if (codeHint) {
          showAlert(alertBox, `✉️ Reset code: <strong>${codeHint}</strong><br><small class="text-muted">Also sent to ${email} (check Spam folder if needed).</small>`, 'success');
        } else {
          showAlert(alertBox, `✉️ Code sent to ${email}! Please check your Inbox & Spam folder.`, 'success');
        }
        startForgotResendTimer();
      } catch (err) {
        showAlert(alertBox, formatAuthError(err), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Reset Code';
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

        const codeHint = data.code || data.devCode;
        const otpInput = document.getElementById('forgotOtpCode');
        if (otpInput && codeHint) otpInput.value = codeHint;
        if (codeHint) {
          showAlert(alertBox, `✅ New reset code: <strong>${codeHint}</strong><br><small class="text-muted">Also sent to ${email}.</small>`, 'success');
        } else {
          showAlert(alertBox, `✅ New code sent to ${email}! Check your Inbox & Spam folder.`, 'success');
        }
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
