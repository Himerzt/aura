"""Test data generator for Part 9.1 (Memory Recall) + 9.2 (Pattern Alert).

Run inside the backend container:
    docker compose exec backend python /app/scripts/test-part9.py [scenario]

Scenarios:
    recall    — 20 days of history with matching mood, triggers Memory Recall
    shame     — 4 consecutive shame spiral days, triggers Pattern Alert
    helpless  — 5 consecutive low-energy days, triggers Pattern Alert
    avoidance — 2 consecutive missed mornings, triggers Pattern Alert
    clean     — 14 healthy days, no alerts, no recall match for today's mood
    reset     — Clear history.json back to {}
"""
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "backend" / "data"
HISTORY_PATH = DATA_DIR / "history.json"
PROFILE_PATH = DATA_DIR / "profile.json"


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def ensure_profile():
    if PROFILE_PATH.exists():
        with open(PROFILE_PATH, encoding="utf-8") as f:
            p = json.load(f)
        if p.get("onboarding_completed"):
            return
    write_json(PROFILE_PATH, {
        "user_id": "local_user",
        "created_at": datetime.now().isoformat(),
        "name": "Test User",
        "goal": "Test Part 9",
        "context": "Testing AURA features",
        "past_attempts": [],
        "daily_anchors": ["morning coffee"],
        "chronotype": "flexible",
        "support_style": "balanced",
        "onboarding_completed": True,
    })


def make_day(mood, energy, tasks_done, tasks_total, user_input, reflection, framework="self_compassion"):
    tasks = []
    for i in range(tasks_total):
        tasks.append({
            "title": f"Task {i+1}",
            "implementation": f"Implementation {i+1}",
            "estimated_minutes": 15,
            "difficulty": "easy",
            "completed": i < tasks_done,
            "created_at": "2026-04-01T08:00:00",
        })
    entry = {
        "morning": {
            "user_input": user_input,
            "mood_state": mood,
            "energy_level": energy,
            "pattern": "test pattern",
            "framework": framework,
            "explanation": "Test explanation",
            "tasks": tasks,
        },
    }
    if reflection:
        entry["evening"] = {
            "user_input": reflection,
            "summary": f"Summary: {reflection}",
            "pattern_detected": False,
            "tomorrow_question": "What will tomorrow bring?",
        }
    return entry


def scenario_recall():
    """20 healthy days + today with overwhelmed mood. Past has overwhelmed days that were overcome."""
    today = date.today()
    history = {}

    # 20 past days: mix of moods, mostly successful
    moods = ["stable", "energized", "anxious", "overwhelmed", "stable",
             "stable", "overwhelmed", "energized", "stable", "anxious",
             "stable", "energized", "stable", "stable", "overwhelmed",
             "stable", "energized", "stable", "anxious", "stable"]

    for i in range(1, 21):
        day_str = (today - timedelta(days=i)).isoformat()
        m = moods[i - 1]
        energy = 3 if m == "overwhelmed" else 6
        history[day_str] = make_day(
            mood=m, energy=energy, tasks_done=2, tasks_total=3,
            user_input=f"Day {i}: feeling {m}",
            reflection=f"I learned something today despite feeling {m}",
            framework="behavioral_activation" if m == "overwhelmed" else "progress_principle",
        )

    # Today: overwhelmed (should trigger recall of past overwhelmed days)
    history[today.isoformat()] = make_day(
        mood="overwhelmed", energy=3, tasks_done=0, tasks_total=2,
        user_input="Overwhelmed today",
        reflection=None,
    )

    write_json(HISTORY_PATH, history)
    print(f"[recall] Wrote {len(history)} days. Today=overwhelmed.")
    print("Expected: GET /api/memory-recall should return a match from a past overwhelmed day.")


