# AURA — Artificial Understanding & Resolving Assistant
## Claude Code Context File

> Đọc file này trước tiên. Sau đó đọc docs/plan.md.
> Không bắt đầu code bất kỳ thứ gì trước khi tóm tắt và hỏi nếu có câu hỏi.

---

## 1. Dự Án Là Gì

AURA là AI life coach cá nhân hóa cho người 20–35 tuổi đang stuck, burnout, hoặc mất định hướng.

**Khác biệt cốt lõi:** Không phải chatbot motivational. AURA nhận diện pattern tâm lý cụ thể (learned helplessness, shame spiral, analysis paralysis...) rồi chọn đúng framework can thiệp — mỗi ngày khác nhau tùy trạng thái thực tế của người dùng.

**Trạng thái hiện tại:** MVP hoàn thành (Phần 1–10). Đang trong tuần polish để demo portfolio cho phỏng vấn.

**Quyết định kiến trúc quan trọng (2026-04-22):**
- **Single-user MVP** — không có auth, không có multi-user. Đây là quyết định có chủ đích, không phải thiếu sót.
- **Auth đã được gỡ bỏ** — JWT/login/register từ Phần 10 đã remove. Lý do: auth không enforce trên API routes = ảo giác bảo mật, nguy hiểm hơn không có.
- **Data layer: JSON files** — profile.json + history.json. SQLite schema (accounts, users, daily_entries, tasks) đã remove vì không được sử dụng.
- **Multi-user + auth là roadmap v2**, không phải MVP.

---

## 2. Tech Stack

| Layer | Công nghệ | Ghi chú |
|-------|-----------|---------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS | port 3000 |
| Backend | FastAPI (Python 3.12) | port 8000 |
| AI Engine | Google Gemini 3.1 Flash Lite (preview) | via `google-genai` SDK |
| Data Storage | JSON files (profile.json + history.json) | Single-user, trong backend/data/ |
| Container | Docker Compose (backend + frontend + nginx) | 1 lệnh khởi động |
| Reverse Proxy | Nginx | user truy cập localhost:80 |
| Deployment | Railway (2 services: backend + frontend) | Không dùng Nginx khi deploy |

---

## 3. Kiến Trúc Hệ Thống

### Local Development (Docker Compose)
```
User (localhost:80)
        │
        ▼
     NGINX
    /api/*  ──► FastAPI :8000
    /*      ──► Next.js :3000
```

### Production (Railway)
```
User
  ├──► Frontend (Railway service) :3000
  │        │ fetch(NEXT_PUBLIC_API_URL)
  │        ▼
  └──► Backend (Railway service) :8000
           │ CORS: ALLOWED_ORIGINS env var
           ▼
       Gemini API
```

### Backend pipeline 4 agent (buổi sáng)
```
user_input
    │
    ▼
Agent 1: Wellness Check      → mood_state, energy_level, risk_flag
    │
    ├─ risk_flag=true ──► Crisis Support Mode (dừng pipeline)
    │
    ├─ Pattern Alert check (shame spiral / learned helplessness / avoidance loop)
    │   └─ có alert? → force_framework cho Agent 2
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

### Backend pipeline buổi tối
```
user_reflection + completed_tasks
    │
    ▼
Agent 4: Reflection          → summary, pattern_detected, tomorrow_question
    │
    ▼
Cập nhật history.json
```

### Backend pipeline hàng tuần (Chủ nhật)
```
history_7_days + profile + patterns
    │
    ▼
Agent 5: Weekly Letter       → letter_title, letter_body, signature_mood
    │
    ▼
