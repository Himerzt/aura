"""Agent 2 — Psychology Insight.

Input : wellness_result (dict), user_profile (dict), history_7_days (list)
Output: primary_pattern, explanation_for_user (VI), why_this_happens (VI),
        recommended_framework, pattern_trend
"""
import json

from agents._gemini import call_gemini
from core.prompts import get_insight_prompt, FRAMEWORK_DESCRIPTIONS

REQUIRED_FIELDS = [
    "primary_pattern",
    "explanation_for_user",
    "why_this_happens",
    "recommended_framework",
    "pattern_trend",
]
VALID_FRAMEWORKS = set(FRAMEWORK_DESCRIPTIONS.keys())
VALID_TRENDS = {"improving", "stable", "declining", "unknown"}


async def run_psychology_insight(
    wellness_result: dict,
    user_profile: dict,
    history_7_days: list[dict],
    force_framework: str | None = None,
) -> dict:
    """
    Identify psychological pattern and select intervention framework.

    Args:
        force_framework: If set by pattern_alert (9.2), overrides the AI's
            framework selection after the call. The AI still analyzes freely,
            but the final recommended_framework is replaced.

    Returns:
        dict with primary_pattern, explanation_for_user, why_this_happens,
        recommended_framework, pattern_trend.

    Raises:
        ValueError: if Gemini output is invalid after retry.
    """
    system_prompt = get_insight_prompt()

    # Build user content with full context
    force_hint = ""
    if force_framework and force_framework in VALID_FRAMEWORKS:
        force_hint = (
            f"\n\n## IMPORTANT OVERRIDE\n"
            f"Pattern alert detected. You MUST use framework '{force_framework}' "
            f"as recommended_framework. Adapt your explanation accordingly."
        )

    user_content = (
        "## Wellness Assessment\n"
        + json.dumps(wellness_result, ensure_ascii=False)
        + "\n\n## User Profile\n"
        + json.dumps(
            {
                "goal": user_profile.get("goal", ""),
                "context": user_profile.get("context", ""),
                "past_attempts": user_profile.get("past_attempts", []),
                "support_style": user_profile.get("support_style", "balanced"),
            },
            ensure_ascii=False,
        )
        + "\n\n## Recent History (last 7 days)\n"
        + json.dumps(history_7_days, ensure_ascii=False)
        + force_hint
    )

    data = await call_gemini(system_prompt, user_content, REQUIRED_FIELDS)

    # Force override framework if pattern alert active (belt + suspenders)
    if force_framework and force_framework in VALID_FRAMEWORKS:
        data["recommended_framework"] = force_framework

    # Validate framework key
    if data["recommended_framework"] not in VALID_FRAMEWORKS:
        raise ValueError(
            f"Invalid framework '{data['recommended_framework']}'. "
            f"Must be one of {VALID_FRAMEWORKS}"
        )

    # Coerce pattern_trend
    if data.get("pattern_trend") not in VALID_TRENDS:
        data["pattern_trend"] = "unknown"

    return data
