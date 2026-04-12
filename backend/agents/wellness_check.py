"""Agent 1 — Wellness Check.

Input : user_input (str), time_of_day (str)
Output: mood_state, energy_level, risk_flag, detected_emotions, confidence
"""
from agents._gemini import call_gemini
from core.prompts import get_wellness_prompt

REQUIRED_FIELDS = ["mood_state", "energy_level", "risk_flag", "detected_emotions", "confidence"]
VALID_MOODS = {"overwhelmed", "numb", "anxious", "stable", "energized"}


async def run_wellness_check(user_input: str, time_of_day: str = "morning") -> dict:
    """
    Analyze user's check-in message and return wellness assessment.

    Returns:
        dict with mood_state, energy_level (1-10), risk_flag (bool),
        detected_emotions (list), confidence (float).

    Raises:
        ValueError: if Gemini output is invalid after retry.
    """
    system_prompt = get_wellness_prompt()
    user_content = f"Time of day: {time_of_day}\n\nUser message: {user_input}"

    data = await call_gemini(system_prompt, user_content, REQUIRED_FIELDS)

    # Validate and coerce values
    if data["mood_state"] not in VALID_MOODS:
        raise ValueError(
            f"Invalid mood_state '{data['mood_state']}'. Must be one of {VALID_MOODS}"
        )

    data["energy_level"] = max(1, min(10, int(data["energy_level"])))
    data["risk_flag"] = bool(data["risk_flag"])
    data["confidence"] = float(data.get("confidence", 0.5))

    if not isinstance(data.get("detected_emotions"), list):
        data["detected_emotions"] = []

    return data
