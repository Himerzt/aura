import json
import os
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).parent.parent / "data"
PROFILE_PATH = DATA_DIR / "profile.json"
HISTORY_PATH = DATA_DIR / "history.json"

VALID_FRICTION_REASONS = {"tired", "distracted", "forgot", "no_meaning"}

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
    now_iso = datetime.now().isoformat(timespec="seconds")
    for task in morning_data.get("tasks", []):
        task.setdefault("created_at", now_iso)
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


# ── Medium extensions (Phần 8D) ──────────────────────────────────────────────

def _resolve_date(date_str: Optional[str]) -> str:
    return date_str or date.today().isoformat()


def _get_task(history: dict, date_str: str, task_index: int) -> dict:
    entry = history.get(date_str, {})
    tasks = entry.get("morning", {}).get("tasks", [])
    if task_index < 0 or task_index >= len(tasks):
        raise ValueError(f"task_index {task_index} out of range for {date_str}")
    return tasks[task_index]


def log_friction(
    task_index: int,
    reason: str,
    note: str = "",
    date_str: Optional[str] = None,
) -> dict:
    """Log friction (skip reason) for a task. Returns the updated task."""
    if reason not in VALID_FRICTION_REASONS:
        raise ValueError(
            f"reason must be one of {sorted(VALID_FRICTION_REASONS)}, got '{reason}'"
        )
    date_str = _resolve_date(date_str)
    history = _load_history()
    task = _get_task(history, date_str, task_index)
    task["friction"] = {
        "reason": reason,
        "note": note,
        "logged_at": datetime.now().isoformat(timespec="seconds"),
    }
    _save_history(history)
    return task


def track_time_to_first_action(
    task_index: int,
    date_str: Optional[str] = None,
) -> dict:
    """Stamp first tick timestamp + compute delay. Idempotent."""
    date_str = _resolve_date(date_str)
    history = _load_history()
    task = _get_task(history, date_str, task_index)

    if "first_action_at" in task:
        return task  # already tracked

    now = datetime.now()
    task["first_action_at"] = now.isoformat(timespec="seconds")

    created_raw = task.get("created_at")
    if created_raw:
        try:
            created = datetime.fromisoformat(created_raw)
            delay = max(0, int((now - created).total_seconds() / 60))
            task["first_action_delay_minutes"] = delay
        except ValueError:
            pass
    _save_history(history)
    return task


def get_framework_diversity_7d() -> dict:
    """Count framework usage in last 7 days."""
    return get_pattern_radar(days=7)


def get_pattern_radar(days: int = 7) -> dict:
    """Count framework usage in last N days. Returns dict keyed by framework."""
    history = _load_history()
    today = date.today()
    counts: dict[str, int] = {}
    for i in range(days):
        day = (today - timedelta(days=i)).isoformat()
        framework = history.get(day, {}).get("morning", {}).get("framework")
        if framework:
            counts[framework] = counts.get(framework, 0) + 1
    return counts


def get_energy_mood_matrix_7d() -> list[dict]:
    """Return [{date, mood, energy}] for last 7 days (oldest → newest)."""
    history = _load_history()
    today = date.today()
    result = []
    for i in range(6, -1, -1):
        day = (today - timedelta(days=i)).isoformat()
        morning = history.get(day, {}).get("morning", {})
        if morning:
            result.append({
                "date": day,
                "mood": morning.get("mood_state"),
                "energy": morning.get("energy_level"),
            })
    return result


def replace_task(
    task_index: int,
    new_task: dict,
    date_str: Optional[str] = None,
) -> dict:
    """Replace a task with new_task, preserving original as `replaced_from`."""
    date_str = _resolve_date(date_str)
    history = _load_history()
    task = _get_task(history, date_str, task_index)

    replaced_from = {k: v for k, v in task.items() if k != "replaced_from"}
    new_task.setdefault("completed", False)
    new_task.setdefault("created_at", datetime.now().isoformat(timespec="seconds"))
    new_task["replaced_from"] = replaced_from

    history[date_str]["morning"]["tasks"][task_index] = new_task
    _save_history(history)
    return new_task


def get_today_morning() -> dict:
    """Return today's morning entry (empty dict if none)."""
    return get_today_entry().get("morning", {})


# ── Weekly Letter helpers (Phần 9.3) ────────────────────────────────────────

