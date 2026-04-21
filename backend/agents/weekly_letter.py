"""Agent 5 — Weekly Letter.

Input : history_7_days (list), user_profile (dict), patterns_detected (list),
        memory_recalls (list)
Output: letter_title, letter_body, signature_mood
"""
import json

from agents._gemini import call_gemini
from core.prompts import get_weekly_letter_prompt

REQUIRED_FIELDS = ["letter_title", "letter_body", "signature_mood"]
VALID_MOODS = {"warm", "proud", "gentle", "honest", "hopeful"}


async def run_weekly_letter(
    history_7_days: list[dict],
    user_profile: dict,
    patterns_detected: list[str] | None = None,
    memory_recalls: list[dict] | None = None,
) -> dict:
    """
    Generate a weekly letter summarizing the user's week.

    Returns:
        dict with letter_title, letter_body, signature_mood.

    Raises:
        ValueError: if Gemini output is invalid after retry.
    """
    system_prompt = get_weekly_letter_prompt()

    # Build rich context for the letter
    days_summary = []
    for day in history_7_days:
        day_info = {"date": day.get("date", "")}
        morning = day.get("morning", {})
        evening = day.get("evening", {})

        if morning:
            day_info["user_input"] = morning.get("user_input", "")
            day_info["mood"] = morning.get("mood_state", "")
            day_info["energy"] = morning.get("energy_level", 0)
            day_info["framework"] = morning.get("framework", "")
            tasks = morning.get("tasks", [])
            done = sum(1 for t in tasks if t.get("completed"))
            day_info["tasks_done"] = f"{done}/{len(tasks)}"
            day_info["task_titles"] = [t.get("title", "") for t in tasks]

        if evening:
            day_info["reflection"] = evening.get("user_input", "")
            day_info["summary"] = evening.get("summary", "")
            day_info["tomorrow_question"] = evening.get("tomorrow_question", "")

        days_summary.append(day_info)

    user_content = (
        "## User Profile\n"
        + json.dumps(
            {
                "name": user_profile.get("name", ""),
                "goal": user_profile.get("goal", ""),
                "context": user_profile.get("context", ""),
                "support_style": user_profile.get("support_style", "balanced"),
            },
            ensure_ascii=False,
        )
        + "\n\n## This Week (7 days, newest first)\n"
        + json.dumps(days_summary, ensure_ascii=False, indent=2)
    )

    if patterns_detected:
        user_content += (
            "\n\n## Patterns detected this week\n"
            + json.dumps(patterns_detected, ensure_ascii=False)
        )

    if memory_recalls:
        user_content += (
            "\n\n## Memory recalls triggered this week\n"
            + json.dumps(memory_recalls, ensure_ascii=False)
        )

    data = await call_gemini(system_prompt, user_content, REQUIRED_FIELDS)

    # Coerce signature_mood
    if data.get("signature_mood") not in VALID_MOODS:
        data["signature_mood"] = "warm"

    return data