Lưu history[sunday].weekly_letter + hiển thị Dashboard
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
      "tasks": [
        {
          "title": "",
          "implementation": "",
          "completed": false,
          "post_emotion": "relieved | neutral | exhausted | null",
          "friction": "tired | distracted | forgot | no_meaning | null",
          "first_action_at": "ISO datetime | null",
          "first_action_delay_minutes": 0,
          "replaced_from": "string (original task title) | null",
          "created_at": "ISO datetime"
        }
      ]
    },
    "evening": {
      "user_input": "string",
      "summary": "string",
      "pattern_detected": false,
      "tomorrow_question": "string"
    },
    "weekly_letter": {
      "letter_title": "string (tiếng Việt)",
      "letter_body": "string (tiếng Việt, 200-400 từ)",
      "signature_mood": "warm | proud | gentle | honest | hopeful",
      "generated_at": "ISO datetime",
      "read": false
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

**Quan trọng:** Rule engine này PHẢI được enforce ở Python code (validate sau khi parse JSON từ Gemini), không chỉ trong prompt. LLM có thể vi phạm prompt rules.

---

## 7. Folder Structure (Post-Polish)

```
AURA_NEW/
├── CLAUDE.md                     ← file này
├── .env                          ← GEMINI_API_KEY (không commit)
├── .env.example                  ← template env vars cho người clone
├── .gitignore
├── .gitattributes
├── README.md                     ← case study format (tiếng Anh)
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
│
├── .claude/
│   ├── settings.json
│   ├── agents/
│   │   ├── agent-tester.md
│   │   ├── debug-helper.md
│   │   ├── project-auditor.md
│   │   ├── prompt-engineer.md
│   │   ├── pr-reviewer.md
│   │   └── ui-builder.md
│   └── commands/
│       ├── start-session.md
│       ├── test-agent.md
│       ├── commit.md
│       └── debug.md
│
├── docs/
│   ├── plan.md
│   ├── design-system.md
│   ├── api-spec.md
│   ├── review/                   ← subagent review reports
│   └── screenshots/              ← cho README
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── _gemini.py
│   │   ├── wellness_check.py
│   │   ├── psychology_insight.py
│   │   ├── task_generator.py
│   │   ├── reflection.py
│   │   └── weekly_letter.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── memory.py             ← JSON read/write (v2: migrate to SQLite)
│   │   ├── memory_recall.py
│   │   ├── pattern_alert.py
│   │   ├── prompts.py
│   │   └── pipeline.py
│   ├── routers/
│   │   ├── __init__.py
│   │   └── api.py
│   ├── scripts/
│   │   └── seed_demo.py          ← tạo 10 ngày demo data
│   ├── tests/
│   │   └── test_streak_shield.py
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
    │   ├── page.tsx              ← redirect: chưa onboard → /onboarding, đã onboard → /morning
    │   ├── globals.css
    │   ├── onboarding/page.tsx
    │   ├── morning/page.tsx
    │   ├── checklist/page.tsx
    │   ├── evening/page.tsx
    │   └── dashboard/page.tsx
    ├── components/
    │   ├── Navigation.tsx
    │   ├── ui/
    │   │   ├── Badge.tsx
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── ErrorCard.tsx
    │   │   ├── Input.tsx
    │   │   ├── LoadingSpinner.tsx
    │   │   ├── PageTransition.tsx
    │   │   └── Skeleton.tsx
    │   └── aura/
    │       ├── EnergyBar.tsx
    │       ├── FrameworkTag.tsx
    │       ├── InsightCard.tsx
    │       ├── MemoryRecallCard.tsx
    │       ├── MilestoneToast.tsx
    │       ├── MoodOrb.tsx
    │       ├── StreakDisplay.tsx
    │       ├── SupportCard.tsx
    │       └── TaskCard.tsx
    └── lib/
        ├── api.ts                ← API URL từ NEXT_PUBLIC_API_URL env var
        ├── types.ts
        ├── mood-context.tsx
        └── theme-context.tsx
```

**Đã remove (từ Phần 10):**
- `backend/core/database.py` — SQLite schema không dùng
- `frontend/app/login/` — auth UI shell
- `frontend/app/register/` — auth UI shell
- `backend/data/aura.db` — SQLite database file

---

## 8. Coding Standards

- Mỗi file Python nên dưới 300 dòng. Nếu vượt 10-15% và tách file sẽ gây phức tạp import → chấp nhận, note lý do ở đầu file.
- Tất cả agent output phải là valid JSON — không có prose
- Text hiển thị cho user: **tiếng Việt**
- Code, comments, variable names: **tiếng Anh**
- Không hardcode API key — đọc từ environment variable
- `risk_flag = true` → dừng pipeline, hiển thị SupportCard với đường dây hỗ trợ
- Không shame user vì bỏ qua task — reframe như data
- API URL frontend: đọc từ `NEXT_PUBLIC_API_URL` env var, KHÔNG hardcode localhost
- CORS backend: đọc từ `ALLOWED_ORIGINS` env var, mặc định `http://localhost:3000`

---

## 9. Design System — "AURA GLOW" (v2.1, Updated 2026-04-13)

**Concept:** Layout tối giản, gọn gàng (tham khảo Linear.app). Background có hào quang (aura) đổi màu + tốc độ theo `mood_state`. Dark Mode default, Light Mode qua `[data-theme="light"]`. v2.1: contrast text cao hơn, nhiều animation hơn, button nổi bật hơn.

### Fonts (Google Fonts)
- **Heading:** `Sora` — weight 600-700, tracking rộng (`letter-spacing: 0.18em` cho logo)
- **Body:** `DM Sans` — weight 400-500
- **Cấm:** Inter, Roboto, Arial

### Màu nền + Text (contrast ≥ 4.5:1)

| Token | Dark | Light |
|-------|------|-------|
| `--bg-primary`     | `#0a0a0f` | `#f5f4ef` |
| `--bg-surface`     | `#14141f` | `#ffffff` |
| `--bg-elevated`    | `#1c1c28` | `#fbfaf6` |
| `--text-primary`   | `#f2f2f7` | `#13131f` |
| `--text-secondary` | `#a8a8c0` | `#4f4f63` |
| `--text-tertiary`  | `#7a7a95` | `#74748a` |
| `--border-default` | `rgba(255,255,255,0.12)` | `rgba(20,20,40,0.14)` |
| `--border-strong`  | `rgba(255,255,255,0.22)` | `rgba(20,20,40,0.28)` |

### 5 Mood Aura (class `mood-*` trên `<body>`)

| Mood | Primary | Soft | Animation | Đặc trưng |
|------|---------|------|-----------|-----------|
| `energized`   | `#ff8c42` | `#ffb347` | drift 14s, opacity 0.65       | Glow tỏa nhanh, sáng mạnh |
| `stable`      | `#64b5f6` | `#a7d8ff` | drift 22s, opacity 0.55       | Dịu, nhịp thở chậm |
| `anxious`     | `#b388ff` | `#80cbc4` | drift 18s + jitter 2.8s       | Run rẩy nhẹ + grain SVG |
| `overwhelmed` | `#ef5350` | `#ff8a80` | drift 12s, opacity 0.62       | Blob phình dồn dập |
| `numb`        | `#78909c` | `#b0bec5` | drift 48s, blur 120px         | Gần chìm vào nền |

### Hiệu ứng Aura
- `div.aura-bg` fixed, z-index 0, 2 radial-gradient blob blur 90-120px
- 2 blob drift ngược chiều qua `auraDrift`, tốc độ do `--aura-speed`
- Chuyển mood: `transition: 0.8s ease`
- Logo `AURA`: `.gradient-text` sweep 200% qua `gradientPan 10s linear infinite`

### Animation Library (globals.css)

| Keyframe | Utility class | Dùng khi |
|----------|---------------|----------|
| `auraDrift`    | (auto, trong `.aura-bg`)  | Background 2 blob |
| `auraJitter`   | (auto, `.mood-anxious`)   | Run rẩy mood anxious |
| `gradientPan`  | `.gradient-text`          | Logo sweep |
| `typingDot`    | `.typing-dot`             | Indicator chat |
| `shimmer`      | `.skeleton`               | Skeleton loading |
| `fadeIn`       | `.anim-fade-in`           | Entry nhẹ |
| `fadeInUp`     | `.anim-fade-in-up`        | Entry section |
| `fadeInScale`  | `.anim-fade-in-scale`     | Card reveal |
| `slideInLeft/Right` | `.anim-slide-left/right` | Bubble chat |
| `floatY`       | `.anim-float`             | Orb nhẹ lên xuống |
| `breathe`      | `.anim-breathe`           | MoodOrb breathing |
| `pulseGlow`    | `.anim-pulse-glow`        | CTA attention |
| `sheen`        | (auto, `.btn-mood:hover`) | Sweep shine button |
| `sonarPing`    | `.sonar-ping`             | Attention ring |
| `rotateSlow`   | `.anim-rotate-slow`       | Decor loop |
| `wobble`       | `.anim-wobble`            | Error shake |
| `textShimmer`  | (thêm tuỳ chỗ)            | Heading shimmer |

**Stagger helper:** `<div class="stagger">` → các con fade-in-up tuần tự cách 100ms (hỗ trợ đến 8 con).

**Hover helpers:** `.hover-lift` (translateY -3 + shadow mood), `.hover-glow-text` (text-shadow mood).

**`prefers-reduced-motion`:** tất cả animation tự giảm về 0.01ms.

### Component style
- **Glass card (`.glass-card`):** `backdrop-filter: blur(16px) saturate(140%)`, hover → `translateY(-2px)` + `box-shadow: 0 0 36px var(--mood-glow)`
- **Button primary (`.btn-mood`):** padding 14×28, min-height 48, font-weight 600, border 1.5px mood, gradient 135° mood→soft, box-shadow 3 lớp glow, hover → sheen sweep + scale 1.015 + brightness 1.08
- **Button ghost (`.btn-ghost`):** border `--border-strong`, bg overlay blur, hover → border + text đổi thành `--mood-color` + glow
- **Button danger (`.btn-danger`):** gradient đỏ #ef5350→#ff7043, text trắng
- **Input underline (`.input-underline`):** border-bottom 1.5px, focus → glow 24px mood
- **Chat bubbles:** `.bubble-user` (phải, mood tint 22%) + `.bubble-aura` (trái, glassmorphism)
- **Typing dot (`.typing-dot`):** 3 chấm nảy, glow `--mood-glow`

### Spacing
Rộng rãi. Container max 640px. Card padding 24px. Gap giữa section ≥ 24px.

### Mood state management
Context `MoodProvider` (`lib/mood-context.tsx`) giữ `mood` hiện tại. `MoodBody` client component apply class `mood-<state>` lên `<body>`. Tất cả CSS var (`--mood-color`, `--aura-speed`, `--mood-glow`) resolve đúng mà không cần re-render các component khác.

**Files chính:**
- `frontend/tailwind.config.ts` — tokens + keyframes
- `frontend/app/globals.css` — CSS vars + `.aura-bg` + `.mood-*`
- `frontend/lib/mood-context.tsx` — MoodProvider + MoodBody

---

## 10. Làm Việc Với Claude Code

Xem `.claude/commands/` để biết các slash command có sẵn:
- `/start-session` — đầu mỗi phiên làm việc
- `/test-agent` — test từng agent riêng lẻ
- `/commit` — commit đúng convention
- `/debug` — debug workflow chuẩn

**Quy trình polish (tuần 22-29/04/2026):**
1. Mở chat mới MỖI session (1 giờ/session, 3 session/ngày)
2. Bắt đầu mỗi session: "Đọc CLAUDE.md. [Mô tả task cụ thể]."
3. Commit sau MỖI session
4. Không thêm feature mới — chỉ polish cái đang có
5. Nếu kẹt > 30 phút 1 vấn đề: bỏ qua, ghi note, sang task tiếp
6. Plan chi tiết 21 session: xem docs/plan-polish.md

---

## 11. Những Gì KHÔNG Cần Làm (v2 Roadmap)

Để tránh scope creep trong tuần polish:
- ❌ Auth / multi-user
- ❌ SQLite migration
- ❌ Push notification
- ❌ Export PDF/CSV
- ❌ Voice input
- ❌ I18n (English toggle)
- ❌ AI model fallback
- ❌ Streaming response từ Gemini
- ❌ Thêm test mới (42 tests hiện tại đủ cho MVP)
