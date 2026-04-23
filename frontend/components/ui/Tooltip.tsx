'use client'

import { useId } from 'react'

interface TooltipProps {
  text: string
  children: React.ReactNode
}

/**
 * Pure CSS tooltip.
 * Desktop: hover to show. Mobile: tap to show, tap outside to close (via blur).
 * Screen readers: aria-describedby links to tooltip content.
 */
export default function Tooltip({ text, children }: TooltipProps) {
  const id = useId()

  return (
    <span className="tooltip-wrapper" tabIndex={0} aria-describedby={id}>
      {children}
      <span id={id} className="tooltip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  )
}
