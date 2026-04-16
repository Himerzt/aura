import type { DayEntry, EveningResult, History, MorningResult, StreakInfo, UserProfile } from './types'

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
