'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import posthog from 'posthog-js'

export default function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const url = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}
