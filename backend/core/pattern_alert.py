"""Pattern Alert Auto-Mode — detect dangerous psychological patterns.

When shame spiral, learned helplessness, or avoidance loop is detected
over consecutive days, the morning pipeline silently overrides Agent 2's
framework selection to prioritize Self-Compassion.

The user doesn't need to know the override happened — AURA just responds
more gently. An optional dashboard indicator can reveal the active alert.
"""
from datetime import date, timedelta
from typing import Optional

from core.memory import _load_history

# Keywords (Vietnamese) that signal self-criticism in reflections
SHAME_KEYWORDS = [
    "thất bại", "tệ quá", "vô dụng", "không làm được", "ghét bản thân",
    "thua cuộc", "ngu", "kém", "chán", "buồn", "tồi", "tệ", "sai",
    "lười", "bỏ cuộc", "không xứng", "mệt mỏi", "vô nghĩa",
    "không thể", "tuyệt vọng", "chết", "bất lực",
]


def _get_consecutive_days(history: dict, num_days: int) -> list[tuple[str, dict]]:
    """Return last N consecutive days (newest first) that have morning entries."""
    today = date.today()
    result = []
    for i in range(num_days + 2):  # small buffer for gaps
        day_str = (today - timedelta(days=i)).isoformat()
        entry = history.get(day_str, {})
        if "morning" in entry:
            result.append((day_str, entry))
        if len(result) >= num_days:
            break
    return result


def _task_completion_rate(entry: dict) -> float:
    """Return task completion ratio for a day entry (0.0 - 1.0)."""
    tasks = entry.get("morning", {}).get("tasks", [])
    if not tasks:
        return 0.0
    done = sum(1 for t in tasks if t.get("completed"))
    return done / len(tasks)


def _has_shame_keywords(entry: dict) -> bool:
    """Check if evening reflection or morning input contains shame keywords."""
    texts = []

    evening = entry.get("evening", {})
    texts.append(evening.get("user_input", "").lower())
    texts.append(evening.get("summary", "").lower())

    morning = entry.get("morning", {})
    texts.append(morning.get("user_input", "").lower())

    combined = " ".join(texts)
    return any(kw in combined for kw in SHAME_KEYWORDS)


def _count_missing_mornings(history: dict, num_days: int) -> int:
    """Count days with no morning entry in last N days (excluding today)."""
    today = date.today()
    missing = 0
    for i in range(1, num_days + 1):
        day_str = (today - timedelta(days=i)).isoformat()
        if "morning" not in history.get(day_str, {}):
            missing += 1
    return missing


def detect_risk_pattern(history_7d: Optional[list[dict]] = None) -> Optional[dict]:
    """Detect dangerous psychological patterns from recent history.

    Patterns detected:
        - shame_spiral: >= 3 consecutive days with shame keywords + <30% task completion
        - learned_helplessness: >= 5 consecutive days with energy <= 3 + 0% task completion
        - avoidance_loop: >= 2 consecutive days skipping morning check-in

    Args:
        history_7d: Optional pre-loaded history list. If None, loads from file.

    Returns:
        dict with {pattern_name, severity, recommended_override, consecutive_days,
                   details} or None if no pattern detected.
    """
    history = _load_history()

    # ── 1. Shame Spiral ──
    # >= 3 consecutive days: shame keywords + tasks < 30% complete
    recent = _get_consecutive_days(history, 7)
    shame_streak = 0
    for _, entry in recent:
        if _has_shame_keywords(entry) and _task_completion_rate(entry) < 0.3:
            shame_streak += 1
        else:
            break  # must be consecutive from most recent

    if shame_streak >= 3:
        return {
            "pattern_name": "shame_spiral",
            "severity": "high" if shame_streak >= 5 else "moderate",
            "recommended_override": "self_compassion",
            "consecutive_days": shame_streak,
            "details": (
                f"{shame_streak} ngày liên tục có dấu hiệu tự chỉ trích "
                f"và hoàn thành task dưới 30%."
            ),
        }

    # ── 2. Learned Helplessness ──
    # >= 5 consecutive days: energy <= 3 + no task completed
    helpless_streak = 0
    for _, entry in recent:
        morning = entry.get("morning", {})
        energy = morning.get("energy_level", 5)
        completion = _task_completion_rate(entry)
        if energy <= 3 and completion == 0.0:
            helpless_streak += 1
        else:
            break

    if helpless_streak >= 5:
        return {
            "pattern_name": "learned_helplessness",
            "severity": "high",
            "recommended_override": "self_compassion",
            "consecutive_days": helpless_streak,
            "details": (
                f"{helpless_streak} ngày liên tục năng lượng rất thấp "
                f"và không hoàn thành task nào."
            ),
        }

    # ── 3. Avoidance Loop ──
    # >= 2 consecutive days skipping morning check-in (not today)
    today = date.today()
    consecutive_misses = 0
    for i in range(1, 8):
        day_str = (today - timedelta(days=i)).isoformat()
        if "morning" not in history.get(day_str, {}):
            consecutive_misses += 1
        else:
            break

    if consecutive_misses >= 2:
        return {
            "pattern_name": "avoidance_loop",
            "severity": "moderate" if consecutive_misses < 4 else "high",
            "recommended_override": "self_compassion",
            "consecutive_days": consecutive_misses,
            "details": (
                f"Bạn đã bỏ qua check-in sáng {consecutive_misses} ngày liên tục."
            ),
        }

    return None
