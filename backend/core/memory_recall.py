"""Aura Memory Recall — find a similar past day the user overcame successfully.

When today's mood matches a past day where the user completed >50% tasks
and had a non-crisis evening reflection, surface that day's own words
as encouragement. No generic advice — the user's own past is the medicine.
"""
from datetime import date, timedelta
from typing import Optional

from core.memory import _load_history

# Minimum days of history required before recall activates
MIN_HISTORY_DAYS = 14

# Only return a match above this threshold
MIN_SIMILARITY_SCORE = 0.7

MOOD_ORDER = ["numb", "overwhelmed", "anxious", "stable", "energized"]


def _mood_distance(a: str, b: str) -> float:
    """0.0 = identical, 1.0 = max distance (numb vs energized)."""
    try:
        ia = MOOD_ORDER.index(a)
        ib = MOOD_ORDER.index(b)
    except ValueError:
        return 1.0
    return abs(ia - ib) / (len(MOOD_ORDER) - 1)


def _day_has_successful_outcome(entry: dict) -> bool:
    """Check if a day entry had >50% tasks completed + has evening reflection."""
    morning = entry.get("morning", {})
    evening = entry.get("evening", {})
    tasks = morning.get("tasks", [])

    if not tasks or not evening:
        return False

    completed = sum(1 for t in tasks if t.get("completed"))
    if completed / len(tasks) <= 0.5:
        return False

    # Skip crisis days (no useful reflection)
    if morning.get("risk_flag"):
        return False

    return True


def _extract_user_quote(entry: dict) -> str:
    """Pull the best user-authored quote from the day's data."""
    evening = entry.get("evening", {})

    # Prefer tomorrow_question (forward-looking, personal)
    tq = evening.get("tomorrow_question", "")
    if tq and len(tq) > 10:
        return tq

    # Fallback to summary
    summary = evening.get("summary", "")
    if summary and len(summary) > 10:
        return summary

    # Last resort: morning user_input
    morning_input = entry.get("morning", {}).get("user_input", "")
    return morning_input or ""


def find_similar_past_day(
    current_mood: str,
    current_energy: int,
) -> Optional[dict]:
    """Find a past day with similar mood/energy where user overcame successfully.

    Similarity score:
        - mood match:          0.5 weight (0 = exact, scaled by distance)
        - energy within +/-2:  0.3 weight
        - recency bonus:       0.2 weight (older = more impressive to recall)

    Returns:
        dict with {date, user_quote, tasks_done, tasks_total, days_ago, mood, energy,
                   similarity_score} or None if no match found.
    """
    history = _load_history()
    today = date.today()

    # Check minimum history
    total_days_with_data = sum(
        1 for v in history.values() if "morning" in v
    )
    if total_days_with_data < MIN_HISTORY_DAYS:
        return None

    best_match: Optional[dict] = None
    best_score = 0.0

    for date_str, entry in history.items():
        # Skip today
        if date_str == today.isoformat():
            continue

        # Must have successful outcome
        if not _day_has_successful_outcome(entry):
            continue

        morning = entry.get("morning", {})
        past_mood = morning.get("mood_state", "")
        past_energy = morning.get("energy_level", 5)

        # ── Mood similarity (0.5 weight) ──
        mood_dist = _mood_distance(current_mood, past_mood)
        mood_score = 1.0 - mood_dist  # 1.0 = exact match

        # ── Energy similarity (0.3 weight) ──
        energy_diff = abs(current_energy - past_energy)
        energy_score = max(0.0, 1.0 - energy_diff / 4)  # within ±2 gets decent score

        # ── Recency (0.2 weight) — older successful days are more impactful ──
        try:
            past_date = date.fromisoformat(date_str)
            days_ago = (today - past_date).days
        except ValueError:
            continue
        # Normalize: 7-180 days → 0.0-1.0 (very recent or very old = less useful)
        if days_ago < 3:
            recency_score = 0.2  # too recent, less impact
        elif days_ago <= 90:
            recency_score = min(1.0, days_ago / 30)  # peaks around 30-90 days
        else:
            recency_score = max(0.3, 1.0 - (days_ago - 90) / 180)

        # ── Composite score ──
        total_score = (
            mood_score * 0.5
            + energy_score * 0.3
            + recency_score * 0.2
        )

        if total_score > best_score and total_score >= MIN_SIMILARITY_SCORE:
            tasks = morning.get("tasks", [])
            tasks_done = sum(1 for t in tasks if t.get("completed"))

            user_quote = _extract_user_quote(entry)
            if not user_quote:
                continue  # skip if no meaningful quote

            best_score = total_score
            best_match = {
                "date": date_str,
                "user_quote": user_quote,
                "tasks_done": tasks_done,
                "tasks_total": len(tasks),
                "days_ago": days_ago,
                "mood": past_mood,
                "energy": past_energy,
                "similarity_score": round(total_score, 3),
            }

    return best_match
