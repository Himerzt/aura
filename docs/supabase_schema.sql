-- ================================================================
-- AURA — Supabase Schema (PostgreSQL)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── User Profiles ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
    user_id         TEXT    NOT NULL PRIMARY KEY DEFAULT 'local_user',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name            TEXT    NOT NULL DEFAULT '',
    goal            TEXT    NOT NULL DEFAULT '',
    context         TEXT    NOT NULL DEFAULT '',
    past_attempts   JSONB   NOT NULL DEFAULT '[]',
    daily_anchors   JSONB   NOT NULL DEFAULT '[]',
    chronotype      TEXT    NOT NULL DEFAULT 'flexible',
    support_style   TEXT    NOT NULL DEFAULT 'balanced',
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    bad_day_messages JSONB   NOT NULL DEFAULT '[]',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Daily Entries ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_entries (
    id              BIGSERIAL  PRIMARY KEY,
    date            DATE       NOT NULL,
    user_id         TEXT       NOT NULL DEFAULT 'local_user',
    morning         JSONB,
    evening         JSONB,
    weekly_letter   JSONB,
    streak_day      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_entries_user_date
    ON daily_entries (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_entries_date
    ON daily_entries (date DESC);

-- ── Profile CRUD ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_profile(p_data JSONB)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result profiles;
BEGIN
    INSERT INTO profiles (
        user_id, name, goal, context, past_attempts, daily_anchors,
        chronotype, support_style, onboarding_completed, bad_day_messages,
        updated_at
    )
    VALUES (
        COALESCE((p_data->>'user_id')::TEXT, 'local_user'),
        COALESCE(p_data->>'name', ''),
        COALESCE(p_data->>'goal', ''),
        COALESCE(p_data->>'context', ''),
        COALESCE((p_data->'past_attempts')::JSONB, '[]'::JSONB),
        COALESCE((p_data->'daily_anchors')::JSONB, '[]'::JSONB),
        COALESCE(p_data->>'chronotype', 'flexible'),
        COALESCE(p_data->>'support_style', 'balanced'),
        COALESCE((p_data->>'onboarding_completed')::BOOLEAN, FALSE),
        COALESCE((p_data->'bad_day_messages')::JSONB, '[]'::JSONB),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        name                = EXCLUDED.name,
        goal                = EXCLUDED.goal,
        context             = EXCLUDED.context,
        past_attempts       = EXCLUDED.past_attempts,
        daily_anchors       = EXCLUDED.daily_anchors,
        chronotype          = EXCLUDED.chronotype,
        support_style       = EXCLUDED.support_style,
        onboarding_completed = EXCLUDED.onboarding_completed,
        bad_day_messages    = EXCLUDED.bad_day_messages,
        updated_at          = NOW()
    RETURNING * INTO result;
    RETURN result;
END;
$$;

-- ── Daily Entry CRUD ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_daily_entry(
    p_date    DATE,
    p_user_id  TEXT,
    p_morning  JSONB DEFAULT NULL,
    p_evening  JSONB DEFAULT NULL,
    p_weekly_letter JSONB DEFAULT NULL,
    p_streak_day INTEGER DEFAULT NULL
)
RETURNS daily_entries
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result daily_entries;
BEGIN
    INSERT INTO daily_entries (
        date, user_id, morning, evening, weekly_letter, streak_day,
        updated_at
    )
    VALUES (
        p_date, p_user_id, p_morning, p_evening, p_weekly_letter, p_streak_day,
        NOW()
    )
    ON CONFLICT (date, user_id) DO UPDATE SET
        morning       = COALESCE(p_morning,  daily_entries.morning),
        evening       = COALESCE(p_evening,  daily_entries.evening),
        weekly_letter = COALESCE(p_weekly_letter, daily_entries.weekly_letter),
        streak_day    = COALESCE(p_streak_day, daily_entries.streak_day),
        updated_at   = NOW()
    RETURNING * INTO result;
    RETURN result;
END;
$$;

-- ── Fetch helpers ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_profile(p_user_id TEXT DEFAULT 'local_user')
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT *
        FROM profiles
        WHERE user_id = p_user_id
        LIMIT 1
    );
END;
$$;

CREATE OR REPLACE FUNCTION get_daily_entry(p_date DATE, p_user_id TEXT DEFAULT 'local_user')
RETURNS daily_entries
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT *
        FROM daily_entries
        WHERE date = p_date AND user_id = p_user_id
        LIMIT 1
    );
END;
$$;

CREATE OR REPLACE FUNCTION get_history_7_days(p_user_id TEXT DEFAULT 'local_user')
RETURNS TABLE (
    entry_date    DATE,
    morning_data  JSONB,
    evening_data  JSONB,
    weekly_letter JSONB,
    streak_day    INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        de.date,
        de.morning,
        de.evening,
        de.weekly_letter,
        de.streak_day
    FROM daily_entries de
    WHERE de.user_id = p_user_id
      AND de.date >= CURRENT_DATE - INTERVAL '6 days'
    ORDER BY de.date ASC;
END;
$$;

-- ── Update specific fields ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_entry_morning(
    p_date    DATE,
    p_user_id  TEXT DEFAULT 'local_user',
    p_morning  JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE daily_entries
    SET morning    = p_morning,
        updated_at = NOW()
    WHERE date = p_date AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_entry_evening(
    p_date    DATE,
    p_user_id  TEXT DEFAULT 'local_user',
    p_evening  JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE daily_entries
    SET evening    = p_evening,
        updated_at = NOW()
    WHERE date = p_date AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_task_completion(
    p_date       DATE,
    p_user_id    TEXT DEFAULT 'local_user',
    p_task_index INTEGER,
    p_completed  BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE daily_entries
    SET morning = jsonb_set(
        COALESCE(morning, '{}'::jsonb),
        ARRAY['tasks', p_task_index::TEXT, 'completed'],
        to_jsonb(p_completed)
    ),
    updated_at = NOW()
    WHERE date = p_date AND user_id = p_user_id;
END;
$$;

-- ── Bad Day Messages ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION add_bad_day_message(
    p_user_id TEXT DEFAULT 'local_user',
    p_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_messages JSONB;
    new_entry JSONB;
    new_id    INTEGER;
BEGIN
    SELECT bad_day_messages INTO current_messages
    FROM profiles WHERE user_id = p_user_id;

    IF current_messages IS NULL THEN
        current_messages := '[]'::JSONB;
    END IF;

    new_id := jsonb_array_length(current_messages);

    new_entry := jsonb_build_object(
        'id', new_id,
        'message', p_message,
        'author_date', CURRENT_DATE::TEXT,
        'last_used_at', NULL,
        'use_count', 0
    );

    UPDATE profiles
    SET bad_day_messages = current_messages || jsonb_build_array(new_entry),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN new_entry;
END;
$$;
