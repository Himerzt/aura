'use client'

import { useState } from 'react'

interface Task {
  id?: number
  title: string
  implementation: string
  estimated_minutes: number
  difficulty?: 'very_easy' | 'easy' | 'medium' | 'hard'
  completed?: boolean
}

interface TaskCardProps {
  task: Task
  onToggle?: (completed: boolean) => void
  animationDelay?: number
}

const difficultyLabels: Record<string, string> = {
  very_easy: 'Rất dễ',
  easy:      'Dễ',
  medium:    'Vừa',
  hard:      'Khó',
}

const difficultyColors: Record<string, string> = {
  very_easy: 'var(--sage)',
  easy:      'var(--sage)',
  medium:    'var(--amber)',
  hard:      'var(--rose)',
}

export default function TaskCard({
  task,
  onToggle,
  animationDelay = 0,
}: TaskCardProps) {
  const [completed, setCompleted] = useState(task.completed ?? false)
  const [popping, setPopping] = useState(false)

  function handleToggle() {
    const next = !completed
    setCompleted(next)
    if (next) {
      setPopping(true)
      setTimeout(() => setPopping(false), 350)
    }
    onToggle?.(next)
  }

  const borderColor = completed ? 'var(--sage)' : 'var(--amber)'

  return (
    <div
      style={{
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-default)',
        borderLeft: `2px solid ${borderColor}`,
        borderRadius: 'var(--card-radius, 16px)',
        padding: '16px 20px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        opacity: 0,
        animation: 'fadeIn 0.4s ease forwards',
        animationDelay: `${animationDelay}ms`,
        transition: 'border-color 0.25s ease',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        aria-label={completed ? 'Đánh dấu chưa xong' : 'Đánh dấu xong'}
        style={{
          width: 24,
          height: 24,
          minWidth: 24,
          borderRadius: 6,
          border: `1.5px solid ${completed ? 'var(--sage)' : 'var(--border-default)'}`,
          background: completed ? 'var(--sage)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          marginTop: 2,
          transition: 'background 0.2s ease, border-color 0.2s ease',
          animation: popping ? 'checkPop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
        }}
      >
        {completed && (
          <svg
            width="12"
            height="10"
            viewBox="0 0 12 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M1 5L4.5 8.5L11 1"
              stroke="#0C0C18"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base, 1rem)',
            fontWeight: 400,
            color: 'var(--text-primary)',
            textDecoration: completed ? 'line-through' : 'none',
            opacity: completed ? 0.6 : 1,
            transition: 'opacity 0.25s ease, text-decoration 0.25s ease',
            lineHeight: 1.4,
          }}
        >
          {task.title}
        </p>

        <p
          style={{
            margin: '6px 0 0',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm, 0.875rem)',
            fontStyle: 'italic',
            color: 'var(--ice)',
            lineHeight: 1.5,
            opacity: completed ? 0.5 : 0.85,
          }}
        >
          {task.implementation}
        </p>

        {/* Badges */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 10,
            flexWrap: 'wrap',
          }}
        >
          {/* Duration badge */}
          <span
            style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-body)',
              color: 'var(--text-secondary)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 999,
              padding: '2px 10px',
              letterSpacing: '0.03em',
            }}
          >
            {task.estimated_minutes} phút
          </span>

          {/* Difficulty badge */}
          {task.difficulty && (
            <span
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-body)',
                color: difficultyColors[task.difficulty],
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${difficultyColors[task.difficulty]}40`,
                borderRadius: 999,
                padding: '2px 10px',
                letterSpacing: '0.03em',
              }}
            >
              {difficultyLabels[task.difficulty]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
