# HƯỚNG DẪN BUILD AURA — TỪ SỐ 0 ĐẾN KHI CHẠY ĐƯỢC

> Đọc hết một lần trước khi bắt đầu. Làm theo đúng thứ tự. Không bỏ bước.

---

## TRƯỚC KHI BẮT ĐẦU — Bạn cần cài những gì

Mở terminal và chạy từng lệnh sau để kiểm tra:

```bash
node --version      # cần >= 18
python3 --version   # cần >= 3.11
docker --version    # cần có Docker Desktop đang chạy
git --version       # cần có git
```

**Nếu thiếu thứ gì:**
- Node.js: tải tại `nodejs.org` → chọn LTS
- Docker Desktop: tải tại `docker.com/products/docker-desktop`
- Git: tải tại `git-scm.com`
- Python: tải tại `python.org`

Sau khi cài xong, cài Claude Code:
```bash
npm install -g @anthropic/claude-code
```

Kiểm tra:
```bash
claude --version
```

---

## BƯỚC 1 — Lấy API Key

### Gemini API Key (dùng làm AI engine)

1. Vào `aistudio.google.com`
2. Đăng nhập bằng Google account
3. Click **Get API key** → **Create API key**
4. Copy key — trông như: `AIzaSy...`
5. Lưu vào notepad, dùng ở Bước 3

---

## BƯỚC 2 — Tạo thư mục dự án

Mở terminal, chạy:

```bash
# Tạo thư mục và vào trong
mkdir AURA_NEW
cd AURA_NEW

# Tạo cấu trúc thư mục
mkdir -p .claude/commands
mkdir -p docs
mkdir -p backend/data
mkdir -p frontend
mkdir -p nginx
```

---

## BƯỚC 3 — Tạo file .env

```bash
# Trên Mac/Linux:
echo 'GEMINI_API_KEY=paste_key_của_bạn_vào_đây' > .env

# Trên Windows (PowerShell):
# [System.IO.File]::WriteAllText(".env", "GEMINI_API_KEY=paste_key_của_bạn_vào_đây", [System.Text.Encoding]::UTF8)
```

**Quan trọng:** Thay `paste_key_của_bạn_vào_đây` bằng key thật từ Bước 1.

---

## BƯỚC 4 — Tạo file .gitignore

Tạo file `.gitignore` với nội dung sau (copy nguyên):

```
.env
.env.local
__pycache__/
*.py[cod]
backend/data/profile.json
backend/data/history.json
node_modules/
.next/
*.db
*.db-wal
*.db-shm
.DS_Store
*.log
```

---

## BƯỚC 5 — Tạo file CLAUDE.md

Đây là file quan trọng nhất — Claude Code đọc file này mỗi khi bắt đầu làm việc.

Tạo file `CLAUDE.md` ở thư mục gốc, copy nguyên nội dung sau:

```markdown
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
user_input → Agent 1 (Wellness Check) → Agent 2 (Psychology Insight) → Agent 3 (Task Generator)
                      │
                      ├─ risk_flag=true → Crisis Support Mode (dừng pipeline)
```

**Backend pipeline buổi tối:**
```
user_reflection + completed_tasks → Agent 4 (Reflection) → Cập nhật history
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
  "context": "string",
  "past_attempts": ["string"],
  "daily_anchors": ["string"],
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

---

## 7. Coding Standards

- Mỗi file Python tối đa 300 dòng
- Tất cả agent output phải là valid JSON
- Text hiển thị cho user: **tiếng Việt**
- Code, comments, variable names: **tiếng Anh**
- Không hardcode API key
- `risk_flag = true` → dừng pipeline, hiển thị SupportCard
- Không shame user vì bỏ qua task

---

## 8. Design Vision

**Aesthetic: "Calm Luxury Dark"**
- Background: `#0A0A0F`
- Typography: `Playfair Display` (headlines) + `DM Sans` (body)
- Accent: Amber `#F5A623` + Ice blue `#A8C4E0`
- Cards: glassmorphism với backdrop-blur
- Chi tiết trong `docs/design-system.md`

---

## 9. Slash Commands

