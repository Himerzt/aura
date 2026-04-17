'use client'

type MoodState = 'energized' | 'stable' | 'anxious' | 'overwhelmed' | 'numb'

interface MoodOrbProps {
  mood?: MoodState
  size?: number
  animated?: boolean
  energy?: number // 1-10, controls glow intensity & pulse speed
}

const moodColors: Record<MoodState, { primary: string; glow: string }> = {
  energized:   { primary: '#F5A623', glow: 'rgba(245,166,35,0.4)' },
  stable:      { primary: '#A8C4E0', glow: 'rgba(168,196,224,0.3)' },
  anxious:     { primary: '#C4A8E0', glow: 'rgba(196,168,224,0.3)' },
  overwhelmed: { primary: '#D4848A', glow: 'rgba(212,132,138,0.3)' },
  numb:        { primary: '#5C6B7A', glow: 'rgba(92,107,122,0.2)' },
}

/**
 * Map energy (1-10) to pulse duration and glow spread.
 * High energy → fast pulse, large glow.
 * Low energy  → slow pulse, subtle glow.
 */
function getEnergyStyle(energy: number) {
  const clamped = Math.max(1, Math.min(10, energy))
  // Pulse: 5s at energy 1 → 1.5s at energy 10
  const pulseDuration = 5 - (clamped - 1) * (3.5 / 9)
  // Float: 8s at energy 1 → 3s at energy 10
  const floatDuration = 8 - (clamped - 1) * (5 / 9)
  // Glow spread multiplier: 0.5x at energy 1 → 1.8x at energy 10
  const glowMultiplier = 0.5 + (clamped - 1) * (1.3 / 9)
  return { pulseDuration, floatDuration, glowMultiplier }
}

export default function MoodOrb({
  mood = 'stable',
  size = 120,
  animated = true,
  energy = 5,
}: MoodOrbProps) {
  const colors = moodColors[mood]
  const inset = Math.round(size * 0.133)
  const { pulseDuration, floatDuration, glowMultiplier } = getEnergyStyle(energy)

  const baseGlowSize = 30 * glowMultiplier
  const outerGlowSize = 60 * glowMultiplier

  const outerStyle: React.CSSProperties = {
    '--orb-glow': colors.glow,
    width: size,
    height: size,
    borderRadius: '50%',
    position: 'relative',
    flexShrink: 0,
    background: `radial-gradient(circle at 35% 35%, ${colors.primary} 0%, transparent 70%)`,
    boxShadow: animated
      ? `0 0 ${baseGlowSize}px ${colors.glow}, 0 0 ${outerGlowSize}px ${colors.glow}`
      : 'none',
    animation: animated
      ? `glowPulse ${pulseDuration}s ease-in-out infinite, auraFloat ${floatDuration}s ease-in-out infinite`
      : undefined,
    transition: 'box-shadow 0.8s ease',
  } as React.CSSProperties

  const innerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: inset,
    borderRadius: '50%',
    background: colors.primary,
    opacity: 0.15 + energy * 0.02, // subtle brightness with energy
    filter: `blur(${8 + energy * 0.5}px)`,
    transition: 'opacity 0.6s ease, filter 0.6s ease',
  }

  return (
    <div style={outerStyle} aria-label={`Mood: ${mood}, Energy: ${energy}`} role="img">
      <div style={innerStyle} />
    </div>
  )
}
