import nodemailer from 'nodemailer';
import { Notification } from '../models/Notification.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * Creates Nodemailer transporter as backup if SMTP is configured
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  if (user && pass && !pass.includes('<') && !pass.includes('paste your')) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: {
        user,
        pass: pass.replace(/\s+/g, '') // strip any spaces from App Passwords
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }
  return null;
}

/**
 * Central transactional email dispatch function
 * Primary provider: Brevo (formerly Sendinblue) Transactional REST API
 * Fallback provider: Nodemailer SMTP
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  fromEmail,
  fromName,
  requestId
}) {
  const reqTag = requestId ? `[${requestId}]` : '[EMAIL]';
  const senderEmail = fromEmail || config.brevoFromEmail || process.env.BREVO_FROM_EMAIL || 'udit129760@gmail.com';
  const senderName = fromName || config.brevoFromName || process.env.BREVO_FROM_NAME || 'Verdika Security';
  const brevoApiKey = (config.brevoApiKey || process.env.BREVO_API_KEY)?.trim();

  // 1. Primary Dispatch Method: Brevo HTTPS REST API
  if (brevoApiKey && !brevoApiKey.includes('<paste') && !brevoApiKey.includes('your_brevo')) {
    try {
      const startTime = Date.now();
      const cleanTo = to.trim().toLowerCase();
      console.log(`\n${reqTag} Attempting send to ${cleanTo} (Subject: "${subject}")`);
      console.log(`${reqTag} Sender: "${senderName}" <${senderEmail}> | Brevo Key Present: ${Boolean(brevoApiKey)} (Len: ${brevoApiKey?.length})`);
      logger.info(`${reqTag} [Email Service] Attempting delivery via Brevo to ${cleanTo} (${subject})...`);

      const brevoPayload = {
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [
          {
            email: cleanTo
          }
        ],
        subject: subject,
        htmlContent: html,
        textContent: text || ''
      };

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(brevoPayload)
      });

      const durationMs = Date.now() - startTime;
      const responseData = await response.json().catch(() => ({}));

      console.log(`${reqTag} [BREVO HTTP STATUS] ${response.status} ${response.statusText} (${durationMs}ms)`);
      console.log(`${reqTag} [BREVO RESPONSE DATA] to=${cleanTo}`, JSON.stringify(responseData));

      if (response.ok) {
        logger.info(`✅ ${reqTag} [Brevo Delivery SUCCESS in ${durationMs}ms] Message ID: ${responseData.messageId} delivered to ${cleanTo}`);
        return {
          success: true,
          provider: 'Brevo',
          messageId: responseData.messageId,
          durationMs
        };
      }

      // Log specific diagnostic error on failure
      logger.error(`❌ ${reqTag} [Brevo Delivery Error ${response.status}]:`, JSON.stringify(responseData, null, 2));

      if (response.status === 401) {
        logger.warn(`${reqTag} ⚠️ [Brevo Auth Warning]: Invalid or expired BREVO_API_KEY.`);
      } else if (response.status === 400 && responseData.message?.includes('sender')) {
        logger.warn(`${reqTag} ⚠️ [Brevo Sender Warning]: Sender email "${senderEmail}" may need verification in Brevo dashboard.`);
      }
    } catch (apiErr) {
      console.error(`❌ ${reqTag} [BREVO EXCEPTION]:`, apiErr);
      logger.error(`❌ ${reqTag} [Brevo Exception]:`, apiErr.message);
    }
  } else {
    console.warn(`${reqTag} [EMAIL WARNING] No active Brevo API key configured in env/config.`);
    logger.info(`${reqTag} [Email Service] No active Brevo API key configured in .env.`);
  }

  // 2. Secondary Fallback Method: Nodemailer SMTP (if configured)
  const transporter = createTransporter();
  if (transporter) {
    logger.info(`[Email Service] Attempting fallback delivery via SMTP (${process.env.SMTP_HOST || 'smtp.gmail.com'})...`);
    try {
      const sendResult = await transporter.sendMail({
        from: process.env.SMTP_FROM || `"${senderName}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html
      });
      logger.info(`✅ [SMTP Delivery SUCCESS]: Message ID ${sendResult?.messageId}`);
      return {
        success: true,
        provider: 'SMTP',
        messageId: sendResult?.messageId
      };
    } catch (smtpErr) {
      logger.error(`❌ [SMTP Delivery Error]:`, smtpErr.message);
    }
  }

  // 3. Fallback / Dev Sandbox Mode
  logger.info(`ℹ️ [Email Fallback] Email dispatch logged in console for ${to} (${subject}).`);
  return {
    success: true,
    provider: 'Sandbox',
    recipient: to
  };
}

/**
 * Generates plain-English, polite explanations from reason codes / agent output
 */
