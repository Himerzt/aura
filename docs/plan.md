# AURA_NEW — Kế Hoạch Xây Dựng

> **Agent:** Đọc file này sau CLAUDE.md đầu mỗi phiên chat mới.
> **Rule:** Không nhảy cóc bước. Hoàn thành + test + được approve mới tiếp tục.
> **Context window:** Mở chat MỚI sau mỗi 3 phần.

---

## Trạng Thái Hiện Tại

- [x] Phần 1 — Docker + Cấu trúc dự án ✓ (2026-04-12)
- [x] Phần 2 — Backend Core (memory, prompts, DB) ✓ (2026-04-12)
- [x] Phần 3 — 4 Agents + Pipeline ✓ (2026-04-12)
- [x] Phần 4 — API Routes FastAPI ✓ (2026-04-12)
- [x] Phần 5 — Design System + Layout Frontend ✓ (2026-04-13)
- [x] Phần 5.5 — Redesign UI "AURA GLOW" ✓ (2026-04-13)
- [x] Phần 5.6 — Animations + Contrast + Button Prominence ✓ (2026-04-13)
- [x] Phần 6 — Frontend: Onboarding + Morning
- [x] Phần 7 — Frontend: Checklist + Evening + Dashboard (+ Easy extensions) ✓ (2026-04-16)
- [ ] Phần 8 — Polish: Streak Shield + Animations + Responsive (+ Medium extensions)
- [ ] Phần 9 — Sáng Kiến Nâng Cao: Memory Recall + Pattern Alert + Weekly Letter + Bad-Day Rehearsal

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
- Tạo `frontend/` với Next.js 15 cơ bản (chỉ trang trắng)
- Tạo `backend/requirements.txt`
- Tạo `.env.example`

**Success Criteria:**
- [x] `docker-compose up --build` chạy không lỗi
- [x] `GET localhost/health` → `{"status": "ok"}`  *(qua nginx)*
- [x] `GET localhost/` → Next.js trang cơ bản
- [x] `docker-compose logs` không có error đỏ

---

## Phần 2 — Backend Core: Memory + Prompts + Database

**Mục tiêu:** Foundation data layer và AI prompts sẵn sàng.

**Việc cần làm:**

`backend/core/database.py`:
- SQLite với WAL mode, foreign keys ON
- `init_db()` tự tạo bảng nếu chưa có
- Bảng: `users`, `daily_entries`, `tasks`

`backend/core/memory.py`:
- `load_profile()` / `save_profile()` — đọc/ghi `backend/data/profile.json`
- `get_today_entry()` / `save_morning()` / `save_evening()` — đọc/ghi `history.json`
- `get_history_7_days()` — trả về 7 entry gần nhất
- `get_streak()` — đếm streak ngày liên tục

`backend/core/prompts.py`:
- `FRAMEWORK_DESCRIPTIONS` dict — 8 framework với trigger condition
- `get_wellness_prompt()` → system prompt Agent 1
- `get_insight_prompt(framework_list)` → system prompt Agent 2
- `get_task_prompt(framework, energy, anchors)` → system prompt Agent 3
- `get_reflection_prompt(history)` → system prompt Agent 4

`backend/data/profile.json` — sample data đầy đủ fields
`backend/data/history.json` — `{}` rỗng

**Success Criteria:**
- [x] `memory.py` import được, không lỗi
- [x] `load_profile()` và `save_profile()` hoạt động
- [x] `init_db()` tạo đúng schema khi gọi
- [x] `prompts.py` có đủ 4 hàm, 8 framework

---

## Phần 3 — 4 Agents + Pipeline

**Quan trọng:** Test từng agent riêng lẻ bằng script Python trước khi ghép pipeline.

**Việc cần làm:**

`backend/agents/wellness_check.py`:
- Input: `user_input: str`, `time_of_day: str`
- Gọi Gemini với system prompt từ `prompts.py`
- Output JSON: `mood_state`, `energy_level` (1-10), `risk_flag`, `detected_emotions`, `confidence`
- `risk_flag = true` nếu có từ ngữ liên quan tự hại

`backend/agents/psychology_insight.py`:
- Input: wellness_result, user_profile, history_7_days
- Chọn framework dựa trên trigger condition (xem CLAUDE.md mục 5)
- Output JSON: `primary_pattern`, `explanation_for_user` (VI), `why_this_happens`, `recommended_framework`, `pattern_trend`

`backend/agents/task_generator.py`:
- Input: insight_result, user_profile, energy_level, available_time
- Tuân thủ nghiêm ngặt rule engine (xem CLAUDE.md mục 6)
- Output JSON: `tasks[]` với `implementation_intention` cụ thể, `encouragement` (VI)

