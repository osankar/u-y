'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, useState } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com'
    if (!key) return
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      person_profiles: 'identified_only',
    })
    setEnabled(true)
  }, [])

  if (!enabled) return <>{children}</>

  return <PHProvider client={posthog}>{children}</PHProvider>
}
