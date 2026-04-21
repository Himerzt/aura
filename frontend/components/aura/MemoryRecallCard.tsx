'use client'

import type { MemoryRecallMatch } from '@/lib/api'

const MOOD_LABELS: Record<string, string> = {
  energized: 'tran nang luong',
  stable: 'on dinh',
  anxious: 'lo au',
  overwhelmed: 'qua tai',
  numb: 'te liet',
}

export default function MemoryRecallCard({ match }: { match: MemoryRecallMatch }) {
  const moodLabel = MOOD_LABELS[match.mood] ?? match.mood

  return (
    <div
      className="glass-card anim-fade-in-up"
      style={{
        padding: 24,
        borderLeft: '2px solid var(--mood-color)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <p
        style={{
          margin: '0 0 10px',
          fontSize: '0.7rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        {'AURA nh\u1EDB'}
      </p>

      <p
        style={{
          margin: '0 0 14px',
          fontSize: '0.92rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}
      >
        {match.days_ago} {`ng\u00E0y tr\u01B0\u1EDBc b\u1EA1n c\u0169ng `}
        <span style={{ color: 'var(--mood-color)', fontWeight: 500 }}>{moodLabel}</span>
        {` nh\u01B0 h\u00F4m nay. Ng\u00E0y \u0111\u00F3 b\u1EA1n \u0111\u00E3 ho\u00E0n th\u00E0nh `}
        <b style={{ color: 'var(--text-primary)' }}>
          {match.tasks_done}/{match.tasks_total}
        </b>
        {' task.'}
      </p>

      <blockquote
        style={{
          margin: '0 0 8px',
          padding: '14px 18px',
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--mood-color) 8%, var(--bg-elevated))',
          borderLeft: '3px solid var(--mood-color)',
          fontSize: '1rem',
          color: 'var(--text-primary)',
          lineHeight: 1.65,
          fontStyle: 'italic',
          fontFamily: 'var(--font-heading, Sora, system-ui)',
          fontWeight: 500,
        }}
      >
        &ldquo;{match.user_quote}&rdquo;
      </blockquote>

      <p
        style={{
          margin: '8px 0 0',
          fontSize: '0.76rem',
          color: 'var(--text-tertiary)',
        }}
      >
        {`\u2014 Ch\u00EDnh b\u1EA1n, ng\u00E0y ${match.date}`}
      </p>
    </div>
  )
}
