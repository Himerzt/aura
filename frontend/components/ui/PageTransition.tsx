'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
}

/**
 * Wraps page content with a fade + slide-up animation on route change.
 * Uses the `page-enter` CSS class defined in globals.css.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const prevPath = useRef(pathname)

  useEffect(() => {
    // Trigger re-animation on route change
    if (pathname !== prevPath.current) {
      setVisible(false)
      prevPath.current = pathname
      // Force a reflow before re-adding the class
      requestAnimationFrame(() => {
        setVisible(true)
      })
    } else {
      setVisible(true)
    }
  }, [pathname])

  return (
    <div
      key={pathname}
      className={visible ? 'page-enter' : ''}
      style={{ opacity: visible ? undefined : 0 }}
    >
      {children}
    </div>
  )
}