`backend/agents/reflection.py`:
- Input: user_input, today_tasks, completed[], history_7_days, day_count
- Output JSON: `today_summary`, `pattern_detected`, `pattern_description`, `progress_highlight`, `tomorrow_question`, `weekly_insight` (null nếu < 7 ngày)

`backend/core/pipeline.py`:
- `run_morning_pipeline(user_input, profile)` → gọi Agent 1 → 2 → 3 tuần tự
- Nếu `risk_flag`: return crisis response, không chạy Agent 2+3

**Success Criteria:**
- [x] Agent 1 test script: nhập "hôm nay mệt" → output JSON hợp lệ
- [x] Agent 2 test script: nhập wellness JSON → chọn đúng framework
- [x] Agent 3 test script: energy=3 → chỉ 1 task, dưới 15 phút
- [x] Agent 4 test script: nhập reflection → có tomorrow_question
- [x] Pipeline: "tôi không muốn làm gì" → 3 agent chạy tuần tự, JSON cuối hợp lệ
- [x] Pipeline: "tôi muốn chết" → dừng tại Agent 1, trả crisis response

---

## Phần 4 — API Routes FastAPI

**Mục tiêu:** Tất cả endpoint hoạt động, test được qua `/docs`.

**Việc cần làm:**

`backend/main.py` — thêm các routes:
```
GET  /health                    → {"status": "ok", "version": "2.0"}
POST /api/onboarding            → lưu profile.json, return success
GET  /api/profile               → trả profile.json
POST /api/morning               → chạy pipeline 3 agent, lưu history
POST /api/evening               → chạy Agent 4, cập nhật history
GET  /api/today                 → trả today entry từ history
GET  /api/streak                → trả streak count
GET  /api/history               → trả 7 ngày gần nhất
GET  /api/weekly-insight        → trả weekly insight nếu đủ 7 ngày
```

Thêm CORS middleware cho localhost:3000.

**Success Criteria:**
- [x] `/docs` load được, hiển thị tất cả endpoints
- [x] `POST /api/onboarding` với sample data → `profile.json` được tạo
- [x] `POST /api/morning` với "hôm nay tôi ổn" → nhận JSON có tasks
- [x] `GET /api/today` → trả đúng entry của hôm nay
- [x] `GET /api/streak` → trả số ngày streak

---

## Phần 5 — Design System + Layout Frontend

**Đây là phần quan trọng nhất về UI. Đọc `docs/design-system.md` trước khi bắt đầu.**

**Aesthetic: "Calm Luxury Dark"** — chi tiết trong `docs/design-system.md`.

**Việc cần làm:**

`frontend/tailwind.config.ts`:
- Custom colors theo design system (midnight, amber, ice-blue, slate)
- Custom fonts: Playfair Display + DM Sans
- Custom animation keyframes: fadeIn, slideUp, glowPulse, auraFloat

`frontend/app/globals.css`:
- CSS variables đầy đủ
- Base styles: background, scrollbar, selection color
- Mood color mapping (CSS classes cho từng mood_state)

`frontend/app/layout.tsx`:
- Google Fonts import (Playfair Display + DM Sans)
- Navigation component (sidebar trên desktop, bottom bar trên mobile)
- Metadata

`frontend/components/ui/` — primitive components:
- `Button.tsx` — variants: primary, ghost, danger
- `Card.tsx` — glassmorphism card
- `Input.tsx` — dark styled input
- `LoadingSpinner.tsx` — subtle spinner
- `Badge.tsx` — mood/framework badges

`frontend/components/aura/`:
- `MoodOrb.tsx` — animated orb thay đổi màu/glow theo mood_state
- `EnergyBar.tsx` — visual bar cho energy_level 1-10
- `FrameworkTag.tsx` — badge hiển thị framework được chọn
- `TaskCard.tsx` — card task với implementation intention + tick
- `InsightCard.tsx` — card giải thích tâm lý
- `StreakDisplay.tsx` — hiển thị streak + shield system
- `SupportCard.tsx` — crisis mode card

**Success Criteria:**
- [ ] `localhost/` load được, dark background đúng màu
- [ ] MoodOrb render với màu amber (stable state)
- [ ] TaskCard render với mock data, tick được
- [ ] StreakDisplay render với số 0
- [ ] Không có lỗi TypeScript

---

## Phần 5.5 — Redesign UI "AURA GLOW" ✅ DONE

**Mục tiêu:** Thay toàn bộ aesthetic "Calm Luxury Dark" cũ bằng "AURA GLOW" — layout tối giản, background aura reactive theo `mood_state`, font Sora + DM Sans. KHÔNG đụng vào logic, API, backend.

**Việc đã làm:**

