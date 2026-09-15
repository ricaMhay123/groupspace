require('dotenv').config();

// =========================================================
// EMAIL TRANSPORT PRIORITY:
//  1. Brevo REST API  — HTTPS, free 300/day, ANY recipient, works on Render ✅
//  2. Resend API      — HTTPS fallback (only sends to owner email on free tier)
//  3. Gmail SMTP      — local development only (blocked on cloud servers)
// =========================================================
const nodemailer = require('nodemailer');

// --- Brevo REST API ---
async function sendViaBrevoApi({ to, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_SMTP_USER || process.env.SMTP_USER || 'ricamhaysaturinas2@gmail.com';
  if (!apiKey) return null;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'GroupSpace', email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data;
}

// --- Resend API ---
let _resendClient = null;
function getResendClient() {
  if (_resendClient) return _resendClient;
  const { Resend } = require('resend');
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resendClient = new Resend(key);
  return _resendClient;
}

// --- Gmail SMTP (local dev only) ---
let _gmailTransporter = null;
function getGmailTransporter() {
  if (_gmailTransporter) return _gmailTransporter;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  _gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
  return _gmailTransporter;
}

// =========================================================
// Core send — tries Brevo API → Gmail SMTP → Resend
// =========================================================
async function sendEmail({ to, subject, html }) {
  // 1. Brevo REST API (best for Render — HTTPS, any recipient)
  if (process.env.BREVO_API_KEY) {
    try {
      const result = await sendViaBrevoApi({ to, subject, html });
      console.log(`✅ [Brevo API] Email sent to ${to}. MessageId: ${result.messageId}`);
      return { accepted: [to], provider: 'brevo' };
    } catch (err) {
      console.error(`⚠️ [Brevo API Error] ${err.message} — trying Gmail...`);
    }
  }

  // 2. Gmail SMTP (works locally, blocked on Render)
  const gmail = getGmailTransporter();
  if (gmail) {
    try {
      const info = await gmail.sendMail({
        from: process.env.EMAIL_FROM || `GroupSpace <${process.env.SMTP_USER}>`,
        to, subject, html
      });
      console.log(`✅ [Gmail SMTP] Email sent to ${to}. MessageId: ${info.messageId}`);
      return { accepted: [to], provider: 'gmail' };
    } catch (err) {
      console.error(`⚠️ [Gmail Error] ${err.message} — trying Resend...`);
    }
  }

  // 3. Resend (HTTPS, but free tier only sends to owner email)
  const resend = getResendClient();
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: 'GroupSpace <onboarding@resend.dev>',
        to: [to], subject, html
      });
      if (result.error) throw new Error(result.error.message);
      console.log(`✅ [Resend] Email sent to ${to}. ID: ${result.data?.id}`);
      return { accepted: [to], provider: 'resend' };
    } catch (err) {
      console.error(`⚠️ [Resend Error] ${err.message}`);
      throw new Error(`All email providers failed: ${err.message}`);
    }
  }

  console.warn(`⚠️ No email provider configured. OTP is in server logs above.`);
  return { accepted: [to], skipped: true };
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
