# AURA - Bộ câu hỏi phỏng vấn tổng hợp

> File này được tổng hợp từ các file đã có trong repo: `README.md`, `INTERVIEW.md`, `AURA_7ngay_21session.md`, `docs/plan.md`, `docs/review.md`, `docs/api-spec.md`, `docs/design-system.md`, `docs/VERCEL_DEPLOY.md`, cùng các module chính trong `backend/core`, `backend/agents`, `backend/routers` và test files.
>
> Mục tiêu: giúp trả lời phỏng vấn theo hướng "tôi hiểu sản phẩm, kiến trúc, đánh đổi và hạn chế", không chỉ mô tả tính năng.

---

## Cách dùng nhanh

- Nếu người phỏng vấn hỏi tổng quan: dùng nhóm **1. Sản phẩm & Kiến trúc**.
- Nếu hỏi sâu kỹ thuật: ưu tiên **2. Chuỗi tác vụ AI**, **3. Thiết kế lời nhắc**, **4. Dữ liệu & API**.
- Nếu hỏi về quyết định thiết kế: dùng **5. Đánh đổi & Thiết kế hệ thống**.
- Nếu hỏi về chất lượng dự án: dùng **6. Độ tin cậy, Kiểm thử & Triển khai**.
- Nếu hỏi tư duy hành vi và sản phẩm: dùng **7. Trải nghiệm người dùng & Tâm lý học**.

---

## 1. Sản phẩm & Kiến trúc

### Q1. AURA là gì? Khác gì với trợ lý trò chuyện thông thường?


**Trả lời gợi ý:**

AURA là một trợ lý AI đồng hành đời sống dạng chuỗi tác vụ AI có kiểm soát, không phải trợ lý trò chuyện hội thoại tự do. Điểm khác biệt là AURA không chỉ trả lời lời khuyên chung chung, mà đọc trạng thái người dùng, nhận diện mẫu hành vi/tâm lý, chọn khung can thiệp phù hợp, rồi tạo nhiệm vụ nhỏ vừa sức theo mức năng lượng.

Ví dụ, người đang vòng xoáy tự trách không nên nhận lời khuyên tăng năng suất kiểu "hãy cố gắng hơn"; họ cần tự cảm thông. Người đang trạng thái ì, khó bắt đầu thì cần quy tắc 2 phút hoặc ý định thực hiện. AURA cố gắng chọn đúng "công cụ tâm lý" cho đúng trạng thái.

---

### Q2. Hãy mô tả kiến trúc tổng thể của AURA.


**Trả lời gợi ý:**

AURA gồm giao diện người dùng Next.js 15, máy chủ xử lý FastAPI, lớp tác vụ AI dùng Gemini, và lớp dữ liệu mặc định là JSON file cho bản mẫu một người dùng. Môi trường phát triển cục bộ chạy bằng Docker Compose với 3 service: giao diện người dùng, máy chủ xử lý và Nginx reverse proxy. Môi trường triển khai thật hiện tách giao diện người dùng lên Vercel và máy chủ xử lý FastAPI lên Railway hoặc dịch vụ chạy bền vững tương tự.

Luồng chính:

```text
Người dùng -> Giao diện Next.js -> /api proxy -> FastAPI
FastAPI -> Chuỗi tác vụ AI -> Gemini API
FastAPI -> lưu hồ sơ/lịch sử -> trả JSON có cấu trúc về giao diện
```

Điểm quan trọng là máy chủ xử lý kiểm soát chuỗi xử lý và kiểm chứng. Giao diện không gọi Gemini trực tiếp, không giữ API key, chỉ hiển thị kết quả đã được máy chủ xử lý chuẩn hóa.

**Minh chứng code:**

File: `frontend/lib/api.ts`

