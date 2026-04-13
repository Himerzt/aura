'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type MoodState = 'energized' | 'stable' | 'anxious' | 'overwhelmed' | 'numb'

interface MoodContextValue {
  mood: MoodState
  setMood: (m: MoodState) => void
}

const MoodContext = createContext<MoodContextValue>({
  mood: 'stable',
  setMood: () => {},
})

export function MoodProvider({ children }: { children: React.ReactNode }) {
  const [mood, setMood] = useState<MoodState>('stable')
  return (
    <MoodContext.Provider value={{ mood, setMood }}>
      {children}
    </MoodContext.Provider>
  )
}

export function useMood() {
  return useContext(MoodContext)
}

/**
 * Applies the current mood as a className on <body>.
 * Kept in a tiny client component so only it re-renders on mood change.
 */
export function MoodBody({ children }: { children: React.ReactNode }) {
  const { mood } = useMood()

  useEffect(() => {
    const body = document.body
    const allMoods: MoodState[] = ['energized', 'stable', 'anxious', 'overwhelmed', 'numb']
    allMoods.forEach((m) => body.classList.remove(`mood-${m}`))
    body.classList.add(`mood-${mood}`)
  }, [mood])

  return <>{children}</>
}
