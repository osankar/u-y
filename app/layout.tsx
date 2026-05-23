import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import PostHogPageView from '@/components/providers/PostHogPageView'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-sans',
  display: 'swap',
})

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
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
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
