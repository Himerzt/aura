'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getProfile,
  getStreak,
  getHistory,
  getToday,
  getWeeklyInsight,
  getPatternRadar,
  getEnergyMoodMatrix,
  getMemoryRecall,
  getPatternAlert,
  getWeeklyLetter,
  markWeeklyLetterRead,
  getBadDayMessages,
  postBadDayMessage,
  type WeeklyInsightResponse,
  type PatternRadarResponse,
  type EnergyMoodPoint,
  type MemoryRecallResponse,
  type PatternAlertResponse,
  type WeeklyLetterResponse,
  type WeeklyLetterArchiveItem,
  type BadDayMessageEntry,
} from '@/lib/api'
import type { Framework } from '@/lib/types'
import { useMood } from '@/lib/mood-context'
import StreakDisplay from '@/components/aura/StreakDisplay'
import MilestoneToast from '@/components/aura/MilestoneToast'
import MemoryRecallCard from '@/components/aura/MemoryRecallCard'
import ErrorCard from '@/components/ui/ErrorCard'
// DashboardSkeleton removed — using per-section SectionSkeleton instead
import type { DayEntry, MoodState, UserProfile, StreakInfo } from '@/lib/types'

// ── History entry as returned by GET /api/history ──
interface HistoryDay extends DayEntry {
  date: string
}

const MOOD_LABELS: Record<MoodState, string> = {
  energized: 'Tràn năng lượng',
  stable: 'Ổn định',
  anxious: 'Lo âu',
  overwhelmed: 'Quá tải',
  numb: 'Tê liệt',
}

