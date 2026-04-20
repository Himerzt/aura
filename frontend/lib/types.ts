// =========================================================
// AURA — Shared TypeScript types
// Mirrors backend data models from CLAUDE.md section 4
// =========================================================

export type MoodState = 'energized' | 'stable' | 'anxious' | 'overwhelmed' | 'numb'

export type Framework =
  | '80_20_pareto'
  | 'behavioral_activation'
  | 'implementation_intention'
  | 'habit_stacking'
  | 'self_compassion'
  | 'progress_principle'
  | 'two_minute_rule'
  | 'dunning_kruger'

export type Chronotype = 'morning' | 'evening' | 'flexible'

export type SupportStyle = 'push' | 'gentle' | 'balanced'

export type Difficulty = 'very_easy' | 'easy' | 'medium' | 'hard'

// ---- Profile ----
export interface UserProfile {
  user_id: string
  created_at: string
  name: string
  goal: string
  context: string
  past_attempts: string[]
  daily_anchors: string[]
  chronotype: Chronotype
  support_style: SupportStyle
  onboarding_completed: boolean
}

// ---- Task ----
export interface FrictionLog {
  reason: 'tired' | 'distracted' | 'forgot' | 'no_meaning'
  note?: string
  logged_at?: string
}

export interface Task {
  id?: number
  title: string
  implementation: string
  estimated_minutes: number
  difficulty?: Difficulty
  completed?: boolean
  created_at?: string
  first_action_at?: string
  first_action_delay_minutes?: number
  friction?: FrictionLog
  replaced_from?: Partial<Task>
}

// ---- Morning Pipeline Result ----
export interface WellnessResult {
  mood_state: MoodState
  energy_level: number
  risk_flag: boolean
  detected_emotions: string[]
  confidence: number
}

export interface InsightResult {
  primary_pattern: string
  explanation_for_user: string
  why_this_happens: string
  recommended_framework: Framework
  pattern_trend: string
}

export interface MorningResult {
  type: 'morning' | 'crisis'
  wellness: WellnessResult
  insight?: InsightResult
  tasks?: Task[]
  encouragement?: string
  message?: string
  hotlines?: Hotline[]
}

// ---- Evening / Reflection ----
export interface EveningResult {
  today_summary: string
  pattern_detected: boolean
  pattern_description?: string | null
  progress_highlight: string
  tomorrow_question: string
  weekly_insight?: string | null
}

// ---- History ----
export interface MorningEntry {
  user_input: string
  mood_state: MoodState
  energy_level: number
  pattern: string
  framework: string
  explanation: string
  tasks: Task[]
}

export interface EveningEntry {
  user_input: string
  summary: string
  pattern_detected: boolean
  tomorrow_question: string
}

export interface DayEntry {
  morning?: MorningEntry
  evening?: EveningEntry
  streak_day?: number
}

export interface History {
  [date: string]: DayEntry
}

// ---- Streak ----
export interface StreakInfo {
  current_streak: number
  today_completed: boolean
  shield_count?: number
}

// ---- Hotline ----
export interface Hotline {
  name: string
  number: string
  available: string
}
