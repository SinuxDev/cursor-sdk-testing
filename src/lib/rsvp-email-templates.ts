interface RsvpEmailTemplateParams {
  attendeeName?: string;
  eventTitle: string;
  eventUrl: string;
  status: 'registered' | 'waitlisted' | 'cancelled';
  ticketUrl?: string;
  ticketShortCode?: string;
  ticketQrCid?: string;
}

export interface RsvpEmailTemplateResult {
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

function getStatusLabel(status: RsvpEmailTemplateParams['status']): string {
  if (status === 'registered') {
    return 'Registered';
  }

  if (status === 'waitlisted') {
    return 'Waitlisted';
  }

  return 'Cancelled';
}

function getSubject(status: RsvpEmailTemplateParams['status'], eventTitle: string): string {
  if (status === 'registered') {
    return `You are registered: ${eventTitle}`;
  }

  if (status === 'waitlisted') {
    return `You are on the waitlist: ${eventTitle}`;
  }

  return `Your RSVP was cancelled: ${eventTitle}`;
}

function getBodyCopy(status: RsvpEmailTemplateParams['status']): string {
  if (status === 'registered') {
    return 'Your spot is confirmed. We will email reminders before the event starts.';
  }

  if (status === 'waitlisted') {
    return 'The event is currently full, so you have been added to the waitlist.';
  }

  return 'Your RSVP has been cancelled and your seat has been released.';
}

export function renderRsvpEmailTemplate(params: RsvpEmailTemplateParams): RsvpEmailTemplateResult {
  const greetingName = params.attendeeName?.trim() || 'there';
  const subject = getSubject(params.status, params.eventTitle);
  const statusLabel = getStatusLabel(params.status);
  const bodyCopy = getBodyCopy(params.status);

  const ticketLines =
    params.status === 'registered' && params.ticketUrl
      ? `\nTicket: ${params.ticketUrl}${params.ticketShortCode ? `\nTicket code: ${params.ticketShortCode}` : ''}`
      : '';

  const text = `Hi ${greetingName},\n\n${bodyCopy}\n\nEvent: ${params.eventTitle}\nStatus: ${statusLabel}\nEvent page: ${params.eventUrl}${ticketLines}\n\nEventForge`;

  const ticketHtml =
    params.status === 'registered' && params.ticketUrl
      ? `<p style="margin:0 0 16px;color:#0f172a;font-size:14px;"><strong>Ticket:</strong> <a href="${params.ticketUrl}" style="color:#0f766e;text-decoration:underline;">View your QR ticket</a></p>${
          params.ticketShortCode
            ? `<p style="margin:0 0 16px;color:#0f172a;font-size:14px;"><strong>Ticket code:</strong> ${escapeHtml(params.ticketShortCode)}</p>`
            : ''
        }${
          params.ticketQrCid
            ? `<div style="margin:0 0 16px;"><img src="cid:${params.ticketQrCid}" alt="Ticket QR code" width="220" height="220" style="display:block;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff;padding:8px;" /></div>`
            : ''
        }`
      : '';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:22px 24px;border-bottom:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">EventForge RSVP</p>
          <h1 style="margin:10px 0 0;font-size:22px;line-height:1.35;color:#0f172a;">${escapeHtml(subject)}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.7;">Hi ${escapeHtml(greetingName)},</p>
          <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(bodyCopy)}</p>
          <p style="margin:0 0 8px;color:#0f172a;font-size:14px;"><strong>Event:</strong> ${escapeHtml(params.eventTitle)}</p>
          <p style="margin:0 0 16px;color:#0f172a;font-size:14px;"><strong>Status:</strong> ${escapeHtml(statusLabel)}</p>
          ${ticketHtml}
          <a href="${params.eventUrl}" style="display:inline-block;padding:11px 16px;border-radius:8px;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">View event</a>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;">
          This is a transactional RSVP email from EventForge.
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
