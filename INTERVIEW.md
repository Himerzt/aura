# AURA — Interview Q&A

> Bộ câu hỏi phỏng vấn ưu tiên cao, kèm câu trả lời kỹ thuật chính xác.
> Mỗi câu hỏi có cả bản tiếng Anh và bản dịch tiếng Việt.

---

## Mục Lục

1. [System Architecture & Design Decisions](#1-system-architecture--design-decisions)
2. [Agent Pipeline & State Transfer](#2-agent-pipeline--state-transfer) ⭐ (câu đặc biệt)
3. [AI & Prompt Engineering](#3-ai--prompt-engineering)
4. [Psychology Framework Engine](#4-psychology-framework-engine)
5. [Frontend & Design System](#5-frontend--design-system)
6. [Data Layer & Storage](#6-data-layer--storage)
7. [Reliability & Error Handling](#7-reliability--error-handling)
8. [Product & Behavioral Design](#8-product--behavioral-design)

---

## 1. System Architecture & Design Decisions

---

### Q1.1

**EN:** Walk me through the overall system architecture of AURA. How do the components communicate in both local development and production?

**VI (Dịch):** Hãy trình bày kiến trúc tổng thể của AURA. Các thành phần giao tiếp với nhau như thế nào trong môi trường local và production?

**Answer:**

AURA có hai cấu hình triển khai:

**Local (Docker Compose):**
```
User → localhost:80 → Nginx → /api/* → FastAPI :8000
                             → /*     → Next.js :3000
```
Ba container: backend, frontend, nginx. Nginx đóng vai trò reverse proxy, giúp frontend gọi API qua cùng origin (`/api/...`) — tránh CORS issue hoàn toàn trong dev.

**Production (Railway):**
```
User → Frontend Railway service :3000
         └─ fetch(NEXT_PUBLIC_API_URL) → Backend Railway service :8000
                                              └─ CORS: ALLOWED_ORIGINS env var
```
Không dùng Nginx trên Railway. Frontend đọc API URL từ `NEXT_PUBLIC_API_URL` env var, backend đọc danh sách origin được phép từ `ALLOWED_ORIGINS`. Cả hai config đều không hardcode — deploy lên bất kỳ đâu chỉ cần thay env var.

---

### Q1.2

**EN:** Why did you choose JSON files over a database like SQLite or PostgreSQL for this project?

**VI (Dịch):** Tại sao bạn chọn JSON file thay vì database như SQLite hay PostgreSQL?

**Answer:**

Đây là quyết định có chủ đích cho **single-user MVP**, không phải thiếu sót kỹ thuật.

**Lý do cụ thể:**
1. **No auth, no multi-user** — khi chỉ có một người dùng, không có race condition, không cần ACID transaction.
2. **Iteration speed** — thay đổi schema JSON không cần migration. Trong quá trình build 10 phần, data model thay đổi liên tục.
3. **Portable demo** — `profile.json` + `history.json` có thể seed trực tiếp, dễ demo cho interviewer.
4. **SQLite đã được build nhưng remove** — Phần 2 có `database.py` với schema đầy đủ (accounts, users, daily_entries, tasks), nhưng không được dùng vì auth không được enforce trên API routes — tạo ra ảo giác bảo mật nguy hiểm hơn không có. Quyết định remove là deliberate.

**Trade-off rõ ràng:** Không scale được multi-user. Đây là roadmap v2 sau MVP.

---

### Q1.3

**EN:** Why did you remove the auth system that was already built in Part 10?

**VI (Dịch):** Tại sao bạn gỡ bỏ hệ thống auth đã được build trong Phần 10?

**Answer:**

Auth (JWT/login/register) đã được build đầy đủ UI — hai trang Login và Register theo AURA GLOW design system. Nhưng tôi quyết định remove vì:

**Vấn đề cốt lõi:** Auth UI tồn tại nhưng **không được enforce trên API routes**. Một user có thể gọi trực tiếp `POST /api/morning` mà không cần token — auth chỉ là decoration. Điều này nguy hiểm hơn là không có auth: người dùng (hoặc reviewer) nghĩ data được bảo vệ nhưng thực ra không phải.

**Nguyên tắc:** "Fake security is worse than no security." Thà document rõ "đây là single-user MVP, không có auth" còn hơn để lại auth shell gây hiểu lầm.

---

## 2. Agent Pipeline & State Transfer

---

### Q2.1 ⭐ (Câu Đặc Biệt)

**EN:** Please explain the specific technical mechanism you implemented to manage state and handle context transfer between the "Wellness Check" agent and the "Insight Task Generator" agent. How did you structure the prompt or data payload to ensure the subsequent agent understood the context accurately without exceeding context windows or hallucinating?

**VI (Dịch):** Hãy giải thích cụ thể cơ chế kỹ thuật bạn đã implement để quản lý state và chuyển context giữa agent "Wellness Check" và agent "Insight Task Generator". Bạn đã cấu trúc prompt hay data payload như thế nào để agent tiếp theo hiểu đúng context mà không vượt quá context window hoặc hallucinate?

**Answer:**

Đây là phần quan trọng nhất của pipeline. Tôi sẽ phân tích từng lớp kỹ thuật:

---

**1. Sequential Pipeline Orchestration (pipeline.py)**

Pipeline chạy tuần tự, không song song. Output của mỗi agent là Python `dict` — được truyền trực tiếp vào agent tiếp theo:

```python
# pipeline.py
wellness = await run_wellness_check(user_input, time_of_day="morning")
# wellness = {"mood_state": "anxious", "energy_level": 4, "risk_flag": False, ...}

insight = await run_psychology_insight(wellness, profile, history, force_framework)
# energy từ wellness được extract trực tiếp:
energy = wellness.get("energy_level", 5)

task_result = await run_task_generator(insight, profile, energy, pre_commit)
```

State được giữ hoàn toàn trong Python heap của request — không có external state store, không có session DB. Mỗi HTTP request là một pipeline execution độc lập.

---

**2. Context Serialization Strategy (psychology_insight.py)**

Vấn đề: làm thế nào để Agent 2 hiểu đúng context mà không bị "thừa thông tin" gây hallucination?

Giải pháp: **Selective serialization** — chỉ gửi subset cần thiết của profile, không gửi toàn bộ object:

```python
# psychology_insight.py — user_content được build thủ công
user_content = (
    "## Wellness Assessment\n"
    + json.dumps(wellness_result, ensure_ascii=False)     # toàn bộ Agent 1 output
    + "\n\n## User Profile\n"
    + json.dumps(
        {
            "goal": user_profile.get("goal", ""),
            "context": user_profile.get("context", ""),
            "past_attempts": user_profile.get("past_attempts", []),
            "support_style": user_profile.get("support_style", "balanced"),
        },
        ensure_ascii=False,
    )                                                       # chỉ 4 fields cần thiết
    + "\n\n## Recent History (last 7 days)\n"
    + json.dumps(history_7_days, ensure_ascii=False)       # giới hạn 7 ngày
    + force_hint                                           # override nếu có pattern alert
)
```

**Tại sao thiết kế này:**
- **Wellness result**: gửi đầy đủ vì Agent 2 cần toàn bộ signal (mood, energy, risk, detected_emotions)
- **Profile**: chỉ gửi 4 fields (goal, context, past_attempts, support_style) — không gửi user_id, created_at, chronotype, daily_anchors (không liên quan đến việc chọn framework tâm lý)
- **History**: giới hạn 7 ngày (`get_history_7_days()`) — đủ để detect pattern trend mà không blow up context window
- Cấu trúc bằng **Markdown headers** (`## Section`) — giúp Gemini parse từng phần độc lập, giảm cross-contamination giữa các section

---

**3. Preventing Hallucination — Belt + Suspenders Pattern**

Vấn đề: LLM có thể generate framework key không hợp lệ, hoặc ignore prompt instruction.

Giải pháp: **Validation + hard override sau khi parse**:

```python
# psychology_insight.py
VALID_FRAMEWORKS = set(FRAMEWORK_DESCRIPTIONS.keys())  # 8 keys cố định

data = await call_gemini(system_prompt, user_content, REQUIRED_FIELDS)

# Belt: nếu có pattern_alert, force override framework bất kể AI chọn gì
if force_framework and force_framework in VALID_FRAMEWORKS:
    data["recommended_framework"] = force_framework

# Suspenders: validate sau khi override
if data["recommended_framework"] not in VALID_FRAMEWORKS:
    raise ValueError(f"Invalid framework '{data['recommended_framework']}'")
```

Tương tự, Agent 3 không tin tưởng AI về task count và time:

```python
# task_generator.py — enforce AFTER parse, không chỉ trong prompt
if len(data["tasks"]) > max_tasks:
    data["tasks"] = data["tasks"][:max_tasks]  # hard truncate

if total_minutes > max_total_min:
    scale = max_total_min / total_minutes
    for task in data["tasks"]:
        task["estimated_minutes"] = max(1, round(task["estimated_minutes"] * scale))  # scale down
```

---

**4. Context Injection for Framework Override (Pattern Alert 9.2)**

Khi `detect_risk_pattern()` phát hiện shame spiral / learned helplessness, `force_framework` được inject vào user_content như một instruction block cuối cùng:

```python
force_hint = (
    f"\n\n## IMPORTANT OVERRIDE\n"
    f"Pattern alert detected. You MUST use framework '{force_framework}' "
    f"as recommended_framework. Adapt your explanation accordingly."
)
```

Thiết kế này đặt override instruction **cuối** user_content — vì LLM tend to weight recent tokens higher. Sau đó vẫn có hard override ở Python layer để đảm bảo.

---

**5. Temperature Setting**

```python
config = types.GenerateContentConfig(
    system_instruction=system_prompt,
    temperature=0.3,   # thấp — deterministic hơn, ít hallucinate hơn
)
```

Temperature 0.3 (thay vì default 1.0) giảm variance đáng kể cho structured JSON output. Agent phân tích tâm lý không cần creativity — cần accuracy.

---

**Tóm tắt kiến trúc state transfer:**

| Layer | Cơ chế |
|-------|--------|
| State storage | Python dict in request scope |
| Serialization | `json.dumps` với selective fields |
| Context window | 7-day history cap + profile subset |
| Hallucination prevention | Required fields validation + Python hard enforcement |
| Framework override | Text injection + Python override (belt + suspenders) |
| Determinism | temperature=0.3 |

---

### Q2.2

**EN:** How does the pipeline handle crisis scenarios, and why did you design it this way?

**VI (Dịch):** Pipeline xử lý tình huống khủng hoảng như thế nào, và tại sao bạn thiết kế như vậy?

**Answer:**

Agent 1 (Wellness Check) là gatekeeper duy nhất cho crisis detection:

```python
# pipeline.py
wellness = await run_wellness_check(user_input)

if wellness.get("risk_flag"):
    return {
        "type": "crisis",
        "wellness": wellness,
        "message": "AURA nhận thấy bạn đang trải qua điều rất nặng nề...",
        "hotlines": CRISIS_HOTLINES,
    }
# Agent 2, 3 không bao giờ chạy nếu risk_flag = True
```

**Lý do thiết kế early-exit:**
1. **Không xử lý khủng hoảng bằng AI** — framework tâm lý và task generation hoàn toàn không phù hợp khi ai đó đang trong crisis. Chạy Agent 2-3 là disrespectful và potentially harmful.
2. **Latency** — không lãng phí 2 API call khi kết quả đã rõ.
3. **SupportCard UI** — frontend nhận `type: "crisis"` → render `SupportCard` với hotline thực tế, không phải insight card.

Trong prompt Agent 1: `risk_flag: true ONLY if message contains explicit self-harm, suicidal ideation, or severe crisis language` — ngưỡng cao có chủ đích để tránh false positive gây gián đoạn UX.

---

### Q2.3

**EN:** Explain the Pattern Alert system (Feature 9.2) and how it integrates with the agent pipeline without breaking the user experience.

**VI (Dịch):** Giải thích hệ thống Pattern Alert (Feature 9.2) và cách nó tích hợp vào pipeline mà không phá vỡ trải nghiệm người dùng.

**Answer:**

Pattern Alert là meta-layer chạy **trước Agent 2**, phân tích lịch sử 7 ngày bằng rule-based logic (không dùng AI) để detect:

- **Shame spiral**: ≥3 ngày liên tục có reflection chứa keywords tự chỉ trích + tasks < 30% complete
- **Learned helplessness**: ≥5 ngày energy ≤3 + 0 task nào complete
- **Avoidance loop**: skip morning check-in ≥2 ngày liên tục

Khi detect được → trả về `recommended_override` (ví dụ: `"self_compassion"`).

**Integration không phá UX:**
```python
# pipeline.py
pattern_alert = detect_risk_pattern()

force_framework = None
if pattern_alert:
    force_framework = pattern_alert.get("recommended_override")

insight = await run_psychology_insight(
    wellness, profile, history, force_framework=force_framework
)
```

**User không biết có override** — họ vẫn nhận insight và tasks bình thường, chỉ là framework đã được chuyển sang self_compassion tự động. Dashboard có indicator "AURA care mode" nhỏ nhưng không intrusive.

Lý do dùng rule-based thay vì AI cho pattern detection: predictability và speed — không muốn thêm latency và thêm điểm có thể hallucinate vào safety-critical feature.

---

## 3. AI & Prompt Engineering

---

### Q3.1

**EN:** How did you structure your prompts to consistently get valid JSON output from Gemini instead of prose responses?

**VI (Dịch):** Bạn đã cấu trúc prompt như thế nào để Gemini luôn trả về valid JSON thay vì text thường?

**Answer:**

Có 4 lớp defense:

**1. System prompt instruction rõ ràng:**
```
Output format (strict JSON, no markdown, no explanation):
{ ... schema ... }
Respond in JSON only. Do not add any text before or after the JSON.
```

**2. Strip markdown fences** — Gemini đôi khi wrap JSON trong code block:
```python
# _gemini.py
def _strip_json(text: str) -> str:
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()
```

**3. Required fields validation** — check sau khi parse:
```python
missing = [f for f in required_fields if f not in data]
if missing:
    raise ValueError(f"Missing required fields: {missing}")
```

**4. Retry với exponential backoff** — nếu parse fail, retry tối đa 4 lần:
- 429 RESOURCE_EXHAUSTED: đợi theo gợi ý của API + 5s buffer
- 503 UNAVAILABLE: exponential backoff 2s, 4s, 8s
- Other errors: linear 1s, 2s, 3s

---

### Q3.2

**EN:** How did you decide which psychological framework to use for each user state, and how do you prevent the AI from making arbitrary choices?

**VI (Dịch):** Bạn quyết định dùng framework tâm lý nào cho từng trạng thái người dùng như thế nào, và làm sao ngăn AI đưa ra lựa chọn tùy tiện?

**Answer:**

Có 3 lớp constraint:

**1. Framework menu trong prompt** — Agent 2 chỉ được chọn từ 8 key cố định:
```python
FRAMEWORK_LIST = "\n".join(
    f"- {key}: {v['name']} — {v['trigger']}"
    for key, v in FRAMEWORK_DESCRIPTIONS.items()
)
```
Mỗi entry có trigger condition rõ ràng (ví dụ: `behavioral_activation: Tê liệt cảm xúc, không muốn làm gì`), giúp AI matching có ngữ nghĩa thay vì đoán.

**2. Hard validation** — nếu AI trả về key không hợp lệ → raise ValueError → retry.

**3. Pattern Alert override** — safety net cuối: nếu detect shame spiral/learned helplessness ở Python layer → force `self_compassion` bất kể AI chọn gì.

---

### Q3.3

**EN:** What model are you using and why? What trade-offs did you consider?

**VI (Dịch):** Bạn đang dùng model nào và tại sao? Bạn đã cân nhắc những trade-off gì?

**Answer:**

Model: **Gemini 3.1 Flash Lite (preview)** qua `google-genai` SDK.

**Lý do chọn:**
- **Latency**: Flash Lite nhanh hơn đáng kể so với Pro. Morning pipeline gọi 3 agent tuần tự — latency nhân 3. Flash Lite giữ tổng thời gian trong ngưỡng chấp nhận được (~3-5s).
- **Cost**: Free tier đủ cho single-user MVP và demo.
- **JSON reliability**: Flash Lite với temperature 0.3 đủ stable cho structured output task.

**Trade-off chấp nhận:**
- Reasoning depth thấp hơn Pro — acceptable vì psychology insight không cần multi-step reasoning phức tạp, chỉ cần pattern matching + framework selection từ menu 8 options.
- "preview" model — có thể thay đổi. Trong production cần pin version cụ thể.

---

## 4. Psychology Framework Engine

---

### Q4.1

**EN:** How does the Task Generator enforce energy-based rules? Why did you implement this in Python rather than relying solely on the prompt?

**VI (Dịch):** Task Generator enforce rule dựa trên energy level như thế nào? Tại sao bạn implement điều này trong Python thay vì chỉ dựa vào prompt?

**Answer:**

Rule engine:
| energy_level | Max tasks | Max time | Difficulty |
|---|---|---|---|
| 1–3 | 1 | 15 min | very_easy |
| 4–6 | 2 | 30 min | easy/medium |
| 7–10 | 3 | 60 min | medium/hard |

**Tại sao Python, không phải prompt-only:**

LLM có thể vi phạm prompt instruction — đặc biệt với constraint số học. Nếu chỉ dùng prompt và LLM trả về 3 task khi energy=2, user nhận được quá nhiều việc → overwhelm → app gây hại thay vì giúp ích.

```python
# task_generator.py — hard enforcement sau khi parse
max_tasks, max_total_min = _get_energy_rules(energy_level)

if len(data["tasks"]) > max_tasks:
    data["tasks"] = data["tasks"][:max_tasks]   # truncate cứng

if total_minutes > max_total_min:
    scale = max_total_min / total_minutes
    for task in data["tasks"]:
        task["estimated_minutes"] = max(1, round(task["estimated_minutes"] * scale))
```

Prompt vẫn có instruction để guide AI generate đúng ngay từ đầu — Python là safety net bắt buộc, không phải thay thế.

---

### Q4.2

**EN:** Explain the Memory Recall feature (9.1). What similarity algorithm did you use and why?

**VI (Dịch):** Giải thích feature Memory Recall (9.1). Bạn dùng thuật toán similarity nào và tại sao?

**Answer:**

Memory Recall tìm ngày trong quá khứ có trạng thái tương đồng với hôm nay — khi user đang khó khăn, hiển thị bằng chứng họ đã vượt qua tình huống tương tự.

**Similarity score** (weighted sum, không phải ML):
```
score = mood_match (0.5) + energy_proximity (0.3) + recency (0.2)
```

- **mood_match (0.5)**: binary — cùng mood_state = 1.0, khác = 0.0. Weight cao nhất vì mood là signal quan trọng nhất.
- **energy_proximity (0.3)**: `1.0 - abs(energy_today - energy_past) / 9.0` — so sánh energy trên thang 1-10.
- **recency (0.2)**: ưu tiên ngày gần hơn nhưng không quá gần (tránh lặp).

**Điều kiện filter trước khi score:**
- `tasks completed > 50%` — chỉ recall ngày user đã thành công
- `no crisis` — không recall ngày có risk_flag
- Yêu cầu ≥14 ngày history để tránh false positive

**Tại sao không dùng embedding similarity:** Overkill cho MVP. Weighted rule-based đủ accurate và 100% explainable — quan trọng cho một app về tâm lý.

---

## 5. Frontend & Design System

---

### Q5.1

**EN:** Explain the "AURA GLOW" design system. How does the mood-reactive background work technically?

**VI (Dịch):** Giải thích design system "AURA GLOW". Background phản ứng theo mood hoạt động như thế nào về mặt kỹ thuật?

**Answer:**

**Kiến trúc:**
1. **CSS Custom Properties** — 5 mood state mỗi cái có set var riêng:
```css
.mood-anxious {
    --mood-color: #b388ff;
    --mood-color-soft: #80cbc4;
    --mood-glow: rgba(179, 136, 255, 0.35);
    --aura-speed: 18s;
    --aura-opacity: 0.58;
}
```

2. **`div.aura-bg`** — fixed, full-screen, z-index 0, 2 radial-gradient blob blur 90-120px animate ngược chiều qua keyframe `auraDrift`. Tốc độ đọc từ `--aura-speed`.

3. **`MoodContext`** — React context giữ `mood` state. `MoodBody` là client component apply class `mood-<state>` lên `<body>`. Khi class đổi → CSS vars cascade xuống mọi component tự động — không cần re-render.

4. **Transition**: `transition: 0.8s ease` trên `.aura-bg` → mood change mượt mà.

**`anxious` mood** có thêm grain SVG overlay + `auraJitter` keyframe (run rẩy nhẹ) để convey uneasy feeling qua texture.

**`prefers-reduced-motion`**: tất cả animation tự disable `animation-duration: 0.01ms` — accessibility built-in.

---

### Q5.2

**EN:** How does the frontend manage state between pages without a state management library like Redux?

**VI (Dịch):** Frontend quản lý state giữa các trang như thế nào mà không dùng thư viện như Redux?

**Answer:**

AURA dùng 3 cơ chế:

**1. Server as source of truth** — mỗi trang fetch dữ liệu từ backend (`GET /api/today`, `GET /api/profile`) khi mount. Không cần sync global state vì backend JSON file là single source of truth.

**2. React Context cho UI state** — `MoodContext` (mood hiện tại) và `ThemeContext` (dark/light) cần persist qua navigation:
```tsx
// layout.tsx
<ThemeProvider>
  <MoodProvider>
    <MoodBody>{children}</MoodBody>
  </MoodProvider>
</ThemeProvider>
```

**3. URL navigation** — flow: `/morning` → `/checklist` → `/evening` → `/dashboard`. State không cần transfer giữa trang vì mỗi trang đọc lại từ API.

Trade-off: mỗi trang có thêm 1 API call khi mount. Acceptable cho single-user local app; nếu scale cần caching layer.

---

## 6. Data Layer & Storage

---

### Q6.1

**EN:** Walk me through the history.json data model and how streaks are calculated.

**VI (Dịch):** Trình bày data model của history.json và cách tính streak.

**Answer:**

`history.json` là dict với key là date string `"YYYY-MM-DD"`:

```json
{
  "2026-04-30": {
    "morning": {
      "mood_state": "anxious",
      "energy_level": 4,
      "tasks": [{"title": "...", "completed": false, "post_emotion": null}]
    },
    "evening": {
      "summary": "...",
      "tomorrow_question": "..."
    },
    "streak_day": 5
  }
}
```

**Streak calculation** (`memory.py`):
- Đếm ngược từ hôm nay, mỗi ngày có morning entry (có check-in) tính là 1 ngày streak
- Nếu miss 1 ngày: dùng **Streak Shield** (nếu có) để bảo vệ streak
- Shield earned: hoàn thành ≥5/7 ngày trong tuần → +1 shield

**Anti-streak metric (Phần 7):** "Days with intention" — đếm số ngày có check-in trong 30 ngày gần nhất. Metric này không phạt việc miss ngày, phù hợp với psychology về habit formation.

---

## 7. Reliability & Error Handling

---

### Q7.1

**EN:** How does the system handle Gemini API failures gracefully?

**VI (Dịch):** Hệ thống xử lý lỗi Gemini API như thế nào?

**Answer:**

Retry logic trong `_gemini.py` với 3 loại lỗi khác nhau:

```python
if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
    wait = _get_retry_delay(exc)   # parse từ error response + 5s buffer
elif "503" in error_str or "UNAVAILABLE" in error_str:
    wait = UNAVAILABLE_BASE_DELAY * (2 ** attempt)  # 2s, 4s, 8s exponential
else:
    wait = 1 + attempt  # 1s, 2s, 3s linear
```

Tổng cộng 4 attempts (1 lần đầu + 3 retry).

**Frontend error handling:**
- Skeleton loading state trong khi chờ API
- `ErrorCard` component khi request fail (không phải JSON dump)
- Backend down → friendly Vietnamese error message

---

### Q7.2

**EN:** How did you test the AURA system? What was your testing strategy?

**VI (Dịch):** Bạn đã test hệ thống AURA như thế nào? Chiến lược test là gì?

**Answer:**

**42 pytest tests** tập trung vào:
- `test_streak_shield.py` — streak + shield logic
- `test_part9.py` — Memory Recall (23 cases), Pattern Alert, Weekly Letter, Bad-Day Rehearsal

**Testing philosophy:**
- Test business logic Python (rule engine, similarity score, pattern detection) — những thứ deterministic và có thể assert
- Không mock Gemini trong unit tests — mock tạo ra false confidence (đây là bài học thực tế từ dự án: LLM output khác mock)
- Integration test thực sự: chạy pipeline với real Gemini API khi cần verify end-to-end

**TypeScript**: `npx tsc --noEmit` — 0 errors trước mỗi commit.

---

## 8. Product & Behavioral Design

---

### Q8.1

**EN:** What is AURA's core differentiator from generic chatbot apps? How does the product design reflect psychological principles?

**VI (Dịch):** Điểm khác biệt cốt lõi của AURA so với chatbot thông thường là gì? Design sản phẩm phản ánh nguyên tắc tâm lý như thế nào?

**Answer:**

**Chatbot thông thường:** reactive, generic, cho lời khuyên giống nhau với mọi người.

**AURA khác biệt ở 3 điểm:**

1. **Pattern recognition, không phải advice** — AURA nhận diện cụ thể user đang ở pattern nào (shame spiral, learned helplessness, analysis paralysis) trước khi đề xuất. Người đang shame spiral cần self_compassion, không cần productivity tips.

2. **Energy-calibrated tasks** — không phải "hôm nay làm 5 việc lớn". Energy 2/10 → 1 task, 15 phút, very_easy. Phù hợp với nghiên cứu về ego depletion và behavioral activation.

3. **User's own words as medicine** — Memory Recall và Bad-Day Rehearsal dùng chính lời của user trong quá khứ, không phải generic quotes. "4 tuần trước bạn cũng anxious như hôm nay và bạn đã hoàn thành 2/3 task" có sức mạnh hơn bất kỳ lời động viên nào.

**Design principles phản ánh tâm lý:**
- **Không shame** khi miss task: "X task chưa xong = data về giới hạn hôm nay, không phải thất bại"
- **Implementation intention** mọi task: "Khi [trigger], tôi sẽ [action] trong [thời gian] tại [địa điểm]" — dựa trên research của Peter Gollwitzer
- **Streak Shield** giảm all-or-nothing thinking về habit
- **Anti-streak metric** ("days with intention") thay streak liên tục — giảm shame khi miss

---

### Q8.2

**EN:** If you were to scale AURA to multi-user, what would be the most critical architectural changes?

**VI (Dịch):** Nếu scale AURA lên multi-user, những thay đổi kiến trúc quan trọng nhất là gì?

**Answer:**

**1. Data layer:** Migration từ JSON files → PostgreSQL. Schema đã được thiết kế (daily_entries, tasks tables) nhưng chưa active. Cần proper migration tooling (Alembic).

**2. Auth:** JWT với proper enforcement trên **mọi** API route — không phải chỉ UI shell. Rate limiting per user.

**3. File storage:** `profile.json` và `history.json` hiện nằm trong container filesystem → không survive restart trên Railway. Cần external storage (S3 cho files, hoặc di chuyển hẳn sang DB).

**4. Agent pipeline:** Hiện chạy sync trong request (blocking). Multi-user cần async queue (Celery + Redis) hoặc background tasks — tránh timeout khi nhiều user gọi pipeline cùng lúc.

**5. Context isolation:** Hiện pipeline đọc từ single profile.json. Multi-user cần user_id trong mọi DB query.

**6. Caching:** Memory Recall và Pattern Alert đọc 7-14 ngày history mỗi request. Cần cache invalidation strategy.

---

### Q8.3

**EN:** What was the most difficult technical problem you solved in this project?

**VI (Dịch):** Vấn đề kỹ thuật khó nhất bạn giải quyết trong dự án này là gì?

**Answer:**

**Vấn đề: LLM không reliable với constraint số học trong prompt.**

Ban đầu tôi chỉ dùng prompt để enforce energy rules ("maximum 1 task if energy ≤ 3"). Trong testing, Gemini vẫn generate 2-3 task với energy thấp — không phải lúc nào cũng, nhưng đủ thường để là vấn đề.

Nếu user energy 2/10 nhận được 3 task → overwhelm → bỏ app. App tâm lý gây overwhelm là anti-pattern nghiêm trọng.

**Giải pháp:** Python validation layer **sau** khi parse Gemini response — hard truncate task list, scale time proportionally. Prompt vẫn guide AI để minimize correction cần thiết, Python đảm bảo correctness tuyệt đối.

Bài học quan trọng: **"Prompt + validate" luôn tốt hơn "prompt only"** với LLM application có safety requirements.

---

*AURA — Built 2026-04 by Huy Nguyen (huynguyen05209@gmail.com)*
*42 tests passing | Next.js 15 + FastAPI + Gemini 3.1 Flash Lite | Deployed on Railway*
