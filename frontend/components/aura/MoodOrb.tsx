'use client'

type MoodState = 'energized' | 'stable' | 'anxious' | 'overwhelmed' | 'numb'

interface MoodOrbProps {
  mood?: MoodState
  size?: number
  animated?: boolean
}

const moodColors: Record<MoodState, { primary: string; glow: string }> = {
  energized:   { primary: '#F5A623', glow: 'rgba(245,166,35,0.4)' },
  stable:      { primary: '#A8C4E0', glow: 'rgba(168,196,224,0.3)' },
  anxious:     { primary: '#C4A8E0', glow: 'rgba(196,168,224,0.3)' },
  overwhelmed: { primary: '#D4848A', glow: 'rgba(212,132,138,0.3)' },
  numb:        { primary: '#5C6B7A', glow: 'rgba(92,107,122,0.2)' },
}

export default function MoodOrb({
  mood = 'stable',
  size = 120,
  animated = true,
}: MoodOrbProps) {
  const colors = moodColors[mood]
  const inset = Math.round(size * 0.133) // ~16px for 120

  const outerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    position: 'relative',
    flexShrink: 0,
    background: `radial-gradient(circle at 35% 35%, ${colors.primary} 0%, transparent 70%)`,
    boxShadow: animated
      ? `0 0 30px ${colors.glow}, 0 0 60px ${colors.glow}`
      : 'none',
    animation: animated
      ? 'glowPulse 3s ease-in-out infinite, auraFloat 6s ease-in-out infinite'
      : undefined,
  }

  const innerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: inset,
    borderRadius: '50%',
    background: colors.primary,
    opacity: 0.2,
    filter: 'blur(8px)',
  }

  return (
    <div style={outerStyle} aria-label={`Mood: ${mood}`} role="img">
      <div style={innerStyle} />
    </div>
  )
}
