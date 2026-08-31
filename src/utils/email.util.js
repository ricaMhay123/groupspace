const { Resend } = require('resend');
require('dotenv').config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Resend free tier: must send FROM onboarding@resend.dev without a verified domain
const FROM_EMAIL = 'GroupSpace <onboarding@resend.dev>';

/**
 * 1. Send OTP / Verification Email via Resend HTTPS API
 */
const sendOtpEmail = async (param1, param2) => {
  let toEmail, otp, type;
  if (typeof param1 === 'object' && param1 !== null) {
    toEmail = param1.to || param1.toEmail || param1.email;
    otp = param1.otpCode || param1.otp || param1.code;
    type = param1.type || 'SIGNUP';
  } else {
    toEmail = param1;
    otp = param2;
    type = 'SIGNUP';
  }

  const isReset = type === 'RESET_PASSWORD';
  const subject = isReset ? 'Your GroupSpace Password Reset Code' : 'Your GroupSpace Verification Code';
  const heading = isReset ? 'Reset Your Password' : 'Verify Your Email Address';
  const description = isReset
    ? 'Use the 6-digit verification code below to securely reset your GroupSpace account password.'
    : 'Use the 6-digit verification code below to complete your registration and activate your workspace account.';

  console.log(`🔑 [${isReset ? 'Password Reset Code' : 'Verification Code'} for ${toEmail}]: ${otp}`);

  if (!resend) {
    console.warn('⚠️ RESEND_API_KEY not set. Email not sent. Set it in Render environment variables.');
    return { accepted: [toEmail], skipped: true };
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f6f8; width: 100%; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 16px rgba(20, 27, 43, 0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
              <div style="font-size: 22px; font-weight: 800; color: #141b2b; letter-spacing: -0.5px;">
                👥 GroupSpace
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                ${heading}
              </h2>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                ${description}
              </p>

              <!-- OTP Code Box -->
              <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px 16px; text-align: center; margin: 0 0 28px 0;">
                <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                  Your 6-Digit Verification Code
                </div>
                <div style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #141b2b; font-family: 'Courier New', Courier, monospace; line-height: 1;">
                  ${otp}
                </div>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #f8fafc; border-left: 3px solid #3b82f6; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #475569; line-height: 1.5;">
                ⏱️ <strong>Note:</strong> This code expires in <strong>10 minutes</strong>. If you didn't request this, you can safely ignore it.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                © 2026 GroupSpace. One Workspace. Better Teamwork.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: subject,
      html: html,
    });
    console.log(`✅ [Resend] Email sent to ${toEmail}. ID: ${result.data?.id}`);
    return { accepted: [toEmail], id: result.data?.id };
  } catch (err) {
    console.error(`⚠️ [Resend Error] Could not send to ${toEmail}: ${err.message}`);
    return { accepted: [toEmail], error: err.message };
  }
};

/**
 * 2. Send Welcome Email via Resend HTTPS API
 */
const sendWelcomeEmail = async (param1, param2) => {
  let toEmail, fullName;
  if (typeof param1 === 'object' && param1 !== null) {
    toEmail = param1.to || param1.toEmail || param1.email;
    fullName = param1.fullName || param1.name || 'User';
  } else {
    toEmail = param1;
    fullName = param2 || 'User';
  }

  const loginUrl = 'https://groupspace-w50r.onrender.com/login.html';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to GroupSpace</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f6f8; width: 100%; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 16px rgba(20, 27, 43, 0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
              <div style="font-size: 22px; font-weight: 800; color: #141b2b; letter-spacing: -0.5px;">
                👥 GroupSpace
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                Welcome to GroupSpace, ${fullName}! 🎉
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                Your account is officially verified and ready. You now have full access to create workspaces, collaborate on Kanban tasks, track team expenses, take collaborative notes, and keep discussions organized in one place.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${loginUrl}" style="background-color: #141b2b; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
                  Launch GroupSpace &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                © 2026 GroupSpace. One Workspace. Better Teamwork.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: `Welcome to GroupSpace, ${fullName}!`,
      html: html,
    });
    console.log(`✅ [Resend] Welcome email sent to ${toEmail}. ID: ${result.data?.id}`);
    return { accepted: [toEmail], id: result.data?.id };
  } catch (err) {
    console.error(`⚠️ [Resend Error] Welcome email failed: ${err.message}`);
    return { accepted: [toEmail] };
  }
};

module.exports = {
  sendOtpEmail,
  sendWelcomeEmail,
};