const MOOD_COLORS: Record<MoodState, string> = {
  energized: 'var(--mood-energized)',
  stable: 'var(--mood-stable)',
  anxious: 'var(--mood-anxious)',
  overwhelmed: 'var(--mood-overwhelmed)',
  numb: 'var(--mood-numb)',
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export default function DashboardPage() {
  const router = useRouter()
  const { setMood } = useMood()
  // Progressive loading: 3 priority groups
  const [coreReady, setCoreReady] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  const [extrasReady, setExtrasReady] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [streak, setStreak] = useState<StreakInfo | null>(null)
  const [history, setHistory] = useState<HistoryDay[]>([])
  const [today, setToday] = useState<DayEntry | null>(null)
  const [weeklyInsight, setWeeklyInsight] = useState<WeeklyInsightResponse | null>(null)
  const [radar, setRadar] = useState<PatternRadarResponse | null>(null)
  const [energyMood, setEnergyMood] = useState<EnergyMoodPoint[]>([])
  const [memoryRecall, setMemoryRecall] = useState<MemoryRecallResponse | null>(null)
  const [patternAlertData, setPatternAlertData] = useState<PatternAlertResponse | null>(null)
  const [weeklyLetter, setWeeklyLetter] = useState<WeeklyLetterResponse | null>(null)
  const [badDayMessages, setBadDayMessages] = useState<BadDayMessageEntry[]>([])
  const [badDaySaved, setBadDaySaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    setCoreReady(false)
    setHistoryReady(false)
    setExtrasReady(false)
    setError(null)

    // P1 — greeting, streak, quick stats, CTAs (fastest, most visible)
    Promise.all([getProfile(), getStreak(), getToday()])
      .then(([prof, str, tod]) => {
        if (cancelled) return
        setProfile(prof)
        setStreak(str)
        setToday(tod)
        if (tod?.morning?.mood_state) {
          setMood(tod.morning.mood_state as MoodState)
        }
        setCoreReady(true)
      })
      .catch((e) => {
        if (!cancelled) setError(e)
      })

    // P2 — history-dependent sections + lightweight lookups
    Promise.all([
      getHistory() as Promise<HistoryDay[]>,
      getMemoryRecall().catch(() => null),
      getPatternAlert().catch(() => null),
      getBadDayMessages().catch(() => ({ messages: [] as BadDayMessageEntry[] })),
    ])
      .then(([hist, mrRes, paRes, bdmRes]) => {
        if (cancelled) return
        setHistory(hist)
        setMemoryRecall(mrRes)
        setPatternAlertData(paRes)
        setBadDayMessages(bdmRes?.messages ?? [])
        setHistoryReady(true)
      })
      .catch(() => {
        if (!cancelled) setHistoryReady(true) // degrade gracefully
      })

    // P3 — heavier analytics + weekly content
    Promise.all([
      getWeeklyInsight(),
      getPatternRadar(30).catch(() => null),
      getEnergyMoodMatrix().catch(() => ({ data: [] as EnergyMoodPoint[] })),
      getWeeklyLetter().catch(() => null),
    ])
      .then(([wi, radarRes, emRes, wlRes]) => {
        if (cancelled) return
        setWeeklyInsight(wi)
        setRadar(radarRes)
        setEnergyMood(emRes?.data ?? [])
        setWeeklyLetter(wlRes)
        setExtrasReady(true)
      })
      .catch(() => {
        if (!cancelled) setExtrasReady(true) // degrade gracefully
      })

    return () => { cancelled = true }
  }, [setMood, reloadKey])

  if (error && !coreReady) {
    return (
      <PageShell>
        <ErrorCard error={error} onRetry={() => setReloadKey((k) => k + 1)} />
      </PageShell>
    )
  }

  const todayTasks = today?.morning?.tasks ?? []
  const todayDone = todayTasks.filter((t) => t.completed).length
  const todayMood = today?.morning?.mood_state as MoodState | undefined

  return (
    <PageShell>
      {/* ── P1: Greeting + Streak + Quick Stats ── */}
      {!coreReady ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionSkeleton height={100} />
          <SectionSkeleton height={80} />
          <SectionSkeleton height={72} />
        </div>
      ) : (
        <>
          <MilestoneToast streak={streak?.current_streak ?? 0} />

          <header className="anim-fade-in-up" style={{ textAlign: 'center', marginBottom: 32 }}>
            <p
              style={{
                margin: 0,
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              {getGreeting()}
            </p>
            <h1
              className="gradient-text"
              style={{
                margin: '6px 0 4px',
                fontFamily: 'var(--font-heading, Sora, system-ui)',
                fontSize: '1.8rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              {profile?.name || 'AURA'}
            </h1>
            {profile?.goal && (
              <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {profile.goal}
              </p>
            )}
          </header>
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ── Streak (STT 18) — P1 ── */}
        <FadeIn show={coreReady}>
          <div className="glass-card" style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
            <StreakDisplay
              currentStreak={streak?.current_streak ?? 0}
              shieldCount={streak?.shield_count ?? 0}
              todayCompleted={streak?.today_completed ?? false}
            />
          </div>
        </FadeIn>

        {/* ── Memory Recall (9.1) — P2 ── */}
        {!historyReady && <SectionSkeleton height={80} />}
        <FadeIn show={historyReady && !!memoryRecall?.available && !!memoryRecall.match}>
          {memoryRecall?.match && <MemoryRecallCard match={memoryRecall.match} />}
        </FadeIn>

        {/* ── Weekly Letter (9.3) — P3 ── */}
        {!extrasReady && <SectionSkeleton height={100} />}
        <FadeIn show={extrasReady && !!weeklyLetter?.available && !!weeklyLetter.letter}>
          {weeklyLetter?.letter && (
            <WeeklyLetterCard
              letter={weeklyLetter.letter}
              sundayDate={weeklyLetter.sunday_date}
              archive={weeklyLetter.archive ?? []}
            />
          )}
        </FadeIn>

        {/* ── Pattern Alert Indicator (9.2) — P2 ── */}
        <FadeIn show={historyReady && !!patternAlertData?.active && !!patternAlertData.alert}>
          {patternAlertData?.alert && <PatternAlertIndicator alert={patternAlertData.alert} />}
        </FadeIn>

        {/* ── Quick Stats (STT 19) — P1 core + P2 history ── */}
        <FadeIn show={coreReady}>
          <QuickStats
            streakDay={streak?.current_streak ?? 0}
            todayTasksDone={todayDone}
            todayTasksTotal={todayTasks.length}
            todayMood={todayMood}
            history={history}
          />
        </FadeIn>

        {/* ── 7-Day Mood Chart (STT 20) — P2 ── */}
        {!historyReady ? (
          <SectionSkeleton height={160} />
        ) : (
          <FadeIn show={historyReady}>
            <MoodChart7Days history={history} />
          </FadeIn>
        )}

        {/* ── First-action insight (Phần 8E) — P2 ── */}
        <FadeIn show={historyReady}>
          <FirstActionInsight history={history} />
        </FadeIn>

        {/* ── Framework diversity warning (Phần 8E) — P2 ── */}
        <FadeIn show={historyReady}>
          <FrameworkDiversityWarning history={history} />
        </FadeIn>

        {/* ── Pattern radar 30d (Phần 8E) — P3 ── */}
        {!extrasReady ? (
          <SectionSkeleton height={300} />
        ) : (
          <FadeIn show={extrasReady && !!radar}>
            {radar && <PatternRadar counts={radar.counts} days={radar.days} />}
          </FadeIn>
        )}

        {/* ── Energy × mood scatter (Phần 8E) — P3 ── */}
        <FadeIn show={extrasReady}>
          <EnergyMoodScatter points={energyMood} />
        </FadeIn>

        {/* ── Why-today Card (STT 23) — P1 + P2 ── */}
        <FadeIn show={coreReady}>
          <WhyTodayCard goal={profile?.goal} history={history} />
        </FadeIn>

        {/* ── Anti-streak: Days with intention (STT 24) — P2 ── */}
        <FadeIn show={historyReady}>
          <DaysWithIntention history={history} />
        </FadeIn>

        {/* ── Share card milestone (STT 25) — P1 ── */}
        <FadeIn show={coreReady}>
          <MilestoneShareCard
            streak={streak?.current_streak ?? 0}
            name={profile?.name || 'AURA User'}
          />
        </FadeIn>

        {/* ── Bad-Day Rehearsal suggestion (9.4) — P2 ── */}
        <FadeIn show={historyReady && (todayMood === 'stable' || todayMood === 'energized') && !badDaySaved}>
          <BadDayRehearsalPrompt
            existingCount={badDayMessages.length}
            onSave={(msg) => {
              postBadDayMessage(msg)
                .then(() => {
                  setBadDaySaved(true)
                  setBadDayMessages((prev) => [...prev, { id: prev.length, message: msg, author_date: new Date().toISOString().slice(0, 10), last_used_at: null, use_count: 0 }])
                })
                .catch(() => {})
            }}
          />
        </FadeIn>

        {/* ── CTA Buttons (STT 21) — P1 ── */}
        <FadeIn show={coreReady}>
          <CTAButtons
            hasMorning={!!today?.morning}
            hasEvening={!!today?.evening}
            router={router}
          />
        </FadeIn>

        {/* ── Weekly Insight (STT 22) — P3 ── */}
        <FadeIn show={extrasReady}>
          <WeeklyInsightCard data={weeklyInsight} />
        </FadeIn>
      </div>
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════
// Helpers — progressive loading
// ═══════════════════════════════════════════════════════════════

function FadeIn({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null
  return (
    <div style={{ animation: 'fadeInUp 0.4s ease both' }}>
      {children}
    </div>
  )
}

function SectionSkeleton({ height = 120 }: { height?: number }) {
  return (
    <div
      className="glass-card skeleton"
      style={{ height, borderRadius: 16 }}
      aria-hidden
    />
  )
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 'clamp(24px, 5vw, 48px) clamp(16px, 4vw, 24px) clamp(32px, 8vw, 64px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 640 }}>{children}</div>
    </div>
  )
}

// ── Quick Stats (STT 19) ─────────────────────────────────────

function QuickStats({
  streakDay,
  todayTasksDone,
  todayTasksTotal,
  todayMood,
  history,
}: {
  streakDay: number
  todayTasksDone: number
  todayTasksTotal: number
  todayMood?: MoodState
  history: HistoryDay[]
}) {
  const moodTrend = getMoodTrend(history)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <StatCard label="Ngày" value={`#${streakDay}`} />
      <StatCard
        label="Tasks hôm nay"
        value={todayTasksTotal > 0 ? `${todayTasksDone}/${todayTasksTotal}` : '—'}
      />
      <StatCard
        label="Mood"
        value={todayMood ? MOOD_LABELS[todayMood] : '—'}
        sub={moodTrend}
      />
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: '16px 12px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: '0.65rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-heading, Sora, system-ui)',
          fontSize: '1.05rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

function getMoodTrend(history: HistoryDay[]): string {
  const moods = history
    .filter((d) => d.morning?.mood_state)
    .map((d) => d.morning!.mood_state as MoodState)

  if (moods.length < 2) return ''

  const score: Record<MoodState, number> = {
    numb: 1,
    overwhelmed: 2,
    anxious: 3,
    stable: 4,
    energized: 5,
  }

  const recent = score[moods[0]] ?? 3
  const prev = score[moods[1]] ?? 3

  if (recent > prev) return 'Tốt hơn hôm qua'
  if (recent < prev) return 'Thấp hơn hôm qua'
  return 'Ổn định'
}

// ── 7-Day Mood Chart (STT 20) ────────────────────────────────

function MoodChart7Days({ history }: { history: HistoryDay[] }) {
  const last7 = getLast7Days(history)

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <SectionLabel>Mood 7 ngày qua</SectionLabel>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          height: 120,
          marginTop: 12,
        }}
      >
        {last7.map((day) => (
          <MoodBar key={day.label} day={day} />
        ))}
      </div>
    </div>
  )
}

interface ChartDay {
  label: string
  mood: MoodState | null
  energy: number
}

function getLast7Days(history: HistoryDay[]): ChartDay[] {
  const days: ChartDay[] = []
  const today = new Date()
  const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const entry = history.find((h) => h.date === iso)
    days.push({
      label: dayLabels[d.getDay()],
      mood: (entry?.morning?.mood_state as MoodState) ?? null,
      energy: entry?.morning?.energy_level ?? 0,
    })
  }

  return days
}

function MoodBar({ day }: { day: ChartDay }) {
  const heightPct = day.energy > 0 ? Math.max(15, (day.energy / 10) * 100) : 0
  const color = day.mood ? MOOD_COLORS[day.mood] : 'var(--border-default)'

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        height: '100%',
        justifyContent: 'flex-end',
      }}
    >
      {day.energy > 0 && (
        <span
          style={{
            fontSize: '0.65rem',
            color: 'var(--text-tertiary)',
            fontWeight: 500,
          }}
        >
          {day.energy}
        </span>
      )}
      <div
        style={{
          width: '100%',
          maxWidth: 36,
          height: day.energy > 0 ? `${heightPct}%` : 4,
          borderRadius: 8,
          background: day.energy > 0
            ? `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 50%, transparent))`
            : 'var(--border-default)',
          transition: 'height 0.5s ease, background 0.3s ease',
          minHeight: 4,
        }}
        title={day.mood ? `${MOOD_LABELS[day.mood]} — Energy ${day.energy}` : 'Không có dữ liệu'}
      />
      <span
        style={{
          fontSize: '0.68rem',
          color: 'var(--text-tertiary)',
          fontWeight: 400,
        }}
      >
        {day.label}
      </span>
    </div>
  )
}

