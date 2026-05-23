import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import PostHogPageView from '@/components/providers/PostHogPageView'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    template: '%s | Utsav Yojana',
    default: 'Utsav Yojana — Find Indian event vendors in the US',
  },
  description:
    'Find Indian event vendors for your wedding, puja, sangeet, mehndi, and more. Browse photographers, caterers, decorators, and other vendors across US cities.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>
          <Header />
          <main>{children}</main>
          <Suspense>
            <PostHogPageView />
          </Suspense>
          <Footer />
        </PostHogProvider>
      </body>
    </html>
  )
}
