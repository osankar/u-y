import { NextRequest, NextResponse } from 'next/server'
import { logApiError } from '@/lib/log'
import { clientIp, isRateLimited } from '@/lib/rate-limit'
import {
  sendEmailAsync,
  sendInquiryConfirmationToGuest,
  sendInquiryNotification,
} from '@/lib/resend'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import {
  budgetsAreValid,
  isValidEmail,
  isValidUuid,
  parseOptionalNumber,
  parseOptionalPositiveInt,
} from '@/lib/validation'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    provider_id,
    guest_name,
    guest_email,
    guest_phone,
    message,
    event_type_id,
    event_date,
    event_timezone,
    guest_count,
    budget_min,
    budget_max,
    city,
    state,
  } = body as Record<string, unknown>

  const missing: string[] = []
  if (!provider_id) missing.push('provider_id')
  if (!guest_name) missing.push('guest_name')
  if (!guest_email) missing.push('guest_email')
  if (!message) missing.push('message')

  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Missing required fields', fields: missing },
      { status: 400 }
    )
  }

  const providerId = String(provider_id)
  const guestName = String(guest_name).trim()
  const guestEmail = String(guest_email).trim().toLowerCase()
  const inquiryMessage = String(message).trim()

  if (!isValidUuid(providerId)) {
    return NextResponse.json({ error: 'Invalid provider_id' }, { status: 400 })
  }
  if (!isValidEmail(guestEmail)) {
    return NextResponse.json({ error: 'Invalid guest_email' }, { status: 400 })
  }
  if (guestName.length === 0 || inquiryMessage.length === 0) {
    return NextResponse.json({ error: 'Invalid field values' }, { status: 400 })
  }
  if (event_type_id != null && !isValidUuid(String(event_type_id))) {
    return NextResponse.json({ error: 'Invalid event_type_id' }, { status: 400 })
  }

  const parsedGuestCount = parseOptionalPositiveInt(guest_count)
  const parsedBudgetMin = parseOptionalNumber(budget_min)
  const parsedBudgetMax = parseOptionalNumber(budget_max)

  if (
    parsedGuestCount === 'invalid' ||
    parsedBudgetMin === 'invalid' ||
    parsedBudgetMax === 'invalid'
  ) {
    return NextResponse.json({ error: 'Invalid numeric field values' }, { status: 400 })
  }
  if (!budgetsAreValid(parsedBudgetMin, parsedBudgetMax)) {
    return NextResponse.json(
      { error: 'budget_min must be less than or equal to budget_max' },
      { status: 400 }
    )
  }

  const ip = clientIp(request)
  if (isRateLimited(`inquiry:ip:${ip}`) || isRateLimited(`inquiry:email:${guestEmail}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const db = getSupabaseAdmin()

  const { data: provider, error: providerError } = await db
    .from('providers')
    .select('id, status, contact_email, business_name')
    .eq('id', providerId)
    .is('deleted_at', null)
    .single()

  if (providerError || !provider || provider.status !== 'approved') {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  let eventTypeName: string | undefined
  if (event_type_id) {
    const { data: et } = await db
      .from('event_types')
      .select('name')
      .eq('id', String(event_type_id))
      .single()
    eventTypeName = et?.name
  }

  const { data: inquiry, error: inquiryError } = await db
    .from('inquiries')
    .insert({
      provider_id: providerId,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guest_phone ? String(guest_phone) : null,
      message: inquiryMessage,
      event_type_id: event_type_id ? String(event_type_id) : null,
      event_date: event_date ? String(event_date) : null,
      event_timezone: event_timezone ? String(event_timezone) : null,
      guest_count: parsedGuestCount,
      budget_min: parsedBudgetMin,
      budget_max: parsedBudgetMax,
      city: city ? String(city) : null,
      state: state ? String(state) : null,
      status: 'sent',
      currency: 'USD',
    })
    .select('id, reply_token')
    .single()

  if (inquiryError || !inquiry) {
    logApiError('api/inquiries insert', inquiryError?.code)
    return NextResponse.json({ error: 'Inquiry submission failed' }, { status: 500 })
  }

  const { error: messageError } = await db.from('inquiry_messages').insert({
    inquiry_id: inquiry.id,
    sender_role: 'guest',
    body: inquiryMessage,
  })

  if (messageError) {
    logApiError('api/inquiries message insert', messageError.code)
    await db.from('inquiries').delete().eq('id', inquiry.id)
    return NextResponse.json({ error: 'Inquiry submission failed' }, { status: 500 })
  }

  sendEmailAsync('inquiry vendor notification', () =>
    sendInquiryNotification({
      vendorEmail: provider.contact_email,
      vendorName: provider.business_name,
      guestName,
      guestEmail,
      message: inquiryMessage,
      replyToken: inquiry.reply_token,
      eventTypeName,
    })
  )

  sendEmailAsync('inquiry guest confirmation', () =>
    sendInquiryConfirmationToGuest({
      guestEmail,
      guestName,
      vendorName: provider.business_name,
    })
  )

  return NextResponse.json({ inquiry_id: inquiry.id }, { status: 201 })
}