- `/start-session` — đầu mỗi phiên làm việc
- `/test-agent [1-4]` — test từng agent riêng lẻ
- `/commit` — commit đúng convention
- `/debug` — debug workflow

**Mở chat mới sau mỗi 3 phần để tránh đầy context window.**
```

---

## BƯỚC 6 — Tạo docs/plan.md

Tạo file `docs/plan.md`, copy nguyên nội dung sau:

```markdown
# AURA_NEW — Kế Hoạch Xây Dựng

> **Agent:** Đọc file này sau CLAUDE.md đầu mỗi phiên chat mới.
> **Rule:** Không nhảy cóc bước. Hoàn thành + test + được approve mới tiếp tục.
> **Context window:** Mở chat MỚI sau mỗi 3 phần.

---

## Trạng Thái Hiện Tại

- [ ] Phần 1 — Docker + Cấu trúc dự án
- [ ] Phần 2 — Backend Core (memory, prompts, DB)
- [ ] Phần 3 — 4 Agents + Pipeline
- [ ] Phần 4 — API Routes FastAPI
- [ ] Phần 5 — Design System + Layout Frontend
- [ ] Phần 6 — Frontend: Onboarding + Morning
- [ ] Phần 7 — Frontend: Checklist + Evening + Dashboard
- [ ] Phần 8 — Polish: Streak Shield + Animations + Responsive

---

## Phần 1 — Docker + Cấu Trúc Dự Án

**Mục tiêu:** Toàn bộ hạ tầng chạy được, chưa có business logic.

**Việc cần làm:**
- Tạo `docker-compose.yml` với 3 service: `backend`, `frontend`, `nginx`
- Tạo `Dockerfile` cho backend (Python 3.12, FastAPI, uvicorn)
- Tạo `Dockerfile` cho frontend (Node 20, Next.js 15)
- Tạo `nginx/nginx.conf` — proxy `/api/*` → backend, `/*` → frontend
- Tạo `backend/main.py` với `GET /health` → `{"status": "ok"}`
- Tạo `backend/data/profile.json` và `history.json` rỗng
- Tạo `frontend/` với Next.js 15 cơ bản
- Tạo `backend/requirements.txt`

**Success Criteria:**
- [ ] `docker-compose up --build` chạy không lỗi
- [ ] `GET localhost/health` → `{"status": "ok"}`
- [ ] `GET localhost/` → Next.js load được
- [ ] `docker-compose logs` không có error đỏ

---

## Phần 2 — Backend Core: Memory + Prompts + Database

**Mục tiêu:** Foundation data layer và AI prompts sẵn sàng.

**Việc cần làm:**

`backend/core/database.py`:
- SQLite WAL mode, foreign keys ON
- `init_db()` tự tạo bảng nếu chưa có

`backend/core/memory.py`:
- `load_profile()` / `save_profile()`
- `get_today_entry()` / `save_morning()` / `save_evening()`
- `get_history_7_days()`
- `get_streak()` trả về `{"current_streak": N, "shield_count": N}`

`backend/core/prompts.py`:
- `FRAMEWORK_DESCRIPTIONS` dict — 8 framework với trigger condition
- `get_wellness_prompt()` → system prompt Agent 1
- `get_insight_prompt()` → system prompt Agent 2
- `get_task_prompt(framework, energy, anchors)` → system prompt Agent 3
- `get_reflection_prompt(history)` → system prompt Agent 4

**Success Criteria:**
- [ ] `memory.py` import không lỗi
- [ ] `load_profile()` và `save_profile()` hoạt động
- [ ] `prompts.py` có đủ 4 hàm, 8 framework

---

## Phần 3 — 4 Agents + Pipeline

**Quan trọng:** Test từng agent riêng lẻ TRƯỚC khi ghép pipeline.

**Việc cần làm:**

`backend/agents/wellness_check.py`:
- Input: `user_input: str`, `time_of_day: str`
- Gọi Gemini 2.5 Flash với system prompt từ `prompts.py`
- Output JSON: `mood_state`, `energy_level` (1-10), `risk_flag`, `detected_emotions`
- `risk_flag = true` nếu có từ ngữ liên quan tự hại

