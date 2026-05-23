import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendInquiryNotification } from '@/lib/resend'

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

  // Verify provider exists and is approved — use getSupabaseAdmin() to access contact_email
  const { data: provider, error: providerError } = await getSupabaseAdmin()
    .from('providers')
    .select('id, status, contact_email, business_name')
    .eq('id', String(provider_id))
    .single()

  if (providerError || !provider || provider.status !== 'approved') {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  // Fetch event type name if provided (for email subject)
  let eventTypeName: string | undefined
  if (event_type_id) {
    const { data: et } = await getSupabaseAdmin()
      .from('event_types')
      .select('name')
      .eq('id', String(event_type_id))
      .single()
    eventTypeName = et?.name
  }

  const { data: inquiry, error: inquiryError } = await getSupabaseAdmin()
    .from('inquiries')
    .insert({
      provider_id: String(provider_id),
      guest_name: String(guest_name),
      guest_email: String(guest_email),
      guest_phone: guest_phone ? String(guest_phone) : null,
      message: String(message),
      event_type_id: event_type_id ? String(event_type_id) : null,
      event_date: event_date ? String(event_date) : null,
      event_timezone: event_timezone ? String(event_timezone) : null,
      guest_count: guest_count != null ? Number(guest_count) : null,
      budget_min: budget_min != null ? Number(budget_min) : null,
      budget_max: budget_max != null ? Number(budget_max) : null,
      city: city ? String(city) : null,
      state: state ? String(state) : null,
      status: 'sent',
      currency: 'USD',
    })
    .select('id, reply_token')
    .single()

  if (inquiryError || !inquiry) {
    console.error('[api/inquiries] insert error', inquiryError)
    return NextResponse.json({ error: 'Inquiry submission failed' }, { status: 500 })
  }

  sendInquiryNotification({
    vendorEmail: provider.contact_email,
    vendorName: provider.business_name,
    guestName: String(guest_name),
    guestEmail: String(guest_email),
    message: String(message),
    replyToken: inquiry.reply_token,
    eventTypeName,
  })

  return NextResponse.json({ inquiry_id: inquiry.id }, { status: 201 })
}