// ── Anti-streak: Days with intention (STT 24) ────────────────

function DaysWithIntention({ history }: { history: HistoryDay[] }) {
  // Count days in last 30 days where user did a morning check-in
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10)

  const daysWithMorning = history.filter(
    (d) => d.date >= cutoff && d.morning,
  ).length

  const pct = Math.round((daysWithMorning / 30) * 100)

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <SectionLabel>Ngày có ý định (30 ngày)</SectionLabel>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-heading, Sora, system-ui)',
            fontSize: '1.6rem',
            fontWeight: 600,
            color: 'var(--mood-color)',
          }}
        >
          {daysWithMorning}
        </span>
        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          / 30 ngày
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: 'var(--border-default)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(135deg, var(--mood-color), var(--mood-color-soft))',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <p
        style={{
          margin: '8px 0 0',
          fontSize: '0.76rem',
          color: 'var(--text-tertiary)',
          lineHeight: 1.5,
        }}
      >
        Không đếm streak. Đếm số ngày bạn chọn xuất hiện — dù chỉ 1 phút.
      </p>
    </div>
  )
}

// ── Share card milestone (STT 25) ────────────────────────────

const MILESTONES = [7, 30, 60, 100] as const

function getMilestone(streak: number): number | null {
  // Return the highest milestone achieved
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (streak >= MILESTONES[i]) return MILESTONES[i]
  }
  return null
}

