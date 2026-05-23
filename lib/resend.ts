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

function replyToAddress(replyToken: string): string {
  const domain = FROM().split('@')[1] ?? 'utsavyojana.com'
  return `reply+${replyToken}@${domain}`
}

export async function sendInquiryNotification(payload: {
  vendorEmail: string
  vendorName: string
  guestName: string
  guestEmail: string
  message: string
  replyToken: string
  eventTypeName?: string
}): Promise<{ ok: boolean }> {
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
  } catch (err) {
    console.error('[resend] sendInquiryNotification failed', err)
    return { ok: false }
  }
}

export async function sendVendorRegistrationConfirmation(payload: {
  businessName: string
  contactEmail: string
}): Promise<{ ok: boolean }> {
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
  } catch (err) {
    console.error('[resend] sendVendorRegistrationConfirmation failed', err)
    return { ok: false }
  }
}
