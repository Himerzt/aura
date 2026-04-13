import type { Metadata } from 'next'
import { Sora, DM_Sans } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import { ThemeProvider } from '@/lib/theme-context'
import { MoodProvider, MoodBody } from '@/lib/mood-context'

// Heading — Sora, wide tracking, weight 600-700
const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
})

// Body — DM Sans, weight 400-500
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body-loaded',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AURA — AI Life Coach',
  description: 'Nhận diện pattern tâm lý, hành động có chủ đích mỗi ngày.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      data-theme="dark"
      className={`${sora.variable} ${dmSans.variable}`}
    >
      <body>
        <ThemeProvider>
          <MoodProvider>
            <MoodBody>
              {/* Aura background — sits behind everything via z-index: 0 */}
              <div className="aura-bg" aria-hidden="true" />
              <div className="flex min-h-screen">
                <Navigation />
                <main className="flex-1 md:ml-60">{children}</main>
              </div>
            </MoodBody>
          </MoodProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