def get_most_recent_sunday() -> str:
    """Return ISO date string of the most recent Sunday (including today if Sunday)."""
    today = date.today()
    days_since_sunday = today.weekday() + 1  # Monday=0 ... Sunday=6 → +1
    if today.weekday() == 6:  # today is Sunday
        days_since_sunday = 0
    sunday = today - timedelta(days=days_since_sunday)
    return sunday.isoformat()


def get_weekly_letter(sunday_date: str | None = None) -> dict | None:
    """Return the weekly letter for a given Sunday, or None if not found."""
    history = _load_history()
    target = sunday_date or get_most_recent_sunday()
    return history.get(target, {}).get("weekly_letter")


def save_weekly_letter(letter: dict, sunday_date: str | None = None) -> None:
    """Save a weekly letter to history under the Sunday date."""
    target = sunday_date or get_most_recent_sunday()
    history = _load_history()
    entry = history.setdefault(target, {})
    letter["generated_at"] = datetime.now().isoformat(timespec="seconds")
    letter["read"] = False
    entry["weekly_letter"] = letter
    _save_history(history)


def mark_weekly_letter_read(sunday_date: str | None = None) -> None:
    """Mark a weekly letter as read."""
    target = sunday_date or get_most_recent_sunday()
    history = _load_history()
    letter = history.get(target, {}).get("weekly_letter")
    if letter:
        letter["read"] = True
        _save_history(history)


def get_all_weekly_letters() -> list[dict]:
    """Return all weekly letters from history, newest first."""
    history = _load_history()
    letters = []
    for date_str in sorted(history.keys(), reverse=True):
        wl = history[date_str].get("weekly_letter")
        if wl:
            letters.append({"date": date_str, **wl})
    return letters


def get_history_for_week(sunday_date: str | None = None) -> list[dict]:
    """Return 7 days of history ending on sunday_date (Mon-Sun)."""
    history = _load_history()
    if sunday_date:
        end = date.fromisoformat(sunday_date)
    else:
        end = date.fromisoformat(get_most_recent_sunday())
    result = []
    for i in range(6, -1, -1):  # Monday to Sunday
        day = (end - timedelta(days=i)).isoformat()
        if day in history:
            result.append({"date": day, **history[day]})
    return result


# ── Bad-Day Rehearsal helpers (Phần 9.4) ──────────────────────────────────────

COOLDOWN_DAYS = 7


def save_bad_day_message(message: str, author_date: str | None = None) -> dict:
    """Save a bad-day message to profile.bad_day_messages[]. Returns the saved entry."""
    profile = load_profile()
    messages = profile.setdefault("bad_day_messages", [])
    entry = {
        "id": len(messages),
        "message": message.strip(),
        "author_date": author_date or date.today().isoformat(),
        "last_used_at": None,
        "use_count": 0,
    }
    messages.append(entry)
    save_profile(profile)
    return entry


def get_bad_day_message() -> dict | None:
    """Return a bad-day message respecting 7-day cooldown. Prefer unused, then oldest-used."""
    profile = load_profile()
    messages = profile.get("bad_day_messages", [])
    if not messages:
        return None

    today = date.today()
    cutoff = (today - timedelta(days=COOLDOWN_DAYS)).isoformat()

    # Split into: never used, used but cooled down, still in cooldown
    never_used = [m for m in messages if m.get("last_used_at") is None]
    cooled = [m for m in messages if m.get("last_used_at") and m["last_used_at"][:10] <= cutoff]
    # in_cooldown are excluded

    if never_used:
        return never_used[0]
    if cooled:
        # Pick the one with oldest last_used_at
        cooled.sort(key=lambda m: m["last_used_at"])
        return cooled[0]
    return None


def mark_bad_day_message_used(msg_id: int) -> None:
    """Mark a bad-day message as used (update last_used_at and use_count)."""
    profile = load_profile()
    messages = profile.get("bad_day_messages", [])
    for m in messages:
        if m.get("id") == msg_id:
            m["last_used_at"] = datetime.now().isoformat(timespec="seconds")
            m["use_count"] = m.get("use_count", 0) + 1
            break
    save_profile(profile)


def get_all_bad_day_messages() -> list[dict]:
    """Return all bad-day messages."""
    profile = load_profile()
    return profile.get("bad_day_messages", [])