function formatPoliteRejectionReason(application, customNotes) {
  if (customNotes && customNotes.trim()) {
    return customNotes.trim();
  }

  const riskResult = application.risk_result || {};
  const reasonCodes = riskResult.reasonCodes || [];

  if (reasonCodes.length > 0) {
    const politeFactors = reasonCodes.map((rc) => {
      if (typeof rc === 'string') return rc;
      if (rc.code === 'high_revenue_volatility') return 'Monthly revenue cash-flow patterns exhibit elevated variance';
      if (rc.code === 'refund_rate_above_benchmark') return 'Customer refund/chargeback ratios currently sit above category benchmarks';
      if (rc.code === 'declining_avg_order_value') return 'Average transaction order volume shows recent downward trajectory';
      if (rc.code === 'young_business_age') return 'Business operating tenure is under the minimum policy requirement';
      if (rc.code === 'DOC_BANK_VERIFICATION_FAILED') return 'Commercial bank account validation could not be completed successfully';
      if (rc.code === 'DOC_BANK_NAME_MISMATCH') return 'Bank registered beneficiary name differs from registered business applicant';
      if (rc.code === 'DOC_MISSING_GST' || rc.code === 'DOC_MISSING_PAN' || rc.code === 'DOC_MISSING_BANK_STMT') return 'Mandatory KYC documentation was incomplete or unverified';
      return rc.description || rc.code;
    });

    return `Our automated multi-agent risk assessment highlighted the following key criteria: ${politeFactors.slice(0, 3).join('; ')}.`;
  }

  return 'The application did not meet the underwriting risk and cash-flow thresholds required for this credit facility.';
}

/**
 * Formats HTML & Plain text email template for decision notification
 */
