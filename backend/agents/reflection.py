"""Agent 4 — Evening Reflection.

Input : user_input (str), today_tasks (list), completed_ids (list[int]),
        history_7_days (list), day_count (int)
Output: today_summary (VI), pattern_detected, pattern_description (VI),
        progress_highlight (VI), tomorrow_question (VI), weekly_insight (VI|null)
"""
import json

from agents._gemini import call_gemini
from core.prompts import get_reflection_prompt

REQUIRED_FIELDS = [
    "today_summary",
    "pattern_detected",
    "progress_highlight",
    "tomorrow_question",
]


async def run_reflection(
    user_input: str,
    today_tasks: list[dict],
    completed_ids: list[int],
    history_7_days: list[dict],
    day_count: int = 1,
) -> dict:
    """
    Generate evening reflection summary with tomorrow's question.

    Returns:
        dict with today_summary, pattern_detected, pattern_description,
        progress_highlight, tomorrow_question, weekly_insight.

    Raises:
        ValueError: if Gemini output is invalid after retry.
    """
    system_prompt = get_reflection_prompt(history_7_days)

    # Mark which tasks were completed
    tasks_with_status = []
    for i, task in enumerate(today_tasks):
        tasks_with_status.append({
            **task,
            "completed": i in completed_ids,
        })

    completed_count = len(completed_ids)
    total_count = len(today_tasks)

    user_content = (
        f"## User Reflection\n{user_input}\n\n"
        f"## Today's Tasks ({completed_count}/{total_count} completed)\n"
        + json.dumps(tasks_with_status, ensure_ascii=False)
        + f"\n\n## Day Count\nThis is day {day_count} of the user's journey.\n\n"
        + "## Recent History\n"
        + json.dumps(history_7_days[-7:] if history_7_days else [], ensure_ascii=False)
    )

    data = await call_gemini(system_prompt, user_content, REQUIRED_FIELDS)

    # Coerce types
    data["pattern_detected"] = bool(data.get("pattern_detected", False))

    # pattern_description is null when no pattern detected
    if not data["pattern_detected"]:
        data["pattern_description"] = None
    elif "pattern_description" not in data:
        data["pattern_description"] = None

    # weekly_insight defaults to null if not present
    if "weekly_insight" not in data:
        data["weekly_insight"] = None

    return data
