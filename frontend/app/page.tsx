'use client'

import MoodOrb from '@/components/aura/MoodOrb'
import EnergyBar from '@/components/aura/EnergyBar'
import TaskCard from '@/components/aura/TaskCard'
import InsightCard from '@/components/aura/InsightCard'
import StreakDisplay from '@/components/aura/StreakDisplay'
import SupportCard from '@/components/aura/SupportCard'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Badge from '@/components/ui/Badge'
import { useMood, type MoodState } from '@/lib/mood-context'

const MOCK_TASK = {
  title: 'Đi bộ 15 phút sau bữa trưa',
  implementation: 'Khi ăn trưa xong lúc 12h, tôi sẽ đi bộ nhẹ quanh khu vực trong 15 phút.',
  estimated_minutes: 15,
  difficulty: 'easy' as const,
  completed: false,
}

const MOODS: MoodState[] = ['energized', 'stable', 'anxious', 'overwhelmed', 'numb']

export default function Home() {
  const { mood, setMood } = useMood()
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '40px 24px',
        paddingBottom: '80px',
      }}
    >
      {/* Header */}
      <div
        className="stagger"
        style={{ maxWidth: 640, margin: '0 auto' }}
      >
        <h1
          className="gradient-text anim-fade-in-up"
          style={{
            fontFamily: 'var(--font-heading, Sora, system-ui)',
            fontSize: '3rem',
            fontWeight: 700,
            letterSpacing: '0.18em',
            marginBottom: 4,
            lineHeight: 1,
          }}
        >
          AURA
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: 24, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Design System Preview — v2.1
        </p>

        {/* ── Mood Preview Controls ── */}
        <div
          className="glass-card"
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            padding: '12px 14px',
            marginBottom: 32,
            alignItems: 'center',
          }}
        >
          <span style={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--text-tertiary)',
            marginRight: 4,
          }}>
            Mood
          </span>
          {MOODS.map((m) => {
            const active = mood === m
            return (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={active ? 'btn-mood' : 'btn-ghost'}
                style={{
                  padding: '8px 14px',
                  minHeight: 34,
                  fontSize: '0.75rem',
                  borderRadius: 999,
                }}
              >
                {m}
              </button>
            )
          })}
        </div>

        {/* ── Section: MoodOrb ── */}
        <Section title="MoodOrb — 5 Mood States">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['energized', 'stable', 'anxious', 'overwhelmed', 'numb'] as const).map((mood) => (
              <div key={mood} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <MoodOrb mood={mood} size={80} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {mood}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Section: EnergyBar ── */}
        <Section title="EnergyBar — Levels">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <EnergyBar level={2} />
            <EnergyBar level={5} />
            <EnergyBar level={9} />
          </div>
        </Section>

        {/* ── Section: StreakDisplay ── */}
        <Section title="StreakDisplay">
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginBottom: 12 }}>streak = 0</p>
              <StreakDisplay currentStreak={0} />
            </div>
            <div>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginBottom: 12 }}>streak = 7, shields = 2, today done</p>
              <StreakDisplay currentStreak={7} shieldCount={2} todayCompleted={true} />
            </div>
          </div>
        </Section>

        {/* ── Section: TaskCard ── */}
        <Section title="TaskCard — Click to Toggle">
          <TaskCard task={MOCK_TASK} animationDelay={0} />
        </Section>

        {/* ── Section: InsightCard ── */}
        <Section title="InsightCard">
          <InsightCard
            framework="behavioral_activation"
            explanation="Bạn đang ở trong trạng thái chờ cảm hứng — nhưng hành động tạo ra cảm hứng, không phải ngược lại."
            whyItHappens="Khi năng lượng thấp, não bộ ưu tiên tiết kiệm năng lượng bằng cách tránh các nhiệm vụ mới. Bắt đầu một hành động nhỏ sẽ kích hoạt dopamine và tạo động lực tự nhiên."
            animationDelay={0}
          />
        </Section>

        {/* ── Section: SupportCard ── */}
        <Section title="SupportCard — Crisis Mode">
          <SupportCard />
        </Section>

        {/* ── Section: Primitive UI ── */}
        <Section title="Buttons">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" loading>Loading</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Badges">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge variant="mood" mood="energized">Energized</Badge>
            <Badge variant="mood" mood="stable">Stable</Badge>
            <Badge variant="mood" mood="anxious">Anxious</Badge>
            <Badge variant="mood" mood="overwhelmed">Overwhelmed</Badge>
            <Badge variant="mood" mood="numb">Numb</Badge>
            <Badge variant="framework">Behavioral Activation</Badge>
            <Badge variant="time">15 phút</Badge>
            <Badge variant="difficulty">Dễ</Badge>
          </div>
        </Section>

        <Section title="Input">
          <div style={{ maxWidth: 360 }}>
            <Input label="Hôm nay bạn cảm thấy thế nào?" placeholder="Chia sẻ cảm xúc của bạn..." />
            <div style={{ marginTop: 12 }}>
              <Input label="Trường lỗi" placeholder="Nhập email..." error="Email không hợp lệ" />
            </div>
          </div>
        </Section>

        <Section title="LoadingSpinner">
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" />
            <LoadingSpinner size="lg" />
            <LoadingSpinner size="md" color="ice" />
          </div>
        </Section>

        <Section title="Card (Glass)">
          <Card hoverable>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Glassmorphism card — hover để thấy border sáng hơn.
            </p>
          </Card>
        </Section>

        <Section title="Skeleton Loading">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton" style={{ height: 20, width: '70%' }} />
            <div className="skeleton" style={{ height: 20, width: '50%' }} />
            <div className="skeleton" style={{ height: 60, width: '100%', marginTop: 8 }} />
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontFamily: 'DM Sans, system-ui, sans-serif',
          fontSize: '0.75rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-tertiary)',
          marginBottom: 16,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}
