"""AURA API routes — all /api/* endpoints."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, model_validator
from core.limiter import limiter

from core.memory import (
    load_profile,
    save_profile,
    save_morning,
    save_evening,
    get_today_entry,
    get_today_morning,
    get_history_7_days,
    get_streak,
    log_friction,
    track_time_to_first_action,
    replace_task,
    get_pattern_radar,
    get_framework_diversity_7d,
    get_energy_mood_matrix_7d,
    get_most_recent_sunday,
    get_weekly_letter,
    save_weekly_letter,
    mark_weekly_letter_read,
    get_all_weekly_letters,
    get_history_for_week,
    save_bad_day_message,
    get_bad_day_message,
    mark_bad_day_message_used,
    get_all_bad_day_messages,
    VALID_FRICTION_REASONS,
)
from core.pipeline import run_morning_pipeline
from core.memory_recall import find_similar_past_day
from core.pattern_alert import detect_risk_pattern
from agents.reflection import run_reflection
from agents.task_generator import run_task_generator
from agents.weekly_letter import run_weekly_letter
from core.rag import run_rag_query

router = APIRouter(prefix="/api", tags=["aura"])


# ── Request Models ─────────────────────────────────────────────────────────────

class OnboardingRequest(BaseModel):
    name: str
    goal: str
    context: str
    past_attempts: list[str] = []
    daily_anchors: list[str] = []
    chronotype: str = "flexible"
    support_style: str = "balanced"


class PreCommitPayload(BaseModel):
    when: str   # e.g. "7h sáng"
    what: str   # e.g. "đi bộ 10 phút sau khi pha cà phê"


class MorningRequest(BaseModel):
    user_input: str
    pre_commit: Optional[PreCommitPayload] = None


class EveningRequest(BaseModel):
    user_input: str
    completed_task_ids: list[int] = []


class RagRequest(BaseModel):
    question: str = Field(min_length=1)

    @model_validator(mode="after")
    def strip_question(self) -> "RagRequest":
        if not self.question.strip():
            raise ValueError("question không được để trống")
        self.question = self.question.strip()
        return self


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/onboarding")
async def onboarding(req: OnboardingRequest):
    """Save user profile from onboarding flow."""
    profile = load_profile()
    profile.update({
        "name": req.name,
        "goal": req.goal,
        "context": req.context,
        "past_attempts": req.past_attempts,
        "daily_anchors": req.daily_anchors,
        "chronotype": req.chronotype,
        "support_style": req.support_style,
        "onboarding_completed": True,
    })
    save_profile(profile)
    return {"success": True, "message": f"Chào mừng {req.name}! Hồ sơ đã được lưu."}


@router.get("/profile")
async def get_profile():
    """Return current user profile."""
    return load_profile()


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    context: Optional[str] = None
    past_attempts: Optional[list[str]] = None
    daily_anchors: Optional[list[str]] = None
    chronotype: Optional[str] = None
    support_style: Optional[str] = None


@router.put("/profile")
async def update_profile(req: ProfileUpdateRequest):
    """Update user profile fields. Only provided fields are updated."""
    profile = load_profile()
    updates = req.model_dump(exclude_none=True)
    if not updates:
        return {"success": False, "message": "Không có trường nào để cập nhật."}
    profile.update(updates)
    save_profile(profile)
    return {"success": True, "profile": profile}


@router.post("/morning")
@limiter.limit("10/minute")
async def morning_checkin(request: Request, req: MorningRequest):
    """Run morning pipeline (Agent 1→2→3) and save result."""
    if not req.user_input.strip():
        raise HTTPException(status_code=400, detail="user_input không được để trống")

    profile = load_profile()

    try:
        pre_commit = req.pre_commit.model_dump() if req.pre_commit else None
        result = await run_morning_pipeline(req.user_input, profile, pre_commit=pre_commit)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI pipeline lỗi: {str(e)}")

    # Save to history (skip saving for crisis mode — just return)
    if result["type"] == "morning":
        today = date.today().isoformat()
        morning_data = {
            "user_input": req.user_input,
            "mood_state": result["wellness"]["mood_state"],
            "energy_level": result["wellness"]["energy_level"],
            "pattern": result["insight"]["primary_pattern"],
            "framework": result["insight"]["recommended_framework"],
            "explanation": result["insight"]["explanation_for_user"],
            "tasks": [
                {**task, "completed": False}
                for task in result["tasks"]
            ],
        }
        # Save pattern_alert metadata if present (9.2)
        if result.get("pattern_alert"):
            morning_data["pattern_alert"] = result["pattern_alert"]
        save_morning(morning_data)

    return result


@router.post("/evening")
async def evening_checkin(req: EveningRequest):
    """Run Agent 4 (reflection) and save evening entry."""
    if not req.user_input.strip():
        raise HTTPException(status_code=400, detail="user_input không được để trống")

    today_entry = get_today_entry()
    morning = today_entry.get("morning", {})
    today_tasks = morning.get("tasks", [])
    history = get_history_7_days()
    streak_info = get_streak()

    try:
        result = await run_reflection(
            user_input=req.user_input,
            today_tasks=today_tasks,
            completed_ids=req.completed_task_ids,
            history_7_days=history,
            day_count=streak_info.get("current_streak", 1),
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI pipeline lỗi: {str(e)}")

    evening_data = {
        "user_input": req.user_input,
        "summary": result["today_summary"],
        "pattern_detected": result["pattern_detected"],
        "tomorrow_question": result["tomorrow_question"],
    }
    save_evening(evening_data, completed_task_ids=req.completed_task_ids)

    return result


@router.get("/today")
async def get_today():
    """Return today's history entry."""
    entry = get_today_entry()
    return entry if entry else {}