`backend/agents/psychology_insight.py`:
- Input: wellness_result + user_profile + history_7_days
- Output JSON: `primary_pattern`, `explanation_for_user` (VI), `recommended_framework`, `pattern_trend`

`backend/agents/task_generator.py`:
- Input: insight_result + user_profile + energy_level
- Tuân thủ rule engine (energy 1-3 = max 1 task 15 phút very_easy)
- Output JSON: `tasks[]` với `implementation` intention, `encouragement` (VI)

`backend/agents/reflection.py`:
- Input: user_input + today_tasks + completed[] + history_7_days
- Output JSON: `today_summary`, `pattern_detected`, `progress_highlight`, `tomorrow_question`

`backend/core/pipeline.py`:
- `run_morning_pipeline(user_input, profile)` → Agent 1 → 2 → 3
- Nếu `risk_flag`: trả crisis response, dừng

**Success Criteria:**
- [ ] Agent 1: "hôm nay mệt" → JSON hợp lệ
- [ ] Agent 2: nhập wellness JSON → chọn đúng framework
- [ ] Agent 3: energy=3 → chỉ 1 task dưới 15 phút
- [ ] Agent 4: nhập reflection → có tomorrow_question
- [ ] Pipeline: "tôi muốn chết" → dừng tại Agent 1, trả crisis response

---

## Phần 4 — API Routes FastAPI

**Mục tiêu:** Tất cả endpoint hoạt động, test qua `/docs`.

**Routes cần tạo:**
```
GET  /health
POST /api/onboarding   → lưu profile.json
GET  /api/profile      → trả profile
POST /api/morning      → pipeline 3 agent
POST /api/evening      → Agent 4
GET  /api/today        → today entry
GET  /api/streak       → streak count + shield
GET  /api/history      → 7 ngày gần nhất
GET  /api/weekly-insight
```

CORS cho `localhost:3000` và `localhost`.

**Success Criteria:**
- [ ] `/docs` load được
- [ ] `POST /api/morning` với "hôm nay ổn" → JSON có tasks
- [ ] `GET /api/streak` → trả số ngày

---

## Phần 5 — Design System + Layout Frontend

**Đọc `docs/design-system.md` TRƯỚC khi viết bất kỳ UI code nào.**

**Việc cần làm:**

`frontend/tailwind.config.ts`:
- Custom colors: midnight, amber `#F5A623`, ice `#A8C4E0`, sage, rose-muted
- Custom fonts: Playfair Display + DM Sans
- Custom animations: fadeIn, slideUp, glowPulse, auraFloat, shimmer, checkPop

`frontend/app/globals.css`:
- CSS variables đầy đủ theo design-system.md
- Scrollbar custom, selection color
- Mood color mapping classes

`frontend/app/layout.tsx`:
- Google Fonts: Playfair Display + DM Sans
- Navigation: sidebar desktop / bottom bar mobile

`frontend/components/ui/`:
- `Button.tsx`, `Card.tsx`, `Input.tsx`, `LoadingSpinner.tsx`, `Badge.tsx`

`frontend/components/aura/`:
- `MoodOrb.tsx` — animated orb, glow color theo mood
- `EnergyBar.tsx` — visual bar 1-10
- `TaskCard.tsx` — card + tick animation
- `InsightCard.tsx` — framework + explanation
- `StreakDisplay.tsx` — streak + shield icons
- `SupportCard.tsx` — crisis mode

**Success Criteria:**
- [ ] Dark background đúng màu `#0A0A0F`
- [ ] MoodOrb render với amber glow
- [ ] Fonts load đúng (Playfair cho heading)
- [ ] Không có TypeScript error

---

## Phần 6 — Frontend: Onboarding + Morning

**Việc cần làm:**

`frontend/app/onboarding/page.tsx`:
- Chat-style UI — từng câu hỏi fade in như chat bubble
- 5 câu: tên → mục tiêu → bối cảnh → thử gì rồi → thói quen hàng ngày
- Typing indicator animation
- Progress dots (●○○○○)
- Submit → `POST /api/onboarding` → redirect `/morning`

