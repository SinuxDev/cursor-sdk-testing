interface SuspensionStatusEmailTemplateParams {
  recipientName?: string;
  isSuspended: boolean;
  reason: string;
  supportName: string;
  supportEmail: string;
  websiteUrl: string;
}

export interface SuspensionStatusEmailTemplateResult {
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

function getSubject(isSuspended: boolean): string {
  return isSuspended
    ? 'Your EventForge account has been suspended'
    : 'Your EventForge account has been reactivated';
}

function getBodyCopy(isSuspended: boolean): string {
  return isSuspended
    ? 'Your EventForge account has been suspended. While this is active, access to key account features may be limited.'
    : 'Your EventForge account has been reactivated. You can now sign in and continue using the platform again.';
}

export function renderSuspensionStatusEmailTemplate(
  params: SuspensionStatusEmailTemplateParams
): SuspensionStatusEmailTemplateResult {
  const greetingName = params.recipientName?.trim() || 'there';
  const reason = params.reason.trim();
  const subject = getSubject(params.isSuspended);
  const bodyCopy = getBodyCopy(params.isSuspended);
  const statusLabel = params.isSuspended ? 'Suspended' : 'Reactivated';
  const accentColor = params.isSuspended ? '#dc2626' : '#16a34a';
  const accentSoft = params.isSuspended ? '#fee2e2' : '#dcfce7';
  const accentText = params.isSuspended ? '#7f1d1d' : '#166534';
  const reasonLabelColor = params.isSuspended ? '#fca5a5' : '#86efac';

  const text = `Hi ${greetingName},

This is a formal account governance notice from EventForge.

Account status: ${statusLabel}

${bodyCopy}

Reason provided by the admin team:
${reason}

If you were not expecting this change or need help, contact ${params.supportName} at ${params.supportEmail}.

EventForge: ${params.websiteUrl}

EventForge`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:32px;background:#111827;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto;background:#e5e7eb;border-radius:28px;overflow:hidden;">
      <tr>
        <td style="padding:0;background:linear-gradient(135deg,#111827 0%,${accentColor} 100%);">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:28px 28px 18px;">
                <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#e5e7eb;">Account Governance Notice</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#ffffff;">${escapeHtml(subject)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <span style="display:inline-block;padding:8px 12px;border-radius:999px;background:${accentSoft};color:${accentText};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(statusLabel)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">Hi ${escapeHtml(greetingName)},</p>
                <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.8;">This is a formal account governance notice from EventForge.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 18px;background:${accentSoft};border:1px solid ${accentColor};border-radius:18px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 6px;color:#64748b;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Account status</p>
                      <p style="margin:0;color:${accentText};font-size:22px;font-weight:700;">${escapeHtml(statusLabel)}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.8;">${escapeHtml(bodyCopy)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;background:#111827;border-radius:18px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 8px;color:${reasonLabelColor};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Reason provided by the admin team</p>
                      <p style="margin:0;color:#f9fafb;font-size:15px;line-height:1.8;">${escapeHtml(reason)}</p>
                    </td>
                  </tr>
                </table>
                <a href="${params.websiteUrl}" style="display:inline-block;padding:13px 18px;border-radius:12px;background:${accentColor};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">Review your account</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#111827;border-radius:18px;">
            <tr>
              <td style="padding:16px 20px;color:#d1d5db;font-size:12px;line-height:1.7;">
                If you were not expecting this change or need help, contact ${escapeHtml(params.supportName)} at ${escapeHtml(params.supportEmail)}.
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