```ts
const BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || `${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export function postMorning(
  user_input: string,
  pre_commit?: PreCommitPayload | null,
): Promise<MorningResult> {
  return json<MorningResult>('/api/morning', {
    method: 'POST',
    body: JSON.stringify({ user_input, pre_commit: pre_commit ?? null }),
  })
}
```

File: `frontend/app/api/[...path]/route.ts`

```ts
const API_ORIGIN = process.env.BACKEND_ORIGIN ?? 'http://backend:8000'
const PROXY_TIMEOUT_MS = 180_000

async function proxyRequest(request: Request, params: Promise<{ path: string[] }>) {
  const { path } = await params
  const targetPath = '/api/' + path.join('/')
  const url = new URL(targetPath, API_ORIGIN)
  const reqUrl = new URL(request.url)
  url.search = reqUrl.search

  const res = await fetch(url.toString(), {
    method: request.method,
    headers: request.headers,
    signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    body: request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.text()
      : undefined,
  })

  return new Response(await res.text(), { status: res.status })
}
```

---

### Q3. Tại sao gọi AURA là chuỗi tác vụ AI có kiểm soát chứ không phải một agent duy nhất?


**Trả lời gợi ý:**

Vì mỗi agent có nhiệm vụ hẹp, đầu vào/đầu ra rõ ràng:

1. Wellness Check: phân tích tâm trạng, mức năng lượng và cờ rủi ro.
2. Psychology Insight: chọn khung can thiệp tâm lý.
3. Bộ tạo nhiệm vụ: tạo nhiệm vụ theo luật năng lượng.
4. Phản tư: tổng hợp buổi tối và tạo câu hỏi ngày mai.
5. Thư tổng kết tuần: tổng hợp tuần thành một lá thư cá nhân.

Chuỗi xử lý chạy tuần tự, đầu ra của agent trước là ngữ cảnh có cấu trúc cho agent sau. Cách này dễ gỡ lỗi và dễ kiểm chứng hơn một lời nhắc khổng lồ làm tất cả.

**Minh chứng code:**

File: `backend/core/pipeline.py`

```py
async def run_morning_pipeline(
    user_input: str,
    profile: dict,
    pre_commit: dict | None = None,
) -> dict:
    wellness = await run_wellness_check(user_input, time_of_day="morning")

    if wellness.get("risk_flag"):
        return {
            "type": "crisis",
            "wellness": wellness,
            "message": "AURA nhận thấy bạn đang trải qua điều rất nặng nề. ...",
            "hotlines": CRISIS_HOTLINES,
        }

    pattern_alert = detect_risk_pattern()
    history = get_history_7_days()
    force_framework = pattern_alert.get("recommended_override") if pattern_alert else None

    insight = await run_psychology_insight(
        wellness, profile, history, force_framework=force_framework
    )

    energy = wellness.get("energy_level", 5)
    task_result = await run_task_generator(insight, profile, energy, pre_commit=pre_commit)
```

---

### Q4. Tại sao không để người dùng trò chuyện tự do với AI?


**Trả lời gợi ý:**

Vì mục tiêu sản phẩm không phải là "nói chuyện", mà là giúp người dùng thoát khỏi trạng thái mắc kẹt bằng một vòng lặp hành vi hằng ngày. Trò chuyện tự do dễ sinh lời khuyên chung chung, khó đo lường, khó kiểm soát an toàn và khó tạo dữ liệu có cấu trúc.

AURA dùng luồng làm việc có cấu trúc: điểm danh buổi sáng -> nhiệm vụ -> danh sách việc cần làm -> phản tư buổi tối -> bảng tổng quan. Nhờ đó hệ thống có dữ liệu nhất quán để phát hiện các mẫu như vòng lặp né tránh, cảm giác bất lực học được hoặc vòng xoáy tự trách.

---

## 2. Chuỗi tác vụ AI & Truyền trạng thái

### Q5. Chuỗi xử lý buổi sáng hoạt động như thế nào?


**Trả lời gợi ý:**

Khi người dùng gửi điểm danh buổi sáng, máy chủ xử lý chạy:

```text
Agent 1: Kiểm tra trạng thái
  -> nếu risk_flag = true: dừng chuỗi xử lý và trả hỗ trợ khủng hoảng
  -> nếu bình thường: tiếp tục

Pattern Alert
  -> kiểm tra lịch sử gần đây để có thể ép chọn khung can thiệp

Agent 2: Phân tích tâm lý
  -> chọn khung can thiệp và giải thích mẫu hành vi/tâm lý

Agent 3: Bộ tạo nhiệm vụ
  -> tạo nhiệm vụ dựa trên khung can thiệp + mức năng lượng
```

Kết quả được lưu vào `history.json` hoặc cách lưu trữ tương ứng, rồi giao diện hiển thị tâm trạng, khung can thiệp, phần giải thích và danh sách nhiệm vụ.

**Minh chứng code:**

File: `backend/routers/api.py`

```py
@router.post("/morning")
@limiter.limit("10/minute")
async def morning_checkin(request: Request, req: MorningRequest):
    if not req.user_input.strip():
        raise HTTPException(status_code=400, detail="user_input không được để trống")

    profile = load_profile()
    result = await run_morning_pipeline(req.user_input, profile, pre_commit=pre_commit)

    if result["type"] == "morning":
        morning_data = {
            "user_input": req.user_input,
            "mood_state": result["wellness"]["mood_state"],
            "energy_level": result["wellness"]["energy_level"],
            "pattern": result["insight"]["primary_pattern"],
            "framework": result["insight"]["recommended_framework"],
            "explanation": result["insight"]["explanation_for_user"],
            "tasks": [{**task, "completed": False} for task in result["tasks"]],
        }
        save_morning(morning_data)

    return result
```

---

### Q6. State được truyền giữa các agent như thế nào?


**Trả lời gợi ý:**

Trạng thái được truyền bằng Python `dict` trong phạm vi một yêu cầu, không dùng phiên toàn cục. Agent 1 trả về dữ liệu có cấu trúc gồm `mood_state`, `energy_level`, `risk_flag`, `detected_emotions`. Agent 2 nhận kết quả kiểm tra trạng thái, phần hồ sơ cần dùng và lịch sử 7 ngày. Agent 3 nhận kết quả phân tích tâm lý, hồ sơ người dùng và mức năng lượng.

Để tránh ngữ cảnh quá dài, AURA chỉ đóng gói những dữ liệu cần thiết như `goal`, `context`, `past_attempts`, `support_style`, `daily_anchors`, không gửi toàn bộ object nếu không cần. Lịch sử cũng được giới hạn 7 ngày cho chuỗi phân tích tâm lý.

**Minh chứng code:**

File: `backend/agents/task_generator.py`

```py
framework = insight_result.get("recommended_framework", "behavioral_activation")
anchors = user_profile.get("daily_anchors", [])
past_attempts = user_profile.get("past_attempts", [])
goal = user_profile.get("goal", "")
context = user_profile.get("context", "")
support_style = user_profile.get("support_style", "balanced")

user_content = (
    "## Psychology Insight\n"
    + json.dumps(insight_result, ensure_ascii=False)
    + "\n\n## User Context\n"
    + json.dumps(
        {
            "goal": goal,
            "context": context,
            "past_attempts": past_attempts,
            "support_style": support_style,
            "available_time_minutes": available_time,
        },
        ensure_ascii=False,
    )
)
```

---

### Q7. Làm sao để agent sau không bịa nội dung hoặc hiểu sai ngữ cảnh?


**Trả lời gợi ý:**

AURA dùng nhiều lớp bảo vệ:

- Lời nhắc có khuôn dạng đầu ra rõ ràng.
- Gemini phản hồi được phân tích cú pháp JSON và kiểm tra trường bắt buộc.
- Khung can thiệp phải thuộc danh sách 8 khóa hợp lệ.
- Số lượng nhiệm vụ và tổng thời gian không chỉ dựa vào lời nhắc, mà được Python kiểm tra sau khi phân tích cú pháp.
- Nếu cảnh báo mẫu hành vi đang bật, máy chủ xử lý ghi đè cứng `recommended_framework`, không chỉ nhắc AI.
- Nhiệt độ sinh câu thấp (`0.3`) để đầu ra ổn định hơn.

Thông điệp chính: lời nhắc chỉ là lớp hướng dẫn, máy chủ xử lý kiểm chứng mới là lớp đảm bảo.

**Minh chứng code:**

File: `backend/agents/_gemini.py`

```py
cleaned = _strip_json(raw)
data: dict = json.loads(cleaned)

missing = [f for f in required_fields if f not in data]
if missing:
    raise ValueError(
        f"Missing required fields: {missing}. Raw: {raw[:300]}"
    )

return data
```

File: `backend/agents/task_generator.py`

```py
missing = [f for f in TASK_FIELDS if f not in task]
if missing:
    raise ValueError(f"Task missing fields: {missing}. Task: {task}")
if task.get("difficulty") not in VALID_DIFFICULTIES:
    task["difficulty"] = "easy"
task["estimated_minutes"] = max(1, int(task.get("estimated_minutes", 5)))
```

---

### Q8. Tình huống khủng hoảng được xử lý thế nào?


**Trả lời gợi ý:**

Agent 1 đóng vai trò chốt kiểm soát đầu vào. Nếu `risk_flag = true`, chuỗi xử lý dừng ngay, không chạy bước phân tích tâm lý và không tạo nhiệm vụ. Máy chủ xử lý trả phản hồi khủng hoảng với thông điệp hỗ trợ và đường dây nóng.

Lý do: khi người dùng có dấu hiệu tự làm hại bản thân hoặc khủng hoảng nặng, việc tạo nhiệm vụ tăng năng suất là sai bối cảnh và có thể gây hại. Dừng sớm vừa giảm độ trễ vừa đảm bảo ranh giới an toàn.

**Minh chứng code:**

File: `backend/core/pipeline.py`

```py
wellness = await run_wellness_check(user_input, time_of_day="morning")

if wellness.get("risk_flag"):
    return {
        "type": "crisis",
        "wellness": wellness,
        "message": (
            "AURA nhận thấy bạn đang trải qua điều rất nặng nề. "
            "Bạn không cần phải đối mặt một mình. "
            "Hãy liên hệ ngay với đường dây hỗ trợ bên dưới — "
            "họ ở đây để lắng nghe bạn."
        ),
        "hotlines": CRISIS_HOTLINES,
    }
```

---

### Q9. Chế độ tự động cảnh báo mẫu hành vi là gì?


**Trả lời gợi ý:**

Pattern Alert là lớp luật cố định chạy trước Agent 2. Nó đọc lịch sử gần đây để phát hiện các mẫu hành vi/tâm lý đáng chú ý:

- Vòng xoáy tự trách: nhiều ngày có dấu hiệu tự chỉ trích và tỷ lệ hoàn thành nhiệm vụ thấp.
- Cảm giác bất lực học được: nhiều ngày năng lượng rất thấp và không hoàn thành nhiệm vụ.
- Vòng lặp né tránh: bỏ điểm danh buổi sáng nhiều ngày liên tiếp.

Nếu phát hiện, máy chủ xử lý truyền `force_framework`, thường là `self_compassion`, vào Agent 2 và sau đó ghi đè cứng kết quả. Người dùng vẫn thấy luồng trải nghiệm bình thường, chỉ là AURA tự chuyển sang giọng điệu và khung can thiệp nhẹ nhàng hơn.

**Minh chứng code:**

File: `backend/core/pipeline.py`

```py
pattern_alert = detect_risk_pattern()

force_framework = None
if pattern_alert:
    force_framework = pattern_alert.get("recommended_override")

insight = await run_psychology_insight(
    wellness, profile, history, force_framework=force_framework
)
```

File: `backend/core/pattern_alert.py`

```py
if shame_streak >= 3:
    return {
        "pattern_name": "shame_spiral",
        "severity": "high" if shame_streak >= 5 else "moderate",
        "recommended_override": "self_compassion",
        "consecutive_days": shame_streak,
        "details": (
            f"{shame_streak} ngày liên tục có dấu hiệu tự chỉ trích "
            f"và hoàn thành task dưới 30%."
        ),
    }
```

---

### Q10. Tại sao Pattern Alert dùng luật cố định thay vì AI?


**Trả lời gợi ý:**

Vì đây là tính năng gần với vùng an toàn của người dùng. Logic dựa trên luật cố định dễ dự đoán, nhanh, dễ kiểm thử và dễ giải thích. Nếu dùng LLM để quyết định vòng xoáy tự trách hoặc cảm giác bất lực học được, hệ thống sẽ có thêm độ trễ và thêm rủi ro bịa nội dung.

Với các mẫu có tiêu chí rõ như số ngày liên tiếp, tỷ lệ hoàn thành, ngưỡng năng lượng và từ khóa tự chỉ trích, luật cố định là lựa chọn phù hợp hơn cho bản mẫu.

**Minh chứng code:**

File: `backend/core/pattern_alert.py`

```py
def _task_completion_rate(entry: dict) -> float:
    tasks = entry.get("morning", {}).get("tasks", [])
    if not tasks:
        return 0.0
    done = sum(1 for t in tasks if t.get("completed"))
    return done / len(tasks)

def _has_shame_keywords(entry: dict) -> bool:
    texts = []
    texts.append(entry.get("evening", {}).get("user_input", "").lower())
    texts.append(entry.get("evening", {}).get("summary", "").lower())
    texts.append(entry.get("morning", {}).get("user_input", "").lower())
    combined = " ".join(texts)
    return any(kw in combined for kw in SHAME_KEYWORDS)
```

---

## 3. AI, Thiết kế lời nhắc & Bộ luật xử lý

### Q11. Làm sao đảm bảo Gemini trả JSON hợp lệ?


**Trả lời gợi ý:**

Máy chủ xử lý có helper `call_gemini()` dùng chung cho các agent. Helper này yêu cầu Gemini chỉ trả JSON trong lời nhắc hệ thống, bỏ lớp bọc markdown nếu Gemini bọc JSON trong ```json, phân tích cú pháp bằng `json.loads`, rồi kiểm tra các trường bắt buộc. Nếu lỗi, helper thử lại với thời gian chờ tăng dần.

Ngoài ra model chạy với temperature thấp để giảm độ dao động. Quan trọng nhất là không tin phản hồi thô từ LLM; luôn phân tích cú pháp và kiểm chứng trước khi chuyển qua bước sau.

**Minh chứng code:**

File: `backend/agents/_gemini.py`

```py
config = types.GenerateContentConfig(
    system_instruction=system_prompt,
    temperature=0.3,
)

response = await asyncio.to_thread(
    client.models.generate_content,
    model=model,
    contents=user_content,
    config=config,
)
raw: str = response.text
cleaned = _strip_json(raw)
data: dict = json.loads(cleaned)
```

---

### Q12. Cơ chế thử lại và phương án dự phòng khi Gemini lỗi hoạt động ra sao?


**Trả lời gợi ý:**

`_gemini.py` thử lại tối đa 3 lần sau lần gọi đầu tiên. Với 429 hoặc `RESOURCE_EXHAUSTED`, nó cố đọc thời gian chờ từ lỗi và cộng thêm một khoảng đệm. Với 503 hoặc `UNAVAILABLE`, nó dùng thời gian chờ tăng theo cấp số nhân: 2s, 4s, 8s. Các lỗi khác dùng thời gian chờ tuyến tính.

Ngoài mô hình chính, code có mô hình dự phòng (`GEMINI_FALLBACK_MODEL`) cho lỗi quá tải. Nếu tất cả đều thất bại, máy chủ xử lý trả lỗi 502 dạng "AI pipeline lỗi" để giao diện hiển thị trạng thái báo lỗi.

**Minh chứng code:**

File: `backend/agents/_gemini.py`

```py
def _model_candidates() -> list[str]:
    primary = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL).strip()
    fallback = os.environ.get("GEMINI_FALLBACK_MODEL", DEFAULT_FALLBACK_MODEL).strip()
    return list(dict.fromkeys(m for m in (primary, fallback) if m))

for model in models:
    for attempt in range(MAX_RETRIES + 1):
        try:
            ...
        except Exception as exc:
            if attempt < MAX_RETRIES:
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    wait = _get_retry_delay(exc)
                elif _is_unavailable(exc):
                    wait = UNAVAILABLE_BASE_DELAY * (2 ** attempt)
                else:
                    wait = 1 + attempt
                await asyncio.sleep(wait)
```

---

### Q13. Tại sao chọn Gemini Flash Lite?


**Trả lời gợi ý:**

Vì AURA gọi nhiều agent tuần tự. Nếu mỗi agent chậm, tổng độ trễ của chuỗi xử lý buổi sáng sẽ rất khó chịu. Flash Lite phù hợp cho bản mẫu vì độ trễ thấp, chi phí thấp, và đủ tốt cho đầu ra JSON có cấu trúc khi lời nhắc rõ và nhiệt độ sinh câu thấp.

Đánh đổi là độ sâu suy luận không bằng mô hình Pro, nhưng nhiệm vụ của AURA chủ yếu là phân loại, chọn khung can thiệp từ menu có sẵn và sinh nội dung có ràng buộc, nên Flash Lite đủ hợp lý.

---

### Q14. Bộ tạo nhiệm vụ áp dụng luật theo năng lượng thế nào?


**Trả lời gợi ý:**

Bộ luật xử lý nằm trong Python:

| Mức năng lượng | Số nhiệm vụ tối đa | Tổng thời gian tối đa |
|---|---:|---:|
| 1-3 | 1 | 15 phút |
| 4-6 | 2 | 30 phút |
| 7-10 | 3 | 60 phút |

Sau khi Gemini trả nhiệm vụ, máy chủ xử lý cắt bớt số nhiệm vụ nếu vượt giới hạn, kiểm tra các trường dữ liệu, chuẩn hóa độ khó và giảm `estimated_minutes` nếu tổng thời gian vượt mức tối đa. Đây là ví dụ rõ nhất của nguyên tắc "lời nhắc + kiểm chứng", không chỉ dựa vào lời nhắc.

**Minh chứng code:**

File: `backend/agents/task_generator.py`

```py
def _get_energy_rules(energy: int) -> tuple[int, int]:
    if energy <= 3:
        return 1, 15
    elif energy <= 6:
        return 2, 30
    return 3, 60

max_tasks, max_total_min = _get_energy_rules(energy_level)

if len(data["tasks"]) > max_tasks:
    data["tasks"] = data["tasks"][:max_tasks]

if total_minutes > max_total_min:
    scale = max_total_min / total_minutes
    for task in data["tasks"]:
        task["estimated_minutes"] = max(1, round(task["estimated_minutes"] * scale))
```

---

### Q15. Vì sao ý định thực hiện quan trọng trong nhiệm vụ?


**Trả lời gợi ý:**

Ý định thực hiện biến nhiệm vụ mơ hồ thành câu "Khi X, tôi sẽ làm Y tại Z trong N phút". Nó giảm năng lượng khởi động và giúp người dùng biết chính xác bắt đầu ở đâu. Với người đang mắc kẹt, nhiệm vụ kiểu "làm việc hiệu quả hơn" không giúp ích; nhiệm vụ cần điểm kích hoạt, ngữ cảnh và thời lượng cụ thể.

---

### Q16. 8 khung can thiệp tâm lý gồm những gì?


**Trả lời gợi ý:**

AURA chọn trong 8 khung can thiệp:

| Khung can thiệp | Khi dùng |
|---|---|
| 80/20 Pareto | Quá nhiều việc, cần ưu tiên |
| Kích hoạt hành vi | Tê lì, không muốn làm gì |
| ý định thực hiện | Biết cần làm nhưng không bắt đầu |
| Habit Stacking | Muốn gắn thói quen mới vào lịch |
| Tự cảm thông | Vòng xoáy tự trách, tự chỉ trích |
| Progress Principle | Mất động lực vì không thấy tiến bộ |
| Quy tắc 2 phút | Trạng thái ì, cần bước khởi động nhỏ |
| Nhận thức Dunning-Kruger | Quá tự tin hoặc rơi vào vùng hoang mang |

Agent 2 chọn khung can thiệp dựa trên kết quả kiểm tra trạng thái, hồ sơ người dùng, lịch sử và cảnh báo mẫu hành vi.

---

## 4. Lớp dữ liệu, API & Lưu trữ

### Q17. Vì sao dùng JSON file thay vì cơ sở dữ liệu?


**Trả lời gợi ý:**

Đây là quyết định có chủ đích cho bản mẫu một người dùng. Với một người dùng, chưa có xác thực và chưa có nhiều tài khoản, JSON file giúp thử nghiệm nhanh, dễ tạo dữ liệu demo, dễ kiểm tra trực tiếp trong portfolio và giảm độ phức tạp. `profile.json` và `history.json` đủ cho vòng lặp hằng ngày.

Đánh đổi rất rõ: JSON không phù hợp nhiều người dùng, ghi đồng thời hoặc dữ liệu lớn. Lộ trình v2 là chuyển sang cơ sở dữ liệu có tách biệt dữ liệu theo người dùng, di chuyển dữ liệu và lưu trữ bền vững tốt hơn.

**Minh chứng code:**

File: `backend/core/memory.py`

```py
_PROVIDER = os.environ.get("DATABASE_PROVIDER", "").strip().lower()

if _PROVIDER == "supabase":
    from core.storage import (
        load_profile,
        save_profile,
        get_today_entry,
        save_morning,
        save_evening,
        get_history_7_days,
        get_streak,
        ...
    )
else:
    _DATA_DIR = Path(__file__).parent.parent / "data"
    _PROFILE_PATH = _DATA_DIR / "profile.json"
    _HISTORY_PATH = _DATA_DIR / "history.json"
```

File: `backend/core/memory.py`

```py
def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        content = f.read().strip()
        if not content:
            return {}
        return json.loads(content)

def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
```

---

### Q18. Repo hiện có Supabase/SQLite/JSON, nên giải thích thế nào khi bị hỏi?


**Trả lời gợi ý:**

Cách trả lời tốt là thừa nhận lịch sử quyết định kỹ thuật:

Ban đầu dự án có hướng SQLite/xác thực, sau khi xem lại thì nhận ra lớp đăng nhập mới chỉ là bề mặt, chưa bắt buộc kiểm tra đầy đủ ở API. Nếu giữ lại, nó dễ tạo cảm giác bảo mật giả. Với demo một người dùng, tôi chọn nói rõ rằng đây là bản mẫu dựa trên JSON. Sau đó code có thêm lớp trừu tượng cho lưu trữ để có thể bật Supabase bằng `DATABASE_PROVIDER=supabase`, nhưng mặc định vẫn là JSON.

Điểm cần nhấn mạnh: tôi ưu tiên sự trung thực và kiểm soát phạm vi hơn là giữ một lớp dữ liệu phức tạp nhưng chưa phục vụ đúng sản phẩm.

**Minh chứng code:**

File: `backend/core/storage.py`

```py
_supabase_client: Optional[Client] = None
_current_user_id = "local_user"

def _get_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError(
                "DATABASE_PROVIDER=supabase but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set"
            )
        _supabase_client = create_client(url, key)
    return _supabase_client
```

---

### Q19. `history.json` lưu những gì?


**Trả lời gợi ý:**

`history.json` là dictionary theo khóa ngày `YYYY-MM-DD`. Mỗi ngày có thể có:

- `morning`: nội dung người dùng nhập, `mood_state`, `energy_level`, mẫu hành vi/tâm lý, khung can thiệp, phần giải thích, danh sách nhiệm vụ.
- `evening`: nội dung phản tư của người dùng, tóm tắt, mẫu được phát hiện, câu hỏi cho ngày mai.
- `streak_day`: thông tin về chuỗi ngày duy trì.
- `weekly_letter`: thư tổng kết tuần nếu đã có thư cho Chủ nhật.

Nhiệm vụ có thể có `completed`, `created_at`, `friction`, `first_action_at`, `first_action_delay_minutes`, hoặc `replaced_from` nếu người dùng chọn tạo nhiệm vụ dễ hơn.

**Minh chứng code:**

File: `backend/core/memory.py`

```py
def save_morning(morning_data: dict) -> None:
    today = date.today().isoformat()
    history = _load_history()
    entry = history.setdefault(today, {})
    now_iso = datetime.now().isoformat(timespec="seconds")
    for task in morning_data.get("tasks", []):
        task.setdefault("created_at", now_iso)
    entry["morning"] = morning_data
    entry.setdefault("streak_day", get_streak()["current_streak"] + 1)
    _save_history(history)

def save_evening(evening_data: dict, completed_task_ids: list[int] | None = None) -> None:
    entry["evening"] = evening_data
    if completed_task_ids is not None and "morning" in entry:
        for i, task in enumerate(entry["morning"].get("tasks", [])):
            task["completed"] = i in completed_task_ids
```

---

### Q20. Khiên bảo vệ chuỗi ngày duy trì hoạt động thế nào?


**Trả lời gợi ý:**

Chuỗi ngày duy trì bình thường đếm số ngày liên tiếp có điểm danh buổi sáng. Khiên bảo vệ được trao nếu một tuần có ít nhất 5/7 ngày điểm danh. Khi người dùng bỏ lỡ một ngày, khiên có thể bảo vệ chuỗi ngày duy trì thay vì reset ngay.

Ý nghĩa sản phẩm là giảm tư duy được ăn cả ngã về không. Với ứng dụng tâm lý/hành vi, chuỗi ngày duy trì không nên biến thành công cụ tạo cảm giác xấu hổ.

**Minh chứng code:**

File: `backend/core/memory.py`

```py
def _calculate_shields(history: dict, today: date) -> int:
    shields_earned = 0
    shields_used = 0
    current_monday = today - timedelta(days=today.weekday())
    for w in range(1, 53):
        week_start = current_monday - timedelta(weeks=w)
        if _count_completed_days_in_week(history, week_start) >= 5:
            shields_earned += 1

    return max(shields_earned - shields_used, 0)

def get_streak() -> dict:
    ...
    if shields > 0:
        shields -= 1
        current_streak += 1
        continue
```

---

### Q21. API chính của AURA gồm những endpoint nào?


**Trả lời gợi ý:**

Các endpoint chính:

- `POST /api/onboarding`: lưu hồ sơ người dùng.
- `GET/PUT /api/profile`: đọc/cập nhật hồ sơ người dùng.
- `POST /api/morning`: chạy chuỗi xử lý buổi sáng.
- `POST /api/evening`: chạy agent phản tư buổi tối.
- `GET /api/today`, `/api/history`, `/api/streak`: đọc dữ liệu.
- `POST /api/task/friction`, `/api/task/first-action`, `/api/task/retry-easier`: theo dõi hành vi với nhiệm vụ.
- `GET /api/memory-recall`, `/api/pattern-alert`, `/api/weekly-letter`, `/api/bad-day-message/today`: các tính năng nâng cao.

Router dùng Pydantic request models để kiểm chứng hình dạng dữ liệu đầu vào.

**Minh chứng code:**

File: `backend/routers/api.py`

```py
class MorningRequest(BaseModel):
    user_input: str
    pre_commit: Optional[PreCommitPayload] = None

class EveningRequest(BaseModel):
    user_input: str
    completed_task_ids: list[int] = []

@router.post("/onboarding")
async def onboarding(req: OnboardingRequest): ...

@router.post("/morning")
async def morning_checkin(request: Request, req: MorningRequest): ...

@router.post("/evening")
async def evening_checkin(req: EveningRequest): ...

@router.get("/memory-recall")
async def memory_recall(): ...

@router.get("/weekly-letter")
async def weekly_letter(): ...
```

---

### Q22. Giới hạn tần suất gọi được áp dụng ở đâu?


**Trả lời gợi ý:**

Endpoint `POST /api/morning` có giới hạn `10/minute`, vì đây là endpoint tốn chi phí nhất: nó gọi chuỗi xử lý nhiều agent và Gemini API. Đây là giới hạn cơ bản cho bản mẫu để tránh gọi API dồn dập hoặc vô tình tạo nhiều yêu cầu.

**Minh chứng code:**

File: `backend/routers/api.py`

```py
@router.post("/morning")
@limiter.limit("10/minute")
async def morning_checkin(request: Request, req: MorningRequest):
    """Run morning pipeline (Agent 1→2→3) and save result."""
```

---

## 5. Đánh đổi & Thiết kế hệ thống

### Q23. Quyết định kỹ thuật khó nhất trong dự án là gì?


**Trả lời gợi ý:**

Một quyết định khó là bỏ hoặc không nhấn mạnh lớp đăng nhập khi nó chưa được kiểm tra đầy đủ ở mọi API. Có màn hình đăng nhập/đăng ký nhìn rất "sản phẩm", nhưng nếu API vẫn không yêu cầu token thì đó là cảm giác bảo mật giả. Tôi chọn ghi rõ rằng đây là bản mẫu một người dùng, thay vì để người xem dự án tưởng dữ liệu đã được bảo vệ.

Một quyết định khác là không tin LLM với ràng buộc số học. Ban đầu lời nhắc có thể nói năng lượng thấp thì chỉ tạo một nhiệm vụ, nhưng LLM đôi khi vẫn vi phạm. Tôi chuyển luật quan trọng sang Python để kiểm tra và áp dụng chắc chắn.

---

### Q24. Nếu mở rộng nhiều người dùng, cần thay đổi gì đầu tiên?


**Trả lời gợi ý:**

Ưu tiên:

1. Xác thực thật sự: mọi API route cần biết người dùng hiện tại là ai.
2. Tách biệt dữ liệu: chuyển JSON sang PostgreSQL/Supabase với `user_id` trên mọi truy vấn.
3. Tác vụ nền: chuỗi xử lý Gemini có thể lâu, nên dùng hàng đợi thay vì chặn yêu cầu HTTP.
4. Lưu trữ bền vững: không dựa vào filesystem tạm thời của nền tảng triển khai.
5. Khả năng quan sát hệ thống: ghi nhật ký yêu cầu, độ trễ từng agent, tỷ lệ lỗi.
6. Giới hạn tần suất theo từng người dùng và quản lý bí mật hệ thống trong môi trường thật.

---

### Q25. Tại sao máy chủ xử lý không triển khai trực tiếp lên Vercel?


**Trả lời gợi ý:**

Chuỗi xử lý buổi sáng có nhiều lần gọi Gemini tuần tự, có thể vượt giới hạn thời gian của hàm serverless. Máy chủ FastAPI cũng cần tiến trình chạy bền vững và nơi lưu dữ liệu ổn định hơn. Vercel phù hợp với giao diện Next.js, còn máy chủ xử lý nên triển khai trên Railway/Render/Fly hoặc một dịch vụ container chạy bền vững.

Hiện giao diện người dùng có thể ở Vercel, máy chủ xử lý ở Railway, giao diện người dùng gọi máy chủ xử lý qua lớp chuyển tiếp API hoặc biến môi trường.

**Minh chứng code:**

File: `frontend/app/api/[...path]/route.ts`

```ts
/**
 * Catch-all API proxy route handler.
 *
 * Replaces Next.js rewrites for /api/* so we can control the fetch timeout.
 * The morning pipeline calls 3 Gemini agents sequentially and can take 60-120s,
 * which exceeds the default rewrite proxy timeout (~30s).
 */
const API_ORIGIN = process.env.BACKEND_ORIGIN ?? 'http://backend:8000'
const PROXY_TIMEOUT_MS = 180_000 // 3 minutes
```

---

### Q26. Tại sao dùng Next.js 15 bộ định tuyến App Router?


**Trả lời gợi ý:**

Next.js App Router phù hợp cho giao diện có nhiều tuyến trang rõ ràng: onboarding, morning, checklist, evening, dashboard. Bố cục/provider dùng chung cho giao diện và ngữ cảnh tâm trạng. Route chuyển tiếp API giúp trình duyệt gọi `/api/...` tương đối, còn phía máy chủ sẽ chuyển tiếp sang địa chỉ backend, giảm rắc rối CORS và tránh lộ cấu hình backend không cần thiết.

**Minh chứng code:**

File: `frontend/app/layout.tsx`

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <MoodProvider>
            <MoodBody>
              <div className="aura-bg" />
              {children}
            </MoodBody>
          </MoodProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

File: `frontend/app/api/[...path]/route.ts`

```ts
export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params)
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params)
}
```

---

### Q27. Tại sao dùng FastAPI?


**Trả lời gợi ý:**

FastAPI hợp với chuỗi xử lý bất đồng bộ và kiểm chứng bằng Pydantic. Mỗi agent là một hàm bất đồng bộ, router có request model rõ ràng, tài liệu Swagger tự sinh qua `/docs`. Python cũng tiện cho bộ luật xử lý, lưu trữ JSON và kiểm thử logic nghiệp vụ.

**Minh chứng code:**

File: `backend/main.py`

```py
from fastapi import FastAPI
from routers.api import router as api_router

app = FastAPI(title="AURA API")
app.include_router(api_router)
```

File: `backend/routers/api.py`

```py
class OnboardingRequest(BaseModel):
    name: str
    goal: str
    context: str
    past_attempts: list[str] = []
    daily_anchors: list[str] = []
    chronotype: str = "flexible"
    support_style: str = "balanced"
```

---

## 6. Độ tin cậy, Kiểm thử & Triển khai

### Q28. Bạn kiểm thử AURA như thế nào?


**Trả lời gợi ý:**

Kiểm thử tập trung vào các phần logic nghiệp vụ có kết quả xác định:

- Khiên bảo vệ chuỗi ngày duy trì: nhận khiên, giữ chuỗi ngày khi bỏ lỡ một ngày, và reset khi không có khiên.
- Gợi nhớ ký ức: khoảng cách tâm trạng, kết quả thành công, số ngày lịch sử tối thiểu, bỏ qua dữ liệu hôm nay.
- Cảnh báo mẫu hành vi: vòng xoáy tự trách, cảm giác bất lực học được, vòng lặp né tránh, và kiểm tra trường hợp không nên cảnh báo.
- Thư tổng kết tuần: vòng đời lưu trữ của thư.
- Lời nhắn cho ngày khó: thời gian chờ và thứ tự ưu tiên tin nhắn.

Lý do ưu tiên test phần này: đây là logic có thể khẳng định đúng/sai rõ ràng. Đầu ra của LLM thì khó kiểm thử đơn vị trực tiếp, nên tôi kiểm thử lớp gọi model, lớp kiểm chứng và dùng giả lập khi cần.

**Minh chứng code:**

File: `backend/tests/test_streak_shield.py`

```py
def test_earns_shield_for_5_of_7_days():
    history = {}
    week_start = TODAY - timedelta(days=TODAY.weekday() + 7)
    for i in range(5):
        history[(week_start + timedelta(days=i)).isoformat()] = {"morning": {}}
    assert _calculate_shields(history, TODAY) >= 1

def test_shield_preserves_streak_on_miss(mock_date):
    with patch("core.memory._load_history", return_value=history):
        result = get_streak()
        assert result["current_streak"] >= 1
        assert result["shield_count"] >= 1
```

File: `backend/tests/test_part9.py`

```py
def test_memory_recall_requires_minimum_history(self):
    history = _build_history(days_back=10)
    with patch("core.memory_recall._load_history", return_value=history):
        assert find_similar_past_day("stable", 5) is None

def test_detects_learned_helplessness(self):
    history = {}
    for i in range(5):
        history[(date.today() - timedelta(days=i)).isoformat()] = _make_day(
            mood="numb", energy=2, tasks_done=0, tasks_total=2
        )
    with patch("core.pattern_alert._load_history", return_value=history):
        result = detect_risk_pattern()
        assert result["pattern_name"] == "learned_helplessness"
```

---

### Q29. Phạm vi kiểm thử còn thiếu gì?


**Trả lời gợi ý:**

Còn thiếu kiểm thử đầu cuối toàn luồng bằng Playwright: onboarding -> morning -> checklist -> evening -> dashboard. Giao diện cũng chưa có kiểm thử component. Nếu đưa lên môi trường thật, tôi sẽ thêm kiểm thử tích hợp cho `/api/morning` bằng Gemini client giả lập, kiểm thử cấu hình CORS/proxy, và kiểm thử di chuyển dữ liệu nếu chuyển sang DB.

---

### Q30. Khi Gemini trả lỗi, trải nghiệm người dùng ra sao?


**Trả lời gợi ý:**

Máy chủ xử lý thử lại trước. Nếu vẫn thất bại, API trả lỗi 502 với chi tiết rõ. Giao diện có trạng thái báo lỗi thay vì crash hoặc hiển thị JSON thô. Về cải tiến, tôi muốn thêm chế độ giảm cấp: nếu Agent 2/3 lỗi, hệ thống có thể trả một nhiệm vụ dự phòng rất nhỏ dựa trên luật cố định, hoặc cho người dùng thử lại.

**Minh chứng code:**

File: `backend/routers/api.py`

```py
try:
    result = await run_morning_pipeline(req.user_input, profile, pre_commit=pre_commit)
except ValueError as e:
    raise HTTPException(status_code=502, detail=f"AI pipeline lỗi: {str(e)}")
```

File: `frontend/lib/api.ts`

```ts
if (!res.ok) {
  const msg = await res.text().catch(() => '')
  throw new Error(msg || `${res.status} ${res.statusText}`)
}
```

---

### Q31. Những điểm nghẽn hiệu năng chính là gì?


**Trả lời gợi ý:**

Điểm nghẽn lớn nhất là độ trễ của nhiều lần gọi Gemini tuần tự trong chuỗi xử lý buổi sáng. Bảng tổng quan cũng có thể gọi nhiều API cho nhiều phần khác nhau. Cải tiến có thể gồm:

- chỉ báo tiến trình theo từng bước chuỗi xử lý,
- tải từng phần trong bảng tổng quan khi cần,
- lưu đệm thư tổng kết tuần,
- đưa chuỗi xử lý agent sang tác vụ nền,
- trả kết quả từng phần nếu nền tảng hỗ trợ.

---

### Q32. Bạn sẽ theo dõi AURA trong triển khai thật như thế nào?


**Trả lời gợi ý:**

Tôi sẽ ghi lại độ trễ theo từng agent, tỷ lệ lỗi Gemini, số lần thử lại, tỷ lệ lỗi theo endpoint, số lần `risk_flag`, và phễu hoàn thành nhiệm vụ. Với quyền riêng tư, log không nên lưu văn bản nhạy cảm về sức khỏe tinh thần trừ khi người dùng đồng ý; thay vào đó chỉ lưu siêu dữ liệu như `mood_state`, `energy_level`, khung can thiệp và độ trễ.

---

## 7. Trải nghiệm người dùng, Tâm lý học & Tư duy sản phẩm

### Q33. Hệ thống thiết kế AURA GLOW hoạt động thế nào?


**Trả lời gợi ý:**

AURA GLOW dùng biến CSS và class `mood-<state>` trên thẻ body để đổi màu/tốc độ nền aura theo tâm trạng. `MoodContext` giữ trạng thái tâm trạng, `MoodBody` gắn class lên `<body>`, còn `.aura-bg` dùng các dải màu tròn, hiệu ứng làm mờ và chuyển động. Khi tâm trạng đổi, biến CSS lan xuống toàn ứng dụng mà không cần render lại nhiều component.

Thiết kế này biến tâm trạng thành tín hiệu thị giác: nhiều năng lượng thì màu ấm và chuyển động nhanh hơn, tê lì thì xám và chậm hơn, lo âu thì có texture/rung nhẹ. Có `prefers-reduced-motion` để tôn trọng khả năng tiếp cận.

**Minh chứng code:**

File: `frontend/lib/mood-context.tsx`

```tsx
export function MoodBody({ children }: { children: React.ReactNode }) {
  const { mood } = useMood()

  useEffect(() => {
    const body = document.body
    const allMoods: MoodState[] = ['energized', 'stable', 'anxious', 'overwhelmed', 'numb']
    allMoods.forEach((m) => body.classList.remove(`mood-${m}`))
    body.classList.add(`mood-${mood}`)
  }, [mood])

  return <>{children}</>
}
```

File: `frontend/app/globals.css`

```css
:root,
[data-theme="dark"] {
  --mood-color:      var(--mood-stable);
  --mood-color-soft: var(--mood-stable-soft);
  --mood-glow:       rgba(100, 181, 246, 0.45);
  --aura-speed:      22s;
}

.mood-energized {
  --mood-color:      var(--mood-energized);
  --mood-color-soft: var(--mood-energized-soft);
  --aura-speed:      14s;
}

.mood-numb {
  --mood-color:      var(--mood-numb);
  --mood-color-soft: var(--mood-numb-soft);
  --aura-speed:      48s;
  --aura-blur:       120px;
}
```

---

### Q34. Vì sao có Gợi nhớ ký ức?


**Trả lời gợi ý:**

Gợi nhớ ký ức giúp người dùng thấy bằng chứng từ chính quá khứ của họ. Nếu hôm nay người dùng lo âu, AURA tìm một ngày trước đây có tâm trạng/mức năng lượng tương tự nhưng họ đã vượt qua và hoàn thành hơn 50% nhiệm vụ. Thay vì dùng câu động viên chung chung, AURA dùng lời của chính người dùng trong phần phản tư.

Tâm lý sản phẩm: "Bạn đã từng đi qua trạng thái này" thường thuyết phục hơn lời khuyên chung.

**Minh chứng code:**

File: `backend/core/memory_recall.py`

```py
def _day_has_successful_outcome(entry: dict) -> bool:
    morning = entry.get("morning", {})
    evening = entry.get("evening", {})
    tasks = morning.get("tasks", [])

    if not tasks or not evening:
        return False

    completed = sum(1 for t in tasks if t.get("completed"))
    if completed / len(tasks) <= 0.5:
        return False

    if morning.get("risk_flag"):
        return False

    return True
```

---

### Q35. Gợi nhớ ký ức tính độ tương đồng thế nào?


**Trả lời gợi ý:**

Nó dùng điểm số có trọng số dựa trên luật cố định:

- Độ tương đồng tâm trạng: 0.5.
- Độ tương đồng năng lượng: 0.3.
- Điểm theo độ gần thời gian: 0.2.

Chỉ xét các ngày có kết quả thành công: có phản tư buổi tối, hoàn thành hơn 50% nhiệm vụ, không phải ngày khủng hoảng. Cần ít nhất 14 ngày dữ liệu và điểm số trên ngưỡng mới trả về kết quả phù hợp. Không dùng embedding vì bản mẫu cần dễ giải thích và có kết quả xác định.

**Minh chứng code:**

File: `backend/core/memory_recall.py`

```py
MIN_HISTORY_DAYS = 14
MIN_SIMILARITY_SCORE = 0.7

total_score = (
    mood_score * 0.5
    + energy_score * 0.3
    + recency_score * 0.2
)

if total_score > best_score and total_score >= MIN_SIMILARITY_SCORE:
    best_match = {
        "date": date_str,
        "user_quote": user_quote,
        "tasks_done": tasks_done,
        "tasks_total": len(tasks),
        "days_ago": days_ago,
        "mood": past_mood,
        "energy": past_energy,
        "similarity_score": round(total_score, 3),
    }
```

---

### Q36. Lời nhắn cho ngày khó là gì?


**Trả lời gợi ý:**

Khi người dùng ở trạng thái tốt, AURA gợi ý họ viết trước một câu nhắn cho ngày khó. Khi sau này tâm trạng là quá tải hoặc tê lì, ứng dụng hiển thị chính câu đó. Tin nhắn có thời gian chờ 7 ngày để không xuất hiện quá thường xuyên và ưu tiên tin nhắn chưa từng dùng.

Đây là cách dùng sự hỗ trợ do chính người dùng viết, thay vì lời động viên chung chung.

**Minh chứng code:**

File: `backend/routers/api.py`

```py
@router.get("/bad-day-message/today")
async def get_bad_day_message_today():
    today_entry = get_today_entry()
    morning = today_entry.get("morning", {})
    mood = morning.get("mood_state")

    if mood not in ("overwhelmed", "numb"):
        return {"available": False, "reason": "mood_not_bad", "entry": None}

    entry = get_bad_day_message()
    if not entry:
        return {"available": False, "reason": "no_messages", "entry": None}

    return {"available": True, "reason": None, "entry": entry}
```

---

### Q37. Thư tổng kết tuần giải quyết vấn đề gì?


**Trả lời gợi ý:**

Bảng tổng quan nhiều số liệu có thể khá khô. Thư tổng kết tuần chuyển 7 ngày dữ liệu thành một lá thư cá nhân bằng tiếng Việt, giọng điệu như một người bạn đã quan sát cả tuần. Nó giúp người dùng nhìn lại tiến bộ theo câu chuyện, không chỉ qua biểu đồ.

Về kỹ thuật, Agent 5 nhận lịch sử tuần, hồ sơ người dùng và các mẫu đã phát hiện, rồi trả JSON gồm tiêu đề, nội dung thư và sắc thái giọng viết. Lá thư được lưu đệm vào lịch sử theo ngày Chủ nhật.

**Minh chứng code:**

File: `backend/routers/api.py`

```py
existing = get_weekly_letter(sunday)
if existing:
    return {
        "available": True,
        "reason": None,
        "sunday_date": sunday,
        "letter": existing,
        "archive": get_all_weekly_letters(),
    }

letter = await run_weekly_letter(
    history_7_days=history_week,
    user_profile=profile,
    patterns_detected=patterns if patterns else None,
)

save_weekly_letter(letter, sunday)
```

File: `backend/core/memory.py`

```py
def save_weekly_letter(letter: dict, sunday_date: str | None = None) -> None:
    target = sunday_date or get_most_recent_sunday()
    history = _load_history()
    entry = history.setdefault(target, {})
    letter["generated_at"] = datetime.now().isoformat(timespec="seconds")
    letter["read"] = False
    entry["weekly_letter"] = letter
    _save_history(history)
```

---

### Q38. Vì sao danh sách việc cần làm có ghi nhận điểm vướng và tạo nhiệm vụ dễ hơn?


**Trả lời gợi ý:**

Vì không hoàn thành nhiệm vụ không nên chỉ được hiểu là thất bại. Ghi nhận điểm vướng biến việc bỏ qua thành dữ liệu: mệt, phân tâm, quên, không thấy ý nghĩa. Tạo nhiệm vụ dễ hơn cho phép thay nhiệm vụ quá sức bằng nhiệm vụ nhỏ hơn, giữ người dùng trong vòng lặp hành động thay vì rời ứng dụng.

Đây là quyết định sản phẩm để giảm cảm giác xấu hổ và tăng khả năng quay lại sau khi vấp.

**Minh chứng code:**

File: `backend/routers/api.py`

```py
@router.post("/task/friction")
async def task_friction(req: FrictionRequest):
    if req.reason not in VALID_FRICTION_REASONS:
        raise HTTPException(
            status_code=400,
            detail=f"reason phải là một trong {sorted(VALID_FRICTION_REASONS)}",
        )
    task = log_friction(req.task_index, req.reason, req.note, req.date)
    return {"success": True, "task": task}

@router.post("/task/retry-easier")
async def task_retry_easier(req: RetryEasierRequest):
    original_energy = morning.get("energy_level", 5)
    new_energy = max(1, original_energy - 2)
    result = await run_task_generator(insight, profile, new_energy)
    updated = replace_task(req.task_index, result["tasks"][0], target_date)
    return {"success": True, "task": updated, "new_energy_level": new_energy}
```

File: `backend/core/memory.py`

```py
def log_friction(task_index: int, reason: str, note: str = "", date_str: Optional[str] = None) -> dict:
    task = _get_task(history, date_str, task_index)
    task["friction"] = {
        "reason": reason,
        "note": note,
        "logged_at": datetime.now().isoformat(timespec="seconds"),
    }
    _save_history(history)
    return task
```

---

### Q39. Chỉ số nào quan trọng hơn chỉ số bề nổi trong AURA?


**Trả lời gợi ý:**

Các chỉ số quan trọng:

- Thời gian đến hành động đầu tiên: từ lúc nhiệm vụ được tạo đến lúc người dùng tick lần đầu.
- Tỷ lệ hoàn thành nhiệm vụ theo mức năng lượng.
- Hiệu quả của từng khung can thiệp: khung can thiệp nào giúp người dùng hoàn thành nhiệm vụ tốt hơn.
- Số ngày có chủ đích hành động trong 30 ngày, không chỉ chuỗi ngày duy trì liên tục.
- Khả năng quay lại sau những ngày bỏ lỡ.

Vì AURA là sản phẩm thay đổi hành vi, chỉ số nên đo hành vi bắt đầu và quay lại, không chỉ lượt xem trang.

**Minh chứng code:**

File: `backend/core/memory.py`

```py
def track_time_to_first_action(
    task_index: int,
    date_str: Optional[str] = None,
) -> dict:
    task = _get_task(history, date_str, task_index)

    if "first_action_at" in task:
        return task

    now = datetime.now()
    task["first_action_at"] = now.isoformat(timespec="seconds")

    created_raw = task.get("created_at")
    if created_raw:
        created = datetime.fromisoformat(created_raw)
        delay = max(0, int((now - created).total_seconds() / 60))
        task["first_action_delay_minutes"] = delay
    _save_history(history)
    return task
```

File: `frontend/app/dashboard/page.tsx`

```tsx
if (typeof t.first_action_delay_minutes === 'number') {
  delays.push(t.first_action_delay_minutes)
  dayDelays.push(t.first_action_delay_minutes)
}
```

---

## 8. Bảo mật, An toàn & Đạo đức

### Q40. Dự án có vấn đề bảo mật hoặc quyền riêng tư nào cần nói rõ?


**Trả lời gợi ý:**

Có. Bản mẫu hiện là một người dùng, không nên khẳng định là SaaS bảo mật cho nhiều người dùng. Nếu dùng JSON file/local demo thì dữ liệu nằm ở nơi lưu trữ của máy chủ xử lý, chưa có tách biệt dữ liệu theo người dùng thật sự. Với triển khai thật cho nhiều người dùng, cần bắt buộc xác thực, tách dữ liệu theo từng người dùng trong cơ sở dữ liệu, mã hóa/quản lý bí mật hệ thống, chức năng xóa/xuất dữ liệu, và chính sách không ghi log văn bản nhạy cảm.

Quan trọng là không nói quá. Với ứng dụng liên quan sức khỏe tinh thần, minh bạch về giới hạn quan trọng hơn là làm cho demo trông "đủ tính năng".

---

### Q41. AURA có phải ứng dụng trị liệu không?


**Trả lời gợi ý:**

Không. AURA là công cụ hỗ trợ cá nhân và phản tư hành vi, không thay thế nhà trị liệu hay dịch vụ khủng hoảng. Vì vậy chuỗi xử lý có bước dừng sớm khi phát hiện khủng hoảng và trả đường dây nóng, thay vì cố xử lý bằng AI. Ngôn ngữ trong ứng dụng cũng nên tránh chẩn đoán, chỉ nói về mẫu hành vi hoặc tín hiệu.

---

### Q42. Chèn lệnh vào lời nhắc có đáng lo không?


**Trả lời gợi ý:**

Có, nhưng phạm vi ảnh hưởng được giảm vì nội dung người dùng nhập chỉ đi vào lời nhắc của agent, còn đầu ra bắt buộc phải phân tích cú pháp JSON và có đủ trường bắt buộc. Tuy vậy, nếu triển khai thật, cần gia cố thêm: kiểm chứng schema mạnh hơn, ràng buộc danh sách giá trị cho đầu ra, bộ phân loại kiểm duyệt/an toàn, và không để nội dung người dùng điều khiển chỉ dẫn hệ thống.

**Minh chứng code:**

File: `backend/agents/_gemini.py`

```py
async def call_gemini(
    system_prompt: str,
    user_content: str,
    required_fields: list[str],
) -> dict:
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=0.3,
    )
    ...
    data: dict = json.loads(cleaned)
    missing = [f for f in required_fields if f not in data]
    if missing:
        raise ValueError(f"Missing required fields: {missing}. Raw: {raw[:300]}")
```

---

## 9. Câu hỏi hành vi

### Q43. Bạn học được gì từ dự án này?


**Trả lời gợi ý:**

Ba bài học lớn:

1. Ứng dụng dùng LLM phải có lớp kiểm chứng. Lời nhắc tốt vẫn chưa đủ.
2. Làm quá phức tạp có thể làm demo yếu hơn. JSON cho một người dùng đôi khi tốt hơn cơ sở dữ liệu/xác thực nửa vời.
3. Trải nghiệm lúc chờ tải rất quan trọng với độ trễ của AI. Người dùng cần biết hệ thống đang làm gì.

Ngoài ra, với sản phẩm tâm lý, giọng điệu và an toàn không phải "phần phụ thêm"; chúng là logic cốt lõi của sản phẩm.

---

### Q44. Nếu có thêm 2 tuần, bạn làm gì?


**Trả lời gợi ý:**

Tôi sẽ ưu tiên:

1. Hoàn thiện xác thực + tách biệt dữ liệu theo người dùng bằng Supabase/PostgreSQL.
2. Đưa chuỗi xử lý sang tác vụ nền hoặc API trả tiến trình từng phần.
3. Thêm Playwright E2E cho luồng chính.
4. Bảng tổng quan tải dần từng phần và lưu đệm thư tổng kết tuần.
5. Công cụ quyền riêng tư: xuất/xóa dữ liệu.

Tôi sẽ không thêm tính năng mới trước khi xử lý lưu trữ bền vững, xác thực và độ tin cậy.

---

### Q45. Tính năng nào bạn tự hào nhất?


**Trả lời gợi ý:**

Gợi nhớ ký ức hoặc Cảnh báo mẫu hành vi. Gợi nhớ ký ức hay ở chỗ nó dùng chính lịch sử của người dùng thay vì câu nói truyền động lực chung chung. Cảnh báo mẫu hành vi hay ở chỗ nó âm thầm chuyển khung can thiệp sang tự cảm thông khi phát hiện vòng xoáy tự trách, giúp sản phẩm phản ứng tinh tế hơn mà không làm người dùng thấy bị "dán nhãn".

---

### Q46. Nếu người phỏng vấn chỉ cho 60 giây, giới thiệu ngắn AURA thế nào?


**Trả lời gợi ý:**

AURA là một trợ lý AI đồng hành đời sống cho người đang mắc kẹt hoặc kiệt sức, nhưng nó không hoạt động như một trợ lý trò chuyện chỉ đưa lời khuyên. Mỗi sáng, người dùng viết vài dòng về trạng thái của họ. Máy chủ xử lý chạy một chuỗi xử lý nhiều agent: phân tích tâm trạng/mức năng lượng, kiểm tra khủng hoảng, nhận diện mẫu hành vi/tâm lý, chọn một trong 8 khung can thiệp như Kích hoạt hành vi hoặc Tự cảm thông, rồi tạo nhiệm vụ nhỏ phù hợp với năng lượng hiện tại. Trong ngày người dùng tick nhiệm vụ và ghi nhận điểm vướng; buổi tối agent phản tư tổng hợp lại; cuối tuần AURA viết một lá thư cá nhân từ dữ liệu 7 ngày.

Điểm kỹ thuật chính là mọi đầu ra của LLM đều được phân tích cú pháp JSON, kiểm chứng và áp dụng luật bằng Python, đặc biệt là giới hạn nhiệm vụ theo mức năng lượng. Dự án dùng Next.js, FastAPI, Gemini, Docker, Vercel/Railway, và có test cho các logic quan trọng như khiên bảo vệ chuỗi ngày duy trì, gợi nhớ ký ức, cảnh báo mẫu hành vi và lời nhắn cho ngày khó.

---

## 10. Câu hỏi ngược lại cho người phỏng vấn

Bạn có thể hỏi ngược lại các câu sau:

1. Với sản phẩm AI có yếu tố sức khỏe tinh thần, công ty mình đặt ranh giới an toàn ở mức nào giữa hỗ trợ hành vi và trị liệu?
2. Đội ngũ hiện kiểm chứng đầu ra LLM bằng khuôn dạng/bộ luật xử lý như thế nào?
3. Nếu một tính năng AI có đầu ra "hay" nhưng khó kiểm thử, đội ngũ đánh đổi giữa sáng tạo và độ tin cậy ra sao?
4. Với sản phẩm cần cá nhân hóa, đội ngũ ưu tiên bộ nhớ dài hạn, quyền riêng tư hay độ trễ như thế nào?
5. Nếu mở rộng AURA thành sản phẩm thật, anh/chị sẽ ưu tiên xác thực/tách biệt dữ liệu trước hay trải nghiệm trả kết quả từng phần trước?

---

## 11. Những điểm cần nói thẳng khi phỏng vấn

- AURA hiện nên được trình bày là **bản mẫu một người dùng/demo**, không phải SaaS nhiều người dùng hoàn chỉnh.
- Xác thực từng được xây dựng nhưng vấn đề nằm ở việc chưa bắt buộc kiểm tra đầy đủ; quyết định tốt là không khẳng định bảo mật khi chưa làm xong.
- Lưu trữ JSON là đánh đổi có chủ đích cho demo, không phải lựa chọn triển khai thật lâu dài.
- LLM không được tin tuyệt đối; máy chủ xử lý kiểm chứng và áp dụng các luật quan trọng.
- Các tính năng tâm lý không phải chẩn đoán y tế; chúng là các mẫu hỗ trợ hành vi.
- Lộ trình v2 nên ưu tiên tách biệt dữ liệu theo người dùng, lưu trữ bền vững, tác vụ nền, trả tiến trình từng phần và kiểm thử đầu cuối.

---

## 12. Bản đồ chủ đề cần học từ AURA

Mục này dùng để ôn theo hướng: **feature trong AURA -> khái niệm AI trong repo/cần học -> mức ưu tiên -> code cần quăng vào khi ôn**. Khi học từng dòng, mở file tham chiếu, đọc logic chính, rồi dán đoạn code ngắn nhất chứng minh được ý đó.

| Trong AURA | Trong repo cần học | Mức ưu tiên | File/code nên quăng vào |
|---|---|---|---|
| 5 agent: Wellness, Psychology, Task, Reflection, Weekly Letter | AI Agents, Agentic Systems, Agent Orchestration, State Management | Đỏ | `backend/core/pipeline.py`, `backend/agents/wellness_check.py`, `backend/agents/psychology_insight.py`, `backend/agents/task_generator.py`, `backend/agents/reflection_agent.py`, `backend/agents/weekly_letter.py` |
| Prompt trả JSON, kiểm tra required fields | Prompt Engineering, Structured Output, Output Parsers | Đỏ | `backend/agents/_gemini.py`, các `REQUIRED_FIELDS`/field list trong từng agent |
| Rule energy: 1 task/2 task/3 task | Guardrails, validation, deterministic business rules | Đỏ | `backend/agents/task_generator.py`, test liên quan task/energy nếu có |
| Pattern Alert dùng rule cố định | AI Safety, Guardrails, Human behavior rules | Đỏ | `backend/core/pattern_alert.py`, chỗ gọi `detect_risk_pattern()` trong `backend/core/pipeline.py` |
| JSON storage, Supabase optional | AI System Design, storage trade-off, multi-user scaling | Đỏ | `backend/core/memory.py`, `backend/core/storage.py`, phần config/env nếu có Supabase |
| Gemini lỗi, retry, fallback | LLMOps, fallback strategy, rate limit, latency | Đỏ | `backend/agents/_gemini.py`, biến `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, logic retry |
| Không phải therapy app | AI Safety, Responsible AI, medical/mental health boundary | Đỏ | `backend/core/pipeline.py` nhánh `risk_flag`, `CRISIS_HOTLINES`, text disclaimer/UI nếu có |
| Gợi nhớ ký ức | Agent Memory, episodic memory, personalization | Vàng | `backend/core/memory_recall.py`, route/API hiển thị memory recall |
| RAG, Vector DB, Fine-tuning | Chưa có trực tiếp trong AURA | Vàng/Xám | Ghi chú khi phỏng vấn: AURA hiện dùng rule/history JSON, chưa dùng embedding retrieval, vector DB hoặc fine-tuning |

### Cách học từng chủ đề

Với mỗi dòng ưu tiên **Đỏ**, chuẩn bị 3 phần:

1. **Nói bằng ngôn ngữ sản phẩm:** tính năng đó giải quyết vấn đề gì cho người dùng.
2. **Nói bằng ngôn ngữ kỹ thuật:** nó thuộc khái niệm AI/backend nào.
3. **Chứng minh bằng code:** dán 10-30 dòng code có điều kiện, schema, retry, rule hoặc orchestration.

Ví dụ format ghi chú:

````md
### Chủ đề: Prompt trả JSON + required fields

- Trong AURA: Agent phải trả JSON để backend dùng tiếp, không lấy text tự do.
- Khái niệm cần học: Structured Output, Output Parser, Prompt Engineering.
- Vì sao quan trọng: LLM có thể trả sai format, nên backend phải parse và validate.

Code liên quan:

```py
# Dán đoạn trong backend/agents/_gemini.py:
# - _strip_json(raw)
# - json.loads(cleaned)
# - missing required_fields
```

Trả lời phỏng vấn:
"Em không tin output thô của Gemini. Em ép model trả JSON, rồi backend parse bằng json.loads và kiểm tra required fields. Nếu thiếu field thì raise lỗi/retry, nên agent sau không nhận dữ liệu mơ hồ."
````

### Nói nhanh về các chủ đề chưa có trực tiếp

Nếu bị hỏi về **RAG, Vector DB, Fine-tuning**, không nên nói AURA đã có. Câu trả lời tốt hơn:

"Trong phiên bản này AURA chưa dùng RAG, vector database hay fine-tuning. Em đang dùng lịch sử JSON có cấu trúc, rule-based memory recall và prompt có context ngắn. Nếu mở rộng, RAG/vector DB phù hợp cho truy xuất ký ức dài hạn hoặc tài liệu tâm lý an toàn; fine-tuning chỉ đáng cân nhắc khi đã có nhiều dữ liệu chất lượng và cần ổn định giọng văn/hành vi hơn prompt."

---

## 13. File tham chiếu nên mở khi bị hỏi sâu

| Chủ đề | File nên mở |
|---|---|
| Tổng quan/nghiên cứu tình huống | `README.md` |
| Q&A cũ | `INTERVIEW.md` |
| Kế hoạch polish/phỏng vấn | `AURA_7ngay_21session.md` |
| API | `docs/api-spec.md`, `backend/routers/api.py` |
| Chuỗi xử lý | `backend/core/pipeline.py` |
| Gemini thử lại/kiểm chứng JSON | `backend/agents/_gemini.py` |
| Bộ luật tạo nhiệm vụ | `backend/agents/task_generator.py` |
| Cảnh báo mẫu hành vi | `backend/core/pattern_alert.py` |
| Gợi nhớ ký ức | `backend/core/memory_recall.py` |
| Lớp dữ liệu | `backend/core/memory.py`, `backend/core/storage.py` |
| Hệ thống thiết kế | `docs/design-system.md`, `frontend/app/globals.css` |
| Chuyển tiếp API phía giao diện | `frontend/lib/api.ts`, `frontend/app/api/[...path]/route.ts` |
| Kiểm thử | `backend/tests/test_part9.py`, `backend/tests/test_streak_shield.py` |
| Triển khai | `docs/VERCEL_DEPLOY.md`, `vercel.json`, `docker-compose.yml` |

---

## 14. Checklist ôn phỏng vấn trong 15 phút

1. Nói được giới thiệu ngắn 60 giây.
2. Vẽ được chuỗi xử lý Kiểm tra trạng thái -> Phân tích tâm lý -> Nhiệm vụ -> Phản tư -> Thư tổng kết tuần.
3. Giải thích được "lời nhắc + kiểm chứng" bằng ví dụ luật theo năng lượng.
4. Nói rõ đánh đổi JSON vs DB.
5. Nói rõ xác thực hiện tại là giới hạn/phạm vi của demo, không nói quá.
6. Nhớ 3 tính năng khác biệt: Cảnh báo mẫu hành vi, Gợi nhớ ký ức, Lời nhắn cho ngày khó.
7. Nhớ 3 cải tiến v2: xác thực/tách biệt dữ liệu, tác vụ nền/trả kết quả từng phần, kiểm thử đầu cuối.
