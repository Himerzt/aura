"""Supabase data layer for AURA — replaces JSON file storage.

Activate by setting DATABASE_PROVIDER=supabase in environment.
Falls back to JSON file storage if not configured.
"""
import os
from datetime import date, datetime, timedelta
from typing import Optional

from supabase import Client, create_client

VALID_FRICTION_REASONS = {"tired", "distracted", "forgot", "no_meaning"}

_supabase_client: Optional[Client] = None
_current_user_id = "local_user"


def _get_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError(
                "DATABASE_PROVIDER=supabase but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set"
            )
        _supabase_client = create_client(url, key)
    return _supabase_client


def _row_to_profile(row: dict) -> dict:
    if not row:
        return {
            "user_id": _current_user_id,
            "created_at": "",
            "name": "",
            "goal": "",
            "context": "",
            "past_attempts": [],
            "daily_anchors": [],
            "chronotype": "flexible",
            "support_style": "balanced",
            "onboarding_completed": False,
            "bad_day_messages": [],
        }
    return {
        "user_id": row.get("user_id", _current_user_id),
        "created_at": (row.get("created_at") or "").isoformat()
        if isinstance(row.get("created_at"), datetime)
        else str(row.get("created_at") or ""),
        "name": row.get("name") or "",
        "goal": row.get("goal") or "",
        "context": row.get("context") or "",
        "past_attempts": row.get("past_attempts") or [],
        "daily_anchors": row.get("daily_anchors") or [],
        "chronotype": row.get("chronotype") or "flexible",
        "support_style": row.get("support_style") or "balanced",
        "onboarding_completed": row.get("onboarding_completed") or False,
        "bad_day_messages": row.get("bad_day_messages") or [],
    }


def _row_to_entry(row: dict) -> dict:
    if not row:
        return {}
    result: dict = {"date": str(row.get("date", ""))}
    if row.get("morning"):
        result["morning"] = row["morning"]
    if row.get("evening"):
        result["evening"] = row["evening"]
    if row.get("weekly_letter"):
        result["weekly_letter"] = row["weekly_letter"]
    if row.get("streak_day") is not None:
        result["streak_day"] = row["streak_day"]
    return result


# ── Profile ────────────────────────────────────────────────────────

def load_profile() -> dict:
    sb = _get_client()
    row = (
        sb.table("profiles")
        .select("*")
        .eq("user_id", _current_user_id)
        .execute()
    )
    records = row.data or []
    if not records:
        return {
            "user_id": _current_user_id,
            "created_at": "",
            "name": "",
            "goal": "",
            "context": "",
            "past_attempts": [],
            "daily_anchors": [],
            "chronotype": "flexible",
            "support_style": "balanced",
            "onboarding_completed": False,
            "bad_day_messages": [],
        }
    return _row_to_profile(records[0])


def save_profile(profile: dict) -> None:
    sb = _get_client()
    sb.rpc("upsert_profile", {"p_data": profile}).execute()


# ── History helpers ────────────────────────────────────────────────

def _load_entry_row(iso_date: str) -> Optional[dict]:
    sb = _get_client()
    row = (
        sb.table("daily_entries")
        .select("*")
        .eq("date", iso_date)
        .eq("user_id", _current_user_id)
        .execute()
    )
    records = row.data or []
    return records[0] if records else None


def _load_history() -> dict:
    sb = _get_client()
    today = date.today()
    start = (today - timedelta(days=364)).isoformat()
    end = today.isoformat()
    rows = (
        sb.table("daily_entries")
        .select("*")
        .eq("user_id", _current_user_id)
        .gte("date", start)
        .lte("date", end)
        .order("date", desc=False)
        .execute()
    )
    result = {}
    for r in rows.data or []:
        result[str(r["date"])] = _row_to_entry(r)
    return result


def get_today_entry() -> dict:
    return _row_to_entry(_load_entry_row(date.today().isoformat()))


def save_morning(morning_data: dict) -> None:
    sb = _get_client()
    today = date.today().isoformat()
    now_iso = datetime.now().isoformat(timespec="seconds")
    for task in morning_data.get("tasks", []):
        task.setdefault("created_at", now_iso)

    streak = get_streak()
    streak_day = streak["current_streak"] + 1

    sb.rpc(
        "upsert_daily_entry",
        {
            "p_date": today,
            "p_user_id": _current_user_id,
            "p_morning": morning_data,
            "p_streak_day": streak_day,
        },
    ).execute()