export function formatDecisionEmail({ application, decision, customNotes }) {
  const merchantData = application.merchant_data || {};
  const businessName = merchantData.business_name || application.applicantName || 'Valued Business Partner';
  const recipientEmail = merchantData.applicant_email || merchantData.email || 'merchant@example.com';
  const appId = application.id || 'N/A';
  const statusToken = application.id;
  const statusUrl = `http://localhost:5173/status/${statusToken}`;

  const isApproved = decision.toLowerCase().includes('approve');
  const isRejected = decision.toLowerCase().includes('reject');

  const decisionLabel = isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'NEEDS MANUAL REVIEW';
  const badgeColor = isApproved ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b';
  const badgeBg = isApproved ? '#ecfdf5' : isRejected ? '#fef2f2' : '#fffbeb';
  const badgeBorder = isApproved ? '#a7f3d0' : isRejected ? '#fecaca' : '#fde68a';

  const subject = `Your Loan Application Decision — ${businessName}`;

  let actionMessage = '';
  if (isApproved) {
    actionMessage = `
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #065f46; margin: 0 0 8px 0; font-size: 16px;">Next Steps for Disbursement</h3>
        <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.5;">
          Our Credit Operations team is preparing your official Sanction Letter and Loan Agreement. A relationship manager will reach out within 24 business hours to finalize electronic signature execution and initiate disbursement to your verified bank account.
        </p>
      </div>
    `;
  } else if (isRejected) {
    const politeReason = formatPoliteRejectionReason(application, customNotes);
    actionMessage = `
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #991b1b; margin: 0 0 8px 0; font-size: 16px;">Reason for Decision</h3>
        <p style="color: #7f1d1d; margin: 0; font-size: 14px; line-height: 1.5;">
          ${politeReason}
        </p>
        <p style="color: #991b1b; margin: 10px 0 0 0; font-size: 13px;">
          You are welcome to re-apply after 90 days once additional operating history or updated financials become available.
        </p>
      </div>
    `;
  } else {
    actionMessage = `
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 16px;">Underwriter Inspection</h3>
        <p style="color: #b45309; margin: 0; font-size: 14px; line-height: 1.5;">
          Your application has been routed to our credit underwriting desk for routine verification. We will notify you as soon as the manual assessment concludes.
        </p>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header -->
        <div style="background: #0f172a; padding: 24px; text-align: left; border-bottom: 3px solid ${badgeColor};">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">VERDIKA RISK ENGINE</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Automated Merchant Underwriting Assessment</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px; color: #334155; margin-top: 0;">
            Dear <strong>${businessName}</strong>,
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Thank you for applying for a commercial credit facility with Verdika. Our AI Multi-Agent Underwriting Engine and credit risk team have completed the evaluation of application <code>${appId}</code>.
          </p>

          <!-- Decision Banner -->
          <div style="background: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 8px; padding: 18px; margin: 24px 0; text-align: center;">
            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Application Status</div>
            <div style="font-size: 24px; font-weight: 800; color: ${badgeColor}; letter-spacing: 0.5px;">
              ${decisionLabel}
            </div>
          </div>

          ${actionMessage}

          <!-- Details Table -->
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Application ID:</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #1e293b; font-family: monospace;">${appId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Business Legal Name:</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #1e293b;">${businessName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Assessed On:</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #1e293b;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            </tr>
          </table>

          <!-- Track Status Link Button -->
          <div style="text-align: center; margin: 32px 0 16px 0;">
            <a href="${statusUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
              View Application Portal →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
          <p style="margin: 0;">This is an automated regulatory notification from Verdika Financial Technologies.</p>
          <p style="margin: 4px 0 0 0;">For inquiries, please reference ID: <strong>${appId}</strong></p>
        </div>

      </div>
    </body>
    </html>
  `;

  const text = `
VERDIKA RISK ENGINE: APPLICATION DECISION
==========================================
Applicant: ${businessName}
Application ID: ${appId}
Decision Verdict: ${decisionLabel}

${isApproved ? 'Your credit application has been approved. A relationship manager will contact you within 24 business hours for electronic agreement signing and disbursement.' : ''}
${isRejected ? formatPoliteRejectionReason(application, customNotes) : ''}

Track real-time status online at: ${statusUrl}
==========================================
  `.trim();

  return { subject, html, text, recipientEmail, businessName };
}

/**
 * Sends decision notification email to merchant and logs audit event
 */
export async function sendDecisionNotification({ application, decision, customNotes = '' }) {
  const { subject, html, text, recipientEmail } = formatDecisionEmail({ application, decision, customNotes });
  const appId = application.id || 'N/A';

  try {
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
      fromName: 'Verdika Risk Engine'
    });

    const notifRecord = await Notification.create({
      application_id: application.id,
      recipient_email: recipientEmail,
      subject,
      content_text: text,
      content_html: html,
      status: 'sent'
    });

    logger.info(`[NotificationService] Sent decision notification to ${recipientEmail} for App: ${appId} [Decision: ${decision}, Provider: ${emailResult.provider}]`);

    return {
      success: true,
      sentVia: emailResult.provider,
      notification: notifRecord
    };
  } catch (err) {
    logger.error(`[NotificationService Error] Failed to send decision email to ${recipientEmail}:`, err.message);

    let notifRecord = null;
    try {
      notifRecord = await Notification.create({
        application_id: application.id,
        recipient_email: recipientEmail,
        subject,
        content_text: text,
        content_html: html,
        error: err.message
      });
    } catch (dbErr) {
      logger.error('[NotificationService DB Error]:', dbErr.message);
    }

    return { success: false, error: err.message, notification: notifRecord };
  }
}

/**
 * Sends a 6-digit OTP verification email for two-factor authentication
 */
export async function sendOtpEmail({ recipientEmail, recipientName = 'Underwriter', otpCode, expiresMinutes = 5, requestId }) {
  const subject = `Your Verdika Login Verification Code: ${otpCode}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header -->
        <div style="background: #0f172a; padding: 20px 24px; text-align: left; border-bottom: 3px solid #3b82f6;">
          <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">VERDIKA SECURITY</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Two-Factor Authentication</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px; text-align: center;">
          <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px;">Verification Code</h2>
          <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0 0 24px 0;">
            Hello <strong>${recipientName}</strong>, enter the following 6-digit code to complete sign-in to your underwriter dashboard:
          </p>

          <!-- 6-digit OTP Box -->
          <div style="margin: 20px auto; padding: 18px 28px; background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 8px; display: inline-block;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0369a1;">
              ${otpCode}
            </span>
          </div>

          <p style="font-size: 13px; color: #dc2626; font-weight: 600; margin: 16px 0 0 0;">
            ⏱️ This code will expire in ${expiresMinutes} minutes.
          </p>

          <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 24px 0 0 0; text-align: left; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            If you did not request this login attempt, please change your password immediately or alert your system administrator.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
VERDIKA SECURITY: TWO-FACTOR AUTHENTICATION
==========================================
Your verification code is: ${otpCode}

This code will expire in ${expiresMinutes} minutes.

If you did not initiate this login, please secure your account immediately.
==========================================
  `.trim();

  const reqTag = requestId ? `[${requestId}]` : '';
  // Highlighted Dev Mode Console Log
  console.log('\n======================================================');
  console.log(`🔑 ${reqTag} [AUTH 2FA] DEV MODE - OTP: ${otpCode} (Recipient: ${recipientEmail})`);
  console.log('======================================================\n');

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
    fromName: 'Verdika Security',
    requestId
  });

  return { success: result.success, otpCode, provider: result.provider };
}

