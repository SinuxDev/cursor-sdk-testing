import { DemoReplyTemplateKey } from '../models/demo-request.model';

interface RenderDemoReplyParams {
  templateKey: DemoReplyTemplateKey;
  recipientName: string;
  supportName: string;
  supportEmail: string;
  websiteUrl: string;
  scheduleLink?: string;
  customMessage?: string;
}

interface RenderedDemoReplyTemplate {
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

function multilineToHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

function buildTemplateCore(params: RenderDemoReplyParams): {
  subject: string;
  title: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
} {
  if (params.templateKey === 'qualified_next_steps') {
    return {
      subject: 'Next steps for your EventForge demo',
      title: 'Great fit - let us move forward',
      paragraphs: [
        'Thanks again for your interest in EventForge. Based on your submitted details, your use case looks like a strong fit for our platform.',
        'The next step is a focused walkthrough where we map your goals to the right setup and rollout plan.',
      ],
      ctaLabel: 'Book your demo slot',
      ctaUrl: params.scheduleLink?.trim() || `${params.websiteUrl}/contact`,
    };
  }

  if (params.templateKey === 'not_a_fit_polite') {
    return {
      subject: 'Update on your EventForge demo request',
      title: 'Thank you for considering EventForge',
      paragraphs: [
        'We appreciate your interest and the time you took to submit your request.',
        'After review, your current requirements are not the best fit for EventForge right now. If your priorities change, we are happy to reconnect.',
      ],
      ctaLabel: 'Visit EventForge',
      ctaUrl: params.websiteUrl,
    };
  }

  if (params.templateKey === 'reschedule_no_show') {
    return {
      subject: 'Let us reschedule your EventForge demo',
      title: 'No problem - we can reschedule',
      paragraphs: [
        'We noticed you could not make the previous demo slot. That happens, and we are happy to find another time that works better for you.',
        'Use the scheduling link below to pick a new slot at your convenience.',
      ],
      ctaLabel: 'Reschedule demo',
      ctaUrl: params.scheduleLink?.trim() || `${params.websiteUrl}/contact`,
    };
  }

  return {
    subject: 'We received your EventForge demo request',
    title: 'Thanks - your request is in review',
    paragraphs: [
      'Thank you for requesting a demo of EventForge. Our team has received your submission and started review.',
      'You can expect a follow-up from us shortly with recommended next steps.',
    ],
    ctaLabel: 'Explore EventForge',
    ctaUrl: params.websiteUrl,
  };
}

export function renderDemoReplyTemplate(params: RenderDemoReplyParams): RenderedDemoReplyTemplate {
  const core = buildTemplateCore(params);
  const safeName = params.recipientName.trim() || 'there';
  const customMessage = params.customMessage?.trim();

  const textLines = [
    `Hello ${safeName},`,
    '',
    core.title,
    '',
    ...core.paragraphs,
    ...(customMessage ? ['', customMessage] : []),
    '',
    `${core.ctaLabel}: ${core.ctaUrl}`,
    '',
    `Need help? Contact ${params.supportEmail}.`,
    '',
    params.supportName,
  ];

  const bodyParagraphHtml = core.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.65;">${escapeHtml(paragraph)}</p>`
    )
    .join('');

  const customMessageHtml = customMessage
    ? `<div style="margin:14px 0 0;padding:12px;border:1px solid #dbeafe;border-radius:10px;background:#f8fbff;"><p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">${multilineToHtml(customMessage)}</p></div>`
    : '';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(core.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #dbe6f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:#0b1220;border-bottom:1px solid #1f2937;">
                <a href="${params.websiteUrl}" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:18px;letter-spacing:0.01em;">${escapeHtml(params.supportName)}</a>
                <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Demo operations</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 14px;color:#0f172a;font-size:15px;line-height:1.65;">Hello ${escapeHtml(safeName)},</p>
                <h1 style="margin:0 0 14px;color:#0f172a;font-size:24px;line-height:1.35;">${escapeHtml(core.title)}</h1>
                ${bodyParagraphHtml}
                ${customMessageHtml}
                <div style="margin-top:16px;">
                  <a href="${core.ctaUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${escapeHtml(core.ctaLabel)}</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0 0 6px;color:#475569;font-size:12px;line-height:1.6;">Need help? Contact <a href="mailto:${params.supportEmail}" style="color:#0f172a;text-decoration:underline;">${params.supportEmail}</a>.</p>
                <p style="margin:0;color:#64748b;font-size:11px;line-height:1.6;">This message was sent by ${escapeHtml(params.supportName)} regarding your demo request.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: core.subject,
    text: textLines.join('\n'),
    html,
  };
}
