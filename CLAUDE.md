# AURA — Artificial Understanding & Resolving Assistant
## Claude Code Context File

> Đọc file này trước tiên. Sau đó đọc docs/plan.md.
> Không bắt đầu code bất kỳ thứ gì trước khi tóm tắt và hỏi nếu có câu hỏi.

---

## 1. Dự Án Là Gì

AURA là AI life coach cá nhân hóa cho người 20–35 tuổi đang stuck, burnout, hoặc mất định hướng.

**Khác biệt cốt lõi:** Không phải chatbot motivational. AURA nhận diện pattern tâm lý cụ thể (learned helplessness, shame spiral, analysis paralysis...) rồi chọn đúng framework can thiệp — mỗi ngày khác nhau tùy trạng thái thực tế của người dùng.

**Build mới hoàn toàn.** Không tái sử dụng code cũ.

---

## 2. Tech Stack

| Layer | Công nghệ | Ghi chú |
|-------|-----------|---------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS | port 3000 |
| Backend | FastAPI (Python 3.12) | port 8000 |
| AI Engine | Google Gemini 2.5 Flash | via `google-genai` SDK |
| Database | SQLite với WAL mode | stdlib `sqlite3`, tự init khi start |
| Container | Docker Compose (backend + frontend) | 1 lệnh khởi động |
| Reverse Proxy | Nginx | user truy cập 1 port duy nhất: localhost:80 |

---

## 3. Kiến Trúc Hệ Thống

```
User (localhost:80)
        │
        ▼
     NGINX
    /api/*  ──► FastAPI :8000
    /*      ──► Next.js :3000
```

**Backend pipeline 4 agent (buổi sáng):**
```
user_input
    │
    ▼
Agent 1: Wellness Check      → mood_state, energy_level, risk_flag
    │
    ├─ risk_flag=true ──► Crisis Support Mode (dừng pipeline)
    │
    ▼
Agent 2: Psychology Insight  → primary_pattern, framework, explanation (VI)
    │
    ▼
Agent 3: Task Generator      → tasks[] với Implementation Intention
    │
    ▼
Lưu history.json + hiển thị UI
```

**Backend pipeline buổi tối:**
```
user_reflection + completed_tasks
    │
    ▼
Agent 4: Reflection          → summary, pattern_detected, tomorrow_question
    │
    ▼
Cập nhật history.json
```

---

## 4. Data Models

### profile.json
```json
{
  "user_id": "local_user",
  "created_at": "ISO date",
  "name": "string",
  "goal": "string",
  "context": "string — bối cảnh cuộc sống",
  "past_attempts": ["string"],
  "daily_anchors": ["string — thói quen đã có sẵn"],
  "chronotype": "morning | evening | flexible",
  "support_style": "push | gentle | balanced",
  "onboarding_completed": false
}
```

### history.json — entry theo ngày
```json
{
  "YYYY-MM-DD": {
    "morning": {
      "user_input": "string",
      "mood_state": "overwhelmed|numb|anxious|stable|energized",
      "energy_level": 1,
      "pattern": "string",
      "framework": "string",
      "explanation": "string (VI)",
      "tasks": [{"title": "", "implementation": "", "completed": false}]
    },
    "evening": {
      "user_input": "string",
      "summary": "string",
      "pattern_detected": false,
      "tomorrow_question": "string"
    },
    "streak_day": 1
  }
}
```

---

## 5. Psychology Framework Engine

Agent 2 chọn 1 trong 8 framework dựa trên trigger condition:

| Framework | Trigger Condition |
|-----------|------------------|
| `80_20_pareto` | Quá nhiều việc, không biết ưu tiên |
| `behavioral_activation` | Numb, không muốn làm gì, chờ cảm hứng |
| `implementation_intention` | Biết cần làm gì nhưng hay quên/trì hoãn |
| `habit_stacking` | Muốn thói quen mới nhưng không có chỗ trong lịch |
| `self_compassion` | Shame spiral, miss nhiều ngày, tự chỉ trích |
| `progress_principle` | Mất motivation, không thấy mình tiến lên |
| `two_minute_rule` | Inertia — biết việc nhưng không bắt đầu được |
| `dunning_kruger` | Valley of despair (muốn bỏ cuộc) hoặc overconfidence |