`frontend/tailwind.config.ts`:
- [x] Thay token colors: `bg-primary`, `bg-surface`, `text-primary`, `text-secondary`
- [x] Thay 5 mood palette mới (energized/stable/anxious/overwhelmed/numb) với primary + soft
- [x] Đổi font: `Sora` (heading) + `DM Sans` (body), bỏ Cormorant/Playfair
- [x] Thêm keyframes: `auraDrift`, `auraJitter`, `auraBreathe`, `gradientPan`, `typingDot`

`frontend/app/globals.css`:
- [x] CSS variables AURA GLOW (dark + light mode)
- [x] `.aura-bg` fixed, 2 blob radial-gradient blur 90px, drift ngược chiều
- [x] `.mood-*` class override `--mood-color`, `--mood-color-soft`, `--mood-glow`, `--aura-speed`, `--aura-opacity`
- [x] `mood-anxious` thêm grain SVG + jitter animation
- [x] Utility classes: `.glass-card`, `.surface-card`, `.gradient-text`, `.btn-mood`, `.input-underline`, `.bubble-user`, `.bubble-aura`, `.typing-dot`

`frontend/lib/mood-context.tsx` (mới):
- [x] `MoodProvider` React context giữ `mood: MoodState`
- [x] `MoodBody` client component apply `mood-<state>` class lên `<body>`

`frontend/app/layout.tsx`:
- [x] Import `Sora` + `DM_Sans` từ `next/font/google`
- [x] Wrap `ThemeProvider > MoodProvider > MoodBody`
- [x] Thêm `<div class="aura-bg">` trước content

`frontend/app/onboarding/page.tsx` (mới):
- [x] Chat bubble UI: AURA bên trái (glassmorphism), user bên phải (tint mood)
- [x] 5 câu hỏi theo `OnboardingRequest`: name → goal → context → past_attempts → daily_anchors
- [x] Typing indicator 3 chấm có glow
- [x] Progress dots 5 bước, dot active kéo dài + glow mood
- [x] Input glass-card với textarea underline + btn-mood
- [x] Submit `POST /api/onboarding` → redirect `/morning`

`CLAUDE.md`:
- [x] Replace mục 9 "Design Vision" bằng "Design System — AURA GLOW"
- [x] Ghi rõ palette, font, animation, file chính

**Success Criteria:**
- [x] `frontend/tailwind.config.ts` build không lỗi với Sora + mood tokens
- [x] `.aura-bg` render behind mọi trang, chuyển màu khi `mood-*` class đổi
- [x] `/onboarding` hiển thị chat bubble đúng aesthetic
- [x] Visual test qua browser (user đã test xong)

---

## Phần 5.6 — Animations + Contrast + Button Prominence ✅ DONE

**Mục tiêu:** User feedback sau Phần 5.5 — thêm nhiều animation hơn cho tổng thể web, làm nút nổi bật hơn, đảm bảo màu chữ / màu nền contrast ≥ 4.5:1 ở cả Dark + Light mode.

**Việc đã làm:**

`frontend/app/globals.css` (rewrite v2.1):
- [x] Tăng contrast text cả 2 mode: dark `--text-primary: #f2f2f7`, `--text-secondary: #a8a8c0`, `--text-tertiary: #7a7a95`; light `--text-primary: #13131f`, `--text-secondary: #4f4f63`, `--text-tertiary: #74748a`
- [x] Light mode `--bg-overlay: rgba(255,255,255,0.72)` để glass-card hiện rõ trên nền sáng (thay vì shadow đen gần như invisible)
- [x] Thêm biến `--btn-text: #0a0a0f` áp dụng cả 2 mode cho button text
- [x] Thêm keyframes mới: `fadeIn`, `fadeInUp`, `fadeInScale`, `slideInLeft`, `slideInRight`, `floatY`, `breathe`, `pulseGlow`, `sheen`, `sonarPing`, `rotateSlow`, `wobble`, `textShimmer`
- [x] Thêm utility class `.anim-fade-in`, `.anim-fade-in-up`, `.anim-fade-in-scale`, `.anim-slide-left/right`, `.anim-float`, `.anim-breathe`, `.anim-pulse-glow`, `.anim-rotate-slow`, `.anim-wobble`
- [x] Thêm `.stagger > *` helper (fade-in-up delay 0.05-0.75s, tối đa 8 con)
- [x] Thêm `.hover-lift`, `.hover-glow-text`, `.sonar-ping`
- [x] `.btn-mood` rewrite: padding 14×28, min-height 48, border 1.5px mood, box-shadow 3 lớp glow, hover → `::before` sheen sweep + scale 1.015 + brightness 1.08
- [x] Thêm `.btn-ghost` + `.btn-danger` đồng bộ prominence
- [x] `.glass-card` hover → translateY(-2px) + border đổi thành `--mood-color` + glow mood 36px
- [x] `@media (prefers-reduced-motion: reduce)` → disable tất cả animation

