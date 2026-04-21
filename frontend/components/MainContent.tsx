'use client'

import { usePathname } from 'next/navigation'

const AUTH_ROUTES = ['/login', '/register']

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuth = AUTH_ROUTES.includes(pathname ?? '')

  return (
    <main className={`flex-1 ${isAuth ? '' : 'md:ml-60'}`}>
      {children}
    </main>
  )
}