@router.get("/streak")
async def streak():
    """Return current streak info."""
    return get_streak()


@router.get("/history")
async def history():
    """Return last 7 days of history entries."""
    return get_history_7_days()


# ── Phần 8D: Task friction + retry-easier + pattern radar ──────────────────────

class FrictionRequest(BaseModel):
    task_index: int
    reason: str  # tired | distracted | forgot | no_meaning
    note: str = ""
    date: Optional[str] = None


class FirstActionRequest(BaseModel):
    task_index: int
    date: Optional[str] = None


class RetryEasierRequest(BaseModel):
    task_index: int
    date: Optional[str] = None


@router.post("/task/friction")
async def task_friction(req: FrictionRequest):
    """Log friction reason for a task (skip/failed chip)."""
    if req.reason not in VALID_FRICTION_REASONS:
        raise HTTPException(
            status_code=400,
            detail=f"reason phải là một trong {sorted(VALID_FRICTION_REASONS)}",
        )
    try:
        task = log_friction(req.task_index, req.reason, req.note, req.date)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"success": True, "task": task}


@router.post("/task/first-action")
async def task_first_action(req: FirstActionRequest):
    """Stamp first-action timestamp on first tick. Idempotent."""
    try:
        task = track_time_to_first_action(req.task_index, req.date)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"success": True, "task": task}


@router.post("/task/retry-easier")
async def task_retry_easier(req: RetryEasierRequest):
    """Generate an easier replacement task (energy - 2) and swap it in."""
    target_date = req.date or date.today().isoformat()
    morning = get_today_morning() if target_date == date.today().isoformat() else {}
    if not morning:
        raise HTTPException(status_code=404, detail="Không tìm thấy morning entry")

    tasks = morning.get("tasks", [])
    if req.task_index < 0 or req.task_index >= len(tasks):
        raise HTTPException(status_code=404, detail="task_index ngoài phạm vi")

    original_energy = morning.get("energy_level", 5)
    new_energy = max(1, original_energy - 2)

    insight = {
        "primary_pattern": morning.get("pattern", ""),
        "explanation_for_user": morning.get("explanation", ""),
        "recommended_framework": morning.get("framework", "behavioral_activation"),
    }
    profile = load_profile()

    try:
        result = await run_task_generator(insight, profile, new_energy)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI pipeline lỗi: {str(e)}")

    new_tasks = result.get("tasks", [])
    if not new_tasks:
        raise HTTPException(status_code=502, detail="Không tạo được task dễ hơn")

    updated = replace_task(req.task_index, new_tasks[0], target_date)
    return {
        "success": True,
        "task": updated,
        "new_energy_level": new_energy,
        "encouragement": result.get("encouragement", ""),
    }


@router.get("/pattern-radar")
async def pattern_radar(days: int = 7):
    """Return count of each framework used in last N days."""
    if days not in (7, 30):
        raise HTTPException(status_code=400, detail="days phải là 7 hoặc 30")
    counts = get_pattern_radar(days=days)
    return {"days": days, "counts": counts}


@router.get("/energy-mood-matrix")
async def energy_mood_matrix():
    """Return [{date, mood, energy}] for last 7 days (for scatter/line chart)."""
    return {"data": get_energy_mood_matrix_7d()}


@router.get("/framework-diversity")
async def framework_diversity():
    """Shorthand for pattern-radar with 7-day window."""
    return {"counts": get_framework_diversity_7d()}


# ── Phần 9.1: Memory Recall ─────────────────────────────────────────────────

@router.get("/memory-recall")
async def memory_recall():
    """Find a similar past day the user overcame. Requires >= 14 days data."""
    today_entry = get_today_entry()
    morning = today_entry.get("morning", {})
    current_mood = morning.get("mood_state")
    current_energy = morning.get("energy_level")

    if not current_mood or not current_energy:
        return {"available": False, "reason": "no_morning_today", "match": None}

    match = find_similar_past_day(current_mood, current_energy)
    if not match:
        return {"available": False, "reason": "no_match", "match": None}

    return {"available": True, "reason": None, "match": match}


# ── Phần 9.2: Pattern Alert Status ──────────────────────────────────────────

