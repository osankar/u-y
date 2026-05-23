import * as Sentry from '@sentry/nextjs'
import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY must be set')
    _resend = new Resend(key)
  }
  return _resend
}

const FROM = () => process.env.RESEND_FROM_EMAIL ?? 'noreply@utsavyojana.com'
const ADMIN_EMAIL = () => process.env.ADMIN_EMAIL

function replyToAddress(replyToken: string): string {
  const domain = FROM().split('@')[1] ?? 'utsavyojana.com'
  return `reply+${replyToken}@${domain}`
}

export type EmailResult = { ok: boolean }

/** Fire-and-forget — email failure must not fail the DB write. */
export function sendEmailAsync(
  label: string,
  send: () => Promise<EmailResult>
): void {
  void send().then((result) => {
    if (!result.ok) {
      Sentry.captureMessage(`${label} failed`, 'warning')
    }
  })
}

export async function sendInquiryNotification(payload: {
  vendorEmail: string
  vendorName: string
  guestName: string
  guestEmail: string
  message: string
  replyToken: string
  eventTypeName?: string
}): Promise<EmailResult> {
  try {
    await getResend().emails.send({
      from: FROM(),
      to: payload.vendorEmail,
      replyTo: replyToAddress(payload.replyToken),
      subject: `New inquiry${payload.eventTypeName ? ` for ${payload.eventTypeName}` : ''} — ${payload.guestName}`,
      text: [
        `Hi ${payload.vendorName},`,
        '',
        `You have a new inquiry from ${payload.guestName} (${payload.guestEmail}).`,
        '',
        payload.message,
        '',
        'Reply to this email to respond directly. Your email address will not be shared with the inquirer.',
      ].join('\n'),
    })
    return { ok: true }
  } catch {
    console.error('[resend] sendInquiryNotification failed')
    return { ok: false }
  }
}

export async function sendInquiryConfirmationToGuest(payload: {
  guestEmail: string
  guestName: string
  vendorName: string
}): Promise<EmailResult> {
  try {
    await getResend().emails.send({
      from: FROM(),
      to: payload.guestEmail,
      subject: `We sent your inquiry to ${payload.vendorName}`,
      text: [
        `Hi ${payload.guestName},`,
        '',
        `Your message to ${payload.vendorName} is on its way. They'll reply to you by email — usually within a few days.`,
        '',
        "If you don't hear back, try another vendor or send a follow-up from the same email address you used here.",
        '',
        '— The Utsav Yojana team',
      ].join('\n'),
    })
    return { ok: true }
  } catch {
    console.error('[resend] sendInquiryConfirmationToGuest failed')
    return { ok: false }
  }
}

export async function sendVendorRegistrationConfirmation(payload: {
  businessName: string
  contactEmail: string
}): Promise<EmailResult> {
  try {
    await getResend().emails.send({
      from: FROM(),
      to: payload.contactEmail,
      subject: `We received your listing request — ${payload.businessName}`,
      text: [
        `Hi,`,
        '',
        `Thanks for submitting ${payload.businessName} to Utsav Yojana. We review each listing manually and will be in touch within a few business days.`,
        '',
        "You don't need to do anything else right now.",
        '',
        '— The Utsav Yojana team',
      ].join('\n'),
    })
    return { ok: true }
  } catch {
    console.error('[resend] sendVendorRegistrationConfirmation failed')
    return { ok: false }
  }
}

export async function sendVendorRegistrationAdminAlert(payload: {
  businessName: string
  slug: string
  city: string
  state: string
  providerId: string
}): Promise<EmailResult> {
  const adminEmail = ADMIN_EMAIL()
  if (!adminEmail) return { ok: true }

  try {
    await getResend().emails.send({
      from: FROM(),
      to: adminEmail,
      subject: `New vendor listing to review — ${payload.businessName}`,
      text: [
        'A new vendor submitted a listing for manual review.',
        '',
        `Business: ${payload.businessName}`,
        `Slug: ${payload.slug}`,
        `Location: ${payload.city}, ${payload.state}`,
        `Provider ID: ${payload.providerId}`,
        '',
        'Review in Supabase Studio and set status to approved or rejected.',
      ].join('\n'),
    })
    return { ok: true }
  } catch {
    console.error('[resend] sendVendorRegistrationAdminAlert failed')
    return { ok: false }
  }
}
