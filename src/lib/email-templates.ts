export type AdminEmailTemplateKey =
  | 'custom'
  | 'policy_warning'
  | 'suspension_notice'
  | 'reinstatement_notice'
  | 'policy_update';

interface RenderTemplateParams {
  supportName: string;
  supportEmail: string;
  websiteUrl: string;
  policyUrl: string;
  helpUrl: string;
  appealUrl: string;
  recipientName?: string;
  customSubject?: string;
  customBody?: string;
}

export interface RenderedEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface TemplateCore {
  subject: string;
  preheader: string;
  eyebrow: string;
  title: string;
  bodyParagraphs: string[];
  accentHex: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMultilineHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

function buildHtmlLayout(params: {
  core: TemplateCore;
  supportName: string;
  supportEmail: string;
  websiteUrl: string;
  recipientName?: string;
}) {
  const greeting = params.recipientName?.trim()
    ? `Hello ${escapeHtml(params.recipientName.trim())},`
    : 'Hello,';

  const bodyHtml = params.core.bodyParagraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.65;">${paragraph}</p>`
    )
    .join('');

  const secondaryCta =
    params.core.secondaryLabel && params.core.secondaryUrl
      ? `<a href="${params.core.secondaryUrl}" style="display:inline-block;padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;color:#0f172a;text-decoration:none;font-weight:600;font-size:14px;">${params.core.secondaryLabel}</a>`
      : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(params.core.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(params.core.preheader)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #dbe6f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:#0b1220;border-bottom:1px solid #1f2937;">
                <a href="${params.websiteUrl}" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:18px;letter-spacing:0.01em;">${escapeHtml(params.supportName)}</a>
                <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(params.core.eyebrow)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 14px;color:#0f172a;font-size:15px;line-height:1.65;">${greeting}</p>
                <h1 style="margin:0 0 14px;color:#0f172a;font-size:24px;line-height:1.35;">${escapeHtml(params.core.title)}</h1>
                ${bodyHtml}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:10px;">
                  <tr>
                    <td>
                      <a href="${params.core.ctaUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:${params.core.accentHex};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${params.core.ctaLabel}</a>
                    </td>
                    <td style="padding-left:10px;">${secondaryCta}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0 0 6px;color:#475569;font-size:12px;line-height:1.6;">Need help? Contact <a href="mailto:${params.supportEmail}" style="color:#0f172a;text-decoration:underline;">${params.supportEmail}</a>.</p>
                <p style="margin:0;color:#64748b;font-size:11px;line-height:1.6;">This is an administrative service message from ${escapeHtml(params.supportName)} related to account, policy, or platform operations.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildTextLayout(params: {
  core: TemplateCore;
  supportName: string;
  supportEmail: string;
  recipientName?: string;
}) {
  const greeting = params.recipientName?.trim()
    ? `Hello ${params.recipientName.trim()},`
    : 'Hello,';
  const body = params.core.bodyParagraphs.join('\n\n');
  const secondary =
    params.core.secondaryLabel && params.core.secondaryUrl
      ? `\n${params.core.secondaryLabel}: ${params.core.secondaryUrl}`
      : '';

  return `${greeting}

${params.core.title}

${body}

${params.core.ctaLabel}: ${params.core.ctaUrl}${secondary}

Need help? Contact ${params.supportEmail}.

${params.supportName}`;
}

function resolveTemplateCore(
  templateKey: AdminEmailTemplateKey,
  params: RenderTemplateParams
): TemplateCore {
  const website = params.websiteUrl;

  if (templateKey === 'policy_warning') {
    return {
      subject: 'Important policy warning from EventForge',
      preheader: 'Please review your recent account activity and policy guidance.',
      eyebrow: 'Compliance Notice',
      title: 'Action Required: Policy warning issued',
      bodyParagraphs: [
        'Our compliance team detected activity that may violate EventForge policy. Please review your recent actions and ensure future behavior aligns with platform standards.',
        'This notice is intended to prevent account restrictions and help you keep full access to EventForge services.',
      ],
      accentHex: '#d97706',
      ctaLabel: 'Review policy guidelines',
      ctaUrl: params.policyUrl,
      secondaryLabel: 'Contact support',
      secondaryUrl: params.helpUrl,
    };
  }

  if (templateKey === 'suspension_notice') {
    return {
      subject: 'Your EventForge account has been suspended',
      preheader: 'Your account is suspended pending policy review.',
      eyebrow: 'Account Enforcement',
      title: 'Your account is currently suspended',
      bodyParagraphs: [
        'Your EventForge account has been suspended due to a policy compliance issue. During this suspension, key account and event actions are restricted.',
        'If you believe this was applied in error, you can submit an appeal and our team will review your case as quickly as possible.',
      ],
      accentHex: '#dc2626',
      ctaLabel: 'Submit appeal',
      ctaUrl: params.appealUrl,
      secondaryLabel: 'Review policy',
      secondaryUrl: params.policyUrl,
    };
  }

  if (templateKey === 'reinstatement_notice') {
    return {
      subject: 'Your EventForge access has been restored',
      preheader: 'Your account review is complete and access has been restored.',
      eyebrow: 'Account Update',
      title: 'Your access has been reinstated',
      bodyParagraphs: [
        'Your account review is complete and your EventForge access has been restored.',
        'Thank you for your cooperation during the review process. Please continue to follow platform policies to avoid future disruptions.',
      ],
      accentHex: '#059669',
      ctaLabel: 'Open EventForge',
      ctaUrl: website,
      secondaryLabel: 'Policy guidelines',
      secondaryUrl: params.policyUrl,
    };
  }

  if (templateKey === 'policy_update') {
    return {
      subject: 'EventForge policy update',
      preheader: 'We updated our policy documentation. Please review the latest version.',
      eyebrow: 'Policy Update',
      title: 'Platform policy changes are now live',
      bodyParagraphs: [
        'We have updated one or more EventForge policies. Please review the latest documentation to stay compliant and protect uninterrupted platform access.',
        'If anything is unclear, our support team can walk you through the changes.',
      ],
      accentHex: '#2563eb',
      ctaLabel: 'Read updated policy',
      ctaUrl: params.policyUrl,
      secondaryLabel: 'Get support',
      secondaryUrl: params.helpUrl,
    };
  }

  return {
    subject: params.customSubject?.trim() || 'Message from EventForge',
    preheader: 'A new administrative message from EventForge support.',
    eyebrow: 'Admin Message',
    title: params.customSubject?.trim() || 'Message from EventForge',
    bodyParagraphs: [params.customBody?.trim() || ''],
    accentHex: '#0f766e',
    ctaLabel: 'Open EventForge',
    ctaUrl: website,
    secondaryLabel: 'Contact support',
    secondaryUrl: params.helpUrl,
  };
}

export function renderAdminEmailTemplate(
  templateKey: AdminEmailTemplateKey,
  params: RenderTemplateParams
): RenderedEmailTemplate {
  const core = resolveTemplateCore(templateKey, params);

  const normalizedCore: TemplateCore = {
    ...core,
    bodyParagraphs:
      templateKey === 'custom'
        ? [formatMultilineHtml(params.customBody?.trim() || '')]
        : core.bodyParagraphs.map((paragraph) => escapeHtml(paragraph)),
  };

  return {
    subject: core.subject,
    html: buildHtmlLayout({
      core: normalizedCore,
      supportName: params.supportName,
      supportEmail: params.supportEmail,
      websiteUrl: params.websiteUrl,
      recipientName: params.recipientName,
    }),
    text: buildTextLayout({
      core: {
        ...core,
        bodyParagraphs:
          templateKey === 'custom' ? [params.customBody?.trim() || ''] : core.bodyParagraphs,
      },
      supportName: params.supportName,
      supportEmail: params.supportEmail,
      recipientName: params.recipientName,
    }),
  };
}
