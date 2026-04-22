# AURA Project Review — Bao Cao Tong The

> Ngay review: 2026-04-22
> Reviewer: Claude Code (Opus 4.6)
> Trang thai: Tat ca 10 phan da hoan thanh

---

## 1. Tong Quan Du An

AURA (Artificial Understanding & Resolving Assistant) la AI life coach ca nhan hoa, target nguoi 20-35 tuoi dang stuck/burnout/mat dinh huong. Khac biet cot loi: nhan dien pattern tam ly cu the (learned helplessness, shame spiral, analysis paralysis...) roi chon dung framework can thiep — moi ngay khac nhau tuy trang thai thuc te.

**Tech Stack:** Next.js 15 + FastAPI + Google Gemini 3.1 Flash Lite + SQLite + Docker Compose + Nginx

**Quy mo code:**
- Backend: ~5,500 dong Python (12 file chinh)
- Frontend: ~20 components, 7 pages, 1 shared API layer
- Tests: 42 pytest (part 9) + streak shield tests
- Tong: ~19 commits, 10 phan phat trien tu 2026-04-12 den 2026-04-22

---

## 2. Nhung Gi Da Lam Duoc

### 2.1 Ha Tang (Phan 1)
- [x] Docker Compose 3 services: backend, frontend, nginx
- [x] Nginx reverse proxy: `/api/*` -> FastAPI, `/*` -> Next.js
- [x] Proxy timeout 180s cho morning pipeline (3 Gemini calls lien tiep)
- [x] Hot-reload volumes cho dev

### 2.2 Backend Core (Phan 2-4)
- [x] **Data layer:** `memory.py` doc/ghi profile.json + history.json (JSON file-based)
- [x] **Database:** SQLite WAL mode voi bang `accounts`, `users`, `daily_entries`, `tasks`
- [x] **8 Psychology Frameworks** voi trigger condition ro rang
- [x] **4 Agent prompts** (Wellness, Insight, Task Generator, Reflection)
- [x] **Pipeline orchestrator** (Agent 1 -> 2 -> 3, crisis stop, pattern alert inject)
- [x] **18+ API endpoints** bao gom CRUD profile, morning/evening pipeline, streak, history, friction, retry-easier, pattern-radar, memory-recall, pattern-alert, weekly-letter, bad-day-message

### 2.3 AI Agents (Phan 3 + 9)
- [x] **Agent 1 - Wellness Check:** Phan tich mood_state (5 loai), energy_level (1-10), risk_flag
- [x] **Agent 2 - Psychology Insight:** Chon 1/8 framework, giai thich tieng Viet, nhan dien pattern trend
- [x] **Agent 3 - Task Generator:** Tao task voi implementation intention, tuan thu rule engine (energy -> so task + thoi gian)
- [x] **Agent 4 - Reflection:** Tong hop buoi toi, nhan dien pattern, tomorrow_question
- [x] **Agent 5 - Weekly Letter:** Thu hang tuan tieng Viet, tone "nguoi ban than"
- [x] **Gemini client** (`_gemini.py`): Retry 429/503 voi exponential backoff, JSON strip, field validation

### 2.4 Frontend (Phan 5-8)
- [x] **Design System "AURA GLOW" v2.1:** Dark/Light mode, 5 mood aura (background reactive), 17+ animations
- [x] **Font:** Sora (heading) + DM Sans (body)
- [x] **Onboarding:** Chat bubble UI, 5 cau hoi, typing indicator, progress dots
- [x] **Morning:** Input tu do, loading MoodOrb, ket qua stagger (mood + insight + tasks)
- [x] **Checklist:** Tick animation, progress bar, micro-emotion 1-tap, friction log, retry-easier, silent tick mode
- [x] **Evening:** Tasks-not-done reframe, guided 3-prompt scaffolding, ambient audio, letter to tomorrow-me, pre-commit IF-THEN
- [x] **Dashboard:** Greeting, streak + shield, 7-day mood chart, pattern radar chart, energy x mood scatter, weekly insight, why-today card, share milestone, CTA buttons
- [x] **Components:** MoodOrb, EnergyBar, FrameworkTag, TaskCard, InsightCard, StreakDisplay, SupportCard, MemoryRecallCard, MilestoneToast, ErrorCard, Skeleton, Navigation, PageTransition
- [x] **PWA:** manifest.webmanifest + service worker + offline-first