`frontend/components/ui/Button.tsx`:
- [x] Bỏ tham chiếu `--amber` / `--rose` cũ
- [x] Primary → class `.btn-mood`, Ghost → `.btn-ghost`, Danger → `.btn-danger`
- [x] Size sm/md/lg map theo min-height 40/48/56

`frontend/app/page.tsx`:
- [x] Thêm `.stagger` cho main container → các section fade-in-up tuần tự
- [x] Thêm mood preview bar (5 pill button) để test aura đổi mood realtime

`CLAUDE.md`:
- [x] Update mục 9 sang "Design System AURA GLOW v2.1"
- [x] Bảng color tokens dark + light với contrast note
- [x] Thêm Animation Library table (17 keyframes + utility class)
- [x] Cập nhật Button/Glass-card spec

`docs/design-system.md`:
- [x] Rewrite toàn bộ file từ "Calm Luxury Dark" cũ sang "AURA GLOW v2.1"
- [x] Color tokens, mood palette, animation library, component specs, do/don't

**Success Criteria:**
- [x] `globals.css` compile không lỗi
- [x] Text contrast ≥ 4.5:1 ở cả dark + light (kiểm tra bằng mắt + token)
- [x] Button primary nổi bật: border + 3-layer shadow + hover sheen
- [x] 10+ animation mới dùng được qua class `.anim-*`
- [x] Visual test qua browser (user đã approve 2026-04-13)

---

## Phần 6 — Frontend: Onboarding + Morning

**Việc cần làm:**

`frontend/app/onboarding/page.tsx`:
- Chat-style UI, từng câu hỏi hiện ra như chat bubble
- 5 câu hỏi: tên → mục tiêu → bối cảnh → thử gì rồi → thói quen hàng ngày
- Typing indicator animation khi chờ
- Progress dots (1/5, 2/5...)
- Submit → `POST /api/onboarding` → redirect `/morning`
- Nếu đã onboarding: redirect thẳng `/morning`

`frontend/app/morning/page.tsx`:
- Form nhập cảm xúc với placeholder gợi ý
- Loading state với animated MoodOrb trong khi chờ API (có thể 3-5 giây)
- Kết quả hiện ra theo thứ tự stagger:
  1. MoodOrb + mood label + energy bar
  2. InsightCard (framework + explanation tiếng Việt)
  3. TaskCard(s) với implementation intention
- Nút "Lưu & Bắt Đầu Ngày" → redirect `/checklist`

**Success Criteria:**
- [x] Onboarding flow chạy đủ 5 câu, submit → profile.json được tạo
- [x] Morning form submit → loading state xuất hiện
- [x] Kết quả 3 agent hiển thị đúng, có animation stagger
- [x] Mood orb đúng màu theo mood_state trả về
- [x] Task implementation intention hiển thị rõ ràng
- [x] Returning user: ReviewCard với 2 CTAs (Mọi thứ vẫn vậy / Cập nhật hồ sơ), editing mode prefill câu trả lời cũ (added 2026-04-13)
- [x] Gemini retry robust hơn: 4 attempts + exponential backoff 2s/4s/8s cho 503 UNAVAILABLE (added 2026-04-13)
- [x] User đã test manual trong browser và approve 2026-04-13

---

## Phần 7 — Frontend: Checklist + Evening + Dashboard

**Việc cần làm:**

`frontend/app/checklist/page.tsx`:
- Danh sách tasks từ morning entry hôm nay
- Tick animation: checkbox → strikethrough + checkmark glow
- Progress bar trên đầu (2/3 tasks)
- "Ghi nhận nhanh" — textarea để note mid-day
- Nút "Kết thúc ngày" → `/evening`

`frontend/app/evening/page.tsx`:
- So sánh: tasks đặt ra vs tasks hoàn thành
- Textarea reflection tự do
- Submit → `POST /api/evening` → hiển thị Agent 4 result:
  - Today summary
  - Pattern insight (nếu có)
  - Progress highlight
  - Tomorrow's question
- Nút "Xem Dashboard" → `/dashboard`

`frontend/app/dashboard/page.tsx`:
- Greeting với tên user
- StreakDisplay với shield count
- Quick stats: ngày hiện tại, tasks hôm nay, mood trend
- Mini mood chart 7 ngày (simple SVG hoặc div bars)
- CTA buttons: "Check-in Sáng" / "Xem Checklist" / "Reflection Tối"
- Weekly insight card (nếu có)

