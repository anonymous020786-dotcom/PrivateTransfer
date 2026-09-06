import 'server-only'
import { brand } from './brand'

// ─────────────────────────────────────────────────────────────────────────────
// Professional, responsive, brand-consistent HTML email layout + templates.
// All transactional / operational emails render through `baseLayout` so they
// share the same polished look (works in Gmail, Outlook, Apple Mail).
// ─────────────────────────────────────────────────────────────────────────────

const PRIMARY = '#4f46e5' // indigo
const BG = '#f4f4f7'
const CARD = '#ffffff'
const TEXT = '#1f2330'
const MUTED = '#6b7280'

function esc(s: string): string {
  return String(s).replace(
    /[&<>"]/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  )
}

export type EmailButton = { label: string; url: string }

export function baseLayout(opts: {
  preheader?: string
  heading: string
  intro?: string
  bodyHtml: string
  button?: EmailButton
  footerNote?: string
  accentColor?: string
  hideBranding?: boolean
}): string {
  const {
    preheader = '',
    heading,
    intro = '',
    bodyHtml,
    button,
    footerNote,
    accentColor,
    hideBranding = false,
  } = opts
  const ACCENT = accentColor || PRIMARY
  const year = new Date().getFullYear()
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light dark"/>
<title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:${BG};">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 0;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
    <tr><td style="padding:8px 8px 20px;text-align:center;">
      <span style="font-size:20px;font-weight:800;letter-spacing:.5px;color:${PRIMARY};">${esc(brand.name)}</span>
    </td></tr>
    <tr><td style="background:${CARD};border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.06);">
      <h1 style="margin:0 0 12px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.3;color:${TEXT};">${esc(heading)}</h1>
      ${intro ? `<p style="margin:0 0 16px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${MUTED};">${esc(intro)}</p>` : ''}
      <div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${TEXT};">${bodyHtml}</div>
      ${
        button
          ? `<div style="text-align:center;margin:28px 0 8px;"><a href="${esc(button.url)}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-weight:700;font-size:15px;padding:13px 28px;border-radius:10px;">${esc(button.label)}</a></div>`
          : ''
      }
      ${footerNote ? `<p style="margin:20px 0 0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${MUTED};">${footerNote}</p>` : ''}
    </td></tr>
    ${
      !hideBranding
        ? `<tr><td style="padding:20px 12px;text-align:center;">
      <p style="margin:0 0 6px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};">
        ${esc(brand.tagline || 'Private peer-to-peer file transfer')}
      </p>
      <p style="margin:0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};">
        <a href="${esc(brand.url)}" style="color:${ACCENT};text-decoration:none;">${esc(brand.url.replace(/^https?:\/\//, ''))}</a>
        &nbsp;·&nbsp; © ${year} ${esc(brand.org.legalName || brand.name)}
      </p>
    </td></tr>`
        : `<tr><td style="padding:12px;text-align:center;"><p style="margin:0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};">© ${year} ${esc(brand.org.legalName || brand.name)}</p></td></tr>`
    }
  </table>
</td></tr></table></body></html>`
}

function kv(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;border:1px solid #eee;border-radius:10px;overflow:hidden;">${rows
    .map(
      ([k, v], i) =>
        `<tr style="background:${i % 2 ? '#fafafa' : '#fff'};"><td style="padding:10px 14px;font-size:13px;color:${MUTED};width:38%;">${esc(k)}</td><td style="padding:10px 14px;font-size:14px;color:${TEXT};font-weight:600;">${esc(v)}</td></tr>`,
    )
    .join('')}</table>`
}

// ── Specific templates ──────────────────────────────────────────────────────

export function tplWelcome(name: string): {
  subject: string
  html: string
  text: string
} {
  return {
    subject: `Welcome to ${brand.name} 🎉`,
    text: `Hi ${name}, welcome to ${brand.name}! Your account is ready. Open ${brand.url}/account`,
    html: baseLayout({
      preheader: `Your ${brand.name} account is ready.`,
      heading: `Welcome aboard, ${name}!`,
      intro: `Thanks for creating a ${brand.name} account. You now have access to unlimited, private, peer-to-peer file transfers and the full tool suite.`,
      bodyHtml: `<ul style="margin:0;padding-left:18px;color:${TEXT};"><li>End-to-end encrypted transfers — files never touch a server</li><li>No size limits</li><li>Your private dashboard, profile and tools</li></ul>`,
      button: { label: 'Open your dashboard', url: `${brand.url}/account` },
      footerNote: `If you didn't create this account, you can safely ignore this email.`,
    }),
  }
}

export function tplSignInAlert(
  name: string,
  meta: { time: string; ip?: string; agent?: string },
): {
  subject: string
  html: string
  text: string
} {
  return {
    subject: `New sign-in to your ${brand.name} account`,
    text: `Hi ${name}, a new sign-in to your ${brand.name} account at ${meta.time}. If this wasn't you, reset your password at ${brand.url}/reset-password`,
    html: baseLayout({
      preheader: `New sign-in detected on your account.`,
      heading: `New sign-in detected`,
      intro: `Hi ${name}, we noticed a new sign-in to your ${brand.name} account.`,
      bodyHtml: kv([
        ['Time', meta.time],
        ['IP address', meta.ip || 'unknown'],
        ['Device', meta.agent || 'unknown'],
      ]),
      button: { label: 'Review account security', url: `${brand.url}/account` },
      footerNote: `If this was you, no action is needed. If not, <a href="${brand.url}/reset-password" style="color:${PRIMARY};">reset your password</a> immediately.`,
    }),
  }
}

export function tplAccountDeleted(name: string): {
  subject: string
  html: string
  text: string
} {
  return {
    subject: `Your ${brand.name} account has been deleted`,
    text: `Hi ${name}, your ${brand.name} account and data have been permanently deleted. Sorry to see you go.`,
    html: baseLayout({
      preheader: `Your account has been permanently deleted.`,
      heading: `Account deleted`,
      intro: `Hi ${name}, your ${brand.name} account and associated data have been permanently removed, as requested.`,
      bodyHtml: `<p style="margin:0;color:${TEXT};">We're sorry to see you go. You're always welcome back — just sign up again any time.</p>`,
      button: { label: `Visit ${brand.name}`, url: brand.url },
    }),
  }
}

export function tplContactReceipt(name: string): {
  subject: string
  html: string
  text: string
} {
  return {
    subject: `We received your message — ${brand.name}`,
    text: `Hi ${name}, thanks for contacting ${brand.name}. We've received your message and will reply soon.`,
    html: baseLayout({
      preheader: `Thanks — we received your message.`,
      heading: `Thanks for reaching out!`,
      intro: `Hi ${name}, we've received your message and our team will get back to you shortly.`,
      bodyHtml: `<p style="margin:0;color:${TEXT};">Need a faster response? Message us on WhatsApp at <b>+91 ${esc(brand.contact.whatsapp)}</b>.</p>`,
      button: { label: `Back to ${brand.name}`, url: brand.url },
    }),
  }
}

export function tplContactAdmin(d: {
  name: string
  email: string
  message: string
  ip?: string
}): {
  subject: string
  html: string
  text: string
} {
  return {
    subject: `📨 New contact form message from ${d.name}`,
    text: `From: ${d.name} <${d.email}>\nIP: ${d.ip || '-'}\n\n${d.message}`,
    html: baseLayout({
      preheader: `New contact message from ${d.name}`,
      heading: `New contact message`,
      bodyHtml:
        kv([
          ['Name', d.name],
          ['Email', d.email],
          ['IP', d.ip || '-'],
        ]) +
        `<p style="margin:14px 0 0;color:${TEXT};white-space:pre-wrap;">${esc(d.message)}</p>`,
      button: { label: 'Reply', url: `mailto:${d.email}` },
    }),
  }
}

export function tplTransferSent(d: {
  title: string
  url: string
  fileCount: number
  totalSize: string
  expiresAt: string
  recipientCount: number
}): { subject: string; html: string; text: string } {
  const expiry = new Date(d.expiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return {
    subject: d.title
      ? `Your transfer "${d.title}" is ready`
      : `Your transfer is ready — ${brand.name}`,
    text: `Your transfer is ready to share: ${d.url}\nExpires: ${expiry}`,
    html: baseLayout({
      preheader: `Your files are uploaded and ready to share.`,
      heading: d.title ? `"${d.title}" is ready!` : `Your transfer is ready!`,
      intro: `Your files have been uploaded successfully and are ready to share.`,
      bodyHtml: kv([
        ['Files', `${d.fileCount} file${d.fileCount !== 1 ? 's' : ''}`],
        ['Total size', d.totalSize],
        ['Expires', expiry],
        ...(d.recipientCount > 0
          ? [
              ['Recipients notified', String(d.recipientCount)] as [
                string,
                string,
              ],
            ]
          : []),
      ]),
      button: { label: 'View your transfer', url: d.url },
      footerNote: `Share this link with anyone: ${d.url}`,
    }),
  }
}

export function tplTransferReady(d: {
  title: string
  url: string
  senderMessage: string
  fileCount: number
  totalSize: string
  expiresAt: string
  recipientName?: string
  senderName?: string
  emailAccentColor?: string
  hideBranding?: boolean
  trackingPixelUrl?: string
}): { subject: string; html: string; text: string } {
  const expiry = new Date(d.expiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const greeting = d.recipientName ? `Hi ${d.recipientName}, ` : ''
  const from = d.senderName ? `${d.senderName} via ${brand.name}` : brand.name
  const pixel = d.trackingPixelUrl
    ? `<img src="${esc(d.trackingPixelUrl)}" width="1" height="1" style="display:none" alt="" />`
    : ''
  return {
    subject: d.title
      ? `${d.title} — file transfer via ${from}`
      : `${d.senderName ? d.senderName + ' sent' : 'Someone sent'} you ${d.fileCount} file${d.fileCount !== 1 ? 's' : ''} via ${brand.name}`,
    text: `${greeting}You have a file transfer waiting. Download it at: ${d.url}\nExpires: ${expiry}`,
    html: baseLayout({
      preheader: `You have ${d.fileCount} file${d.fileCount !== 1 ? 's' : ''} waiting for you.`,
      heading: d.title || `You have files waiting`,
      intro: greeting
        ? greeting +
          (d.senderMessage ||
            `someone shared files with you via ${brand.name}.`)
        : d.senderMessage || `Someone shared files with you via ${brand.name}.`,
      bodyHtml:
        kv([
          ['Files', `${d.fileCount} file${d.fileCount !== 1 ? 's' : ''}`],
          ['Total size', d.totalSize],
          ['Expires', expiry],
        ]) + pixel,
      button: { label: 'Download files', url: d.url },
      footerNote: `This link expires on ${expiry}. Files are stored securely on Cloudflare R2.`,
      accentColor: d.emailAccentColor || undefined,
      hideBranding: d.hideBranding,
    }),
  }
}

export function tplTransferDownloaded(d: {
  title: string
  url: string
  downloadCount: number
}): { subject: string; html: string; text: string } {
  return {
    subject: `Your transfer was downloaded — ${brand.name}`,
    text: `Your transfer${d.title ? ` "${d.title}"` : ''} was just downloaded (${d.downloadCount} total). View: ${d.url}`,
    html: baseLayout({
      preheader: `Someone downloaded your transfer.`,
      heading: `Your transfer was downloaded!`,
      intro: `Your file transfer${d.title ? ` "${d.title}"` : ''} was just downloaded for the first time.`,
      bodyHtml: kv([['Downloads so far', String(d.downloadCount)]]),
      button: { label: 'View transfer', url: d.url },
      footerNote: `You received this because you enabled download notifications for this transfer.`,
    }),
  }
}

export function tplCollectInvite(d: {
  requesterName?: string
  ownerName: string
  title: string
  description: string
  url: string
  expiresAt: string
}): { subject: string; html: string; text: string } {
  const expiry = new Date(d.expiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const greeting = d.requesterName ? `Hi ${d.requesterName},` : 'Hi,'
  return {
    subject: `${d.ownerName} is requesting files from you — ${brand.name}`,
    text: `${greeting}\n\n${d.ownerName} has requested files from you: "${d.title}".\n\n${d.description ? d.description + '\n\n' : ''}Upload your files here: ${d.url}\n\nLink expires: ${expiry}`,
    html: baseLayout({
      preheader: `${d.ownerName} is requesting files from you.`,
      heading: `${d.ownerName} wants files from you`,
      intro: `${greeting} ${d.ownerName} has sent you a file request via ${brand.name}.`,
      bodyHtml: kv([
        ['Request', d.title],
        ...(d.description
          ? [['Instructions', d.description] as [string, string]]
          : []),
        ['Upload by', expiry],
      ]),
      button: { label: 'Upload files', url: d.url },
      footerNote: `This upload link expires on ${expiry}. You can upload up to multiple files at once.`,
    }),
  }
}

export function tplDownloadReceipt(d: {
  title: string
  url: string
  fileCount: number
  totalSize: string
  senderName?: string
}): { subject: string; html: string; text: string } {
  const from = d.senderName ? d.senderName : brand.name
  return {
    subject: `Download confirmed — ${d.title || 'your files'} from ${from}`,
    text: `You successfully downloaded ${d.fileCount} file${d.fileCount !== 1 ? 's' : ''} from ${from}. Transfer link: ${d.url}`,
    html: baseLayout({
      preheader: `You downloaded ${d.fileCount} file${d.fileCount !== 1 ? 's' : ''}.`,
      heading: `Download confirmed`,
      intro: `You've successfully downloaded files sent by ${from} via ${brand.name}.`,
      bodyHtml: kv([
        ...(d.title ? [['Transfer', d.title] as [string, string]] : []),
        ['Files', `${d.fileCount} file${d.fileCount !== 1 ? 's' : ''}`],
        ['Size', d.totalSize],
      ]),
      button: { label: 'View transfer', url: d.url },
      footerNote: `You received this because you downloaded files from this transfer link.`,
    }),
  }
}

export function tplTransferExpiring(d: {
  title: string
  url: string
  expiresAt: string
  hoursLeft: number
}): { subject: string; html: string; text: string } {
  const expiry = new Date(d.expiresAt).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const label = d.title ? `"${d.title}"` : 'Your transfer'
  return {
    subject: `${label} expires in ${d.hoursLeft}h — ${brand.name}`,
    text: `${label} will expire in ${d.hoursLeft} hours (${expiry}). Renew or download now: ${d.url}`,
    html: baseLayout({
      preheader: `${label} is expiring soon.`,
      heading: `Your transfer is expiring soon`,
      intro: `${label} will expire in approximately ${d.hoursLeft} hours.`,
      bodyHtml: kv([
        ['Transfer', d.title || '(untitled)'],
        ['Expires', expiry],
      ]),
      button: { label: 'View & renew transfer', url: d.url },
      footerNote: `You received this because you created this transfer. Renew from the transfer page to extend its life.`,
    }),
  }
}

export function tplMalwareAlert(d: {
  title: string
  url: string
  slug: string
}): { subject: string; html: string; text: string } {
  return {
    subject: `⚠️ Malware detected in your transfer — ${brand.name}`,
    text: `Our virus scanner detected malicious content in your transfer${d.title ? ` "${d.title}"` : ''}. Access has been suspended. View: ${d.url}`,
    html: baseLayout({
      preheader: `Malicious content detected in your transfer.`,
      heading: `Malware detected`,
      intro: `Our virus scanner flagged malicious content in your transfer${d.title ? ` "${d.title}"` : ''}. Download access has been automatically suspended.`,
      bodyHtml: kv([
        ...(d.title ? [['Transfer', d.title] as [string, string]] : []),
        ['Action taken', 'Download access suspended'],
      ]),
      button: { label: 'Review transfer', url: d.url },
      footerNote: `Please review and delete this transfer. If you believe this is a false positive, contact support.`,
    }),
  }
}

export function tplWorkspaceInvite(d: {
  inviterName: string
  workspaceName: string
  inviteUrl: string
}): { subject: string; html: string; text: string } {
  return {
    subject: `${d.inviterName} invited you to "${d.workspaceName}" on ${brand.name}`,
    text: `${d.inviterName} has invited you to join the workspace "${d.workspaceName}" on ${brand.name}.\n\nAccept: ${d.inviteUrl}\n\nExpires in 7 days.`,
    html: baseLayout({
      preheader: `You've been invited to join ${d.workspaceName}.`,
      heading: `You're invited to a workspace`,
      intro: `${d.inviterName} has invited you to join the workspace "${d.workspaceName}" on ${brand.name}.`,
      bodyHtml: kv([
        ['Workspace', d.workspaceName],
        ['Invited by', d.inviterName],
        ['Expires', '7 days'],
      ]),
      button: { label: 'Accept invitation', url: d.inviteUrl },
      footerNote: `If you did not expect this invitation, you can safely ignore this email.`,
    }),
  }
}

export function tplRecipientComment(d: {
  transferTitle: string
  commentText: string
  transferUrl: string
}): { subject: string; html: string; text: string } {
  return {
    subject: `New comment on your transfer — ${brand.name}`,
    text: `A recipient left a comment on your transfer${d.transferTitle ? ` "${d.transferTitle}"` : ''}:\n\n"${d.commentText}"\n\nView: ${d.transferUrl}`,
    html: baseLayout({
      preheader: `A recipient commented on your transfer.`,
      heading: `New comment`,
      intro: `A recipient left a comment on your transfer${d.transferTitle ? ` "${d.transferTitle}"` : ''}.`,
      bodyHtml: kv([['Comment', d.commentText]]),
      button: { label: 'View transfer', url: d.transferUrl },
      footerNote: `You received this because you created this transfer.`,
    }),
  }
}

export function tplRecipientReview(d: {
  transferTitle: string
  rating: number
  comment: string
  transferUrl: string
}): { subject: string; html: string; text: string } {
  const stars = '★'.repeat(d.rating) + '☆'.repeat(5 - d.rating)
  return {
    subject: `New review on your transfer — ${brand.name}`,
    text: `A recipient reviewed your transfer${d.transferTitle ? ` "${d.transferTitle}"` : ''}: ${stars}${d.comment ? `\n\n"${d.comment}"` : ''}\n\nView: ${d.transferUrl}`,
    html: baseLayout({
      preheader: `A recipient reviewed your transfer.`,
      heading: `New review`,
      intro: `A recipient rated your transfer${d.transferTitle ? ` "${d.transferTitle}"` : ''}.`,
      bodyHtml: kv([
        ['Rating', `${stars} (${d.rating}/5)`],
        ...(d.comment ? [['Comment', d.comment] as [string, string]] : []),
      ]),
      button: { label: 'View transfer', url: d.transferUrl },
      footerNote: `You received this because you created this transfer.`,
    }),
  }
}

export function tplCriticalAlert(d: { event: string; detail: string }): {
  subject: string
  html: string
  text: string
} {
  return {
    subject: `🚨 [${brand.name}] ${d.event}`,
    text: `Critical/operational event: ${d.event}\n\n${d.detail}`,
    html: baseLayout({
      preheader: `Operational alert: ${d.event}`,
      heading: `⚠️ ${d.event}`,
      intro: `An operational event was recorded on ${brand.name}.`,
      bodyHtml: `<p style="margin:0;color:${TEXT};white-space:pre-wrap;">${esc(d.detail)}</p>`,
      button: { label: 'Open admin', url: `${brand.url}/admin` },
    }),
  }
}
