# AURA — Artificial Understanding & Resolving Assistant

> Pipeline tâm lý học hành vi: phân tích trạng thái → chọn framework can thiệp → tạo task vừa sức — mỗi ngày một lần, không phán xét.

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat&logo=nextdotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-4285F4?style=flat&logo=google&logoColor=white)
![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=flat&logo=docker&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

---

## 1. Vấn Đề

Người ở giai đoạn 20–35 tuổi khi burnout hoặc stuck thường biết mình cần làm gì — nhưng không làm được. Không phải thiếu thông tin, mà là sai framework tâm lý cho đúng thời điểm.

Chatbot thông thường trả lời giống nhau bất kể người dùng đang kiệt sức hay bình thường — "Hãy lập kế hoạch!", "Hãy chia nhỏ mục tiêu!" — không phân biệt learned helplessness với inertia, shame spiral với procrastination đơn thuần.

AURA không khuyên bảo. AURA đọc trạng thái, nhận diện pattern, rồi chọn đúng công cụ can thiệp — như một therapist biết hôm nay bạn cần gì khác hôm qua.

---

## 2. Giải Pháp: Agentic Pipeline, Không Phải Chatbot

AURA là một pipeline 5 agent chạy tuần tự. Mỗi agent có một nhiệm vụ độc lập, output của agent trước là input của agent sau. Không có hội thoại tự do — chỉ có structured reasoning.

### Luồng buổi sáng (4 agent)

```
┌─────────────────────────────────────────────────────────┐
│                     USER INPUT                          │
│          "Hôm nay tôi cảm thấy..." (free text)         │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
          ┌─────────────────────────┐
          │   Agent 1: Wellness     │
          │   Check                 │
          │                         │
          │  → mood_state           │
          │  → energy_level (1-10)  │
          │  → risk_flag            │
          └──────────┬──────────────┘
                     │
          risk_flag? ├──YES──► Crisis Support Mode
                     │         (dừng pipeline, hiện
                     │          đường dây hỗ trợ)
                     │NO
                     ▼
          ┌─────────────────────────┐
          │   Agent 2: Psychology   │
          │   Insight               │
          │                         │
          │  Pattern Alert check:   │
          │  shame spiral /         │
          │  learned helplessness / │
          │  avoidance loop         │
          │                         │
          │  → framework (1/8)      │
          │  → explanation (VI)     │
          └──────────┬──────────────┘
                     │
                     ▼
          ┌─────────────────────────┐
          │   Agent 3: Task         │
          │   Generator             │
          │                         │
          │  Rule engine (Python):  │
          │  energy 1-3 → 1 task    │
          │  energy 4-6 → 2 tasks   │
          │  energy 7-10 → 3 tasks  │
          │                         │
          │  → tasks[] với          │
          │    Implementation       │
          │    Intention            │
          └──────────┬──────────────┘
                     │
                     ▼
          ┌─────────────────────────┐
          │  Lưu history.json       │
          │  + Hiển thị UI          │
          └─────────────────────────┘
```

### Luồng buổi tối (Agent 4) + Hàng tuần (Agent 5)

```
Buổi tối:  user_reflection + completed_tasks
               → Agent 4: Reflection
               → summary + pattern_detected + tomorrow_question
               → Cập nhật history.json

Chủ nhật:  history_7_days + profile + patterns
               → Agent 5: Weekly Letter
               → Thư cá nhân 200-400 từ (tiếng Việt)
               → Lưu vào history[sunday].weekly_letter
```

---

## 3. Psychology Framework Engine

Agent 2 chọn 1 trong 8 framework dựa trên trigger condition được phát hiện từ input và lịch sử pattern:

| Framework | Trigger condition |
|-----------|------------------|
| **80/20 Pareto** | Quá nhiều việc, không biết ưu tiên — overwhelmed by volume |
| **Behavioral Activation** | Numb, không muốn làm gì, đang chờ cảm hứng xuất hiện |
| **Implementation Intention** | Biết cần làm gì nhưng hay quên hoặc trì hoãn thực thi |
| **Habit Stacking** | Muốn thói quen mới nhưng không tìm được chỗ trong lịch |
| **Self-Compassion** | Shame spiral, miss nhiều ngày liên tiếp, tự chỉ trích nặng |
| **Progress Principle** | Mất motivation, không nhìn thấy mình đang tiến lên |
| **2-Minute Rule** | Inertia — biết rõ việc cần làm nhưng không bắt đầu được |
| **Dunning-Kruger Awareness** | Valley of despair (muốn bỏ cuộc) hoặc overconfidence |

Framework không phải gợi ý — là quyết định của Agent 2 dựa trên pattern thực tế, có thể bị override bởi Pattern Alert engine nếu phát hiện shame spiral hoặc learned helplessness lặp lại ≥ 3 ngày liên tiếp.

---

## 4. Task Generation Rule Engine

Agent 3 không được tin tưởng hoàn toàn — LLM có thể vi phạm prompt rules. Rule engine được enforce ở Python code (validate sau khi parse JSON từ Gemini):

| energy_level | Số task tối đa | Thời gian tối đa | Độ khó cho phép |
|:---:|:---:|:---:|:---|
| 1 – 3 | 1 task | 15 phút | `very_easy` only |
| 4 – 6 | 2 tasks | 30 phút tổng | `easy` hoặc `medium` |
| 7 – 10 | 3 tasks | 60 phút tổng | `medium` hoặc `hard` |

Nếu `past_attempts` trong profile có pattern bỏ cuộc với một loại task cụ thể: tránh lặp lại, chọn approach khác.

Mỗi task kèm **Implementation Intention**: "Khi [trigger], tôi sẽ [action] tại [location] trong [duration]." — giúp giảm activation energy và tăng follow-through rate.

---

## 5. Quyết Định Kỹ Thuật

### Tại sao Next.js 15 App Router?

Server Components giúp giữ API key và data fetch ở server. App Router cho phép nested layout — `MoodBody` client component apply class `mood-<state>` lên `<body>` để CSS variables của design system hoạt động mà không cần re-render toàn bộ cây component.

### Tại sao FastAPI?

Async-native và tích hợp tốt với Google Genai SDK. Pipeline 4 agent chạy tuần tự — mỗi agent là một async function call, dễ test độc lập. Pydantic models enforce output schema của từng agent trước khi truyền sang agent tiếp theo.

### Tại sao Gemini 2.5 Flash Lite?

Latency thấp (~1-2s/agent) và giá phù hợp cho MVP demo. Quan trọng hơn: model đủ mạnh để follow JSON schema nghiêm ngặt với temperature thấp, điều kiện tiên quyết để rule engine Python phía sau không bị bể.

### Tại sao JSON files thay vì SQLite?

Single-user MVP — không có auth, không có multi-user. `profile.json` và `history.json` đủ cho mọi operation cần thiết. SQLite schema đã được thiết kế (accounts, users, daily_entries, tasks) nhưng không được sử dụng — giữ lại SQLite thêm độ phức tạp mà không thêm giá trị cho demo portfolio.

Đây là quyết định có chủ đích, không phải thiếu sót kỹ thuật. Multi-user + auth là Roadmap v2.

### Tại sao không có auth?

Auth được build ở Phần 10 rồi bị remove. Lý do: JWT middleware không được enforce trên API routes trong single-user context = ảo giác bảo mật. Nguy hiểm hơn là không có auth, vì người đọc code có thể tin rằng hệ thống đã được bảo vệ khi thực ra không. Tốt hơn là thành thật: đây là local tool chạy trên máy cá nhân.

---

## 6. Chạy Locally

**Prerequisites:** Docker Desktop đang chạy, Git.

```bash
# 1. Clone và vào thư mục
git clone https://github.com/Himerzt/aura.git
cd aura

# 2. Tạo file .env từ template
cp .env.example .env
# Mở .env, điền GEMINI_API_KEY
# Lấy tại: https://aistudio.google.com/apikey

# 3. Khởi động toàn bộ stack
docker-compose up --build
```

Mở trình duyệt tại **http://localhost** — Nginx reverse proxy tự route `/api/*` → FastAPI `:8000` và `/*` → Next.js `:3000`.

Lần đầu chạy sẽ mất 2–3 phút để build image. Lần sau: `docker-compose up` (không cần `--build`).

**Seed dữ liệu demo (tuỳ chọn):**

```bash
# Tạo 10 ngày lịch sử mẫu để xem Dashboard ngay
docker-compose exec backend python scripts/seed_demo.py
```

---

## 7. Screenshots

> Sẽ thêm sau khi chụp màn hình thực tế.

| Màn hình | Mô tả |
|----------|-------|
| Onboarding | 5 bước intake profile |
| Morning pipeline | Input → kết quả 4 agent |
| Checklist | Task tracking với friction data |
| Evening reflection | Câu hỏi gợi ý + IF-THEN |
| Dashboard | Streak + weekly letter + pattern history |

---

## 8. Lessons Learned

**1. Subagent review phát hiện vấn đề mà người viết code bỏ qua.**

Auth shell (login/register routes) được build ở Phần 10 nhưng không enforce trên API — subagent review chạy độc lập không có context của người viết, nên nó đọc code theo đúng nghĩa đen và báo ngay: "JWT middleware tồn tại nhưng không được mount." Người viết code biết mình chưa wire up, nên không thấy đó là vấn đề. Reviewer không biết điều đó, nên thấy đúng vấn đề. Lesson: review process có giá trị nhất khi reviewer không có context.

**2. Over-engineering data layer là rủi ro thực, không phải lý thuyết.**

SQLite schema với 4 bảng (accounts, users, daily_entries, tasks) được thiết kế kỹ — FK constraints, indexes, migration plan. Nhưng khi nhìn lại: ứng dụng chỉ có 1 user, không có auth, không có concurrent writes. Schema phức tạp hơn mức cần thiết 10 lần. Quyết định remove và dùng 2 JSON files giúp giảm 200 dòng code, bỏ được 1 dependency (SQLAlchemy), và không mất feature nào. Lesson: data layer phù hợp với số user thực tế, không phải số user tưởng tượng.

**3. Loading UX tốt có impact cao hơn thêm feature mới.**

Pipeline 4 agent mất 8–15 giây. Ban đầu: màn hình trắng + spinner đơn giản. Sau khi thêm progress indicator 3 bước ("Đang phân tích tâm trạng... → Đang chọn framework... → Đang tạo kế hoạch..."), cảm giác chờ đợi khác hoàn toàn — người dùng biết hệ thống đang làm gì, không phải bị treo. Lesson: perceived performance quan trọng như actual performance, đặc biệt khi có AI latency không thể tránh.

**4. Tiếng Việt trong AI prompt cần test kỹ hơn tiếng Anh.**

Gemini đôi khi trộn lẫn tiếng Anh vào response tiếng Việt, đặc biệt với thuật ngữ tâm lý học. Phải explicit trong prompt: "Trả lời hoàn toàn bằng tiếng Việt. Không dùng tiếng Anh kể cả với thuật ngữ chuyên ngành — dịch hoặc giải thích bằng tiếng Việt." Và validate output sau khi parse JSON.

---

## 9. Known Limitations

**Single-user, local only.**
Không có auth, không có account system. Dữ liệu lưu trong `backend/data/` — nếu xoá container mà không mount volume, dữ liệu mất. Đây là local tool cho một người dùng trên một máy.

**Không có real-time streaming.**
Pipeline 4 agent chạy tuần tự và trả về kết quả một lần sau khi xong hết. Không có streaming từng token — người dùng chờ 8–15 giây rồi thấy toàn bộ kết quả. Gemini SDK hỗ trợ streaming nhưng chưa được implement.

**Framework selection phụ thuộc vào LLM.**
Pattern Alert engine có thể override framework, nhưng lần đầu trong ngày Agent 2 vẫn dựa vào Gemini reasoning. Với input ngắn hoặc mơ hồ, framework được chọn có thể không phải optimal.

**Không có notification.**
Không có reminder buổi sáng/tối. Người dùng phải tự nhớ mở app.

**Dữ liệu không được backup tự động.**
`history.json` có thể lớn theo thời gian nhưng không có rotation hay compression.

---

## 10. Roadmap v2

Những gì sẽ được build nếu AURA chuyển từ personal tool sang product:

| Feature | Lý do |
|---------|-------|
| **Auth + multi-user** | Mỗi user có profile và history riêng |
| **SQLite migration** | Schema đã thiết kế sẵn, migration path rõ ràng |
| **Streaming response** | Giảm perceived latency từ 10s → hiển thị từng phần |
| **Push notification** | Reminder buổi sáng/tối theo chronotype của user |
| **Export PDF/CSV** | Weekly report để chia sẻ với therapist hoặc coach |
| **Pattern analytics** | Dashboard dài hạn — framework nào hiệu quả nhất với user này |
| **Voice input** | Gõ buổi sáng khi chưa tỉnh ngủ là friction không cần thiết |

---

*Built as a portfolio project — solo, 10 parts, ~3 tuần. Stack: Next.js 15 + FastAPI + Gemini + Docker.*
