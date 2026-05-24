# AURA — Artificial Understanding & Resolving Assistant

## Overview

AURA is a personalized AI life coach designed for people aged 20–35 who are feeling stuck, burned out, or have lost direction.

**Core difference:** AURA is NOT a motivational chatbot. AURA identifies specific psychological patterns (learned helplessness, shame spiral, analysis paralysis, avoidance loop...) and selects the correct intervention framework for each day based on the user's actual state.

## Key Principles

- AURA operates on evidence-based psychological frameworks.
- AURA does not shame users for incomplete tasks — it reframes them as data.
- AURA's approach changes daily based on the user's mood and energy state.
- AURA focuses on small, actionable wins rather than big overhauls.

## Architecture

### Morning Pipeline (Agent 1 → 2 → 3)

1. **Wellness Check (Agent 1):** Analyzes user's morning message, detects mood state (overwhelmed, numb, anxious, stable, energized), energy level (1-10), and risk flags.
2. **Psychology Insight (Agent 2):** Identifies the primary psychological pattern and selects the most appropriate intervention framework.
3. **Task Generator (Agent 3):** Generates 1-3 tasks using Implementation Intention format ("When [trigger], I will [action] at [location]").

### Evening Pipeline (Agent 4)

- User completes a brief reflection and marks tasks as done/not done.
- Agent 4 generates a summary, detects patterns, and asks a priming question for tomorrow.

### Weekly Letter (Agent 5, Sunday only)

- AURA writes a personal letter summarizing the week, referencing specific moments and moods.
- Requires at least 7 days of history to generate.

## User Data

AURA stores user data in JSON files (single-user MVP):
- `profile.json`: User's name, goal, life context, past attempts, daily anchors, chronotype, support style.
- `history.json`: Daily entries containing morning check-in, tasks, evening reflection, and weekly letters.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.12) |
| AI Engine | Google Gemini 3.1 Flash Lite (preview) |
| Data Storage | JSON files (single-user MVP) |
| Container | Docker Compose |

## Psychological Frameworks

AURA uses 8 intervention frameworks: 80/20 Pareto, Behavioral Activation, Implementation Intention, Habit Stacking, Self-Compassion, Progress Principle, Two-Minute Rule, and Dunning-Kruger.

## Mood States

AURA recognizes 5 mood states: overwhelmed, numb, anxious, stable, and energized. Each mood triggers different framework recommendations and task difficulty levels.

## Task Generation Rules

Energy levels determine task parameters:

| Energy Level | Max Tasks | Max Time | Difficulty |
|-------------|-----------|----------|------------|
| 1–3 | 1 task | 15 min | very_easy |
| 4–6 | 2 tasks | 30 min | easy/medium |
| 7–10 | 3 tasks | 60 min | medium/hard |

## Safety Features

- **Crisis Detection:** If risk_flag is true (explicit self-harm or suicidal ideation), the morning pipeline stops and displays a support card with crisis hotline information.
- **Pattern Alerts:** Detects shame spirals, learned helplessness, and avoidance loops.
- **No Hallucination:** AURA only generates tasks and summaries based on actual user input and history.

## Deployment

- Local: Docker Compose (frontend + backend + nginx)
- Production: Vercel (frontend) + Railway (backend)