### 2.5 Tinh Nang Nang Cao (Phan 9)
- [x] **Memory Recall (9.1):** Tim ngay tuong tu trong qua khu, hien loi user tu viet thay vi advice generic
- [x] **Pattern Alert Auto-Mode (9.2):** Shame spiral / learned helplessness / avoidance loop detection, tu dong override framework
- [x] **Weekly Letter (9.3):** Agent 5 viet thu tieng Viet, archive, mark-as-read
- [x] **Bad-Day Rehearsal (9.4):** Ngay tot viet truoc cho ngay xau, cooldown 7 ngay, morning interstitial

### 2.6 Auth (Phan 10)
- [x] **Login/Register page** voi AURA GLOW aesthetic
- [x] **JWT auth:** bcrypt password hash, 72h token expiry
- [x] **Auth API:** `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- [x] **Seed script:** 2 tai khoan thu nghiem voi history 10/30 ngay

---

## 3. Danh Gia Luong Xu Ly (Flow Analysis)

### 3.1 Morning Flow — TRANG THAI: Hop ly, tot
```
User mo app -> /morning
  |-- Profile chua onboard? -> redirect /onboarding
  |-- Miss >= 3 ngay? -> Gentle re-entry banner
  |-- Co pre-commit tu dem qua? -> Hien IF-THEN card
  |-- User viet cam xuc -> POST /api/morning
  |     |-- Agent 1: Wellness Check
  |     |     |-- risk_flag=true -> Crisis View (dung pipeline, hien hotline)
  |     |-- Pattern Alert: check shame/helplessness/avoidance
  |     |     |-- Co alert? -> force_framework cho Agent 2
  |     |-- Agent 2: Psychology Insight (chon framework)
  |     |-- Agent 3: Task Generator (theo energy rules)
  |-- Mood overwhelmed/numb? -> Fetch bad-day message -> interstitial
  |-- Hien ket qua: MoodOrb + Insight + Tasks
  |-- "Luu & Bat dau ngay" -> /checklist
```
**Nhan xet:** Luong nay phuc tap nhung logic. Pipeline 3 agent chay tuan tu, moi buoc co validation + fallback. Crisis stop la an toan cao nhat (dung ngay khi detect risk). Pattern alert inject truoc Agent 2 la thiet ke thong minh — user khong biet bi override.

### 3.2 Evening Flow — TRANG THAI: Hop ly
```
/evening
  |-- Fetch today entry + done tasks tu localStorage
  |-- Tasks chua xong? -> Reframe card ("data, khong phai that bai")
  |-- Guided 3-prompt (hoc / ngac nhien / biet on)
  |-- Submit -> Agent 4 Reflection
  |-- Hien: summary, pattern, tomorrow_question
  |-- Letter to tomorrow-me + Pre-commit IF-THEN
  |-- "Xem Dashboard" -> /dashboard
```

### 3.3 Dashboard Flow — TRANG THAI: Day du nhung nang
```
/dashboard
  |-- 10 API calls song song (Promise.all)
  |-- Hien: greeting, streak, mood chart, pattern radar,
  |   energy-mood scatter, weekly insight, why-today card,
  |   memory recall, pattern alert indicator, weekly letter,
  |   bad-day rehearsal prompt, share milestone
```
**Nhan xet:** Dashboard load 10 API cung luc la diem yeu (xem muc 6.1).

### 3.4 Auth Flow — TRANG THAI: Co van de (xem muc 5)
```
/ -> redirect /login
  |-- Login -> POST /api/auth/login -> JWT -> /dashboard
  |-- Register -> POST /api/auth/register -> JWT -> /onboarding