**Success Criteria:**
- [x] Tick task có animation smooth
- [x] Progress bar cập nhật real-time
- [x] Evening submit → Agent 4 result hiển thị với tomorrow_question
- [x] Dashboard hiển thị streak đúng
- [x] 7-day mood chart render đúng với data từ history

### Phần 7 — Mở Rộng (Easy)

> Các ý tưởng UI/state-only, không cần agent mới, không cần schema migration. Fit trực tiếp vào 3 trang đang build.

**Checklist page:**
- [x] **Micro-emotion 1-tap sau task** — 3 emoji (nhẹ nhõm / bình thường / kiệt sức) lưu vào `task.post_emotion`. Feed Agent 4 như micro-signal.
- [x] **Silent tick mode** — nếu `energy_level ≤ 3` buổi sáng, cho phép check-in 1 emoji duy nhất, bỏ qua form.

**Evening page:**
- [x] **Tasks-not-done reframe card** — hiển thị TRƯỚC reflection textarea: "X task chưa xong = data về giới hạn hôm nay, không phải thất bại".
- [x] **Guided reflection 3-prompt scaffolding** — thay textarea trống bằng 3 ô ngắn: "1 điều hôm nay dạy bạn / 1 điều làm bạn ngạc nhiên / 1 điều bạn biết ơn".
- [x] **Letter to tomorrow-me** — 1-2 câu user viết cho chính mình, sáng mai hiện ra ở đầu trang morning.
- [x] **Ambient mode** — toggle lofi/rain background audio khi làm reflection.

**Dashboard page:**
- [x] **"Why-today" card** — hiển thị `profile.goal` + 1 câu trích từ reflection tuần trước.
- [x] **Anti-streak metric** — thay "streak liên tục" bằng **"days with intention"** (số ngày có check-in trong 30 ngày gần nhất). Giảm shame khi miss.
- [x] **Seed-of-day** — đầu mỗi trang hiển thị 1 câu trích từ chính reflection user tuần trước ("Ngày 12/4 bạn viết: ...").
- [x] **Share card milestone** — 7/30 ngày có design đẹp theo mood tốt nhất tuần, PNG export để share.

**Success Criteria:**
- [x] Không phát sinh endpoint mới (dùng `history.json` sẵn có)
- [x] Mọi extension có thể toggle off qua setting (không ép user)

### Phần 7 — Bảng Kế Hoạch Thực Hiện

> Thứ tự build từ trên xuống. Core = bắt buộc (baseline Phần 7 gốc), Easy = extension đã thêm. Làm hết Core 1 trang rồi mới sang Easy trang đó, rồi mới chuyển trang tiếp theo.

| STT | Task | Trang | Cấp độ | Phụ thuộc | Trạng thái |
|-----|------|-------|--------|-----------|------------|
| 1 | Fetch today entry từ `GET /api/today` + state management | Checklist | Core | Phần 4 API | ✅ Done |
| 2 | Render task list với checkbox + strikethrough animation | Checklist | Core | #1 | ✅ Done |
| 3 | Progress bar real-time (X/Y tasks done) | Checklist | Core | #2 | ✅ Done |
| 4 | Textarea "Ghi nhận nhanh" (mid-day note) | Checklist | Core | #1 | ✅ Done |
| 5 | Button "Kết thúc ngày" → redirect `/evening` | Checklist | Core | #2, #4 | ✅ Done |
| 6 | Seed-of-day banner đầu trang (trích reflection cũ) | Checklist | Easy | #1 | ✅ Done |
| 7 | Micro-emotion 1-tap (3 emoji) sau mỗi task tick | Checklist | Easy | #2 | ✅ Done |
| 8 | Silent tick mode (energy ≤ 3 → chỉ 1 emoji) | Checklist | Easy | #2, #7 | ✅ Done |
| 9 | Fetch today tasks + so sánh done/not-done | Evening | Core | #5 | ✅ Done |
| 10 | Tasks-not-done reframe card (hiện trước reflection) | Evening | Easy | #9 | ✅ Done |
| 11 | Guided 3-prompt reflection scaffolding (3 ô ngắn) | Evening | Easy | #9 | ✅ Done |
| 12 | Submit → `POST /api/evening` → Agent 4 | Evening | Core | #9, #11 | ✅ Done |
| 13 | Hiển thị Agent 4 result (summary, pattern, tomorrow_question) | Evening | Core | #12 | ✅ Done |
| 14 | Letter to tomorrow-me input (1-2 câu) | Evening | Easy | #13 | ✅ Done |
| 15 | Ambient mode toggle (lofi/rain audio) | Evening | Easy | #9 | ✅ Done |
| 16 | Button "Xem Dashboard" → redirect `/dashboard` | Evening | Core | #13 | ✅ Done |
| 17 | Greeting với `profile.name` + timezone-aware | Dashboard | Core | Phần 4 API | ✅ Done |
| 18 | StreakDisplay component với shield count | Dashboard | Core | #17 | ✅ Done |
| 19 | Quick stats card (ngày, tasks hôm nay, mood trend) | Dashboard | Core | #17 | ✅ Done |
| 20 | Mini 7-day mood chart (SVG/div bars) | Dashboard | Core | #17 | ✅ Done |
| 21 | CTA buttons: Check-in Sáng / Checklist / Evening | Dashboard | Core | #17 | ✅ Done |
| 22 | Weekly insight card (nếu đủ 7 ngày) | Dashboard | Core | #17 | ✅ Done |
| 23 | "Why-today" card (goal + quote từ reflection gần nhất) | Dashboard | Easy | #17, #6 | ✅ Done |
| 24 | Anti-streak metric ("days with intention" 30 ngày) | Dashboard | Easy | #18 | ✅ Done |
| 25 | Share card milestone (7/30 ngày, PNG export) | Dashboard | Easy | #18 | ✅ Done |