/**
 * Sends a welcome email to a newly created Finance Company Admin with their login credentials
 */
export async function sendCompanyAdminWelcomeEmail({
  adminEmail,
  adminName,
  companyName,
  password,
  loginUrl,
  applyUrl
}) {
  const subject = `Welcome to Verdika — Finance Company Admin Account Created (${companyName})`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px;">
      <div style="max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px;">
        <h2 style="color: #38bdf8; margin: 0 0 16px 0;">Welcome to Verdika, ${adminName}!</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
          A dedicated institutional tenancy for <strong>${companyName}</strong> has been provisioned on the Verdika Risk Platform by a Platform Super Admin.
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h4 style="color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-size: 12px; margin: 0 0 12px 0;">Your Administrator Credentials</h4>
          <p style="margin: 6px 0; color: #f8fafc; font-size: 14px;"><strong>Login Email:</strong> <code style="color: #38bdf8;">${adminEmail}</code></p>
          <p style="margin: 6px 0; color: #f8fafc; font-size: 14px;"><strong>Password:</strong> <code style="color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 2px 6px; border-radius: 4px;">${password}</code></p>
          <p style="margin: 6px 0; color: #f8fafc; font-size: 14px;"><strong>Public Merchant Gateway:</strong> <a href="${applyUrl}" style="color: #38bdf8;">${applyUrl}</a></p>
        </div>

        <div style="text-align: center; margin: 30px 0 20px 0;">
          <a href="${loginUrl}" style="background: #3b82f6; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Sign In to Company Dashboard →
          </a>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to Verdika, ${adminName}!
An administrator account for ${companyName} has been created for you.

Login Email: ${adminEmail}
Password: ${password}
Login Portal: ${loginUrl}
Public Merchant Application Link: ${applyUrl}
  `.trim();

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
    fromName: 'Verdika Onboarding'
  });

  logger.info(`[Notification] Admin credentials email dispatched for ${adminEmail} (${companyName}) [Provider: ${result.provider}]`);
  return { success: result.success, email: adminEmail, provider: result.provider };
}

/**
 * Sends a Super Admin platform invitation email
 */
export async function sendSuperAdminInviteEmail({
  recipientEmail,
  inviteLink,
  invitedByName,
  expiresHours = 72
}) {
  const subject = `Platform Super Admin Invitation — Verdika Risk Engine`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px;">
      <div style="max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px;">
        <div style="display: inline-block; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); color: #c084fc; font-weight: 700; font-size: 11px; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; margin-bottom: 12px;">
          Privileged Platform Access
        </div>
        <h2 style="color: #ffffff; margin: 0 0 16px 0;">You've Been Invited to Verdika Super Admin</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
          <strong>${invitedByName || 'A Platform Administrator'}</strong> has invited you to join the Verdika Platform Governance team as a <strong>Super Admin</strong>.
        </p>

        <div style="text-align: center; margin: 30px 0 20px 0;">
          <a href="${inviteLink}" style="background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">
            Accept Super Admin Invitation →
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          This secure link will expire in ${expiresHours} hours.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
You have been invited to become a Super Admin on Verdika by ${invitedByName}.
Accept invitation link: ${inviteLink}
Expires in ${expiresHours} hours.
  `.trim();

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
    fromName: 'Verdika Governance'
  });

  logger.info(`[Notification] Super Admin invite dispatched to ${recipientEmail} [Provider: ${result.provider}]`);
  return { success: result.success, email: recipientEmail, inviteLink, provider: result.provider };
}
