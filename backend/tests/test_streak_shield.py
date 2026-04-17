"""Tests for Streak Shield System (Phần 8 Milestone A)."""

import json
import sys
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.memory import (
    _calculate_shields,
    _count_completed_days_in_week,
    get_streak,
    _load_history,
    _write_json,
    HISTORY_PATH,
)

TODAY = date(2026, 4, 17)  # Thursday


def _make_history(active_days: list[date]) -> dict:
    """Build a history dict with morning entries for the given dates."""
    return {
        d.isoformat(): {"morning": {"user_input": "test"}}
        for d in active_days
    }


def _days_back(n: int, from_date: date = TODAY) -> list[date]:
    """Return a list of n consecutive dates ending at from_date."""
    return [from_date - timedelta(days=i) for i in range(n)]


# ── _count_completed_days_in_week ───────────────────────────────────────────

def test_count_completed_full_week():
    week_start = TODAY - timedelta(days=TODAY.weekday() + 7)  # Last Monday
    days = [week_start + timedelta(days=i) for i in range(7)]
    history = _make_history(days)
    assert _count_completed_days_in_week(history, week_start) == 7


def test_count_completed_partial_week():
    week_start = TODAY - timedelta(days=TODAY.weekday() + 7)
    days = [week_start + timedelta(days=i) for i in range(3)]
    history = _make_history(days)
    assert _count_completed_days_in_week(history, week_start) == 3


def test_count_completed_empty_week():
    week_start = TODAY - timedelta(days=TODAY.weekday() + 7)
    assert _count_completed_days_in_week({}, week_start) == 0


# ── _calculate_shields ──────────────────────────────────────────────────────

def test_no_shields_for_new_user():
    assert _calculate_shields({}, TODAY) == 0


def test_earns_shield_for_5_of_7_days():
    # Last week: Mon-Fri active (5 days)
    last_monday = TODAY - timedelta(days=TODAY.weekday() + 7)
    days = [last_monday + timedelta(days=i) for i in range(5)]
    history = _make_history(days)
    assert _calculate_shields(history, TODAY) >= 1


def test_no_shield_for_4_of_7_days():
    # Last week: only 4 days
    last_monday = TODAY - timedelta(days=TODAY.weekday() + 7)
    days = [last_monday + timedelta(days=i) for i in range(4)]
    history = _make_history(days)
    assert _calculate_shields(history, TODAY) == 0


# ── get_streak with shields ─────────────────────────────────────────────────

@patch("core.memory.date")
def test_streak_basic_no_shield(mock_date):
    mock_date.today.return_value = TODAY
    mock_date.side_effect = lambda *a, **kw: date(*a, **kw)

    # 5 consecutive days including today
    days = _days_back(5)
    history = _make_history(days)

    with patch("core.memory._load_history", return_value=history):
        result = get_streak()
        assert result["current_streak"] == 5
        assert result["today_completed"] is True
        assert "shield_count" in result


@patch("core.memory.date")
def test_streak_returns_shield_count(mock_date):
    mock_date.today.return_value = TODAY
    mock_date.side_effect = lambda *a, **kw: date(*a, **kw)

    # Build history: last full week 5/7 + this week active
    last_monday = TODAY - timedelta(days=TODAY.weekday() + 7)
    last_week_days = [last_monday + timedelta(days=i) for i in range(5)]
    this_week_days = _days_back(TODAY.weekday() + 1)  # Mon to today
    all_days = list(set(last_week_days + this_week_days))
    history = _make_history(all_days)

    with patch("core.memory._load_history", return_value=history):
        result = get_streak()
        assert result["shield_count"] >= 1


@patch("core.memory.date")
def test_shield_preserves_streak_on_miss(mock_date):
    mock_date.today.return_value = TODAY
    mock_date.side_effect = lambda *a, **kw: date(*a, **kw)

    # 2 full weeks ago: 6/7 days (earns shield)
    two_weeks_ago_monday = TODAY - timedelta(days=TODAY.weekday() + 14)
    old_week = [two_weeks_ago_monday + timedelta(days=i) for i in range(6)]

    # Last week: 5/7 (earns another shield)
    last_monday = TODAY - timedelta(days=TODAY.weekday() + 7)
    last_week = [last_monday + timedelta(days=i) for i in range(5)]

    # This week: active every day except yesterday (1 gap)
    this_week = _days_back(TODAY.weekday() + 1)
    yesterday = TODAY - timedelta(days=1)
    this_week = [d for d in this_week if d != yesterday]

    all_days = list(set(old_week + last_week + this_week))
    history = _make_history(all_days)

    with patch("core.memory._load_history", return_value=history):
        result = get_streak()
        # Shield should allow streak to continue past the gap
        assert result["current_streak"] >= len(this_week)


@patch("core.memory.date")
def test_no_shield_streak_breaks_on_miss(mock_date):
    mock_date.today.return_value = TODAY
    mock_date.side_effect = lambda *a, **kw: date(*a, **kw)

    # Only this week, 2 days active with gap yesterday, no shields earned
    history = _make_history([TODAY, TODAY - timedelta(days=2)])

    with patch("core.memory._load_history", return_value=history):
        result = get_streak()
        # No shields → streak breaks at gap
        assert result["current_streak"] == 1  # Only today
        assert result["shield_count"] == 0


@patch("core.memory.date")
def test_today_not_completed_yet(mock_date):
    mock_date.today.return_value = TODAY
    mock_date.side_effect = lambda *a, **kw: date(*a, **kw)

    # Yesterday and day before active, today not yet
    history = _make_history([TODAY - timedelta(days=1), TODAY - timedelta(days=2)])

    with patch("core.memory._load_history", return_value=history):
        result = get_streak()
        assert result["current_streak"] == 2
        assert result["today_completed"] is False


if __name__ == "__main__":
    tests = [
        test_count_completed_full_week,
        test_count_completed_partial_week,
        test_count_completed_empty_week,
        test_no_shields_for_new_user,
        test_earns_shield_for_5_of_7_days,
        test_no_shield_for_4_of_7_days,
        test_streak_basic_no_shield,
        test_streak_returns_shield_count,
        test_shield_preserves_streak_on_miss,
        test_no_shield_streak_breaks_on_miss,
        test_today_not_completed_yet,
    ]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
            passed += 1
        except Exception as e:
            print(f"  FAIL  {t.__name__}: {e}")
            failed += 1
    print(f"\n{passed}/{passed+failed} tests passed")
    sys.exit(1 if failed else 0)
