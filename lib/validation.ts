const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const PRICE_UNITS = ['event', 'hour', 'person', 'package', 'day'] as const
export type PriceUnit = (typeof PRICE_UNITS)[number]

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function isValidSlug(value: string): boolean {
  const slug = value.trim()
  return slug.length >= 3 && slug.length <= 80 && SLUG_RE.test(slug)
}

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value.trim())
}

export function parsePriceUnit(value: unknown): PriceUnit | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return null
  return PRICE_UNITS.includes(value as PriceUnit) ? (value as PriceUnit) : null
}

export function parseOptionalPositiveInt(
  value: unknown
): number | null | 'invalid' {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) return 'invalid'
  return n
}

export function parseOptionalNumber(value: unknown): number | null | 'invalid' {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 'invalid'
  return n
}

export function budgetsAreValid(min: number | null, max: number | null): boolean {
  if (min == null || max == null) return true
  return min <= max
}