def save_evening(
    evening_data: dict, completed_task_ids: Optional[list[int]] = None
) -> None:
    sb = _get_client()
    today = date.today().isoformat()
    if completed_task_ids is not None:
        for idx in completed_task_ids:
            sb.rpc(
                "update_task_completion",
                {
                    "p_date": today,
                    "p_user_id": _current_user_id,
                    "p_task_index": idx,
                    "p_completed": True,
                },
            ).execute()
    sb.rpc(
        "update_entry_evening",
        {"p_date": today, "p_user_id": _current_user_id, "p_evening": evening_data},
    ).execute()


def get_history_7_days() -> list[dict]:
    history = _load_history()
    today = date.today()
    result = []
    for i in range(7):
        day = (today - timedelta(days=i)).isoformat()
        if day in history:
            result.append({"date": day, **history[day]})
    return result


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
            continue
        else:
            if shields > 0:
                shields -= 1
                current_streak += 1
                continue
            break

    return {
        "current_streak": current_streak,
        "today_completed": "morning" in history.get(today.isoformat(), {}),
        "shield_count": _calculate_shields(history, today),
    }


def _calculate_shields(history: dict, today: date) -> int:
    shields_earned = 0
    shields_used = 0
    current_monday = today - timedelta(days=today.weekday())
    for w in range(1, 53):
        week_start = current_monday - timedelta(weeks=w)
        count = sum(
            1
            for i in range(7)
            if "morning"
            in history.get((week_start + timedelta(days=i)).isoformat(), {})
        )
        if count >= 5:
            shields_earned += 1

    streak_active = True
    for i in range(1, 365):
        day = (today - timedelta(days=i)).isoformat()
        entry = history.get(day, {})
        if "morning" in entry:
            continue
        prev_day = (today - timedelta(days=i + 1)).isoformat()
        if "morning" in history.get(prev_day, {}):
            shields_used += 1
        else:
            break

    return max(shields_earned - shields_used, 0)


# ── Task operations ────────────────────────────────────────────────

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
    if reason not in VALID_FRICTION_REASONS:
        raise ValueError(
            f"reason must be one of {sorted(VALID_FRICTION_REASONS)}, got '{reason}'"
        )
    date_str = date_str or date.today().isoformat()
    history = _load_history()
    task = _get_task(history, date_str, task_index)
    task["friction"] = {
        "reason": reason,
        "note": note,
        "logged_at": datetime.now().isoformat(timespec="seconds"),
    }
    _patch_task_in_entry(date_str, task_index, task)
    return task


def track_time_to_first_action(
    task_index: int,
    date_str: Optional[str] = None,
) -> dict:
    date_str = date_str or date.today().isoformat()
    history = _load_history()
    task = _get_task(history, date_str, task_index)
    if "first_action_at" in task:
        return task

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
    _patch_task_in_entry(date_str, task_index, task)
    return task


def _patch_task_in_entry(date_str: str, task_index: int, task: dict) -> None:
    sb = _get_client()
    row = _load_entry_row(date_str)
    if not row or not row.get("morning"):
        return
    tasks = list(row["morning"].get("tasks", []))
    if task_index < len(tasks):
        tasks[task_index] = task
        sb.table("daily_entries").update(
            {"morning": {**row["morning"], "tasks": tasks}}
        ).eq("date", date_str).eq("user_id", _current_user_id).execute()


def replace_task(
    task_index: int,
    new_task: dict,
    date_str: Optional[str] = None,
) -> dict:
    date_str = date_str or date.today().isoformat()
    history = _load_history()
    task = _get_task(history, date_str, task_index)
    replaced_from = {k: v for k, v in task.items() if k != "replaced_from"}
    new_task.setdefault("completed", False)
    new_task.setdefault(
        "created_at", datetime.now().isoformat(timespec="seconds")
    )
    new_task["replaced_from"] = replaced_from
    _patch_task_in_entry(date_str, task_index, new_task)
    return new_task


# ── Analytics ─────────────────────────────────────────────────────

def get_framework_diversity_7d() -> dict:
    return get_pattern_radar(days=7)