`frontend/app/morning/page.tsx`:
- Textarea nhập cảm giác sáng
- Loading state: MoodOrb pulsing + text "AURA đang lắng nghe..." 3 giai đoạn
- Kết quả stagger reveal:
  - 0ms: MoodOrb + mood label + EnergyBar
  - 200ms: InsightCard (framework + explanation VI)
  - 400ms: TaskCard(s) với implementation intention
- Nút "Bắt Đầu Ngày" → `/checklist`

**Success Criteria:**
- [ ] Flow 5 câu chạy mượt, submit → profile.json được tạo
- [ ] Loading state xuất hiện khi gọi API
- [ ] 3 agent results hiện stagger đúng thứ tự
- [ ] MoodOrb đúng màu theo mood_state

---

## Phần 7 — Frontend: Checklist + Evening + Dashboard

**Việc cần làm:**

`frontend/app/checklist/page.tsx`:
- Tasks từ morning entry
- Tick animation: checkbox → checkmark glow + text strikethrough
- Progress bar real-time (2/3 tasks)
- Mid-day pulse: 3 nút 😫/😐/🔥 → gọi `POST /api/midday` adjust tasks
- Nút "Kết thúc ngày" → `/evening`

`frontend/app/evening/page.tsx`:
- So sánh tasks đặt ra vs hoàn thành
- Textarea reflection tự do
- Submit → `POST /api/evening` → hiện Agent 4 result:
  - Today summary, pattern insight, progress highlight
  - Tomorrow's question (hiện nổi bật)
- Nút "Xem Dashboard" → `/dashboard`

`frontend/app/dashboard/page.tsx`:
- Greeting: "Chào buổi sáng, [tên]"
- StreakDisplay với shield count
- Mini mood chart 7 ngày (SVG bars)
- CTA: "Check-in Sáng" / "Xem Tasks" / "Reflection Tối"
- Weekly insight card nếu có

**Success Criteria:**
- [ ] Tick animation smooth
- [ ] Progress bar cập nhật real-time
- [ ] Evening → Agent 4 result hiện tomorrow_question
- [ ] Dashboard streak đúng số
- [ ] 7-day chart render đúng

---

## Phần 8 — Polish: Streak Shield + Animations + Responsive

**Mục tiêu:** App trở nên đáng nhớ về cảm giác.

**Việc cần làm:**

Streak Shield logic (`backend/core/memory.py`):
- Hoàn thành ≥5/7 ngày trong tuần → +1 shield
- Shield dùng khi miss 1 ngày (streak không reset)

Animations:
- MoodOrb: glowPulse 3s infinite, auraFloat 6s infinite
- Task completion: checkPop 0.3s + particle glow
- Number counters: đếm lên khi trang load
- Milestone: 7-day streak → full-width celebration banner

Responsive:
- Bottom nav bar trên mobile (≤768px)
- Sidebar trên desktop
- Touch targets ≥ 44px
- Readable trên 375px (iPhone SE)

Error states:
- Backend down → friendly card "Kết nối bị gián đoạn"
- Loading skeletons cho data-fetching

**Success Criteria:**
- [ ] MoodOrb glow mượt
- [ ] Task completion có visual feedback rõ
- [ ] Usable trên 375px
- [ ] Shield logic đúng
- [ ] Không có console error

---

## Ghi Chú Cho Agent

1. `GEMINI_API_KEY` đọc từ `os.environ.get("GEMINI_API_KEY")`
2. Nếu Gemini trả markdown code block: strip ` ```json ` trước khi parse
3. Mở chat MỚI sau Phần 1-2, sau Phần 3-4, sau Phần 5-6
4. Commit sau mỗi phần: `git add . && git commit -m "phan-X: ten"`
5. Kẹt 2 lần: đổi hướng hoàn toàn, đừng patch tiếp
```

---

## BƯỚC 7 — Tạo docs/design-system.md

Tạo file `docs/design-system.md`, copy nội dung sau:

