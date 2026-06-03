import { UserRole } from '../models/user.model';

interface RoleChangeEmailTemplateParams {
  recipientName?: string;
  previousRole: UserRole;
  nextRole: UserRole;
  reason: string;
  supportName: string;
  supportEmail: string;
  websiteUrl: string;
}

export interface RoleChangeEmailTemplateResult {
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

function getRoleLabel(role: UserRole): string {
  if (role === 'admin') {
    return 'Admin';
  }

  if (role === 'organizer') {
    return 'Organizer';
  }

  return 'Attendee';
}

function getRoleDescription(role: UserRole): string {
  if (role === 'admin') {
    return 'You can now access the admin dashboard and manage platform governance features.';
  }

  if (role === 'organizer') {
    return 'You can now create events and manage organizer workflows in your dashboard.';
  }

  return 'Your account now uses the attendee experience for browsing events and managing RSVPs.';
}

export function renderRoleChangeEmailTemplate(
  params: RoleChangeEmailTemplateParams
): RoleChangeEmailTemplateResult {
  const greetingName = params.recipientName?.trim() || 'there';
  const reason = params.reason.trim();
  const previousRoleLabel = getRoleLabel(params.previousRole);
  const nextRoleLabel = getRoleLabel(params.nextRole);
  const roleDescription = getRoleDescription(params.nextRole);
  const subject = `Your EventForge role was updated to ${nextRoleLabel}`;

  const text = `Hi ${greetingName},

This is a formal account governance notice from EventForge.

Previous role: ${previousRoleLabel}
New role: ${nextRoleLabel}

Reason provided by the admin team:
${reason}

What this means for your account:
${roleDescription}

If you were not expecting this change or need help, contact ${params.supportName} at ${params.supportEmail}.

Open EventForge: ${params.websiteUrl}

EventForge`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:32px;background:#0f172a;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto;background:#e2e8f0;border-radius:28px;overflow:hidden;">
      <tr>
        <td style="padding:0;background:linear-gradient(135deg,#1d4ed8 0%,#0f172a 100%);">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:28px 28px 18px;">
                <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#bfdbfe;">Account Governance Notice</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#f8fafc;">${escapeHtml(subject)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <span style="display:inline-block;padding:8px 12px;border:1px solid rgba(191,219,254,0.35);border-radius:999px;background:rgba(15,23,42,0.24);color:#dbeafe;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Role access updated</span>
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
                <p style="margin:0 0 22px;color:#334155;font-size:15px;line-height:1.8;">This is a formal account governance notice from EventForge. Your account access level was updated by the admin team.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 22px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:18px;">
                  <tr>
                    <td style="padding:18px 20px;width:50%;border-right:1px solid #bfdbfe;">
                      <p style="margin:0 0 6px;color:#64748b;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Previous role</p>
                      <p style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">${escapeHtml(previousRoleLabel)}</p>
                    </td>
                    <td style="padding:18px 20px;width:50%;">
                      <p style="margin:0 0 6px;color:#64748b;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">New role</p>
                      <p style="margin:0;color:#1d4ed8;font-size:20px;font-weight:700;">${escapeHtml(nextRoleLabel)}</p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 18px;background:#111827;border-radius:18px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 8px;color:#93c5fd;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Reason provided by the admin team</p>
                      <p style="margin:0;color:#f8fafc;font-size:15px;line-height:1.8;">${escapeHtml(reason)}</p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:18px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 8px;color:#475569;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">What this means for your account</p>
                      <p style="margin:0;color:#334155;font-size:15px;line-height:1.8;">${escapeHtml(roleDescription)}</p>
                    </td>
                  </tr>
                </table>
                <a href="${params.websiteUrl}" style="display:inline-block;padding:13px 18px;border-radius:12px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">Review your account</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0f172a;border-radius:18px;">
            <tr>
              <td style="padding:16px 20px;color:#cbd5e1;font-size:12px;line-height:1.7;">
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
