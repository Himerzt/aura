import type {
  DayEntry,
  EveningResult,
  Framework,
  MorningResult,
  StreakInfo,
  Task,
  UserProfile,
} from './types'

// ── Auth ────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  success: boolean
  token?: string
  user?: { id: string; name: string; email: string }
}

export function postLogin(email: string, password: string): Promise<AuthResponse> {
  return json<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function postRegister(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return json<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

// ── Core fetch helper ───────────────────────────────────────────────────────

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || `${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export function getProfile(): Promise<UserProfile> {
  return json<UserProfile>('/api/profile')
}

export function postMorning(user_input: string): Promise<MorningResult> {
  return json<MorningResult>('/api/morning', {
    method: 'POST',
    body: JSON.stringify({ user_input }),
  })
}

export function getToday(): Promise<DayEntry> {
  return json<DayEntry>('/api/today')
}

export function postEvening(
  user_input: string,
  completed_task_ids: number[],
): Promise<EveningResult> {
  return json<EveningResult>('/api/evening', {
    method: 'POST',
    body: JSON.stringify({ user_input, completed_task_ids }),
  })
}

export function getStreak(): Promise<StreakInfo> {
  return json<StreakInfo>('/api/streak')
}

export function getHistory(): Promise<DayEntry[]> {
  return json<DayEntry[]>('/api/history')
}

export interface WeeklyInsightResponse {
  available: boolean
  days_remaining: number
  insight: string | null
}

export function getWeeklyInsight(): Promise<WeeklyInsightResponse> {
  return json<WeeklyInsightResponse>('/api/weekly-insight')
}

export function updateProfile(
  fields: Partial<Omit<UserProfile, 'user_id' | 'created_at' | 'onboarding_completed'>>,
): Promise<{ success: boolean; profile: UserProfile }> {
  return json('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(fields),
  })
}

// ── Phần 8E: Medium extensions ─────────────────────────────────────────────

export type FrictionReason = 'tired' | 'distracted' | 'forgot' | 'no_meaning'

export interface FrictionPayload {
  task_index: number
  reason: FrictionReason
  note?: string
  date?: string
}

export function postFriction(
  payload: FrictionPayload,
): Promise<{ success: boolean; task: Task }> {
  return json('/api/task/friction', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function postFirstAction(
  task_index: number,
  date?: string,
): Promise<{ success: boolean; task: Task }> {
  return json('/api/task/first-action', {
    method: 'POST',
    body: JSON.stringify({ task_index, date }),
  })
}

export interface RetryEasierResponse {
  success: boolean
  task: Task
  new_energy_level: number
  encouragement: string
}

export function postRetryEasier(
  task_index: number,
  date?: string,
): Promise<RetryEasierResponse> {
  return json<RetryEasierResponse>('/api/task/retry-easier', {
    method: 'POST',
    body: JSON.stringify({ task_index, date }),
  })
}

export interface PatternRadarResponse {
  days: number
  counts: Partial<Record<Framework, number>>
}

export function getPatternRadar(days: 7 | 30 = 30): Promise<PatternRadarResponse> {
  return json<PatternRadarResponse>(`/api/pattern-radar?days=${days}`)
}

export interface EnergyMoodPoint {
  date: string
  mood: string | null
  energy: number | null
}

export function getEnergyMoodMatrix(): Promise<{ data: EnergyMoodPoint[] }> {
  return json(`/api/energy-mood-matrix`)
}

export function getFrameworkDiversity(): Promise<{
  counts: Partial<Record<Framework, number>>
}> {
  return json(`/api/framework-diversity`)
}

// ── Phần 9.1: Memory Recall ─────────────────────────────────────────────

export interface MemoryRecallMatch {
  date: string
  user_quote: string
  tasks_done: number
  tasks_total: number
  days_ago: number
  mood: string
  energy: number
  similarity_score: number
}

export interface MemoryRecallResponse {
  available: boolean
  reason: string | null
  match: MemoryRecallMatch | null
}

export function getMemoryRecall(): Promise<MemoryRecallResponse> {
  return json<MemoryRecallResponse>('/api/memory-recall')
}

// ── Phần 9.2: Pattern Alert ─────────────────────────────────────────────

export interface PatternAlert {
  pattern_name: string
  severity: string
  recommended_override: string
  consecutive_days: number
  details: string
}

export interface PatternAlertResponse {
  active: boolean
  alert: PatternAlert | null
}

export function getPatternAlert(): Promise<PatternAlertResponse> {
  return json<PatternAlertResponse>('/api/pattern-alert')
}

// ── Phần 9.3: Weekly Letter ─────────────────────────────────────────────

export interface WeeklyLetter {
  letter_title: string
  letter_body: string
  signature_mood: 'warm' | 'proud' | 'gentle' | 'honest' | 'hopeful'
  generated_at: string
  read: boolean
}

export interface WeeklyLetterArchiveItem extends WeeklyLetter {
  date: string
}

export interface WeeklyLetterResponse {
  available: boolean
  reason: string | null
  sunday_date?: string
  letter: WeeklyLetter | null
  archive: WeeklyLetterArchiveItem[]
}

export function getWeeklyLetter(): Promise<WeeklyLetterResponse> {
  return json<WeeklyLetterResponse>('/api/weekly-letter')
}

export function markWeeklyLetterRead(
  sunday_date?: string,
): Promise<{ success: boolean }> {
  const params = sunday_date ? `?sunday_date=${sunday_date}` : ''
  return json(`/api/weekly-letter/read${params}`, { method: 'POST' })
}

// ── Phần 9.4: Bad-Day Rehearsal ───────────────────────────────────────────

export interface BadDayMessageEntry {
  id: number
  message: string
  author_date: string
  last_used_at: string | null
  use_count: number
}

export interface BadDayMessageTodayResponse {
  available: boolean
  reason: string | null
  entry: BadDayMessageEntry | null
}

export function getBadDayMessageToday(): Promise<BadDayMessageTodayResponse> {
  return json<BadDayMessageTodayResponse>('/api/bad-day-message/today')
}

export function postBadDayMessage(
  message: string,
): Promise<{ success: boolean; entry: BadDayMessageEntry }> {
  return json('/api/bad-day-message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export function markBadDayMessageUsed(
  msgId: number,
): Promise<{ success: boolean }> {
  return json(`/api/bad-day-message/used?msg_id=${msgId}`, { method: 'POST' })
}

export function getBadDayMessages(): Promise<{ messages: BadDayMessageEntry[] }> {
  return json('/api/bad-day-messages')
}
