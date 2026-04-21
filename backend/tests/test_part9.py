"""Tests for Part 9.1 (Memory Recall), 9.2 (Pattern Alert), 9.3 (Weekly Letter)."""
import json
import sys
import os
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

# Ensure backend is on path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.memory_recall import (
    find_similar_past_day,
    _mood_distance,
    _day_has_successful_outcome,
    MIN_HISTORY_DAYS,
)
from core.pattern_alert import (
    detect_risk_pattern,
    _task_completion_rate,
    _has_shame_keywords,
)


# ═══════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════

def _make_day(mood="stable", energy=5, tasks_done=2, tasks_total=3,
              evening=True, user_input="hom nay tot", reflection_text="tot lam"):
    """Create a minimal day entry."""
    tasks = []
    for i in range(tasks_total):
        tasks.append({
            "title": f"Task {i+1}",
            "implementation": f"Do task {i+1}",
            "completed": i < tasks_done,
            "created_at": "2026-01-01T08:00:00",
        })
    entry = {
        "morning": {
            "user_input": user_input,
            "mood_state": mood,
            "energy_level": energy,
            "tasks": tasks,
        }
    }
    if evening:
        entry["evening"] = {
            "user_input": reflection_text,
            "summary": f"Summary: {reflection_text}",
            "pattern_detected": False,
            "tomorrow_question": "What will I do tomorrow?",
        }
    return entry


def _build_history(days_back=20, mood="stable", energy=5, tasks_done=2,
                   tasks_total=3, evening=True, user_input="oke",
                   reflection_text="tot"):
    """Build a history dict with N days of uniform data."""
    history = {}
    today = date.today()
    for i in range(1, days_back + 1):
        day_str = (today - timedelta(days=i)).isoformat()
        history[day_str] = _make_day(
            mood=mood, energy=energy, tasks_done=tasks_done,
            tasks_total=tasks_total, evening=evening,
            user_input=user_input, reflection_text=reflection_text,
        )
    return history


# ═══════════════════════════════════════════════════════════════
# 9.1 — Memory Recall Tests
# ═══════════════════════════════════════════════════════════════

class TestMoodDistance:
    def test_identical(self):
        assert _mood_distance("stable", "stable") == 0.0

    def test_extremes(self):
        assert _mood_distance("numb", "energized") == 1.0

    def test_adjacent(self):
        assert _mood_distance("stable", "energized") == 0.25

    def test_invalid(self):
        assert _mood_distance("unknown", "stable") == 1.0


class TestDayOutcome:
    def test_successful(self):
        entry = _make_day(tasks_done=2, tasks_total=3, evening=True)
        assert _day_has_successful_outcome(entry) is True

    def test_no_evening(self):
        entry = _make_day(tasks_done=3, tasks_total=3, evening=False)
        assert _day_has_successful_outcome(entry) is False

    def test_low_completion(self):
        entry = _make_day(tasks_done=1, tasks_total=3, evening=True)
        assert _day_has_successful_outcome(entry) is False

    def test_no_tasks(self):
        entry = {"morning": {"tasks": []}, "evening": {"user_input": "ok"}}
        assert _day_has_successful_outcome(entry) is False


class TestFindSimilarPastDay:
    def test_not_enough_history(self):
        """Should return None with < 14 days of data."""
        history = _build_history(days_back=10)
        with patch("core.memory_recall._load_history", return_value=history):
            result = find_similar_past_day("stable", 5)
        assert result is None

    def test_finds_match(self):
        """Should find a matching day with sufficient history."""
        history = _build_history(days_back=20, mood="overwhelmed", energy=3)
        with patch("core.memory_recall._load_history", return_value=history):
            result = find_similar_past_day("overwhelmed", 3)
        assert result is not None
        assert result["mood"] == "overwhelmed"
        assert result["tasks_done"] == 2
        assert result["similarity_score"] >= 0.7

    def test_no_match_different_mood(self):
        """All past days are energized, query is numb — distance too big."""
        history = _build_history(days_back=20, mood="energized", energy=9)
        with patch("core.memory_recall._load_history", return_value=history):
            result = find_similar_past_day("numb", 2)
        assert result is None

    def test_skips_unsuccessful_days(self):
        """Days with 0 tasks done should not match."""
        history = _build_history(days_back=20, mood="stable", energy=5,
                                  tasks_done=0, tasks_total=3)
        with patch("core.memory_recall._load_history", return_value=history):
            result = find_similar_past_day("stable", 5)
        assert result is None

    def test_skips_today(self):
        """Today's entry should never be returned."""
        history = _build_history(days_back=20, mood="stable", energy=5)
        today_str = date.today().isoformat()
        history[today_str] = _make_day(mood="stable", energy=5)
        with patch("core.memory_recall._load_history", return_value=history):
            result = find_similar_past_day("stable", 5)
        if result:
            assert result["date"] != today_str


# ═══════════════════════════════════════════════════════════════
# 9.2 — Pattern Alert Tests
# ═══════════════════════════════════════════════════════════════