```markdown
# AURA Design System — "Calm Luxury Dark"

> Đọc file này trước khi viết bất kỳ UI code nào.

## 1. Colors

```css
--bg-void:        #080810;
--bg-base:        #0C0C18;
--bg-surface:     #12121F;
--bg-elevated:    #1A1A2E;
--bg-overlay:     rgba(255, 255, 255, 0.04);

--border-subtle:  rgba(255, 255, 255, 0.06);
--border-default: rgba(255, 255, 255, 0.10);
--border-strong:  rgba(255, 255, 255, 0.18);

--text-primary:   #F0EDE8;
--text-secondary: #9B98A0;
--text-tertiary:  #5C5965;

--amber:          #F5A623;
--amber-dim:      rgba(245, 166, 35, 0.15);
--ice:            #A8C4E0;
--sage:           #8FB8A0;
--rose:           #D4848A;

--mood-energized:   #F5A623;
--mood-stable:      #A8C4E0;
--mood-anxious:     #C4A8E0;
--mood-overwhelmed: #D4848A;
--mood-numb:        #5C6B7A;
```

## 2. Typography

Fonts: `Playfair Display` (400, 600) cho headlines + `DM Sans` (300, 400, 500) cho body.

- Heading: font-display, weight 600
- Body: font-body, weight 400
- Muted: font-body, weight 300

## 3. Glass Cards

```css
background: rgba(255, 255, 255, 0.04);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.10);
border-radius: 16px;
```

## 4. Mood Orb

Orb tròn 120px, center page. Glow color theo mood:
- energized: amber glow `rgba(245,166,35,0.4)`
- stable: ice glow `rgba(168,196,224,0.3)`
- anxious: violet glow `rgba(196,168,224,0.3)`
- overwhelmed: rose glow `rgba(212,132,138,0.3)`
- numb: slate, minimal glow

Animation: `glowPulse 3s ease-in-out infinite` + `auraFloat 6s ease-in-out infinite`

## 5. Animations

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 20px var(--glow-color); }
  50%       { box-shadow: 0 0 60px var(--glow-color); }
}
@keyframes auraFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes checkPop {
  0%   { transform: scale(0); }
  60%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
```

## 6. Stagger Pattern (Morning results)

```tsx
// Element 1 — MoodOrb: animationDelay 0ms
// Element 2 — InsightCard: animationDelay 200ms
// Element 3 — TaskCard(s): animationDelay 400ms
```

## 7. Loading State (Pipeline — 3-5 giây)

```
Giai đoạn 1 (0-1.5s):  "AURA đang lắng nghe..."
Giai đoạn 2 (1.5-3s):  "Nhận diện pattern..."
Giai đoạn 3 (3s+):     "Chuẩn bị kế hoạch..."
```
MoodOrb pulsing với màu tím trung tính trong lúc chờ.

## 8. Navigation

Desktop (≥768px): Sidebar trái 240px
Mobile (<768px): Bottom navigation bar

## 9. Tailwind Config Additions

```ts
colors: {
  'midnight': { 900:'#080810', 800:'#0C0C18', 700:'#12121F', 600:'#1A1A2E' },
  'amber': '#F5A623',
  'ice': '#A8C4E0',
  'sage': '#8FB8A0',
  'rose-muted': '#D4848A',
},
fontFamily: {
  display: ['Playfair Display', 'Georgia', 'serif'],
  body: ['DM Sans', 'system-ui', 'sans-serif'],
},
```
```

---

## BƯỚC 8 — Tạo .claude/settings.json

Tạo file `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(docker-compose *)",
      "Bash(docker *)",
      "Bash(git *)",
      "Bash(gh *)",
      "Bash(python *)",
      "Bash(python3 *)",
      "Bash(pip *)",
      "Bash(npm *)",
      "Bash(npx *)",
      "Bash(ls *)",
      "Bash(cat *)",
      "Bash(mkdir *)",
      "Bash(cp *)",
      "Bash(mv *)",
      "Bash(touch *)",
      "Bash(curl *)",
      "Bash(echo *)"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(sudo rm *)"
    ]
  }
}
```

---

## BƯỚC 9 — Tạo 4 slash commands

**File `.claude/commands/start-session.md`:**

```markdown
# /start-session