def get_pattern_radar(days: int = 7) -> dict:
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
    history = _load_history()
    today = date.today()
    result = []
    for i in range(6, -1, -1):
        day = (today - timedelta(days=i)).isoformat()
        morning = history.get(day, {}).get("morning", {})
        if morning:
            result.append(
                {
                    "date": day,
                    "mood": morning.get("mood_state"),
                    "energy": morning.get("energy_level"),
                }
            )
    return result


def get_today_morning() -> dict:
    return get_today_entry().get("morning", {})


# ── Weekly Letter helpers ──────────────────────────────────────────

def get_most_recent_sunday() -> str:
    today = date.today()
    days_since_sunday = today.weekday() + 1
    if today.weekday() == 6:
        days_since_sunday = 0
    sunday = today - timedelta(days=days_since_sunday)
    return sunday.isoformat()


def get_weekly_letter(sunday_date: Optional[str] = None) -> Optional[dict]:
    target = sunday_date or get_most_recent_sunday()
    entry = _row_to_entry(_load_entry_row(target))
    return entry.get("weekly_letter")


def save_weekly_letter(letter: dict, sunday_date: Optional[str] = None) -> None:
    target = sunday_date or get_most_recent_sunday()
    letter["generated_at"] = datetime.now().isoformat(timespec="seconds")
    letter["read"] = False
    sb = _get_client()
    sb.rpc(
        "upsert_daily_entry",
        {
            "p_date": target,
            "p_user_id": _current_user_id,
            "p_weekly_letter": letter,
        },
    ).execute()


def mark_weekly_letter_read(sunday_date: Optional[str] = None) -> None:
    target = sunday_date or get_most_recent_sunday()
    row = _load_entry_row(target)
    if row and row.get("weekly_letter"):
        wl = dict(row["weekly_letter"])
        wl["read"] = True
        sb = _get_client()
        sb.rpc(
            "upsert_daily_entry",
            {"p_date": target, "p_user_id": _current_user_id, "p_weekly_letter": wl},
        ).execute()


def get_all_weekly_letters() -> list[dict]:
    history = _load_history()
    letters = []
    for date_str in sorted(history.keys(), reverse=True):
        wl = history[date_str].get("weekly_letter")
        if wl:
            letters.append({"date": date_str, **wl})
    return letters


def get_history_for_week(sunday_date: Optional[str] = None) -> list[dict]:
    history = _load_history()
    if sunday_date:
        end = date.fromisoformat(sunday_date)
    else:
        end = date.fromisoformat(get_most_recent_sunday())
    result = []
    for i in range(6, -1, -1):
        day = (end - timedelta(days=i)).isoformat()
        if day in history:
            result.append({"date": day, **history[day]})
    return result


# ── Bad Day Rehearsal helpers ─────────────────────────────────────

COOLDOWN_DAYS = 7


def save_bad_day_message(message: str, author_date: Optional[str] = None) -> dict:
    sb = _get_client()
    result = sb.rpc(
        "add_bad_day_message",
        {"p_user_id": _current_user_id, "p_message": message.strip()},
    ).execute()
    return result.data


def get_bad_day_message() -> Optional[dict]:
    profile = load_profile()
    messages = profile.get("bad_day_messages", [])
    if not messages:
        return None
    today = date.today()
    cutoff = (today - timedelta(days=COOLDOWN_DAYS)).isoformat()
    never_used = [m for m in messages if m.get("last_used_at") is None]
    cooled = [
        m
        for m in messages
        if m.get("last_used_at") and m["last_used_at"][:10] <= cutoff
    ]
    if never_used:
        return never_used[0]
    if cooled:
        cooled.sort(key=lambda m: m["last_used_at"])
        return cooled[0]
    return None


def mark_bad_day_message_used(msg_id: int) -> None:
    save_profile  # imported already; we update in-memory and re-save
    profile = load_profile()
    messages = profile.get("bad_day_messages", [])
    for m in messages:
        if m.get("id") == msg_id:
            m["last_used_at"] = datetime.now().isoformat(timespec="seconds")
            m["use_count"] = m.get("use_count", 0) + 1
            break
    save_profile(profile)


def get_all_bad_day_messages() -> list[dict]:
    return load_profile().get("bad_day_messages", [])