const MILESTONE_MESSAGES: Record<number, string> = {
  7: '1 tuần kiên trì — bạn đang xây thói quen thật sự.',
  30: '30 ngày! Đây không phải may mắn, đây là lựa chọn.',
  60: '60 ngày — bạn đã chứng minh với chính mình.',
  100: '100 ngày. Respect. 💛',
}

function MilestoneShareCard({
  streak,
  name,
}: {
  streak: number
  name: string
}) {
  const milestone = getMilestone(streak)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const exportPng = useCallback(() => {
    if (!milestone) return
    const canvas = document.createElement('canvas')
    const w = 600
    const h = 340
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#0a0a0f')
    grad.addColorStop(1, '#14141f')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Accent line
    ctx.fillStyle = '#64b5f6'
    ctx.fillRect(0, 0, 4, h)

    // "AURA" label
    ctx.fillStyle = '#7a7a95'
    ctx.font = '600 11px sans-serif'
    ctx.letterSpacing = '3px'
    ctx.fillText('AURA', 32, 42)

    // Milestone number
    ctx.fillStyle = '#64b5f6'
    ctx.font = '700 72px sans-serif'
    ctx.fillText(`${milestone}`, 32, 140)

    // "ngày" text
    ctx.fillStyle = '#a8a8c0'
    ctx.font = '400 20px sans-serif'
    ctx.fillText('ngày liên tiếp', 32, 172)

    // Message
    ctx.fillStyle = '#f2f2f7'
    ctx.font = '400 16px sans-serif'
    const msg = MILESTONE_MESSAGES[milestone] ?? `${milestone} ngày!`
    ctx.fillText(msg, 32, 220)

    // Name
    ctx.fillStyle = '#7a7a95'
    ctx.font = '400 13px sans-serif'
    ctx.fillText(`— ${name}`, 32, 280)

    // Date
    ctx.fillText(new Date().toLocaleDateString('vi-VN'), 32, 306)

    // Download
    const link = document.createElement('a')
    link.download = `aura-milestone-${milestone}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [milestone, name])

  if (!milestone) return null

  return (
    <div
      className="glass-card anim-fade-in-scale"
      style={{
        padding: 24,
        borderLeft: '2px solid var(--mood-color)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <SectionLabel>Milestone</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-heading, Sora, system-ui)',
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--mood-color)',
          }}
        >
          {milestone}
        </span>
        <span style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
          ngày
        </span>
      </div>
      <p
        style={{
          margin: '0 0 16px',
          fontSize: '0.92rem',
          color: 'var(--text-primary)',
          lineHeight: 1.55,
        }}
      >
        {MILESTONE_MESSAGES[milestone]}
      </p>
      <button
        type="button"
        className="btn-ghost"
        onClick={exportPng}
        style={{
          borderRadius: 10,
          cursor: 'pointer',
          padding: '8px 18px',
          fontSize: '0.8rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M7 1v8m0 0L4 6.5M7 9l3-2.5M2 11h10"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Tải ảnh chia sẻ
      </button>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

// ── CTA Buttons (STT 21) ─────────────────────────────────────

function CTAButtons({
  hasMorning,
  hasEvening,
  router,
}: {
  hasMorning: boolean
  hasEvening: boolean
  router: ReturnType<typeof useRouter>
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      {!hasMorning && (
        <button
          type="button"
          className="btn-mood anim-pulse-glow"
          onClick={() => router.push('/morning')}
          style={{ borderRadius: 12, cursor: 'pointer', flex: '1 1 auto', maxWidth: 220 }}
        >
          Check-in Sáng
        </button>
      )}
      {hasMorning && (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.push('/checklist')}
          style={{ borderRadius: 12, cursor: 'pointer', flex: '1 1 auto', maxWidth: 220 }}
        >
          Xem Checklist
        </button>
      )}
      {hasMorning && !hasEvening && (
        <button
          type="button"
          className="btn-mood"
          onClick={() => router.push('/evening')}
          style={{ borderRadius: 12, cursor: 'pointer', flex: '1 1 auto', maxWidth: 220 }}
        >
          Reflection Tối
        </button>
      )}
      {hasMorning && hasEvening && (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.push('/morning')}
          style={{ borderRadius: 12, cursor: 'pointer', flex: '1 1 auto', maxWidth: 220 }}
        >
          Check-in Sáng
        </button>
      )}
    </div>
  )
}

// ── Why-today Card (STT 23) ──────────────────────────────────

function WhyTodayCard({ goal, history }: { goal?: string; history: HistoryDay[] }) {
  if (!goal) return null

  // Find the most recent reflection quote (not today)
  const today = new Date().toISOString().slice(0, 10)
  const pastWithEvening = history
    .filter((d) => d.date !== today && d.evening)
    .sort((a, b) => b.date.localeCompare(a.date))

  const recentQuote = pastWithEvening.length > 0
    ? pastWithEvening[0].evening?.tomorrow_question || pastWithEvening[0].evening?.summary || null
    : null

  return (
    <div
      className="glass-card"
      style={{
        padding: 24,
        borderLeft: '2px solid var(--mood-color)',
      }}
    >
      <SectionLabel>Tại sao hôm nay</SectionLabel>
      <p
        style={{
          margin: 0,
          fontSize: '1.02rem',
          fontWeight: 500,
          color: 'var(--text-primary)',
          lineHeight: 1.55,
        }}
      >
        {goal}
      </p>
      {recentQuote && (
        <p
          style={{
            margin: '12px 0 0',
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            fontStyle: 'italic',
            borderTop: '1px solid var(--border-default)',
            paddingTop: 12,
          }}
        >
          &ldquo;{recentQuote}&rdquo;
        </p>
      )}
    </div>
  )
}

// ── Weekly Insight (STT 22) ──────────────────────────────────

function WeeklyInsightCard({ data }: { data: WeeklyInsightResponse | null }) {
  if (!data) return null

  if (!data.available) {
    return (
      <div className="glass-card" style={{ padding: 24 }}>
        <SectionLabel>Weekly Insight</SectionLabel>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Cần thêm {data.days_remaining} ngày nữa để AURA tổng hợp insight tuần cho bạn.
        </p>
        <div
          style={{
            marginTop: 12,
            height: 6,
            borderRadius: 999,
            background: 'var(--border-default)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${((7 - data.days_remaining) / 7) * 100}%`,
              height: '100%',
              background: 'linear-gradient(135deg, var(--mood-color), var(--mood-color-soft))',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
          {7 - data.days_remaining}/7 ngày
        </p>
      </div>
    )
  }

  if (!data.insight) return null

  return (
    <div
      className="glass-card"
      style={{
        padding: 24,
        borderLeft: '2px solid var(--mood-color)',
      }}
    >
      <SectionLabel>Weekly Insight</SectionLabel>
      <p
        style={{
          margin: 0,
          color: 'var(--text-primary)',
          fontSize: '0.96rem',
          lineHeight: 1.65,
        }}
      >
        {data.insight}
      </p>
    </div>
  )
}

