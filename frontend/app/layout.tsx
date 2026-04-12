import type { Metadata } from 'next'
import { Cormorant_Garamond, Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import { ThemeProvider } from '@/lib/theme-context'

// Primary luxury display — headlines, AURA logo
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

// Secondary serif — insight text, emotional copy
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display-loaded',
  display: 'swap',
})

// UI body
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
      className={`${cormorant.variable} ${playfair.variable} ${dmSans.variable}`}
    >
      <body
        style={{
          fontFamily: 'var(--font-body-loaded, DM Sans, system-ui, sans-serif)',
        }}
      >
        <ThemeProvider>
          <div className="flex min-h-screen">
            <Navigation />
            <main className="flex-1 md:ml-60">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
