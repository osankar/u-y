import { NextRequest, NextResponse } from 'next/server'
import { logApiError } from '@/lib/log'
import {
  sendEmailAsync,
  sendVendorRegistrationAdminAlert,
  sendVendorRegistrationConfirmation,
} from '@/lib/resend'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { isValidEmail, isValidSlug, parsePriceUnit } from '@/lib/validation'

async function rollbackProvider(db: ReturnType<typeof getSupabaseAdmin>, providerId: string) {
  await db.from('provider_category_map').delete().eq('provider_id', providerId)
  await db.from('provider_locations').delete().eq('provider_id', providerId)
  await db.from('providers').delete().eq('id', providerId)
}

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

  const businessName = String(business_name).trim()
  const slugValue = String(slug).trim().toLowerCase()
  const contactEmail = String(contact_email).trim().toLowerCase()
  const cityValue = String(city).trim()
  const stateValue = String(state).trim()

  if (businessName.length === 0) {
    return NextResponse.json({ error: 'Invalid business_name' }, { status: 400 })
  }
  if (!isValidSlug(slugValue)) {
    return NextResponse.json(
      { error: 'Invalid slug — use lowercase letters, numbers, and hyphens (3–80 chars)' },
      { status: 400 }
    )
  }
  if (!isValidEmail(contactEmail)) {
    return NextResponse.json({ error: 'Invalid contact_email' }, { status: 400 })
  }

  const parsedPriceUnit = parsePriceUnit(price_unit)
  if (price_unit != null && price_unit !== '' && parsedPriceUnit === null) {
    return NextResponse.json({ error: 'Invalid price_unit' }, { status: 400 })
  }

  const priceLow =
    price_range_low != null && price_range_low !== '' ? Number(price_range_low) : null
  const priceHigh =
    price_range_high != null && price_range_high !== '' ? Number(price_range_high) : null

  if (
    (priceLow != null && !Number.isFinite(priceLow)) ||
    (priceHigh != null && !Number.isFinite(priceHigh)) ||
    (priceLow != null && priceHigh != null && priceLow > priceHigh)
  ) {
    return NextResponse.json({ error: 'Invalid price range' }, { status: 400 })
  }

  if (Array.isArray(category_ids)) {
    for (const catId of category_ids) {
      if (typeof catId !== 'string' || catId.length === 0) {
        return NextResponse.json({ error: 'Invalid category_ids' }, { status: 400 })
      }
    }
  }

  const db = getSupabaseAdmin()

  const { data: provider, error: providerError } = await db
    .from('providers')
    .insert({
      business_name: businessName,
      slug: slugValue,
      contact_email: contactEmail,
      contact_phone: contact_phone ? String(contact_phone) : null,
      description: description ? String(description) : null,
      website_url: website_url ? String(website_url) : null,
      instagram_url: instagram_url ? String(instagram_url) : null,
      price_range_low: priceLow,
      price_range_high: priceHigh,
      price_unit: parsedPriceUnit,
      requested_category_text: requested_category_text ? String(requested_category_text) : null,
      status: 'pending',
      currency: 'USD',
    })
    .select('id')
    .single()

  if (providerError || !provider) {
    if (providerError?.code === '23505') {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
    }
    logApiError('api/vendors/register provider insert', providerError?.code)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }

  const { error: locationError } = await db.from('provider_locations').insert({
    provider_id: provider.id,
    city: cityValue,
    state: stateValue,
    is_primary: true,
    country: 'US',
  })

  if (locationError) {
    logApiError('api/vendors/register location insert', locationError.code)
    await rollbackProvider(db, provider.id)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }

  if (Array.isArray(category_ids) && category_ids.length > 0) {
    const { error: catError } = await db.from('provider_category_map').insert(
      category_ids.map((cat_id: unknown) => ({
        provider_id: provider.id,
        category_id: String(cat_id),
      }))
    )
    if (catError) {
      logApiError('api/vendors/register category map insert', catError.code)
      await rollbackProvider(db, provider.id)
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
    }
  }

  sendEmailAsync('vendor registration confirmation', () =>
    sendVendorRegistrationConfirmation({
      businessName,
      contactEmail,
    })
  )

  sendEmailAsync('vendor registration admin alert', () =>
    sendVendorRegistrationAdminAlert({
      businessName,
      slug: slugValue,
      city: cityValue,
      state: stateValue,
      providerId: provider.id,
    })
  )

  return NextResponse.json({ provider_id: provider.id }, { status: 201 })
}