// ── First-action delay insight (Phần 8E) ──────────────────────

function FirstActionInsight({ history }: { history: HistoryDay[] }) {
  // Compute avg first-action delay minutes across all tasks in history with created_at stamps
  const delays: number[] = []
  let daysOver3h = 0
  const byDay: Record<string, number[]> = {}

  for (const day of history) {
    const tasks = day.morning?.tasks ?? []
    const dayDelays: number[] = []
    for (const t of tasks) {
      if (typeof t.first_action_delay_minutes === 'number') {
        delays.push(t.first_action_delay_minutes)
        dayDelays.push(t.first_action_delay_minutes)
      }
    }
    if (dayDelays.length) {
      byDay[day.date] = dayDelays
      const avgDay = dayDelays.reduce((a, b) => a + b, 0) / dayDelays.length
      if (avgDay > 180) daysOver3h++
    }
  }

  if (delays.length < 2) return null

  const avg = Math.round(delays.reduce((a, b) => a + b, 0) / delays.length)
  const showWarning = daysOver3h >= 3

  return (
    <div
      className="glass-card"
      style={{
        padding: 24,
        borderLeft: showWarning ? '2px solid #ff9b7a' : '2px solid var(--mood-color)',
      }}
    >
      <SectionLabel>Thời gian chạm task đầu tiên</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-heading, Sora, system-ui)',
            fontSize: '1.6rem',
            fontWeight: 600,
            color: showWarning ? '#ff9b7a' : 'var(--mood-color)',
          }}
        >
          {avg < 60 ? `${avg}m` : `${(avg / 60).toFixed(1)}h`}
        </span>
        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          trung bình từ khi tạo → tick
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: '0.82rem',
          color: 'var(--text-tertiary)',
          lineHeight: 1.55,
        }}
      >
        {showWarning
          ? 'Có vẻ bạn đang phân tích quá nhiều trước khi bắt đầu. Thử áp dụng 2-minute rule cho task tiếp theo nhé.'
          : delays.length < 5
          ? 'AURA cần thêm dữ liệu để đưa ra nhận xét chính xác.'
          : 'Bạn đang bắt đầu task khá nhanh sau khi tạo — duy trì nhé.'}
      </p>
    </div>
  )
}

// ── Framework diversity warning (Phần 8E) ──────────────────────

const FRAMEWORK_LABELS: Record<string, string> = {
  '80_20_pareto': 'Pareto 80/20',
  behavioral_activation: 'Behavioral Activation',
  implementation_intention: 'Implementation Intention',
  habit_stacking: 'Habit Stacking',
  self_compassion: 'Self-Compassion',
  progress_principle: 'Progress Principle',
  two_minute_rule: '2-Minute Rule',
  dunning_kruger: 'Dunning-Kruger',
}

function FrameworkDiversityWarning({ history }: { history: HistoryDay[] }) {
  // Sort by date desc; find longest consecutive streak of same framework from most recent
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date))
  let streakFw: string | null = null
  let streakLen = 0
  for (const day of sorted) {
    const fw = day.morning?.framework
    if (!fw) break
    if (streakFw === null) {
      streakFw = fw
      streakLen = 1
    } else if (fw === streakFw) {
      streakLen++
    } else {
      break
    }
  }

  if (!streakFw || streakLen < 5) return null

  return (
    <div
      className="glass-card anim-fade-in"
      style={{
        padding: 20,
        borderLeft: '2px solid #ff9b7a',
        background: 'var(--bg-elevated)',
      }}
    >
      <SectionLabel>Pattern lặp</SectionLabel>
      <p
        style={{
          margin: 0,
          fontSize: '0.92rem',
          color: 'var(--text-primary)',
          lineHeight: 1.6,
        }}
      >
        AURA đã chọn <b>{FRAMEWORK_LABELS[streakFw] ?? streakFw}</b> {streakLen} ngày liên tiếp.
        Có thể bạn đang ở một giai đoạn — cũng có thể AURA đang hiểu chưa đủ. Nếu thấy chệch,
        mô tả kỹ hơn vào sáng mai.
      </p>
    </div>
  )
}