@router.get("/pattern-alert")
async def pattern_alert_status():
    """Check if a pattern alert is currently active."""
    alert = detect_risk_pattern()
    if not alert:
        return {"active": False, "alert": None}
    return {"active": True, "alert": alert}


# ── Phần 9.3: Weekly Letter ────────────────────────────────────────────────

@router.get("/weekly-letter")
async def weekly_letter():
    """
    Return the weekly letter. Only generates if:
    - Today is Sunday OR the most recent Sunday's letter hasn't been read yet
    - At least 7 days of history data exist
    If a letter already exists for this Sunday, return it without re-generating.
    """
    sunday = get_most_recent_sunday()
    today = date.today()

    # Check if we have enough data (>= 7 days)
    history_week = get_history_for_week(sunday)
    days_with_data = [d for d in history_week if d.get("morning")]
    if len(days_with_data) < 7:
        return {
            "available": False,
            "reason": "not_enough_data",
            "days_with_data": len(days_with_data),
            "letter": None,
            "archive": get_all_weekly_letters(),
        }

    # Check if today is Sunday or letter is unread
    existing = get_weekly_letter(sunday)
    if existing:
        return {
            "available": True,
            "reason": None,
            "sunday_date": sunday,
            "letter": existing,
            "archive": get_all_weekly_letters(),
        }

    # Only generate on Sunday (day 6) or if letter doesn't exist yet
    # for the most recent Sunday (allow reading any day of the week)
    is_sunday = today.weekday() == 6
    if not is_sunday:
        # Not Sunday and no letter exists — check if past Sunday had enough data
        # Allow generation any day if Sunday has passed and letter wasn't generated
        pass

    # Generate the letter
    profile = load_profile()

    # Collect patterns detected this week
    patterns = []
    for day in history_week:
        morning = day.get("morning", {})
        if morning.get("pattern"):
            patterns.append(morning["pattern"])
        alert = morning.get("pattern_alert")
        if alert:
            patterns.append(alert.get("pattern_name", ""))

    try:
        letter = await run_weekly_letter(
            history_7_days=history_week,
            user_profile=profile,
            patterns_detected=patterns if patterns else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI pipeline lỗi: {str(e)}")

    save_weekly_letter(letter, sunday)

    return {
        "available": True,
        "reason": None,
        "sunday_date": sunday,
        "letter": get_weekly_letter(sunday),
        "archive": get_all_weekly_letters(),
    }


@router.post("/weekly-letter/read")
async def mark_letter_read(sunday_date: str | None = None):
    """Mark the weekly letter for a given Sunday as read."""
    mark_weekly_letter_read(sunday_date)
    return {"success": True}


# ── Phần 9.4: Bad-Day Rehearsal ──────────────────────────────────────────


class BadDayMessageRequest(BaseModel):
    message: str


@router.post("/bad-day-message")
async def create_bad_day_message(req: BadDayMessageRequest):
    """Save a bad-day rehearsal message written by the user on a good day."""
    text = req.message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="message không được để trống")
    entry = save_bad_day_message(text)
    return {"success": True, "entry": entry}


@router.get("/bad-day-message/today")
async def get_bad_day_message_today():
    """
    Return a bad-day message ONLY if today's mood is overwhelmed or numb.
    Otherwise return available=false so the frontend doesn't show it.
    """
    today_entry = get_today_entry()
    morning = today_entry.get("morning", {})
    mood = morning.get("mood_state")

    # Only serve on bad days
    if mood not in ("overwhelmed", "numb"):
        return {"available": False, "reason": "mood_not_bad", "entry": None}

    entry = get_bad_day_message()
    if not entry:
        return {"available": False, "reason": "no_messages", "entry": None}

    return {"available": True, "reason": None, "entry": entry}


@router.post("/bad-day-message/used")
async def bad_day_message_used(msg_id: int):
    """Mark a bad-day message as used after the user reads it."""
    mark_bad_day_message_used(msg_id)
    return {"success": True}


@router.get("/bad-day-messages")
async def list_bad_day_messages():
    """Return all bad-day messages for management/display."""
    return {"messages": get_all_bad_day_messages()}


@router.get("/weekly-insight")
async def weekly_insight():
    """Return weekly insight if 7+ days of history available."""
    history_data = get_history_7_days()
    if len(history_data) < 7:
        return {
            "available": False,
            "days_remaining": 7 - len(history_data),
            "insight": None,
        }
    # Extract weekly insights from reflection entries
    insights = [
        d.get("evening", {}).get("summary")
        for d in history_data
        if d.get("evening", {}).get("summary")
    ]
    return {
        "available": True,
        "days_remaining": 0,
        "insight": insights[-1] if insights else None,
    }


# ── RAG Lab ──────────────────────────────────────────────────────────────────

@router.post("/rag/query")
async def rag_query(req: RagRequest):
    """Answer user question using RAG on AURA's internal documents."""
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question không được để trống")

    try:
        result = await run_rag_query(question)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI pipeline lỗi: {str(e)}")

    return result

# Done 26/05/2026