**Chiến lược ship:**
1. **Milestone A (Checklist Core)** — STT 1-5: user có thể tick task cơ bản. Ship được. ✅ **Done** (2026-04-14)
2. **Milestone B (Evening Core)** — STT 9, 12, 13, 16: vòng lặp morning→evening khép kín. ✅ **Done** (2026-04-15)
3. **Milestone C (Dashboard Core)** — STT 17-22: user thấy được big picture. ✅ **Done** (2026-04-16)
4. **Milestone D (Easy polish)** — STT 6-8, 10-11, 14-15, 23-25: layer lên sau khi 3 trang ổn định. ✅ **Done** (2026-04-16)

**Rule:** Không bắt đầu Milestone tiếp theo nếu Milestone trước chưa test qua browser + approve.

---

## Phần 8 — Polish: Streak Shield + Animations + Responsive

**Mục tiêu:** App trở nên đáng nhớ về cảm giác.

### Phần 8 — Bảng Kế Hoạch Thực Hiện

| Milestone | Nội dung | Status |
|-----------|----------|--------|
| A | Streak Shield System (Backend) | [x] ✓ |
| B | Animations & Visual Feedback (Frontend) | [x] ✓ |
| C | Responsive + Error States (Frontend) | [x] ✓ |
| D | Medium Extensions: Backend | [ ] |
| E | Medium Extensions: Frontend | [ ] |

**Việc cần làm:**

**Streak Shield System (`backend/core/memory.py`):**
- `get_streak()` trả thêm `shield_count`
- Logic: hoàn thành ≥5/7 ngày trong tuần → +1 shield
- Shield dùng được khi miss 1 ngày

**Animations (toàn frontend):**
- Page transitions: fade + slide nhẹ
- MoodOrb: `glowPulse` animation liên tục, cường độ thay đổi theo energy
- Task completion: particle burst nhỏ (CSS-only)
- Number counters: số streak đếm lên khi trang load
- Milestone toast: 7 ngày streak → full-width celebration banner

**Responsive (mobile-first):**
- Bottom navigation bar trên mobile (≤768px)
- Sidebar navigation trên desktop
- All text readable trên 375px
- Touch targets ≥ 44px

**Error States:**
- Backend down: friendly error card, không phải JSON dump
- Loading skeleton cho tất cả data-fetching states

**Success Criteria:**
- [ ] MoodOrb glow animation chạy mượt
- [ ] Task completion có visual feedback rõ ràng
- [ ] App usable trên 375px (iPhone SE)
- [ ] Streak shield logic đúng
- [ ] Error state hiển thị khi backend down
- [ ] Không có console error trên Chrome DevTools

### Phần 8 — Mở Rộng (Medium)

> Logic mới, cần backend/data processing hoặc re-call agent, nhưng không cần agent mới. Fit vào scope Polish.

**Backend — bổ sung vào `core/memory.py`:**
- [ ] `log_friction(task_id, reason)` — preset chips khi user skip: `mệt / bị phân tâm / quên / không thấy ý nghĩa`. Lưu vào `history[date].morning.tasks[i].friction`.
- [ ] `track_time_to_first_action(task_id)` — từ lúc task tạo → tick đầu tiên. Lưu `first_action_delay_minutes`.
- [ ] `get_framework_diversity_7d()` — trả về dict count framework 7 ngày.
- [ ] `get_energy_mood_matrix_7d()` — trả về array `[{date, mood, energy}]` cho chart.

**Backend — bổ sung endpoint:**
- [ ] `POST /api/task/retry-easier` — nhận `task_id`, gọi lại Agent 3 với `energy_level - 2`, thay thế task cũ trong `history.json`.
- [ ] `POST /api/task/friction` — lưu friction log.
- [ ] `GET /api/pattern-radar` — trả về count 8 framework trong 7/30 ngày.

