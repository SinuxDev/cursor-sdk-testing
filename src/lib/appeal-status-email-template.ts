import { AppealIssueType, AppealStatus } from '../models/appeal-request.model';

interface AppealStatusEmailTemplateParams {
  recipientName?: string;
  status: AppealStatus;
  referenceCode: string;
  issueType: AppealIssueType;
  supportName: string;
  supportEmail: string;
  websiteUrl: string;
}

export interface AppealStatusEmailTemplateResult {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getIssueLabel(issueType: AppealIssueType): string {
  if (issueType === 'account_suspension') return 'Account suspension';
  if (issueType === 'policy_warning') return 'Policy warning';
  if (issueType === 'payment_restriction') return 'Payment restriction';
  if (issueType === 'content_violation') return 'Content violation';
  return 'Other';
}

function getStatusLabel(status: AppealStatus): string {
  if (status === 'in_review') return 'In review';
  if (status === 'resolved') return 'Resolved';
  if (status === 'rejected') return 'Rejected';
  return 'Submitted';
}

function getStatusSubject(status: AppealStatus): string {
  if (status === 'in_review') return 'Your EventForge appeal is now in review';
  if (status === 'resolved') return 'Your EventForge appeal has been resolved';
  if (status === 'rejected') return 'Update on your EventForge appeal';
  return 'We received your EventForge appeal';
}

function getStatusBody(status: AppealStatus): string {
  if (status === 'in_review') {
    return 'Our trust and safety team is currently reviewing your submission. We will notify you after the review is complete.';
  }

  if (status === 'resolved') {
    return 'Your appeal has been reviewed and resolved. If additional account changes apply, they will be reflected in your account shortly.';
  }

  if (status === 'rejected') {
    return 'Your appeal has been reviewed and the original enforcement decision remains in place at this time.';
  }

  return 'Your appeal has been submitted and entered into our review queue.';
}

function getPalette(status: AppealStatus) {
  if (status === 'resolved') {
    return {
      primary: '#0f766e',
      accentSoft: '#ccfbf1',
      accentText: '#134e4a',
      tag: 'Resolved',
    };
  }

  if (status === 'rejected') {
    return {
      primary: '#b91c1c',
      accentSoft: '#fee2e2',
      accentText: '#7f1d1d',
      tag: 'Decision issued',
    };
  }

  if (status === 'in_review') {
    return {
      primary: '#1d4ed8',
      accentSoft: '#dbeafe',
      accentText: '#1e3a8a',
      tag: 'In review',
    };
  }

  return {
    primary: '#7c3aed',
    accentSoft: '#ede9fe',
    accentText: '#4c1d95',
    tag: 'Submitted',
  };
}

export function renderAppealStatusEmailTemplate(
  params: AppealStatusEmailTemplateParams
): AppealStatusEmailTemplateResult {
  const recipientName = params.recipientName?.trim() || 'there';
  const subject = getStatusSubject(params.status);
  const body = getStatusBody(params.status);
  const statusLabel = getStatusLabel(params.status);
  const issueLabel = getIssueLabel(params.issueType);
  const palette = getPalette(params.status);

  const text = `Hi ${recipientName},

This is an update about your EventForge appeal request.

Reference code: ${params.referenceCode}
Issue type: ${issueLabel}
Current status: ${statusLabel}

${body}

You can keep this reference code for future communication.
For help, contact ${params.supportName} at ${params.supportEmail}.

EventForge: ${params.websiteUrl}

EventForge Trust Team`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:30px;background:#0b1020;font-family:'Space Grotesk','Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:700px;margin:0 auto;background:#f8fafc;border-radius:24px;overflow:hidden;">
      <tr>
        <td style="padding:0;background:linear-gradient(135deg,#0b1020 0%,${palette.primary} 100%);">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#e2e8f0;">Appeal status update</p>
                <h1 style="margin:0;font-size:30px;line-height:1.2;color:#ffffff;">${escapeHtml(subject)}</h1>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border-radius:18px;border:1px solid #e2e8f0;overflow:hidden;">
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">Hi ${escapeHtml(recipientName)},</p>
                <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.8;">This is an update about your EventForge appeal request.</p>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 18px;background:${palette.accentSoft};border-radius:14px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <p style="margin:0 0 6px;color:#64748b;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Current status</p>
                      <p style="margin:0;color:${palette.accentText};font-size:22px;font-weight:700;">${escapeHtml(statusLabel)}</p>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 18px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:14px;">
                  <tr>
                    <td style="padding:16px 18px;color:#334155;font-size:14px;line-height:1.8;">
                      <p style="margin:0;"><strong>Reference code:</strong> ${escapeHtml(params.referenceCode)}</p>
                      <p style="margin:6px 0 0;"><strong>Issue type:</strong> ${escapeHtml(issueLabel)}</p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.8;">${escapeHtml(body)}</p>
                <p style="margin:0 0 20px;color:#64748b;font-size:13px;line-height:1.7;">Please keep your reference code for future communication.</p>
                <a href="${params.websiteUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:${palette.primary};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">Open EventForge</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#111827;border-radius:14px;">
            <tr>
              <td style="padding:14px 16px;color:#d1d5db;font-size:12px;line-height:1.7;">
                For help, contact ${escapeHtml(params.supportName)} at ${escapeHtml(params.supportEmail)}.
                <span style="display:inline-block;margin-left:8px;color:${palette.accentSoft};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(palette.tag)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject,
    text,
    html,
  };
}