// ── Pattern radar 30d (Phần 8E) ────────────────────────────────

const FRAMEWORK_ORDER: Framework[] = [
  '80_20_pareto',
  'behavioral_activation',
  'implementation_intention',
  'habit_stacking',
  'self_compassion',
  'progress_principle',
  'two_minute_rule',
  'dunning_kruger',
]

function PatternRadar({
  counts,
  days,
}: {
  counts: Partial<Record<Framework, number>>
  days: number
}) {
  const total = Object.values(counts).reduce((a: number, b) => a + (b ?? 0), 0)
  if (total === 0) {
    return (
      <div className="glass-card" style={{ padding: 24 }}>
        <SectionLabel>Framework radar ({days} ngày)</SectionLabel>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Chưa có dữ liệu framework trong {days} ngày qua.
        </p>
      </div>
    )
  }

  const maxCount = Math.max(1, ...FRAMEWORK_ORDER.map((fw) => counts[fw] ?? 0))
  const cx = 140
  const cy = 140
  const radius = 100
  const n = FRAMEWORK_ORDER.length

  const angle = (i: number) => (i * 2 * Math.PI) / n - Math.PI / 2
  const point = (i: number, r: number) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  })

  const polygon = FRAMEWORK_ORDER.map((fw, i) => {
    const c = counts[fw] ?? 0
    const r = (c / maxCount) * radius
    return point(i, r)
  })
  const polygonPath = polygon.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <SectionLabel>Framework radar ({days} ngày)</SectionLabel>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 8,
        }}
      >
        <svg
          width="280"
          height="280"
          viewBox="0 0 280 280"
          aria-label="Pattern radar chart"
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          {/* Grid rings */}
          {[0.25, 0.5, 0.75, 1].map((scale) => (
            <polygon
              key={scale}
              points={FRAMEWORK_ORDER.map((_, i) => {
                const p = point(i, radius * scale)
                return `${p.x},${p.y}`
              }).join(' ')}
              fill="none"
              stroke="var(--border-default)"
              strokeWidth="1"
              opacity={0.4}
            />
          ))}
          {/* Axes */}
          {FRAMEWORK_ORDER.map((_, i) => {
            const p = point(i, radius)
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={p.x}
                y2={p.y}
                stroke="var(--border-default)"
                strokeWidth="1"
                opacity={0.35}
              />
            )
          })}
          {/* Data polygon */}
          <polygon
            points={polygonPath}
            fill="color-mix(in srgb, var(--mood-color) 28%, transparent)"
            stroke="var(--mood-color)"
            strokeWidth="1.8"
          />
          {/* Data points */}
          {polygon.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="var(--mood-color)"
            />
          ))}
          {/* Labels */}
          {FRAMEWORK_ORDER.map((fw, i) => {
            const p = point(i, radius + 20)
            const count = counts[fw] ?? 0
            const label = FRAMEWORK_LABELS[fw] ?? fw
            // Shorten label to first word for compactness
            const short = label.split(/[\s-]/)[0]
            return (
              <text
                key={fw}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill={count > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)'}
                fontWeight={count > 0 ? 600 : 400}
              >
                {short} {count > 0 ? `·${count}` : ''}
              </text>
            )
          })}
        </svg>
      </div>
      <p
        style={{
          margin: '8px 0 0',
          fontSize: '0.76rem',
          color: 'var(--text-tertiary)',
          lineHeight: 1.5,
          textAlign: 'center',
        }}
      >
        {total} ngày có framework trong {days} ngày qua
      </p>
    </div>
  )
}

// ── Energy × mood correlation scatter (Phần 8E) ────────────────

const MOOD_SCORE: Record<string, number> = {
  numb: 1,
  overwhelmed: 2,
  anxious: 3,
  stable: 4,
  energized: 5,
}

