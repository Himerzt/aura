# AURA API Specification
## FastAPI Backend — Endpoint Reference

---

## Base URL

Development: `http://localhost/api` (qua Nginx)
Direct backend: `http://localhost:8000`

---

## Endpoints

### Health

```
GET /health
Response: { "status": "ok", "version": "2.0" }
```

---

### Onboarding

```
POST /api/onboarding
Content-Type: application/json

Body:
{
  "name": "string",
  "goal": "string",
  "context": "string",
  "past_attempts": ["string"],
  "daily_anchors": ["string"],
  "chronotype": "morning | evening | flexible",
  "support_style": "push | gentle | balanced"
}

Response 200:
{
  "success": true,
  "message": "Profile đã được lưu"
}
```

---

### Profile

```
GET /api/profile
Response:
{
  "name": "string",
  "goal": "string",
  "context": "string",
  "onboarding_completed": true,
  "created_at": "ISO date string"
}
```

---

### Morning Pipeline (3 agents)

```
POST /api/morning
Content-Type: application/json

Body:
{
  "user_input": "string — mô tả cảm giác buổi sáng"
}

Response 200 — Normal:
{
  "mood_state": "overwhelmed | numb | anxious | stable | energized",
  "energy_level": 3,
  "detected_emotions": ["tired", "unmotivated"],
  "primary_pattern": "learned_helplessness",
  "framework": "behavioral_activation",
  "explanation_for_user": "string (tiếng Việt)",
  "why_this_happens": "string (tiếng Việt)",
  "tasks": [
    {
      "title": "string",
      "implementation": "Sau khi X, tôi sẽ Y",
      "why_it_works": "string",
      "estimated_minutes": 10,
      "difficulty": "very_easy | easy | medium | hard"
    }
  ],
  "encouragement": "string (tiếng Việt)",
  "risk_flag": false
}

Response 200 — Crisis (risk_flag = true):
{
  "risk_flag": true,
  "support_message": "string (tiếng Việt, không phán xét)",
  "hotline": "1800 599 920",
  "next_step": "string"
}
```

---

### Evening Reflection (Agent 4)

```
POST /api/evening
Content-Type: application/json

Body:
{
  "user_input": "string — reflection buổi tối",
  "completed_tasks": [true, false, true]
}

Response 200:
{
  "today_summary": "string (tiếng Việt)",
  "pattern_detected": false,
  "pattern_description": "string | null",
  "progress_highlight": "string (tiếng Việt)",
  "tomorrow_question": "string (câu hỏi Socratic, tiếng Việt)",
  "weekly_insight": null
}

Nếu day_count = 7:
{
  ...,
  "weekly_insight": {
    "summary": "string",
    "strongest_pattern": "string",
    "recommendation": "string"
  }
}
```

---

### Today's Entry

```
GET /api/today
Response:
{
  "date": "YYYY-MM-DD",
  "morning": { ...morning entry | null },
  "evening": { ...evening entry | null },
  "streak_day": 3
}
```

---

### Streak

```
GET /api/streak
Response:
{
  "current_streak": 5,
  "today_completed": true,
  "shield_count": 1
}
```

---

### History

```
GET /api/history
Response: (array — raw entries với đầy đủ morning/evening data)
[
  {
    "date": "YYYY-MM-DD",
    "morning": { ...full morning entry },
    "evening": { ...full evening entry | absent },
    "streak_day": 3
  }
]
```

---

### Weekly Insight

```
GET /api/weekly-insight
Response (nếu đủ 7 ngày):
{
  "available": true,
  "summary": "string (tiếng Việt)",
  "strongest_pattern": "string",
  "most_effective_framework": "string",
  "completion_rate": 0.71,
  "mood_trend": "improving | stable | worsening"
}

Response (chưa đủ 7 ngày):
{
  "available": false,
  "days_remaining": 4
}
```

---

### Update Profile

```
PUT /api/profile
Content-Type: application/json

Body: (same as POST /api/onboarding)

Response 200:
{
  "success": true,
  "message": "Profile đã được cập nhật"
}
```

---

### Task Friction Log

```
POST /api/task/friction
Content-Type: application/json

Body:
{
  "task_index": 0,
  "reason": "tired | distracted | forgot | no_meaning",
  "note": "string (optional)",
  "date": "YYYY-MM-DD (optional, default today)"
}

Response 200:
{
  "success": true,
  "task": { ...updated task object }
}
```

---

### Task First Action

```
POST /api/task/first-action
Content-Type: application/json

Body:
{
  "task_index": 0,
  "date": "YYYY-MM-DD (optional, default today)"
}

Response 200:
{
  "success": true,
  "task": { ...updated task object with first_action_at }
}
```

---

### Task Retry Easier

```
POST /api/task/retry-easier
Content-Type: application/json

Body:
{
  "task_index": 0,
  "date": "YYYY-MM-DD (optional, default today)"
}

Response 200:
{
  "success": true,
  "task": { ...new easier task },
  "new_energy_level": 3,
  "encouragement": "string (tiếng Việt)"
}
```

---

### Pattern Radar

```
GET /api/pattern-radar?days=7
Query params: days = 7 | 30

Response 200:
{
  "days": 7,
  "counts": {
    "behavioral_activation": 2,
    "implementation_intention": 3,
    ...
  }
}
```

---

### Energy-Mood Matrix

```
GET /api/energy-mood-matrix

Response 200:
{
  "data": [
    { "date": "YYYY-MM-DD", "mood": "stable", "energy": 6 }
  ]
}
```

---

### Framework Diversity

```
GET /api/framework-diversity

Response 200:
{
  "counts": {
    "behavioral_activation": 2,
    ...
  }
}
```

---

## Error Responses

```json
// 400 Bad Request
{ "detail": "Missing required field: user_input" }

// 500 Internal Server Error
{ "detail": "Agent pipeline failed", "error_type": "gemini_timeout" }
```

---

## CORS

Cho phép: `http://localhost:3000`, `http://localhost`
Methods: GET, POST, OPTIONS
Headers: Content-Type