class TestTaskCompletionRate:
    def test_all_done(self):
        entry = _make_day(tasks_done=3, tasks_total=3)
        assert _task_completion_rate(entry) == 1.0

    def test_none_done(self):
        entry = _make_day(tasks_done=0, tasks_total=3)
        assert _task_completion_rate(entry) == 0.0

    def test_no_tasks(self):
        entry = {"morning": {"tasks": []}}
        assert _task_completion_rate(entry) == 0.0


class TestShameKeywords:
    def test_has_keywords(self):
        entry = _make_day(user_input="hom nay that bai qua")
        # "that bai" = "th\u1EA5t b\u1EA1i" without accents won't match
        # Let's use proper Vietnamese
        entry["morning"]["user_input"] = "h\u00F4m nay th\u1EA5t b\u1EA1i qu\u00E1"
        assert _has_shame_keywords(entry) is True

    def test_no_keywords(self):
        entry = _make_day(user_input="hom nay tot lam")
        assert _has_shame_keywords(entry) is False


class TestDetectRiskPattern:
    def test_healthy_history_no_alert(self):
        """14 good days should produce no alert."""
        history = _build_history(days_back=14, mood="stable", energy=5,
                                  tasks_done=2, tasks_total=3)
        with patch("core.pattern_alert._load_history", return_value=history):
            result = detect_risk_pattern()
        assert result is None

    def test_shame_spiral(self):
        """3+ days with shame keywords + <30% completion."""
        today = date.today()
        history = {}
        for i in range(1, 5):
            day_str = (today - timedelta(days=i)).isoformat()
            history[day_str] = _make_day(
                mood="overwhelmed", energy=2,
                tasks_done=0, tasks_total=3,
                user_input="t\u00F4i th\u1EA5t b\u1EA1i, v\u00F4 d\u1EE5ng",
                evening=True,
                reflection_text="t\u00F4i t\u1EC7 qu\u00E1",
            )
        with patch("core.pattern_alert._load_history", return_value=history):
            result = detect_risk_pattern()
        assert result is not None
        assert result["pattern_name"] == "shame_spiral"
        assert result["recommended_override"] == "self_compassion"
        assert result["consecutive_days"] >= 3

    def test_learned_helplessness(self):
        """5+ days with energy <= 3 and 0% completion."""
        today = date.today()
        history = {}
        for i in range(1, 7):
            day_str = (today - timedelta(days=i)).isoformat()
            history[day_str] = _make_day(
                mood="numb", energy=2,
                tasks_done=0, tasks_total=2,
                evening=True,
            )
        with patch("core.pattern_alert._load_history", return_value=history):
            result = detect_risk_pattern()
        assert result is not None
        assert result["pattern_name"] in ("shame_spiral", "learned_helplessness")

    def test_avoidance_loop(self):
        """2+ consecutive days without morning entry."""
        today = date.today()
        history = {}
        # 3 days ago had morning, days 1-2 missed
        day3 = (today - timedelta(days=3)).isoformat()
        history[day3] = _make_day()
        # day 1 and 2: no morning (empty or missing)
        with patch("core.pattern_alert._load_history", return_value=history):
            result = detect_risk_pattern()
        assert result is not None
        assert result["pattern_name"] == "avoidance_loop"
        assert result["consecutive_days"] >= 2

    def test_no_false_positive_one_bad_day(self):
        """One bad day followed by good days should NOT trigger."""
        today = date.today()
        history = {}
        # Day 1: bad
        day1 = (today - timedelta(days=1)).isoformat()
        history[day1] = _make_day(
            mood="overwhelmed", energy=2,
            tasks_done=0, tasks_total=3,
            user_input="th\u1EA5t b\u1EA1i",
        )
        # Days 2-7: good
        for i in range(2, 8):
            day_str = (today - timedelta(days=i)).isoformat()
            history[day_str] = _make_day(
                mood="stable", energy=6,
                tasks_done=2, tasks_total=3,
            )
        with patch("core.pattern_alert._load_history", return_value=history):
            result = detect_risk_pattern()
        assert result is None


# ═══════════════════════════════════════════════════════════════
# 9.3 — Weekly Letter Tests
# ═══════════════════════════════════════════════════════════════

import tempfile
from core.memory import (
    get_most_recent_sunday,
    get_weekly_letter,
    save_weekly_letter,
    mark_weekly_letter_read,
    get_all_weekly_letters,
    get_history_for_week,
    _write_json,
    _read_json,
    HISTORY_PATH,
)
from core.prompts import get_weekly_letter_prompt


class TestGetMostRecentSunday:
    def test_returns_iso_date(self):
        result = get_most_recent_sunday()
        assert len(result) == 10  # YYYY-MM-DD
        d = date.fromisoformat(result)
        assert d.weekday() == 6  # Sunday

    def test_not_in_future(self):
        result = date.fromisoformat(get_most_recent_sunday())
        assert result <= date.today()


