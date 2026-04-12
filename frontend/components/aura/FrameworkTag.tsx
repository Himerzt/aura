'use client'

type Framework =
  | '80_20_pareto'
  | 'behavioral_activation'
  | 'implementation_intention'
  | 'habit_stacking'
  | 'self_compassion'
  | 'progress_principle'
  | 'two_minute_rule'
  | 'dunning_kruger'

interface FrameworkTagProps {
  framework: Framework | string
  showDescription?: boolean
}

const frameworkLabels: Record<string, string> = {
  '80_20_pareto':             '80/20 Pareto',
  'behavioral_activation':    'Kích Hoạt Hành Vi',
  'implementation_intention': 'Ý Định Thực Hiện',
  'habit_stacking':           'Xếp Chồng Thói Quen',
  'self_compassion':          'Tự Trắc Ẩn',
  'progress_principle':       'Nguyên Lý Tiến Bộ',
  'two_minute_rule':          'Quy Tắc 2 Phút',
  'dunning_kruger':           'Vượt Qua Thung Lũng',
}

const frameworkDescriptions: Record<string, string> = {
  '80_20_pareto':             '20% hành động tạo ra 80% kết quả',
  'behavioral_activation':    'Hành động trước, cảm hứng sẽ theo sau',
  'implementation_intention': 'Khi X xảy ra, tôi sẽ làm Y',
  'habit_stacking':           'Gắn thói quen mới vào thói quen đã có',
  'self_compassion':          'Đối xử với bản thân như người bạn',
  'progress_principle':       'Tiến bộ nhỏ mỗi ngày tạo động lực lớn',
  'two_minute_rule':          'Nếu mất dưới 2 phút, hãy làm ngay',
  'dunning_kruger':           'Vượt qua thung lũng tuyệt vọng để tiến lên',
}

export default function FrameworkTag({
  framework,
  showDescription = false,
}: FrameworkTagProps) {
  const label = frameworkLabels[framework] ?? framework
  const description = frameworkDescriptions[framework]

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          display: 'inline-block',
          background: 'var(--ice-dim)',
          color: 'var(--ice)',
          border: '1px solid rgba(168,196,224,0.2)',
          borderRadius: 999,
          padding: '4px 12px',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>

      {showDescription && description && (
        <span
          style={{
            fontSize: 'var(--text-xs, 0.75rem)',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-body)',
            paddingLeft: 4,
          }}
        >
          {description}
        </span>
      )}
    </div>
  )
}