1. Đọc `CLAUDE.md`
2. Đọc `docs/plan.md`
3. Tóm tắt theo format:
   - Dự án: AURA — AI life coach 4-agent pipeline
   - Tiến độ: ✅ Phần X xong / ⏳ Phần Y chưa làm
   - Phần tiếp theo: Phần N — [tên]
4. Hỏi: "Bắt đầu Phần N không?"
5. CHƯA LÀM GÌ cho đến khi được xác nhận.
```

**File `.claude/commands/test-agent.md`:**

```markdown
# /test-agent [số_agent] [input_text]

Tạo script test tạm `backend/test_agent_N.py`:
```python
import asyncio, json, os, sys
sys.path.insert(0, '/app')
# import agent tương ứng
async def test():
    result = await run_agent(user_input="[INPUT]")
    print(json.dumps(result, ensure_ascii=False, indent=2))
asyncio.run(test())
```
Chạy: `docker-compose exec backend python test_agent_N.py`
Kiểm tra:
- [ ] Valid JSON
- [ ] Đủ required fields
- [ ] Tiếng Việt trong explanation fields
Xóa script sau khi test.
```

**File `.claude/commands/commit.md`:**

```markdown
# /commit [phần_số] [tên_ngắn]

```bash
git status
git add .
git commit -m "phan-[N]: [ten-ngan-khong-dau]"
```
Sau đó update `docs/plan.md`:
- Đổi `- [ ]` → `- [x]` cho success criteria của phần vừa xong
- Đổi status thành `✅ DONE`
Nhắc: Nếu xong Phần 2, 4, hoặc 6 → nhắc mở chat mới.
```

**File `.claude/commands/debug.md`:**

```markdown
# /debug

Bước 1 — Thu thập logs:
```bash
docker-compose logs backend --tail=50
docker-compose logs frontend --tail=30
docker-compose logs nginx --tail=20
```

Bước 2 — Lỗi phổ biến:
| Triệu chứng | Fix |
|-------------|-----|
| 502 Bad Gateway | Backend crash → xem logs backend |
| ModuleNotFoundError | Đổi `from backend.xxx` → `from xxx` |
| JSONDecodeError | Strip ```json``` trước khi parse |
| CORS error | Kiểm tra allow_origins trong FastAPI |

Bước 3 — Kẹt lần 2: Dừng. Đề xuất approach khác hoàn toàn.
```

---

## BƯỚC 10 — Tạo file data rỗng

```bash
echo '{}' > backend/data/history.json
echo '{"onboarding_completed": false}' > backend/data/profile.json
```

---

## BƯỚC 11 — Tạo .gitattributes (quan trọng trên Windows)

```bash
echo '* text=auto eol=lf' > .gitattributes
```

---

## BƯỚC 12 — Khởi tạo Git và push lên GitHub

```bash
# Init git
git init

# Add tất cả file (trừ .env vì đã có .gitignore)
git add .

# Commit đầu tiên
git commit -m "init: project structure and config files"
```

Sau đó tạo repo trên GitHub:
1. Vào `github.com` → **New repository**
2. Tên: `aura-new`
3. **Private** (vì có thể sẽ add API key)
4. **Không** tick Add README
5. Click **Create repository**

GitHub sẽ hiện lệnh, chạy theo:
```bash
git remote add origin https://github.com/TÊN_BẠN/aura-new.git
git branch -M main
git push -u origin main
```

---

## BƯỚC 13 — Mở Claude Code và bắt đầu

```bash
# Đảm bảo đang trong thư mục AURA_NEW
cd AURA_NEW

