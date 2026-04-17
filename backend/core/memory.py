import json
import os
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).parent.parent / "data"
PROFILE_PATH = DATA_DIR / "profile.json"
HISTORY_PATH = DATA_DIR / "history.json"

DEFAULT_PROFILE = {
    "user_id": "local_user",
    "created_at": "",
    "name": "",
    "goal": "",
    "context": "",
    "past_attempts": [],
    "daily_anchors": [],
    "chronotype": "flexible",
    "support_style": "balanced",
    "onboarding_completed": False,
}


def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        content = f.read().strip()
        if not content:
            return {}
        return json.loads(content)


def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Profile ──────────────────────────────────────────────────────────────────

def load_profile() -> dict:
    data = _read_json(PROFILE_PATH)
    if not data:
        return dict(DEFAULT_PROFILE)
    # Merge defaults for any missing keys
    merged = dict(DEFAULT_PROFILE)
    merged.update(data)
    return merged


def save_profile(profile: dict) -> None:
    _write_json(PROFILE_PATH, profile)


# ── History helpers ──────────────────────────────────────────────────────────

def _load_history() -> dict:
    return _read_json(HISTORY_PATH)


def _save_history(history: dict) -> None:
    _write_json(HISTORY_PATH, history)


def get_today_entry() -> dict:
    today = date.today().isoformat()
    history = _load_history()
    return history.get(today, {})


def save_morning(morning_data: dict) -> None:
    today = date.today().isoformat()
    history = _load_history()
    entry = history.setdefault(today, {})
    entry["morning"] = morning_data
    entry.setdefault("streak_day", get_streak()["current_streak"] + 1)
    _save_history(history)


def save_evening(evening_data: dict, completed_task_ids: list[int] | None = None) -> None:
    today = date.today().isoformat()
    history = _load_history()
    entry = history.setdefault(today, {})
    entry["evening"] = evening_data
    # Update task completed status based on checklist
    if completed_task_ids is not None and "morning" in entry:
        tasks = entry["morning"].get("tasks", [])
        for i, task in enumerate(tasks):
            task["completed"] = i in completed_task_ids
    _save_history(history)


def get_history_7_days() -> list[dict]:
    history = _load_history()
    today = date.today()
    result = []
    for i in range(7):
        day = (today - timedelta(days=i)).isoformat()
        if day in history:
            result.append({"date": day, **history[day]})
    return result


def _count_completed_days_in_week(history: dict, week_start: date) -> int:
    """Count days with morning entry in a Mon-Sun week."""
    count = 0
    for i in range(7):
        day = (week_start + timedelta(days=i)).isoformat()
        if "morning" in history.get(day, {}):
            count += 1
    return count


def _calculate_shields(history: dict, today: date) -> int:
    """Calculate total shields earned from completed weeks (≥5/7 days).
    Shields are consumed when a missed day would break a streak."""
    shields_earned = 0
    shields_used = 0

    # Check completed weeks (not the current partial week)
    # Go back up to 52 weeks
    current_monday = today - timedelta(days=today.weekday())
    for w in range(1, 53):
        week_start = current_monday - timedelta(weeks=w)
        if _count_completed_days_in_week(history, week_start) >= 5:
            shields_earned += 1

    # Count shields used: missed days inside an otherwise active streak
    # Walk backwards from today; each gap day that didn't break streak used a shield
    streak_active = True
    for i in range(1, 365):
        day = (today - timedelta(days=i)).isoformat()
        entry = history.get(day, {})
        if "morning" in entry:
            continue
        # Missed day — check if streak continued past it
        prev_day = (today - timedelta(days=i + 1)).isoformat()
        if "morning" in history.get(prev_day, {}):
            shields_used += 1
        else:
            break  # Two consecutive misses = streak truly broken

    return max(shields_earned - shields_used, 0)


def get_streak() -> dict:
    history = _load_history()
    today = date.today()
    current_streak = 0
    shields = _calculate_shields(history, today)

    for i in range(365):
        day = (today - timedelta(days=i)).isoformat()
        entry = history.get(day, {})
        if "morning" in entry:
            current_streak += 1
        elif i == 0:
            # Today has no entry yet — streak continues from yesterday
            continue
        else:
            # Missed day — use a shield if available
            if shields > 0:
                shields -= 1
                current_streak += 1  # Shield preserves the streak
                continue
            break

    return {
        "current_streak": current_streak,
        "today_completed": "morning" in history.get(today.isoformat(), {}),
        "shield_count": _calculate_shields(history, today),
    }