function EnergyMoodScatter({ points }: { points: EnergyMoodPoint[] }) {
  const valid = points.filter(
    (p): p is Required<EnergyMoodPoint> & { mood: string; energy: number } =>
      !!p.mood && typeof p.energy === 'number' && p.energy > 0,
  )

  if (valid.length < 2) {
    return (
      <div className="glass-card" style={{ padding: 24 }}>
        <SectionLabel>Năng lượng × Mood (7 ngày)</SectionLabel>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Cần ít nhất 2 ngày có dữ liệu mood + energy để vẽ biểu đồ.
        </p>
      </div>
    )
  }

  const w = 280
  const h = 180
  const padL = 36
  const padR = 12
  const padT = 12
  const padB = 28
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  // X = mood score (1..5), Y = energy (1..10)
  const xFor = (m: string) => padL + ((MOOD_SCORE[m] ?? 3) - 1) / 4 * innerW
  const yFor = (e: number) => padT + (1 - (e - 1) / 9) * innerH

  const moodOrder = ['numb', 'overwhelmed', 'anxious', 'stable', 'energized']
  const moodShort: Record<string, string> = {
    numb: 'Numb',
    overwhelmed: 'Over',
    anxious: 'Anx',
    stable: 'Stable',
    energized: 'Energ',
  }

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <SectionLabel>Năng lượng × Mood (7 ngày)</SectionLabel>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: 8,
        }}
      >
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          style={{ maxWidth: '100%', height: 'auto' }}
          aria-label="Energy vs mood scatter"
        >
          {/* Y axis ticks 2,5,8 */}
          {[2, 5, 8].map((e) => (
            <g key={e}>
              <line
                x1={padL}
                x2={w - padR}
                y1={yFor(e)}
                y2={yFor(e)}
                stroke="var(--border-default)"
                strokeWidth="1"
                opacity={0.3}
              />
              <text
                x={padL - 6}
                y={yFor(e)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9"
                fill="var(--text-tertiary)"
              >
                {e}
              </text>
            </g>
          ))}
          {/* X axis labels */}
          {moodOrder.map((m, i) => (
            <text
              key={m}
              x={padL + (i / 4) * innerW}
              y={h - 10}
              textAnchor="middle"
              fontSize="9"
              fill="var(--text-tertiary)"
            >
              {moodShort[m]}
            </text>
          ))}
          {/* Points */}
          {valid.map((p, i) => (
            <g key={i}>
              <circle
                cx={xFor(p.mood)}
                cy={yFor(p.energy)}
                r={6}
                fill="color-mix(in srgb, var(--mood-color) 70%, transparent)"
                stroke="var(--mood-color)"
                strokeWidth="1.2"
              >
                <title>
                  {p.date} — {p.mood} / energy {p.energy}
                </title>
              </circle>
              <text
                x={xFor(p.mood)}
                y={yFor(p.energy) - 9}
                textAnchor="middle"
                fontSize="8"
                fill="var(--text-tertiary)"
              >
                {p.date.slice(5)}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: '0.72rem',
          color: 'var(--text-tertiary)',
          textAlign: 'center',
        }}
      >
        Trục X = mood (tệ → tốt) · Trục Y = energy (1–10)
      </p>
    </div>
  )
}

// ── Pattern Alert Indicator (9.2) ─────────────────────────────

const PATTERN_MESSAGES: Record<string, string> = {
  shame_spiral:
    'AURA nh\u1EADn th\u1EA5y b\u1EA1n \u0111ang t\u1EF1 ch\u1EC9 tr\u00EDch nhi\u1EC1u ng\u00E0y li\u00EAn t\u1EE5c. Tu\u1EA7n n\u00E0y AURA s\u1EBD \u01B0u ti\u00EAn self-compassion cho b\u1EA1n.',
  learned_helplessness:
    'AURA nh\u1EADn th\u1EA5y n\u0103ng l\u01B0\u1EE3ng c\u1EE7a b\u1EA1n \u0111ang r\u1EA5t th\u1EA5p nhi\u1EC1u ng\u00E0y. AURA s\u1EBD nh\u1EB9 nh\u00E0ng h\u01A1n v\u1EDBi b\u1EA1n tu\u1EA7n n\u00E0y.',
  avoidance_loop:
    'B\u1EA1n \u0111\u00E3 v\u1EAFng m\u1EB7t m\u1ED9t th\u1EDDi gian. Kh\u00F4ng sao c\u1EA3 \u2014 AURA \u0111ang \u01B0u ti\u00EAn s\u1EF1 d\u1ECBu d\u00E0ng \u0111\u1EC3 \u0111\u00F3n b\u1EA1n tr\u1EDF l\u1EA1i.',
}

