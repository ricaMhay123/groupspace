require('dotenv').config();

// =========================================================
// EMAIL TRANSPORT PRIORITY:
//  1. Gmail SMTP  — sends FROM gmail.com via Google's servers = passes DMARC ✅
//  2. Brevo REST  — HTTPS, works on Vercel but DMARC fails for @gmail.com senders
//  3. Resend REST — HTTPS fallback
// =========================================================
const nodemailer = require('nodemailer');

// --- Gmail SMTP (uses Google's own servers — DMARC always passes for @gmail.com) ---
let _gmailTransporter = null;
function getGmailTransporter() {
  if (_gmailTransporter) return _gmailTransporter;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  const port   = parseInt(process.env.SMTP_PORT   || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  _gmailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port,
    secure,
    auth: { user: user.trim(), pass: pass.trim() },
    tls: { rejectUnauthorized: false }
  });
  return _gmailTransporter;
}

// --- Brevo REST API (HTTPS — not blocked by Vercel) ---
async function sendViaBrevo({ to, subject, html }) {
  const apiKey   = (process.env.BREVO_API_KEY || '').trim();
  const fromEmail = (process.env.BREVO_SMTP_USER || process.env.SMTP_USER || '').trim();
  if (!apiKey) throw new Error('BREVO_API_KEY not set');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': apiKey.trim(), 'content-type': 'application/json' },
    body: JSON.stringify({ sender: { name: 'GroupSpace', email: fromEmail }, to: [{ email: to }], subject, htmlContent: html })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${data.message || JSON.stringify(data)}`);
  return data;
}

// --- Resend REST API (HTTPS) ---
async function sendViaResend({ to, subject, html }) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) throw new Error('RESEND_API_KEY not set');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'GroupSpace <onboarding@resend.dev>', to: [to], subject, html })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data;
}

// =========================================================
// Core send — tries Resend → Gmail SMTP → Brevo
// =========================================================
// Core send — Brevo REST API (HTTPS) → Resend REST (HTTPS)
// =========================================================
// Core send — Gmail SMTP → Brevo REST → Resend REST
// Gmail first: sends FROM @gmail.com via Google's servers → DMARC passes → inbox ✅
// =========================================================
async function sendEmail({ to, subject, html }) {
  const fromUser = process.env.SMTP_USER;

  const errors = [];

  // 1. Gmail SMTP via Google's own servers (DMARC-compliant, delivers to inbox)
  const gmail = getGmailTransporter();
  if (gmail) {
    try {
      const info = await gmail.sendMail({
        from: `"GroupSpace" <${fromUser}>`,
        to, subject, html
      });
      console.log(`✅ [Gmail SMTP] Email sent to ${to}. MessageId: ${info.messageId}`);
      return { accepted: [to], provider: 'gmail' };
    } catch (err) {
      errors.push(`[Gmail SMTP Error] ${err.message}`);
      console.error(`⚠️ [Gmail SMTP Error] ${err.message} — trying Brevo...`);
    }
  } else {
    errors.push('[Email] Gmail SMTP not configured (SMTP_USER or SMTP_PASS missing)');
    console.warn('[Email] Gmail SMTP not configured (SMTP_USER or SMTP_PASS missing)');
  }

  // 2. Brevo REST API (HTTPS — but emails from @gmail.com may hit spam/be rejected)
  if (process.env.BREVO_API_KEY) {
    try {
      const data = await sendViaBrevo({ to, subject, html });
      console.log(`✅ [Brevo] Email queued to ${to}. MessageId: ${data.messageId}`);
      return { accepted: [to], provider: 'brevo', messageId: data.messageId };
    } catch (err) {
      errors.push(`[Brevo Error] ${err.message}`);
      console.error(`⚠️ [Brevo Error] ${err.message} — trying Resend...`);
    }
  } else {
    errors.push('[Email] BREVO_API_KEY not configured');
  }

  // 3. Resend REST API (HTTPS)
  if (process.env.RESEND_API_KEY) {
    try {
      const data = await sendViaResend({ to, subject, html });
      console.log(`✅ [Resend] Email sent to ${to}. ID: ${data.id}`);
      return { accepted: [to], provider: 'resend' };
    } catch (err) {
      errors.push(`[Resend Error] ${err.message}`);
      console.error(`⚠️ [Resend Error] ${err.message}`);
    }
  } else {
    errors.push('[Email] RESEND_API_KEY not configured');
  }

  const finalError = new Error('All email providers failed or none are configured.');
  finalError.trace = errors;
  throw finalError;
}


// =========================================================
// HTML Templates
// =========================================================
function buildOtpHtml({ subject, heading, description, otp }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:40px 16px;background:#f4f6f8;"><tr><td align="center">
<table width="520" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
<tr><td style="padding:28px 32px;border-bottom:1px solid #f1f5f9;"><div style="font-size:20px;font-weight:800;color:#141b2b;">&#128101; GroupSpace</div></td></tr>
<tr><td style="padding:32px;">
  <h2 style="margin:0 0 12px;font-size:22px;color:#0f172a;">${heading}</h2>
  <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${description}</p>
  <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
    <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Your 6-Digit Code</div>
    <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#141b2b;font-family:monospace;">${otp}</div>
  </div>
  <div style="background:#eff6ff;border-left:3px solid #3b82f6;border-radius:6px;padding:12px 16px;font-size:13px;color:#475569;">
    &#9200; Code expires in <strong>10 minutes</strong>. If you did not request this, ignore this email.
  </div>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #f1f5f9;text-align:center;">
  <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; 2026 GroupSpace &mdash; One Workspace. Better Teamwork.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function buildWelcomeHtml({ fullName, loginUrl }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Welcome to GroupSpace</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:40px 16px;background:#f4f6f8;"><tr><td align="center">
<table width="520" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
<tr><td style="padding:28px 32px;border-bottom:1px solid #f1f5f9;"><div style="font-size:20px;font-weight:800;color:#141b2b;">&#128101; GroupSpace</div></td></tr>
<tr><td style="padding:32px;">
  <h2 style="margin:0 0 12px;font-size:22px;color:#0f172a;">Welcome, ${fullName}! &#127881;</h2>
  <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">Your account is verified and ready. Create workspaces, collaborate on tasks, track expenses, and more.</p>
  <div style="text-align:center;margin:28px 0;"><a href="${loginUrl}" style="background:#141b2b;color:#fff;padding:14px 28px;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;display:inline-block;">Launch GroupSpace &rarr;</a></div>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #f1f5f9;text-align:center;">
  <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; 2026 GroupSpace &mdash; One Workspace. Better Teamwork.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// =========================================================
// Public API
// =========================================================
const sendOtpEmail = async (param1, param2) => {
  let toEmail, otp, type;
  if (typeof param1 === 'object' && param1 !== null) {
    toEmail = param1.to || param1.toEmail || param1.email;
    otp = param1.otpCode || param1.otp || param1.code;
    type = param1.type || 'SIGNUP';
  } else { toEmail = param1; otp = param2; type = 'SIGNUP'; }

  const isReset = type === 'RESET_PASSWORD';
  const subject = isReset ? 'Your GroupSpace Password Reset Code' : 'Your GroupSpace Verification Code';
  const heading = isReset ? 'Reset Your Password' : 'Verify Your Email';
  const description = isReset
    ? 'Use the 6-digit code below to reset your GroupSpace password.'
    : 'Use the 6-digit code below to complete your GroupSpace registration.';

  console.log(`🔑 [${isReset ? 'Reset OTP' : 'Signup OTP'} for ${toEmail}]: ${otp}`);
  return sendEmail({ to: toEmail, subject, html: buildOtpHtml({ subject, heading, description, otp }) });
};

const sendWelcomeEmail = async (param1, param2) => {
  let toEmail, fullName;
  if (typeof param1 === 'object' && param1 !== null) {
    toEmail = param1.to || param1.toEmail || param1.email;
    fullName = param1.fullName || param1.name || 'User';
  } else { toEmail = param1; fullName = param2 || 'User'; }

  const loginUrl = 'https://groupspace-w50r.onrender.com/login.html';
  return sendEmail({ to: toEmail, subject: `Welcome to GroupSpace, ${fullName}!`, html: buildWelcomeHtml({ fullName, loginUrl }) })
    .catch(err => { console.error(`⚠️ Welcome email error: ${err.message}`); return { accepted: [toEmail] }; });
};

module.exports = { sendOtpEmail, sendWelcomeEmail };