**Checklist page (Medium):**
- [ ] **"Task quá sức" escape hatch** — nút nhỏ cạnh task → call `/api/task/retry-easier`, animation swap task mới mượt.
- [ ] **Friction log modal khi skip** — preset chips, optional free text.
- [ ] **Time-to-first-action indicator** — nếu delay > 3h nhiều ngày liên tục, dashboard hiện insight "có vẻ bạn đang phân tích quá nhiều".
- [ ] **Implementation intention countdown** — nếu task có mốc giờ trigger, hiện countdown live.
- [ ] **Midday mood re-check slider** — 1 slider ở đầu checklist, so với morning mood.

**Evening page (Medium):**
- [ ] **Tomorrow pre-commit** — sau Agent 4 result, ô input "Ngày mai lúc ___ tôi sẽ ___". Lock IF-THEN, sáng mai hiện lại trong morning form như mặc định.

**Dashboard page (Medium):**
- [ ] **Pattern radar chart** — spider chart 8 framework, count 30 ngày gần nhất.
- [ ] **Framework diversity indicator** — nếu 1 framework lặp > 5 ngày liên tục, hiển thị cảnh báo nhẹ "có pattern lặp".
- [ ] **Energy × mood correlation chart** — scatter 7 ngày, trục X = mood, Y = energy.

**UX platform (Medium):**
- [ ] **Reminder neo vào daily_anchor** — thay vì push giờ tùy ý, neo vào thói quen onboarding ("sau khi pha cà phê sáng"). Dùng local notification nếu PWA.
- [ ] **PWA installable offline-first** — manifest.json + service worker, checklist chạy offline, sync khi online.
- [ ] **Gentle re-entry flow** — nếu miss ≥ 3 ngày, skip morning form, chỉ hỏi 1 câu: "không sao, hôm nay bạn muốn bắt đầu bằng điều gì nhỏ nhất?".

**Success Criteria:**
- [ ] 3 endpoint mới có trong `/docs`
- [ ] Pattern radar render đúng với mock history 30 ngày
- [ ] PWA pass Lighthouse audit (installable)
- [ ] Retry-easier flow không mất data task cũ (lưu `replaced_from` reference)

---

## Phần 9 — Sáng Kiến Nâng Cao (Hard)

**Mục tiêu:** Biến AURA từ "task manager có AI" thành "companion nhớ bạn". Phần này cần agent mới hoặc meta-logic trên lịch sử dài. Chỉ làm sau khi Phần 1-8 ổn định và có ít nhất 14 ngày data thật.

**Việc cần làm:**

### 9.1 — Aura Memory Recall

**Ý tưởng:** Khi mood_state hôm nay trùng với 1 ngày trong quá khứ đã vượt qua thành công, dashboard hiện chính lời của user từ ngày đó làm liều thuốc — không phải advice generic.

`backend/core/memory_recall.py` (mới):
- [ ] `find_similar_past_day(current_mood, current_energy)` — tìm entry có `mood_state` tương đồng + tasks completed > 50% + evening reflection không phải crisis.
- [ ] Similarity score dựa trên: mood match (0.5) + energy ±2 (0.3) + day_count distance (0.2).
- [ ] Trả về `{date, user_quote, tasks_done, days_ago}`.

`backend/main.py`:
- [ ] `GET /api/memory-recall` — trả về similar past day nếu có, null nếu không đủ data (< 14 ngày).

`frontend/components/aura/MemoryRecallCard.tsx` (mới):
- [ ] Card dashboard: "30 ngày trước bạn cũng overwhelmed như hôm nay. Ngày đó bạn đã viết: '...' và bạn đã hoàn thành 2/3 task."
- [ ] Tone: không patronizing, không "bạn làm được mà" generic.

### 9.2 — Pattern Alert Auto-Mode

**Ý tưởng:** Nếu detect shame spiral / learned helplessness ≥ 3 ngày liên tục, pipeline tự chuyển sang Self-Compassion priority mode, user không cần biết — Agent 2 bỏ qua lựa chọn bình thường.

`backend/core/pattern_alert.py` (mới):
- [ ] `detect_risk_pattern(history_7d)` — rule-based detector:
  - Shame spiral: ≥ 3 ngày liên tục có reflection chứa keywords tự chỉ trích + tasks < 30% complete
  - Learned helplessness: ≥ 5 ngày liên tục energy ≤ 3 + không có task nào complete
  - Avoidance loop: skip morning check-in ≥ 2 ngày liên tục
- [ ] Trả về `{pattern_name, severity, recommended_override}`.

