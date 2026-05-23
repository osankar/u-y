import * as Sentry from '@sentry/nextjs'
import { tracesSampleRate } from '@/lib/sentry'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate,
  debug: false,
})
