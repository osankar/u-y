import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendVendorRegistrationConfirmation } from '@/lib/resend'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    business_name,
    slug,
    contact_email,
    city,
    state,
    contact_phone,
    description,
    website_url,
    instagram_url,
    price_range_low,
    price_range_high,
    price_unit,
    requested_category_text,
    category_ids,
  } = body as Record<string, unknown>

  const missing: string[] = []
  if (!business_name) missing.push('business_name')
  if (!slug) missing.push('slug')
  if (!contact_email) missing.push('contact_email')
  if (!city) missing.push('city')
  if (!state) missing.push('state')

  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Missing required fields', fields: missing },
      { status: 400 }
    )
  }

  const db = getSupabaseAdmin()

  const { data: provider, error: providerError } = await db
    .from('providers')
    .insert({
      business_name: String(business_name),
      slug: String(slug),
      contact_email: String(contact_email),
      contact_phone: contact_phone ? String(contact_phone) : null,
      description: description ? String(description) : null,
      website_url: website_url ? String(website_url) : null,
      instagram_url: instagram_url ? String(instagram_url) : null,
      price_range_low: price_range_low != null ? Number(price_range_low) : null,
      price_range_high: price_range_high != null ? Number(price_range_high) : null,
      price_unit: price_unit as 'event' | 'hour' | 'person' | 'package' | 'day' | null ?? null,
      requested_category_text: requested_category_text ? String(requested_category_text) : null,
      status: 'pending',
      currency: 'USD',
    })
    .select('id')
    .single()

  if (providerError || !provider) {
    console.error('[api/vendors/register] provider insert error', providerError)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }

  const { error: locationError } = await db
    .from('provider_locations')
    .insert({
      provider_id: provider.id,
      city: String(city),
      state: String(state),
      is_primary: true,
      country: 'US',
    })

  if (locationError) {
    console.error('[api/vendors/register] location insert error', locationError)
  }

  if (Array.isArray(category_ids) && category_ids.length > 0) {
    const { error: catError } = await db
      .from('provider_category_map')
      .insert(
        category_ids.map((cat_id: unknown) => ({
          provider_id: provider.id,
          category_id: String(cat_id),
        }))
      )
    if (catError) {
      console.error('[api/vendors/register] category map insert error', catError)
    }
  }

  sendVendorRegistrationConfirmation({
    businessName: String(business_name),
    contactEmail: String(contact_email),
  })

  return NextResponse.json({ provider_id: provider.id }, { status: 201 })
}