`backend/core/pipeline.py`:
- [ ] `run_morning_pipeline()` check pattern_alert TRƯỚC khi gọi Agent 2.
- [ ] Nếu có alert → inject `force_framework` vào Agent 2 context, override selection logic.
- [ ] Log alert vào `history[date].meta.pattern_alert`.

`frontend/components/aura/`:
- [ ] Không cần UI đặc biệt — user nhận framework đã override một cách tự nhiên.
- [ ] Optional: dashboard có indicator nhỏ "AURA đang ưu tiên self-compassion cho bạn tuần này" nếu alert active.

### 9.3 — Weekly Letter (Agent 5)

**Ý tưởng:** Chủ nhật, agent mới tổng hợp cả tuần thành 1 lá thư tiếng Việt cho user, tone như người bạn thân đã dõi theo 7 ngày. Không phải "insights", không phải bullet points — là thư.

`backend/agents/weekly_letter.py` (mới):
- [ ] Input: `history_7_days`, `profile`, `patterns_detected`, `memory_recalls`.
- [ ] System prompt: viết thư tiếng Việt, xưng "mình" - "bạn", 200-400 từ, đề cập cụ thể 2-3 khoảnh khắc trong tuần.
- [ ] Output JSON: `{letter_title, letter_body, signature_mood}`.

`backend/core/prompts.py`:
- [ ] `get_weekly_letter_prompt()` — system prompt với examples tone (tránh "as an AI", tránh listicle).

`backend/main.py`:
- [ ] `GET /api/weekly-letter` — chỉ return nếu hôm nay là Chủ nhật (hoặc đã qua CN gần nhất và chưa đọc) + đủ 7 ngày data.
- [ ] Letter lưu vào `history[sunday_date].weekly_letter` để đọc lại sau.

`frontend/app/dashboard/page.tsx`:
- [ ] Weekly Letter card — prominent position nếu có thư chưa đọc, collapsible archive cho thư cũ.
- [ ] Reading view: font Sora serif-like, max-width 560px, typography như đọc thư thật.

### 9.4 — Bad-Day Rehearsal

**Ý tưởng:** Ngày user ở state `energized`/`stable`, AURA gợi ý viết trước "1 câu dặn mình cho ngày khó". Khi mood_state = overwhelmed/numb sau này → hiện đúng câu đó ở đầu trang morning, trước khi hỏi bất cứ câu gì.

`backend/core/memory.py`:
- [ ] `save_bad_day_message(message, author_date)` — lưu vào `profile.bad_day_messages[]`.
- [ ] `get_bad_day_message()` — random 1 message chưa dùng gần đây, hoặc oldest nếu hết.
- [ ] `mark_bad_day_message_used(id)` — track usage tránh lặp.

`backend/main.py`:
- [ ] `POST /api/bad-day-message` — lưu message mới.
- [ ] `GET /api/bad-day-message/today` — chỉ return nếu hôm nay mood = overwhelmed/numb.

`frontend/app/morning/page.tsx`:
- [ ] Nếu mood detect (từ input đầu tiên) = overwhelmed/numb → pause pipeline, hiển thị Bad-Day Message card từ chính user quá khứ.
- [ ] User đọc xong → nút "Tiếp tục" → pipeline bình thường.

`frontend/app/dashboard/page.tsx`:
- [ ] Nếu hôm nay mood tốt (stable/energized) + chưa có message gần đây → gợi ý nhẹ "Viết 1 câu cho ngày khó sau này?".

**Success Criteria Phần 9:**
- [ ] Memory Recall chỉ fire khi có ≥ 14 ngày data và similarity score > 0.7
- [ ] Pattern Alert không false positive trên data lành mạnh (test với mock 14 ngày tốt)
- [ ] Weekly Letter có tone thực sự "người", không giống AI output (review bằng mắt)
- [ ] Bad-Day Rehearsal không spam — cooldown 7 ngày giữa các lần dùng lại 1 message
- [ ] Tất cả 4 feature có thể tắt qua setting — không ép user dùng meta-layer

---

## Ghi Chú Quan Trọng Cho Agent

1. **Gemini API Key** đọc từ `os.environ.get("GEMINI_API_KEY")` — không hardcode
2. **JSON output từ agent:** Nếu Gemini trả về markdown code block, strip ` ```json ` trước khi parse
3. **Context window:** Mở chat MỚI sau Phần 1-2, sau Phần 3-4, sau Phần 5-6
4. **Commit Git** sau mỗi phần: `git add . && git commit -m "phan-X: ten phan"`
5. **Khi báo xong:** Phải show bằng chứng — docker logs hoặc browser screenshot
6. **Kẹt 2 lần:** Đổi hướng hoàn toàn, đừng patch tiếp
