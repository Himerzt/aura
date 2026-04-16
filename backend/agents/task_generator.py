"""Agent 3 — Task Generator.

Input : insight_result (dict), user_profile (dict), energy_level (int),
        available_time (int, optional minutes)
Output: tasks[] with implementation intention, encouragement (VI)

Rule engine (strict):
  energy 1-3  → max 1 task, ≤15 min, very_easy
  energy 4-6  → max 2 tasks, ≤30 min, easy/medium
  energy 7-10 → max 3 tasks, ≤60 min, medium/hard
"""
import json

from agents._gemini import call_gemini
from core.prompts import get_task_prompt

REQUIRED_FIELDS = ["tasks", "encouragement"]
TASK_FIELDS = ["title", "implementation", "estimated_minutes", "difficulty"]
VALID_DIFFICULTIES = {"very_easy", "easy", "medium", "hard"}


def _get_energy_rules(energy: int) -> tuple[int, int]:
    """Return (max_tasks, max_total_minutes) for given energy level."""
    if energy <= 3:
        return 1, 15
    elif energy <= 6:
        return 2, 30
    return 3, 60


async def run_task_generator(
    insight_result: dict,
    user_profile: dict,
    energy_level: int,
    available_time: int | None = None,
) -> dict:
    """
    Generate tasks with implementation intentions based on framework and energy.

    Returns:
        dict with tasks (list) and encouragement (str).

    Raises:
        ValueError: if output violates energy rules or is invalid after retry.
    """
    framework = insight_result.get("recommended_framework", "behavioral_activation")
    anchors = user_profile.get("daily_anchors", [])
    past_attempts = user_profile.get("past_attempts", [])
    goal = user_profile.get("goal", "")
    context = user_profile.get("context", "")
    support_style = user_profile.get("support_style", "balanced")

    system_prompt = get_task_prompt(
        framework, energy_level, anchors,
        goal=goal, context=context, support_style=support_style,
    )

    user_content = (
        "## Psychology Insight\n"
        + json.dumps(insight_result, ensure_ascii=False)
        + "\n\n## User Context\n"
        + json.dumps(
            {
                "goal": goal,
                "context": context,
                "past_attempts": past_attempts,
                "support_style": support_style,
                "available_time_minutes": available_time,
            },
            ensure_ascii=False,
        )
    )

    data = await call_gemini(system_prompt, user_content, REQUIRED_FIELDS)

    if not isinstance(data.get("tasks"), list) or len(data["tasks"]) == 0:
        raise ValueError("tasks must be a non-empty list")

    max_tasks, max_total_min = _get_energy_rules(energy_level)

    # Enforce max task count
    if len(data["tasks"]) > max_tasks:
        data["tasks"] = data["tasks"][:max_tasks]

    # Validate each task structure
    total_minutes = 0
    for task in data["tasks"]:
        missing = [f for f in TASK_FIELDS if f not in task]
        if missing:
            raise ValueError(f"Task missing fields: {missing}. Task: {task}")
        if task.get("difficulty") not in VALID_DIFFICULTIES:
            task["difficulty"] = "easy"
        task["estimated_minutes"] = max(1, int(task.get("estimated_minutes", 5)))
        total_minutes += task["estimated_minutes"]

    # Enforce total time limit
    if total_minutes > max_total_min:
        scale = max_total_min / total_minutes
        for task in data["tasks"]:
            task["estimated_minutes"] = max(1, round(task["estimated_minutes"] * scale))

    return data