# Mở Claude Code
claude
```

Khi Claude Code mở, gõ lệnh đầu tiên:

```
/start-session
```

Claude Code sẽ đọc CLAUDE.md và plan.md, tóm tắt dự án, và hỏi bạn muốn bắt đầu phần nào.

Trả lời:

```
Bắt đầu Phần 1. Đây là Ralph Loop — tự chạy docker-compose 
verify sau mỗi bước. Chỉ báo khi tất cả success criteria pass.
```

---

## BƯỚC 14 — Vòng lặp làm việc chuẩn

**Sau khi Phần 1 xong:**

1. Claude báo "Phần 1 xong"
2. Bạn tự kiểm tra: mở browser → `localhost` → phải thấy trang Next.js
3. Chạy: `curl localhost/health` → phải thấy `{"status":"ok"}`
4. Nếu ổn, gõ: `/commit 1 docker-structure`
5. Gõ tiếp: **mở chat MỚI** (quan trọng!)

**Chat mới — Phần 2 + 3:**

```
/start-session
```

Sau khi tóm tắt:

```
Bắt đầu Phần 2. Structured mode — sau khi viết xong 
memory.py và prompts.py, dừng lại cho tôi review trước 
khi làm tiếp.
```

**Khi review Phần 3 (agents):**

Sau khi agent viết xong wellness_check.py:
```
/test-agent 1 "hôm nay tôi rất mệt không muốn làm gì"
```
Xem output JSON. Nếu hợp lệ, nói "ok tiếp tục Agent 2".

---

## BƯỚC 15 — Lịch mở chat mới

| Sau phần | Mở chat mới | Lý do |
|----------|-------------|-------|
| Phần 2 | ✅ BẮT BUỘC | Context đầy sau infra + core |
| Phần 4 | ✅ BẮT BUỘC | Context đầy sau 4 agents |
| Phần 6 | ✅ BẮT BUỘC | Context đầy sau frontend setup |

Cách mở chat mới đúng:
1. Gõ `/clear` hoặc tắt terminal, mở terminal mới
2. Vào thư mục: `cd AURA_NEW`
3. Gõ `claude`
4. Gõ `/start-session`

---

## KIỂM TRA TIẾN ĐỘ

Bất cứ lúc nào muốn biết mình đang ở đâu:

```bash
# Xem các phần đã commit
git log --oneline

# Xem app đang chạy không
docker-compose ps

# Xem backend hoạt động không
curl localhost/health

# Xem frontend load không
curl -I localhost
```

---

## XỬ LÝ LỖI PHỔ BIẾN

**Docker không chạy được:**
```bash
# Kiểm tra Docker Desktop đang mở chưa
docker info

# Build lại từ đầu
docker-compose down
docker-compose up --build
```

**502 Bad Gateway:**
```bash
docker-compose logs backend --tail=50
# Tìm dòng ERROR và paste vào Claude Code
```

**Agent trả về lỗi JSON:**
Paste nguyên error vào Claude Code:
```
/debug
[paste error vào đây]
```

**Context window đầy (Claude trả lời không còn chính xác):**
Mở chat mới ngay, gõ `/start-session`.

---

## KHI APP CHẠY XONG

Mở browser → `localhost`

Flow đầu tiên:
1. **Onboarding** — trả lời 5 câu hỏi về bản thân
2. **Morning** — nhập cảm giác buổi sáng → xem AI phân tích + tasks
3. **Checklist** — tick tasks trong ngày
4. **Evening** — viết reflection → nhận câu hỏi cho ngày mai
5. **Dashboard** — xem streak + progress

---

## TÓM TẮT CẤU TRÚC FILE ĐÃ TẠO

```
AURA_NEW/
├── .env                    ← GEMINI_API_KEY (không commit)
├── .gitignore
├── .gitattributes
├── CLAUDE.md               ← não của Claude Code
├── README.md
│
├── .claude/
│   ├── settings.json       ← auto-approve commands
│   └── commands/
│       ├── start-session.md
│       ├── test-agent.md
│       ├── commit.md
│       └── debug.md
│
├── docs/
│   ├── plan.md             ← 8 phần build plan
│   └── design-system.md   ← UI spec
│
└── backend/
    └── data/
        ├── profile.json    ← {}
        └── history.json    ← {}
```

Claude Code sẽ tự tạo phần còn lại (`docker-compose.yml`, `backend/`, `frontend/`, `nginx/`) khi bạn bắt đầu Phần 1.

---

*Từ file này đến app chạy được: khoảng 2-4 ngày làm việc thực tế.*
*Mỗi phần mất 1-3 giờ tùy độ phức tạp.*
