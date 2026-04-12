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
    get_history_7_days,
    get_streak,
)
from core.pipeline import run_morning_pipeline
from agents.reflection import run_reflection

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
    save_evening(evening_data)

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