function PatternAlertIndicator({
  alert,
}: {
  alert: { pattern_name: string; severity: string; consecutive_days: number }
}) {
  const message =
    PATTERN_MESSAGES[alert.pattern_name] ??
    `AURA \u0111ang \u01B0u ti\u00EAn self-compassion cho b\u1EA1n tu\u1EA7n n\u00E0y.`

  return (
    <div
      className="glass-card anim-fade-in"
      style={{
        padding: 20,
        borderLeft: '2px solid var(--mood-color-soft, #b388ff)',
        background: 'var(--bg-elevated)',
      }}
    >
      <p
        style={{
          margin: '0 0 8px',
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        AURA care mode
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '0.92rem',
          color: 'var(--text-primary)',
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>
    </div>
  )
}

// ── Weekly Letter Card (9.3) ─────────────────────────────────

const SIGNATURE_LABELS: Record<string, string> = {
  warm: 'Ấm áp',
  proud: 'Tự hào',
  gentle: 'Dịu dàng',
  honest: 'Chân thành',
  hopeful: 'Hy vọng',
}

function WeeklyLetterCard({
  letter,
  sundayDate,
  archive,
}: {
  letter: { letter_title: string; letter_body: string; signature_mood: string; read: boolean }
  sundayDate?: string
  archive: WeeklyLetterArchiveItem[]
}) {
  const [expanded, setExpanded] = useState(!letter.read)
  const [showArchive, setShowArchive] = useState(false)
  const [markedRead, setMarkedRead] = useState(letter.read)

  const handleMarkRead = () => {
    if (!markedRead) {
      markWeeklyLetterRead(sundayDate).catch(() => {})
      setMarkedRead(true)
    }
  }

  // Auto-mark as read when user expands
  useEffect(() => {
    if (expanded && !markedRead) {
      handleMarkRead()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const oldLetters = archive.filter((a) => a.date !== sundayDate)

  return (
    <div
      className="glass-card anim-fade-in-scale"
      style={{
        padding: 0,
        overflow: 'hidden',
        borderLeft: '2px solid var(--mood-color)',
      }}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <p
            style={{
              margin: '0 0 4px',
              fontSize: '0.65rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            {!markedRead && (
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--mood-color)',
                  marginRight: 8,
                  verticalAlign: 'middle',
                }}
              />
            )}
            Thư tuần này
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 600,
              fontFamily: 'var(--font-heading, Sora, system-ui)',
              color: 'var(--text-primary)',
              lineHeight: 1.4,
            }}
          >
            {letter.letter_title}
          </p>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          style={{
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.3s ease',
          }}
        >
          <path
            d="M5 8l5 5 5-5"
            stroke="var(--text-tertiary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Letter body — collapsible */}
      {expanded && (
        <div
          className="anim-fade-in"
          style={{
            padding: '0 24px 24px',
            maxWidth: 560,
          }}
        >
          <div
            style={{
              fontSize: '0.94rem',
              color: 'var(--text-primary)',
              lineHeight: 1.85,
              fontFamily: 'var(--font-body, "DM Sans", system-ui)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {letter.letter_body}
          </div>
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '0.76rem',
                color: 'var(--text-tertiary)',
                fontStyle: 'italic',
              }}
            >
              — AURA, {SIGNATURE_LABELS[letter.signature_mood] ?? letter.signature_mood}
            </span>
            {oldLetters.length > 0 && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowArchive((v) => !v)}
                style={{
                  borderRadius: 8,
                  cursor: 'pointer',
                  padding: '6px 14px',
                  fontSize: '0.72rem',
                }}
              >
                {showArchive ? 'Ẩn thư cũ' : `Xem ${oldLetters.length} thư cũ`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Archive — collapsible */}
      {expanded && showArchive && oldLetters.length > 0 && (
        <div
          className="anim-fade-in"
          style={{
            padding: '0 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {oldLetters.map((item) => (
            <ArchiveLetterItem key={item.date} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function ArchiveLetterItem({ item }: { item: WeeklyLetterArchiveItem }) {
  const [open, setOpen] = useState(false)

  const dateLabel = (() => {
    try {
      return new Date(item.date + 'T00:00:00').toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'long',
      })
    } catch {
      return item.date
    }
  })()

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-default)',
        paddingTop: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          padding: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            {dateLabel}
          </span>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: '0.88rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
          >
            {item.letter_title}
          </p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.3s ease',
          }}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="var(--text-tertiary)"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          className="anim-fade-in"
          style={{
            marginTop: 8,
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
            maxWidth: 560,
          }}
        >
          {item.letter_body}
          <p
            style={{
              margin: '12px 0 0',
              fontSize: '0.72rem',
              color: 'var(--text-tertiary)',
              fontStyle: 'italic',
            }}
          >
            — AURA, {SIGNATURE_LABELS[item.signature_mood] ?? item.signature_mood}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Bad-Day Rehearsal prompt (9.4) ────────────────────────────

function BadDayRehearsalPrompt({
  existingCount,
  onSave,
}: {
  existingCount: number
  onSave: (message: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  if (saved) {
    return (
      <div
        className="glass-card anim-fade-in"
        style={{
          padding: 20,
          borderLeft: '2px solid var(--mood-color)',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
          Đã lưu. Khi nào bạn cần, AURA sẽ nhắc lại cho bạn.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <div
        className="glass-card anim-fade-in"
        style={{
          padding: 20,
          borderLeft: '2px solid var(--mood-color-soft, var(--mood-color))',
        }}
      >
        <SectionLabel>Dặn mình cho ngày khó</SectionLabel>
        <p
          style={{
            margin: '0 0 12px',
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}
        >
          Hôm nay bạn đang ổn — viết 1 câu cho chính mình vào ngày khó sau này?
          {existingCount > 0 && (
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
              {' '}(đã có {existingCount} câu)
            </span>
          )}
        </p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setOpen(true)}
          style={{ borderRadius: 10, cursor: 'pointer', padding: '8px 18px', fontSize: '0.8rem' }}
        >
          Viết ngay
        </button>
      </div>
    )
  }

  return (
    <div
      className="glass-card anim-fade-in-up"
      style={{
        padding: 24,
        borderLeft: '2px solid var(--mood-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <SectionLabel>Viết cho ngày khó</SectionLabel>
      <textarea
        className="input-underline"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ví dụ: Ngày nào cũng qua. Hãy nhớ rằng bạn đã từng vượt qua những ngày tệ hơn thế này."
        rows={3}
        style={{
          resize: 'vertical',
          minHeight: 72,
          fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
          fontSize: '0.9rem',
          lineHeight: 1.6,
        }}
      />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setOpen(false)}
          style={{ borderRadius: 10, cursor: 'pointer', padding: '8px 16px', fontSize: '0.78rem' }}
        >
          Huỷ
        </button>
        <button
          type="button"
          className="btn-mood"
          disabled={!text.trim()}
          onClick={() => {
            if (text.trim()) {
              onSave(text.trim())
              setSaved(true)
            }
          }}
          style={{ borderRadius: 10, cursor: 'pointer', padding: '8px 18px', fontSize: '0.8rem' }}
        >
          Lưu
        </button>
      </div>
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: '0 0 10px',
        fontSize: '0.7rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
      }}
    >
      {children}
    </p>
  )
}
