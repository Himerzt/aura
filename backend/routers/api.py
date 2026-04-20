"""AURA API routes — all /api/* endpoints."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
    VALID_FRICTION_REASONS,
)
from core.pipeline import run_morning_pipeline
from agents.reflection import run_reflection
from agents.task_generator import run_task_generator

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


class MorningRequest(BaseModel):
    user_input: str


class EveningRequest(BaseModel):
    user_input: str
    completed_task_ids: list[int] = []


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
async def morning_checkin(req: MorningRequest):
    """Run morning pipeline (Agent 1→2→3) and save result."""
    if not req.user_input.strip():
        raise HTTPException(status_code=400, detail="user_input không được để trống")

    profile = load_profile()

    try:
        result = await run_morning_pipeline(req.user_input, profile)
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