---

## 6. Task Generation Rule Engine

Agent 3 phải tuân thủ nghiêm ngặt:

| energy_level | Số task tối đa | Thời gian tối đa | Độ khó |
|-------------|----------------|-----------------|--------|
| 1–3 | 1 task | 15 phút | very_easy only |
| 4–6 | 2 tasks | 30 phút tổng | easy / medium |
| 7–10 | 3 tasks | 60 phút tổng | medium / hard |

Nếu past_attempts có pattern bỏ cuộc với 1 loại task: tránh lặp lại, chọn approach khác.

---

## 7. Folder Structure Target

```
AURA_NEW/
├── CLAUDE.md                     ← file này
├── .env                          ← GEMINI_API_KEY (không commit)
├── .gitignore
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
│
├── .claude/
│   ├── settings.json             ← Claude Code settings
│   └── commands/                 ← slash commands tái sử dụng
│       ├── start-session.md      ← /start-session
│       ├── test-agent.md         ← /test-agent
│       ├── commit.md             ← /commit
│       └── debug.md              ← /debug
│
├── docs/
│   ├── plan.md                   ← kế hoạch 8 phần
│   ├── design-system.md          ← design tokens, component spec
│   └── api-spec.md               ← endpoint documentation
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── agents/
│   │   ├── wellness_check.py
│   │   ├── psychology_insight.py
│   │   ├── task_generator.py
│   │   └── reflection.py
│   ├── core/
│   │   ├── memory.py
│   │   ├── prompts.py
│   │   ├── pipeline.py
│   │   └── database.py
│   └── data/
│       ├── profile.json
│       └── history.json
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── tailwind.config.ts
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── onboarding/page.tsx
    │   ├── morning/page.tsx
    │   ├── checklist/page.tsx
    │   ├── evening/page.tsx
    │   └── dashboard/page.tsx
    ├── components/
    │   ├── ui/                   ← reusable primitives
    │   └── aura/                 ← domain-specific components
    └── lib/
        ├── api.ts
        └── types.ts
```

---

## 8. Coding Standards

- Mỗi file Python tối đa 300 dòng — tách file nếu vượt
- Tất cả agent output phải là valid JSON — không có prose
- Text hiển thị cho user: **tiếng Việt**
- Code, comments, variable names: **tiếng Anh**
- Không hardcode API key — đọc từ environment variable
- `risk_flag = true` → dừng pipeline, hiển thị SupportCard với đường dây hỗ trợ
- Không shame user vì bỏ qua task — reframe như data

---

## 9. Design Vision (Quan Trọng)

**Aesthetic direction: "Calm Luxury Dark"**

- Background: `#0A0A0F` (near-black với tint xanh lạnh nhẹ)
- Typography: `Playfair Display` (headlines) + `DM Sans` (body) — không dùng Inter
- Accent: Soft amber `#F5A623` + Ice blue `#A8C4E0`
- Cards: `rgba(255,255,255,0.04)` với `backdrop-blur` + border `rgba(255,255,255,0.08)`
- Animations: Subtle fade-in stagger, không flashy
- Mood indicators: Gradient aura glow theo mood_state (warm=amber, cold=blue, neutral=slate)

Chi tiết đầy đủ trong `docs/design-system.md`.

---

## 10. Làm Việc Với Claude Code

Xem `.claude/commands/` để biết các slash command có sẵn:
- `/start-session` — đầu mỗi phiên làm việc
- `/test-agent` — test từng agent riêng lẻ
- `/commit` — commit đúng convention
- `/debug` — debug workflow chuẩn

**Quan trọng:** Mở chat mới sau mỗi 3 phần để tránh đầy context window.