```

---

## 4. Nhung Diem Da Cai Thien Va Khac Y Dinh Ban Dau

| Khia canh | Y dinh ban dau (CLAUDE.md/plan.md) | Thuc te hien tai | Danh gia |
|-----------|-----------------------------------|-------------------|----------|
| **Design** | "Calm Luxury Dark" (Playfair Display font) | "AURA GLOW" v2.1 (Sora + DM Sans, aura reactive) | Tot hon — hien dai, reactive theo mood |
| **UI Aesthetic** | Dark mode co dinh | Dark + Light mode, contrast >= 4.5:1 | Tot hon — accessibility |
| **Animation** | Vai fadeIn co ban | 17+ keyframes, stagger, hover-lift, reduced-motion support | Tot hon nhieu |
| **Agent count** | 4 agents | 5 agents (them Weekly Letter) | Mo rong hop ly |
| **Data storage** | SQLite lam primary | Hybrid: SQLite (auth) + JSON file (profile/history) | Chua thong nhat (xem muc 6.2) |
| **Onboarding** | Form truyen thong | Chat bubble UI kieu tro chuyen | Tot hon — than thien hon |
| **Task management** | Tick co ban | Tick + friction log + retry-easier + micro-emotion | Mo rong tot |
| **Evening** | Textarea tu do | 3-prompt scaffolding + ambient audio + pre-commit | Trai nghiem tot hon |
| **Dashboard** | Stats co ban | 7 card/chart + memory recall + weekly letter | Day du nhung co the qua tai |
| **Auth** | Khong co trong plan ban dau (Phan 1-9) | Them Phan 10: Login/Register/JWT | Bo sung can thiet |
| **PWA** | Khong co trong plan ban dau | Them manifest + service worker | Bonus tot |

---

## 5. Van De Va Diem Yeu Hien Tai

### 5.1 NGHIEM TRONG — Auth Chua Ket Noi Voi App

**Van de:** Auth system (JWT) da build nhung CHUA duoc enforce tren cac API route chinh. Cu the:
- `/api/morning`, `/api/evening`, `/api/profile`, v.v. KHONG co `Depends(get_current_user)` — bat ky ai cung goi duoc
- Frontend KHONG luu JWT token sau login, khong gui Authorization header
- Tat ca data van doc/ghi tu `profile.json` / `history.json` voi user_id="local_user" — khong phan biet user
- Register tao row trong SQLite nhung pipeline van dung JSON file

**Muc do:** Cao. Auth hien chi la UI shell, khong co bao ve thuc te.

**De xuat:**
1. Them `Depends(get_current_user)` cho moi route trong `api.py`
2. Frontend luu JWT vao localStorage/cookie, gui trong header
3. Chuyen data tu JSON file sang SQLite query theo `user_id`
4. Middleware redirect ve `/login` khi khong co token hop le

### 5.2 TRUNG BINH — Data Layer Khong Thong Nhat

**Van de:** Database SQLite co schema (users, daily_entries, tasks) nhung KHONG duoc su dung. Toan bo read/write di qua `profile.json` + `history.json`. SQLite chi dung cho auth (accounts table).

**He qua:**
- Khong co ACID transaction cho data quan trong
- Khong ho tro multi-user (tat ca cung 1 file JSON)
- Khong co index, query phuc tap phai load toan bo file
- Khi history lon (1 nam = 365 entries), doc/ghi se cham

**De xuat:** Migrate data layer tu JSON sang SQLite, hoac cam ket single-user va bo SQLite schema khong dung.

### 5.3 TRUNG BINH — Dashboard Qua Tai

**Van de:** Dashboard goi 10 API song song moi lan load. Voi Gemini API (weekly letter generation), co the mat 10-20 giay.

**De xuat:**
- Cache response voi stale-while-revalidate
- Lazy load cac section it quan trong (radar chart, energy scatter)
- Weekly letter chi generate 1 lan roi cache

### 5.4 THAP — Test Coverage Thap

**Van de:** Chi co 42 pytest cho Phan 9 va streak shield. Khong co:
- Unit test cho Agent 1-4
- Integration test cho pipeline
- Frontend test (0 test)
- E2E test

**De xuat:** Them unit test cho core logic (memory.py, pipeline.py, validation). Frontend co the dung Playwright cho golden path.

### 5.5 THAP — Bao Mat

**Van de nho:**
- `JWT_SECRET` hardcode default trong code (`"aura-dev-secret-change-in-production"`)
- Khong co rate limiting tren auth endpoints (brute-force possible)
- Khong co CSRF protection
- Khong co input sanitization cho Gemini prompts (prompt injection risk thap vi output la JSON)

### 5.6 THAP — UX Nho

- Khong co navigation quay lai tu `/checklist` ve `/morning`
- Khong co xac nhan khi dong trang (mat data textarea)
- Loading state cua morning pipeline co the mat 5-15 giay — chi co typing dot, khong co progress indicator
- Ambient audio (evening) khong co toggle nho tren mobile

---

## 6. Kha Nang Nang Cap

### 6.1 Uu Tien Cao
| Nang cap | Mo ta | Do kho |
|----------|-------|--------|
| **Auth enforcement** | Ket noi JWT voi API routes, phan biet user data | Trung binh |
| **Multi-user data** | Migrate tu JSON sang SQLite hoac PostgreSQL | Cao |
| **Streaming response** | Gemini output stream -> real-time UI update | Trung binh |
| **Notification API** | Push notification cho daily reminder | Trung binh |

### 6.2 Uu Tien Trung Binh
| Nang cap | Mo ta | Do kho |
|----------|-------|--------|
| **Dashboard optimization** | Lazy loading + cache + skeleton per section | Thap |
| **Mood trend analytics** | Chart 30 ngay, predict mood pattern | Trung binh |
| **Export data** | Download lich su ca nhan dang PDF/CSV | Thap |
| **I18n** | Ho tro English + tieng Viet toggle | Trung binh |
| **Onboarding upgrade** | Them chronotype detection, support style quiz | Thap |

### 6.3 Uu Tien Thap (Nice-to-have)
| Nang cap | Mo ta | Do kho |
|----------|-------|--------|
| **Voice input** | Web Speech API cho morning check-in | Thap |
| **AI model fallback** | Khi Gemini down, fallback sang model khac | Trung binh |
| **Community features** | Anonymous mood sharing, group challenges | Cao |
| **Therapist dashboard** | Share progress voi chuyen gia | Cao |

---

## 7. Danh Gia Trai Nghiem Nguoi Dung (UX Assessment)

### 7.1 DIEM MANH — Trai nghiem tot

**Onboarding (8/10):**
- Chat bubble UI rat than thien, khong giong form nhap lieu
- Typing indicator tao cam giac "dang noi chuyen voi ai do"
- 5 cau hoi vua du, khong qua dai

**Morning Check-in (8/10):**
- Textarea tu do — khong ep user chon tu dropdown
- MoodOrb animation khi loading tao cam giac AURA dang "suy nghi"
- Ket qua hien theo stagger — cam giac kham pha tung lop
- Crisis mode dung ngay, hien hotline — an toan va co trach nhiem

**Checklist (9/10):**
- Micro-emotion sau moi task la thiet ke hay nhat — feedback loop nhanh
- Friction log khi skip task thay vi hoi "tai sao ban khong lam?" — respect user
- Retry-easier la safety net tot — giam cam giac that bai
- Silent tick mode khi energy thap — AURA hieu ban met

**Evening (8/10):**
- Reframe card "data, khong phai that bai" — chong shame loop
- Guided 3-prompt hay hon textarea trong (nguoi dung biet viet gi)
- Pre-commit IF-THEN la implementation intention thuc te

**Design (9/10):**
- AURA GLOW reactive theo mood — background thay doi = visual feedback
- Dark mode mac dinh phu hop target audience (20-35, tech-savvy)
- Animation nhieu nhung co `prefers-reduced-motion` — inclusive
- Glass-card aesthetic hien dai, khong bi "too corporate"

### 7.2 DIEM YEU — Co the giam trai nghiem

**Loading time (5/10):**
- Morning pipeline: 3 Gemini API calls lien tiep = 5-15 giay. Chi co typing dot, khong progress bar.
- Dashboard: 10 API calls = co the 3-5 giay trang trang. Co skeleton nhung van lau.
- User khong biet dang o buoc nao (Agent 1? 2? 3?)

**First-time experience (6/10):**
- Sau onboarding, chuyen thang sang /morning — khong co "tour" hay gioi thieu
- Khong giai thich framework la gi, energy bar nghia la gi
- Dashboard lan dau trong vi chua co data

**Retention risk (6/10):**
- Neu user bo 1-2 ngay, khong co push notification nhac
- Gentle re-entry (miss >= 3 ngay) tot, nhung miss 1-2 ngay khong co gi
- Weekly letter chi co khi du 7 ngay data — user moi se khong thay

**Mobile (7/10):**
- Responsive co, bottom nav co, touch target 44px+
- Nhung dashboard voi 10+ card tren mobile se qua dai (scroll fatigue)
- Radar chart / scatter chart kho doc tren man hinh nho

**Emotional safety (9/10):**
- Crisis detection + hotline: tot
- Pattern alert tu dong chuyen framework: tot
- "Data, khong phai that bai" reframe: tot
- Bad-day rehearsal: rat sáng tao
- Nhung: khong co cach de user report false positive (AURA hieu sai mood)

### 7.3 Tom Tat UX Score

| Khia canh | Diem (1-10) | Ghi chu |
|-----------|-------------|---------|
| First impression | 8 | AURA GLOW design rat dep |
| Onboarding | 8 | Chat bubble than thien |
| Daily loop (morning -> checklist -> evening) | 8.5 | Loop kep kin, micro-feedback tot |
| Dashboard | 7 | Day du nhung nang, mobile kho doc |
| Emotional safety | 9 | Crisis stop, reframe, bad-day rehearsal |
| Loading/performance | 5 | Gemini latency la bottleneck chinh |
| Retention | 6 | Thieu notification, miss 1-2 ngay im lang |
| **Tong binh quan** | **7.4/10** | **Solid MVP, can polish loading + retention** |

---

## 8. Ket Luan

### Du an lam tot:
1. **Kien truc agent pipeline** thiet ke tot — 5 agent chay tuan tu, moi agent co input/output ro rang, validation chat
2. **Psychology framework engine** la diem khac biet thuc su — khong phai chatbot motivation generic
3. **Emotional safety** tot nhat trong scope MVP — crisis stop, pattern alert, bad-day rehearsal, reframe
4. **Design system AURA GLOW** chuyen nghiep, reactive theo mood, co reduced-motion
5. **Feature depth** vuot xa MVP thong thuong — friction log, retry-easier, weekly letter, memory recall

### Du an can cai thien:
1. **Auth chua ket noi** — uu tien cao nhat, hien app chua bao ve data
2. **Data layer** phai chon 1: JSON (single-user simple) hoac SQLite (multi-user scalable)
3. **Loading performance** — Gemini latency can streaming hoac progress indicator
4. **Test coverage** — chi 42 test cho 5,500 dong Python la thap
5. **Retention mechanism** — can notification/email de giu user quay lai

### Verdict:
> AURA la mot **MVP an tuong** voi chieu sau tam ly va thiet ke tot. Pipeline 5 agent + 8 framework la competitive advantage thuc su. Tuy nhien, auth va data layer can uu tien fix truoc khi bat ky user nao ngoai dev su dung. Voi 2-3 tuan polish them (auth enforcement + streaming + notification), day la san pham co the demo/pilot voi user thuc.

---

*Review boi Claude Code (Opus 4.6) — 2026-04-22*