class TestWeeklyLetterStorage:
    """Test save/load/read lifecycle using real history file with temp backup."""

    def setup_method(self):
        """Back up real history, replace with test data."""
        self._backup = None
        if HISTORY_PATH.exists():
            self._backup = _read_json(HISTORY_PATH)
        # Write clean test history
        _write_json(HISTORY_PATH, {})

    def teardown_method(self):
        """Restore original history."""
        if self._backup is not None:
            _write_json(HISTORY_PATH, self._backup)
        elif HISTORY_PATH.exists():
            _write_json(HISTORY_PATH, {})

    def test_save_and_get(self):
        letter = {
            "letter_title": "Test Title",
            "letter_body": "Test body content",
            "signature_mood": "warm",
        }
        sunday = get_most_recent_sunday()
        save_weekly_letter(letter, sunday)

        result = get_weekly_letter(sunday)
        assert result is not None
        assert result["letter_title"] == "Test Title"
        assert result["read"] is False
        assert "generated_at" in result

    def test_mark_read(self):
        letter = {
            "letter_title": "Read Test",
            "letter_body": "Body",
            "signature_mood": "gentle",
        }
        sunday = get_most_recent_sunday()
        save_weekly_letter(letter, sunday)
        mark_weekly_letter_read(sunday)

        result = get_weekly_letter(sunday)
        assert result is not None
        assert result["read"] is True

    def test_get_nonexistent(self):
        result = get_weekly_letter("2020-01-05")
        assert result is None

    def test_get_all_letters(self):
        """Save 2 letters on different Sundays, verify both returned."""
        today = date.today()
        # Find 2 recent Sundays
        sun1 = get_most_recent_sunday()
        sun2 = (date.fromisoformat(sun1) - timedelta(days=7)).isoformat()

        save_weekly_letter(
            {"letter_title": "Week 1", "letter_body": "B1", "signature_mood": "warm"},
            sun1,
        )
        save_weekly_letter(
            {"letter_title": "Week 2", "letter_body": "B2", "signature_mood": "proud"},
            sun2,
        )

        letters = get_all_weekly_letters()
        assert len(letters) == 2
        assert letters[0]["date"] == sun1  # newest first
        assert letters[1]["date"] == sun2


class TestGetHistoryForWeek:
    def setup_method(self):
        self._backup = None
        if HISTORY_PATH.exists():
            self._backup = _read_json(HISTORY_PATH)

    def teardown_method(self):
        if self._backup is not None:
            _write_json(HISTORY_PATH, self._backup)
        elif HISTORY_PATH.exists():
            _write_json(HISTORY_PATH, {})

    def test_returns_week_of_data(self):
        """Build 7 days ending on a Sunday, verify all returned."""
        sunday = get_most_recent_sunday()
        end = date.fromisoformat(sunday)
        history = {}
        for i in range(7):
            day = (end - timedelta(days=i)).isoformat()
            history[day] = _make_day(mood="stable", energy=5)
        _write_json(HISTORY_PATH, history)

        result = get_history_for_week(sunday)
        assert len(result) == 7


class TestWeeklyLetterPrompt:
    def test_prompt_contains_key_instructions(self):
        prompt = get_weekly_letter_prompt()
        assert "Vietnamese" in prompt
        assert "letter_title" in prompt
        assert "letter_body" in prompt
        assert "signature_mood" in prompt
        assert "mình" in prompt
        assert "bạn" in prompt

    def test_prompt_forbids_ai_phrases(self):
        prompt = get_weekly_letter_prompt()
        assert "as an AI" in prompt  # mentioned as forbidden


class TestWeeklyLetterAgent:
    """Test run_weekly_letter with mocked Gemini."""

    def test_valid_output(self):
        import asyncio
        from agents.weekly_letter import run_weekly_letter, VALID_MOODS

        mock_response = {
            "letter_title": "Một tuần đáng nhớ",
            "letter_body": "Mình thấy tuần này bạn đã cố gắng rất nhiều...",
            "signature_mood": "warm",
        }

        with patch("agents.weekly_letter.call_gemini", return_value=mock_response):
            history = [
                {"date": "2026-04-14", **_make_day()},
                {"date": "2026-04-15", **_make_day()},
            ]
            result = asyncio.get_event_loop().run_until_complete(
                run_weekly_letter(history, {"name": "Test", "goal": "Test goal"})
            )
        assert result["letter_title"] == "Một tuần đáng nhớ"
        assert result["signature_mood"] in VALID_MOODS

    def test_invalid_mood_coerced(self):
        import asyncio
        from agents.weekly_letter import run_weekly_letter

        mock_response = {
            "letter_title": "Title",
            "letter_body": "Body",
            "signature_mood": "invalid_mood",
        }

        with patch("agents.weekly_letter.call_gemini", return_value=mock_response):
            result = asyncio.get_event_loop().run_until_complete(
                run_weekly_letter([], {"name": "Test"})
            )
        assert result["signature_mood"] == "warm"  # coerced to default


# ═══════════════════════════════════════════════════════════════
# Run
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
