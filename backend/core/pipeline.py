"""Morning pipeline orchestrator.

Runs Agent 1 → 2 → 3 sequentially.
Stops at Agent 1 if risk_flag is True and returns crisis response.
Checks pattern_alert BEFORE Agent 2 to inject force_framework when needed.
"""
from agents.wellness_check import run_wellness_check
from agents.psychology_insight import run_psychology_insight
from agents.task_generator import run_task_generator
from core.memory import get_history_7_days
from core.pattern_alert import detect_risk_pattern

CRISIS_HOTLINES = [
    {"name": "Đường dây hỗ trợ sức khỏe tâm thần", "number": "1800 599 920", "available": "24/7"},
    {"name": "Đường dây hỗ trợ khủng hoảng tâm lý", "number": "1800 599 921", "available": "24/7"},
]


async def run_morning_pipeline(
    user_input: str,
    profile: dict,
    pre_commit: dict | None = None,
) -> dict:
    """
    Full morning pipeline: Wellness → Insight → Tasks.

    Returns:
        On normal flow:
            {"type": "morning", "wellness": {...}, "insight": {...},
             "tasks": [...], "encouragement": "..."}

        On crisis (risk_flag=True):
            {"type": "crisis", "wellness": {...}, "message": "...", "hotlines": [...]}

    Raises:
        ValueError: propagated from agents on invalid Gemini output.
    """
    # ── Agent 1: Wellness Check ──────────────────────────────────────────────
    wellness = await run_wellness_check(user_input, time_of_day="morning")

    # ── Crisis stop ──────────────────────────────────────────────────────────
    if wellness.get("risk_flag"):
        return {
            "type": "crisis",
            "wellness": wellness,
            "message": (
                "AURA nhận thấy bạn đang trải qua điều rất nặng nề. "
                "Bạn không cần phải đối mặt một mình. "
                "Hãy liên hệ ngay với đường dây hỗ trợ bên dưới — "
                "họ ở đây để lắng nghe bạn."
            ),
            "hotlines": CRISIS_HOTLINES,
        }

    # ── Pattern Alert (9.2) — check before Agent 2 ────────────────────────
    pattern_alert = detect_risk_pattern()

    # ── Agent 2: Psychology Insight ──────────────────────────────────────────
    history = get_history_7_days()

    # If pattern alert detected, inject force_framework into Agent 2 context
    force_framework = None
    if pattern_alert:
        force_framework = pattern_alert.get("recommended_override")

    insight = await run_psychology_insight(
        wellness, profile, history, force_framework=force_framework
    )

    # ── Agent 3: Task Generator ──────────────────────────────────────────────
    energy = wellness.get("energy_level", 5)
    task_result = await run_task_generator(insight, profile, energy, pre_commit=pre_commit)

    result = {
        "type": "morning",
        "wellness": wellness,
        "insight": insight,
        "tasks": task_result["tasks"],
        "encouragement": task_result.get("encouragement", ""),
    }

    # Attach pattern_alert metadata (for history logging + frontend indicator)
    if pattern_alert:
        result["pattern_alert"] = pattern_alert

    return result
