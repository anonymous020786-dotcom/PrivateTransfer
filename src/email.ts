import 'server-only'
import nodemailer from 'nodemailer'
import { brand } from './brand'
import { getAdminEmails } from './supabase/config'
import { getAllSettings, isFeatureEnabled } from './lib/appSettings'

// Email delivery via Hostinger SMTP (or any SMTP provider).
// Config is read from the app_settings DB table first, falling back to env vars.
// If neither is present, messages are logged and skipped gracefully.
//
// Env var fallbacks:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

type SmtpConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

async function getSmtpConfig(): Promise<SmtpConfig | null> {
  // Try DB settings first (allows changing without redeploy).
  try {
    const s = await getAllSettings()
    const host = s.smtp_host || process.env.SMTP_HOST
    const user = s.smtp_user || process.env.SMTP_USER
    const pass = s.smtp_pass || process.env.SMTP_PASS
    if (host && user && pass) {
      return {
        host,
        port: Number(s.smtp_port || process.env.SMTP_PORT || 465),
        user,
        pass,
        from: s.smtp_from || process.env.SMTP_FROM || user,
      }
    }
  } catch {
    // DB unavailable — fall through to env vars only.
  }

  // Pure env-var fallback.
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  return {
    host,
    port: Number(process.env.SMTP_PORT || 465),
    user,
    pass,
    from: process.env.SMTP_FROM || user,
  }
}

export async function isEmailConfigured(): Promise<boolean> {
  return (await getSmtpConfig()) !== null
}

// Transporter is rebuilt whenever config changes (DB values may update).
// We don't cache it indefinitely to ensure fresh credentials are always used.
let _transporter: {
  config: SmtpConfig
  transport: nodemailer.Transporter
} | null = null

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const cfg = await getSmtpConfig()
  if (!cfg) return null

  if (
    _transporter &&
    _transporter.config.host === cfg.host &&
    _transporter.config.user === cfg.user &&
    _transporter.config.pass === cfg.pass
  ) {
    return _transporter.transport
  }

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  })
  _transporter = { config: cfg, transport }
  return transport
}

export type SendResult = { success: boolean; reason?: string }

export async function sendMail({
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  to?: string
  subject: string
  text: string
  html?: string
  replyTo?: string
}): Promise<SendResult> {
  const enabled = await isFeatureEnabled('feature_email_notifications', true)
  if (!enabled) {
    console.info('[email] notifications disabled — skipping:', { subject })
    return { success: false, reason: 'disabled' }
  }

  const cfg = await getSmtpConfig()
  if (!cfg) {
    console.warn('[email] SMTP not configured — message not sent:', { subject })
    return { success: false, reason: 'not_configured' }
  }

  try {
    const transport = await getTransporter()
    if (!transport) return { success: false, reason: 'not_configured' }
    await transport.sendMail({
      from: cfg.from,
      to: to || brand.contact.email,
      subject,
      text,
      html,
      replyTo,
    })
    return { success: true }
  } catch (err) {
    console.error('[email] send failed:', err)
    return { success: false, reason: 'send_failed' }
  }
}

export async function notifyAdmins(msg: {
  subject: string
  text: string
  html?: string
}): Promise<void> {
  const admins = getAdminEmails()
  if (admins.length === 0) return
  await Promise.allSettled(admins.map((to) => sendMail({ to, ...msg })))
}

export function sendMailBg(args: Parameters<typeof sendMail>[0]): void {
  sendMail(args).catch((e) => console.error('[email] bg send failed:', e))
}
