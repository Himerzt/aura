import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "aura.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id          TEXT PRIMARY KEY DEFAULT 'local_user',
            name        TEXT,
            goal        TEXT,
            context     TEXT,
            chronotype  TEXT CHECK(chronotype IN ('morning', 'evening', 'flexible')),
            support_style TEXT CHECK(support_style IN ('push', 'gentle', 'balanced')),
            onboarding_completed INTEGER DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS daily_entries (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         TEXT NOT NULL DEFAULT 'local_user',
            entry_date      TEXT NOT NULL,
            session         TEXT NOT NULL CHECK(session IN ('morning', 'evening')),
            user_input      TEXT,
            mood_state      TEXT,
            energy_level    INTEGER,
            pattern         TEXT,
            framework       TEXT,
            explanation     TEXT,
            summary         TEXT,
            pattern_detected INTEGER DEFAULT 0,
            tomorrow_question TEXT,
            streak_day      INTEGER DEFAULT 0,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, entry_date, session)
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id             TEXT NOT NULL DEFAULT 'local_user',
            entry_date          TEXT NOT NULL,
            title               TEXT NOT NULL,
            implementation      TEXT,
            estimated_minutes   INTEGER,
            difficulty          TEXT,
            completed           INTEGER DEFAULT 0,
            completed_at        TEXT,
            created_at          TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)

    conn.commit()
    conn.close()