def scenario_shame():
    """4 consecutive days of shame spiral."""
    today = date.today()
    history = {}

    # 4 recent days: shame keywords + low completion
    for i in range(1, 5):
        day_str = (today - timedelta(days=i)).isoformat()
        history[day_str] = make_day(
            mood="overwhelmed", energy=2, tasks_done=0, tasks_total=3,
            user_input="T\u00f4i th\u1ea5t b\u1ea1i, v\u00f4 d\u1ee5ng qu\u00e1",
            reflection="T\u00f4i t\u1ec7 qu\u00e1, kh\u00f4ng l\u00e0m \u0111\u01b0\u1ee3c g\u00ec",
        )

    # 10 older good days (for history depth)
    for i in range(5, 15):
        day_str = (today - timedelta(days=i)).isoformat()
        history[day_str] = make_day(
            mood="stable", energy=6, tasks_done=2, tasks_total=3,
            user_input="Good day",
            reflection="Productive day",
        )

    write_json(HISTORY_PATH, history)
    print(f"[shame] Wrote {len(history)} days. Last 4 days = shame spiral.")
    print("Expected: GET /api/pattern-alert should return shame_spiral alert.")


def scenario_helpless():
    """5+ consecutive days low energy + 0 completion."""
    today = date.today()
    history = {}

    for i in range(1, 7):
        day_str = (today - timedelta(days=i)).isoformat()
        history[day_str] = make_day(
            mood="numb", energy=2, tasks_done=0, tasks_total=2,
            user_input="Nothing works",
            reflection="Could not do anything",
        )

    # Older good days
    for i in range(7, 17):
        day_str = (today - timedelta(days=i)).isoformat()
        history[day_str] = make_day(
            mood="stable", energy=6, tasks_done=2, tasks_total=3,
            user_input="Fine",
            reflection="OK day",
        )

    write_json(HISTORY_PATH, history)
    print(f"[helpless] Wrote {len(history)} days. Last 6 days = learned helplessness.")
    print("Expected: GET /api/pattern-alert should return learned_helplessness or shame_spiral.")


def scenario_avoidance():
    """2+ missed mornings."""
    today = date.today()
    history = {}

    # Days 3-10 had mornings
    for i in range(3, 11):
        day_str = (today - timedelta(days=i)).isoformat()
        history[day_str] = make_day(
            mood="stable", energy=5, tasks_done=2, tasks_total=3,
            user_input="Normal day",
            reflection="OK",
        )

    # Days 1-2: no morning entry at all (empty)
    write_json(HISTORY_PATH, history)
    print(f"[avoidance] Wrote {len(history)} days. Last 2 days = no morning.")
    print("Expected: GET /api/pattern-alert should return avoidance_loop.")


def scenario_clean():
    """14 healthy days, today = stable. No alerts, no recall for stable mood."""
    today = date.today()
    history = {}

    for i in range(1, 15):
        day_str = (today - timedelta(days=i)).isoformat()
        history[day_str] = make_day(
            mood="energized", energy=8, tasks_done=3, tasks_total=3,
            user_input="Great day!",
            reflection="Everything went well",
            framework="progress_principle",
        )

    # Today: stable (different mood from all past days which are energized)
    history[today.isoformat()] = make_day(
        mood="stable", energy=5, tasks_done=0, tasks_total=2,
        user_input="Normal day",
        reflection=None,
    )

    write_json(HISTORY_PATH, history)
    print(f"[clean] Wrote {len(history)} days. All healthy + energized.")
    print("Expected: /api/pattern-alert = no alert. /api/memory-recall = no match (mood mismatch).")


def scenario_reset():
    write_json(HISTORY_PATH, {})
    print("[reset] history.json cleared to {}.")


SCENARIOS = {
    "recall": scenario_recall,
    "shame": scenario_shame,
    "helpless": scenario_helpless,
    "avoidance": scenario_avoidance,
    "clean": scenario_clean,
    "reset": scenario_reset,
}

if __name__ == "__main__":
    ensure_profile()
    scenario = sys.argv[1] if len(sys.argv) > 1 else "recall"
    if scenario not in SCENARIOS:
        print(f"Unknown scenario: {scenario}")
        print(f"Available: {', '.join(SCENARIOS)}")
        sys.exit(1)
    SCENARIOS[scenario]()
    print("Done. Restart is NOT needed — backend reads history.json on each request.")
