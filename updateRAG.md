# AURA — Update RAG Feature
## Claude Opus 4.6 Implementation Context File

> Đọc file này sau khi đã đọc `CLAUDE.md`.
> Mục tiêu của file này là hướng dẫn agent thêm chức năng **RAG** vào AURA như một **subnav/page mới ở thanh bên trái**, không phá vỡ kiến trúc MVP hiện tại.
> Không bắt đầu code trước khi tóm tắt lại hiểu biết về task, liệt kê file sẽ sửa, và xác định rủi ro chính.

---

## 1. Mục Tiêu Feature

Thêm một page mới tên **RAG** vào frontend AURA, hiển thị trong navigation/subnav bên trái.

Feature này phục vụ mục tiêu học tập và demo portfolio: giúp người dùng thử nghiệm cơ chế **Retrieval-Augmented Generation** trên dữ liệu/tài liệu của AURA hoặc tài liệu do người dùng cung cấp trong phạm vi MVP.

**Ý nghĩa đơn giản:**
- Người dùng đặt câu hỏi.
- Hệ thống tìm các đoạn nội dung liên quan từ nguồn dữ liệu đã có.
- Sau đó LLM trả lời dựa trên các đoạn được tìm thấy.
- Câu trả lời phải cho thấy nó dựa vào context nào, không trả lời kiểu đoán tự do.

**Tên page đề xuất:** `RAG Lab`

**Route đề xuất:** `/rag`

**Vị trí UI:** thêm item `RAG Lab` vào thanh navigation bên trái, cùng nhóm với Morning / Checklist / Evening / Dashboard.

---

## 2. Phạm Vi MVP

### Phải làm trong scope này

- Thêm page frontend `/rag`.
- Thêm navigation item ở sidebar/left nav.
- Tạo UI để người dùng nhập câu hỏi.
- Gọi backend API để gửi câu hỏi.
- Backend nhận câu hỏi, tìm context liên quan, gọi Gemini, trả về câu trả lời có cấu trúc.
- Hiển thị:
  - câu trả lời chính,
  - các source/context chunks đã dùng,
  - trạng thái loading/error,
  - empty state khi chưa hỏi gì.
- Giữ text hiển thị cho user bằng tiếng Việt.
- Không phá vỡ các page hiện có.
- Không thêm auth/multi-user/database nếu không thật sự cần.

### Không làm trong scope này

- Không build full document management system.
- Không thêm login/auth.
- Không migrate toàn bộ storage sang database.
- Không làm multi-user.
- Không làm upload file phức tạp nếu chưa có hạ tầng.
- Không dùng vector database cloud nếu chỉ cần demo MVP.
- Không streaming response.
- Không rewrite kiến trúc pipeline morning/evening/weekly.
- Không sửa design system trừ khi cần component nhỏ cho page RAG.

---

## 3. Định Nghĩa RAG Trong AURA

Trong AURA, RAG không phải là một chatbot tổng quát. RAG là một tính năng phụ để người dùng truy vấn kiến thức/context có sẵn của hệ thống.

RAG flow tối thiểu:

```text
User question
    │
    ▼
Backend /api/rag/query
    │
    ▼
Load knowledge sources
    │
    ▼
Retrieve relevant chunks
    │
    ▼
Build grounded prompt
    │
    ▼
Gemini answer
    │
    ▼
Return structured JSON to frontend
```

Nguyên tắc quan trọng:
- Retrieval trước, generation sau.
- Nếu không tìm thấy context phù hợp, trả lời rõ là không đủ dữ liệu.
- Không để LLM tự bịa nội dung ngoài context.
- Câu trả lời nên có phần `sources` để người dùng thấy hệ thống đã dựa vào gì.

---

## 4. Nguồn Dữ Liệu Cho RAG MVP

Vì AURA hiện là single-user MVP dùng JSON files, hãy ưu tiên nguồn dữ liệu đơn giản, local, dễ kiểm soát.

### Nguồn ưu tiên 1 — AURA internal knowledge

Tạo thư mục:

```text
backend/data/rag_docs/
```

Trong đó có thể chứa các file `.md` hoặc `.txt`, ví dụ:

```text
backend/data/rag_docs/
├── aura_overview.md
├── psychology_frameworks.md
├── product_notes.md
└── interview_notes.md
```

Agent có thể tạo file seed ban đầu nếu chưa tồn tại, nhưng không được đưa dữ liệu giả quá dài hoặc sai.

### Nguồn ưu tiên 2 — history/profile nếu phù hợp

Có thể cho RAG đọc:

```text
backend/data/profile.json
backend/data/history.json
```

Nhưng phải cẩn thận:
- Đây là dữ liệu cá nhân.
- Chỉ dùng trong local single-user MVP.
- Không expose raw JSON quá dài ra UI.
- Khi trả lời, chỉ trích thông tin cần thiết.

### Không dùng trong MVP này

- Không cần Pinecone/Weaviate/Chroma server.
- Không cần Supabase vector ngay.
- Không cần upload PDF nếu chưa có parser ổn định.
- Không cần background indexing phức tạp.

---

## 5. Retrieval Strategy Cho MVP

Vì đây là MVP demo, ưu tiên retrieval đơn giản, deterministic, dễ giải thích khi phỏng vấn.

### Option A — Keyword/BM25-like retrieval đơn giản

Có thể implement bằng Python thuần:

1. Load tất cả `.md`/`.txt` trong `backend/data/rag_docs/`.
2. Chia nội dung thành chunks.
3. Tính điểm relevance dựa trên overlap giữa query terms và chunk terms.
4. Lấy top `k=3` hoặc `k=5` chunks.
5. Đưa chunks vào prompt cho Gemini.

Ưu điểm:
- Không thêm dependency nặng.
- Dễ debug.
- Dễ giải thích với nhà tuyển dụng.
- Phù hợp MVP.

Nhược điểm:
- Không hiểu semantic tốt bằng embedding.

### Option B — Embedding/vector retrieval

Chỉ làm nếu agent thấy project đã có dependency phù hợp và có thời gian an toàn.

Nếu dùng embedding:
- Phải lưu index local rõ ràng.
- Phải có fallback nếu embedding API lỗi.
- Không làm phức tạp deployment.

**Khuyến nghị:** làm Option A trước. Sau khi chạy ổn mới cân nhắc Option B như roadmap.

---

## 6. Backend API Spec

### Endpoint

```http
POST /api/rag/query
```

### Request body

```json
{
  "question": "RAG trong AURA hoạt động như thế nào?"
}
```

### Success response

```json
{
  "answer": "string - câu trả lời tiếng Việt, grounded theo context",
  "sources": [
    {
      "title": "aura_overview.md",
      "chunk_id": "aura_overview.md#chunk-1",
      "preview": "đoạn context ngắn đã dùng",
      "score": 0.82
    }
  ],
  "confidence": "high | medium | low",
  "used_context": true
}
```

### No-context response

```json
{
  "answer": "Mình chưa tìm thấy đủ dữ liệu trong tài liệu hiện có để trả lời chắc chắn câu này.",
  "sources": [],
  "confidence": "low",
  "used_context": false
}
```

### Error response

Dùng format error hiện có của backend nếu project đã có convention. Nếu chưa có, trả lỗi rõ ràng:

```json
{
  "detail": "Question is required"
}
```

---

## 7. Backend Files Dự Kiến

Agent phải inspect project thực tế trước khi tạo file. Danh sách dưới đây là đề xuất theo cấu trúc hiện tại trong `CLAUDE.md`.

### Có thể cần tạo mới

```text
backend/core/rag.py
backend/data/rag_docs/aura_overview.md
backend/data/rag_docs/psychology_frameworks.md
```

### Có thể cần sửa

```text
backend/routers/api.py
backend/agents/_gemini.py
backend/core/prompts.py
backend/requirements.txt
```

### Nguyên tắc backend

- Không đưa logic retrieval vào router quá nhiều.
- Router chỉ validate input và gọi service/core function.
- RAG logic nên nằm trong `backend/core/rag.py`.
- Prompt tạo answer nên nằm trong `backend/core/prompts.py` nếu project đang gom prompt ở đó.
- Gemini call dùng helper hiện có trong `backend/agents/_gemini.py`.
- Output từ Gemini phải được parse/validate trước khi trả về frontend.

---

## 8. Backend Implementation Design

### Hàm đề xuất trong `backend/core/rag.py`

```python
def load_rag_documents() -> list[dict]:
    """Load markdown/txt docs from backend/data/rag_docs."""


def chunk_document(title: str, text: str, chunk_size: int = 800, overlap: int = 120) -> list[dict]:
    """Split document into small chunks for retrieval."""


def retrieve_relevant_chunks(question: str, top_k: int = 5) -> list[dict]:
    """Return top relevant chunks using simple lexical scoring."""


def run_rag_query(question: str) -> dict:
    """Retrieve context, call Gemini, validate response, return structured answer."""
```

### Simple scoring rule

Có thể dùng rule đơn giản:

- Normalize lowercase.
- Remove punctuation.
- Split terms.
- Ignore very short terms.
- Score chunk bằng số lượng query terms xuất hiện trong chunk.
- Có thể boost nếu term xuất hiện trong title.

Không cần over-engineer. Mục tiêu là demo được flow RAG.

### Prompt rule

Prompt gửi Gemini phải có yêu cầu:

- Trả lời bằng tiếng Việt.
- Chỉ dựa trên context được cung cấp.
- Nếu context không đủ, nói không đủ dữ liệu.
- Không bịa source.
- Trả JSON hợp lệ.

Output schema mong muốn:

```json
{
  "answer": "string",
  "confidence": "high | medium | low"
}
```

Backend sẽ tự attach `sources` từ retrieval result, không để LLM tự tạo source.

---

## 9. Frontend UI Spec

### Route

```text
frontend/app/rag/page.tsx
```

### Navigation

Tìm component navigation hiện có, có thể là:

```text
frontend/components/Navigation.tsx
```

Thêm item:

```text
RAG Lab → /rag
```

Icon tùy chọn, nhưng không cần thêm dependency mới nếu chưa có.

### UI page cần có

Page `/rag` nên có các phần:

1. Header:
   - Title: `RAG Lab`
   - Subtitle: `Hỏi thử AURA dựa trên tài liệu và dữ liệu nội bộ của MVP.`

2. Input card:
   - Textarea/input cho câu hỏi.
   - Button `Hỏi AURA`.
   - Disable button khi câu hỏi rỗng hoặc đang loading.

3. Answer card:
   - Hiển thị câu trả lời.
   - Hiển thị confidence.

4. Sources card:
   - Danh sách context chunks đã dùng.
   - Mỗi source có title + preview.
   - Nếu không có source, hiển thị no-context state.

5. Error state:
   - Hiển thị lỗi gọn, không stack trace.

### Visual style

Tuân thủ AURA GLOW từ `CLAUDE.md`:

- Dùng glass card nếu đã có class `.glass-card`.
- Text tiếng Việt.
- Không dùng emoji trong UI.
- Không phá dark/light mode.
- Không hardcode màu nếu project đã có CSS variables.
- Layout max-width tương tự các page khác.

---

## 10. Frontend API Client

Nếu project có:

```text
frontend/lib/api.ts
```

thì thêm function:

```typescript
export async function queryRag(question: string): Promise<RagResponse> {
  // POST /api/rag/query
}
```

Types có thể thêm vào:

```text
frontend/lib/types.ts
```

Type đề xuất:

```typescript
export type RagSource = {
  title: string;
  chunk_id: string;
  preview: string;
  score: number;
};

export type RagResponse = {
  answer: string;
  sources: RagSource[];
  confidence: "high" | "medium" | "low";
  used_context: boolean;
};
```

---

## 11. Acceptance Criteria

Feature được xem là hoàn tất khi:

- Sidebar/left navigation có item `RAG Lab`.
- Click `RAG Lab` mở page `/rag`.
- Page `/rag` render không lỗi.
- Người dùng nhập câu hỏi và submit được.
- Frontend gọi đúng backend endpoint.
- Backend trả về answer có cấu trúc.
- Nếu có context phù hợp, UI hiển thị answer + sources.
- Nếu không có context phù hợp, UI hiển thị thông báo không đủ dữ liệu.
- Không làm hỏng Morning / Checklist / Evening / Dashboard.
- Không hardcode localhost trong frontend.
- Không commit API key hoặc secret.
- Build/test/lint liên quan pass hoặc lỗi pre-existing được ghi rõ.

---

## 12. Verification Commands

Agent phải inspect `package.json`, `requirements.txt`, và tài liệu hiện có để xác định command chính xác. Không đoán bừa nếu command khác thực tế.

Các command dự kiến:

### Backend

```bash
cd backend
python -m pytest
```

Nếu không có pytest hoặc test chưa setup:

```bash
cd backend
python -m py_compile core/rag.py routers/api.py
```

Chạy server local nếu phù hợp:

```bash
cd backend
uvicorn main:app --reload
```

Test endpoint thủ công:

```bash
curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question":"AURA là gì?"}'
```

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

Nếu có typecheck riêng:

```bash
cd frontend
npm run typecheck
```

### Docker nếu cần verify full stack

```bash
docker compose up --build
```

---

## 13. Quy Trình Làm Việc Cho Agent

Làm theo loop này, không nhảy bước:

1. Đọc `CLAUDE.md`.
2. Đọc `updateRAG.md`.
3. Inspect folder structure thực tế.
4. Tìm navigation component hiện tại.
5. Tìm API router hiện tại.
6. Tìm Gemini helper hiện tại.
7. Tìm frontend API client/types hiện tại.
8. Lập danh sách file sẽ sửa/tạo.
9. Implement backend RAG core nhỏ nhất.
10. Implement API endpoint.
11. Implement frontend type + API client.
12. Implement `/rag` page.
13. Thêm nav item.
14. Chạy verification backend.
15. Chạy verification frontend.
16. Fix lỗi nếu có.
17. Cập nhật progress vào file plan/session summary nếu project đang dùng.
18. Báo cáo cuối cùng: file changed, commands run, pass/fail, remaining risks.

---

## 14. Guardrails

### Không được làm

- Không rewrite toàn bộ app.
- Không thêm auth.
- Không thêm database chỉ để làm RAG MVP.
- Không thêm vector DB cloud.
- Không thay đổi flow morning/evening/weekly nếu không cần.
- Không đổi design system.
- Không đổi deployment architecture.
- Không thêm dependency nặng nếu lexical retrieval đủ.
- Không để Gemini tự tạo source giả.
- Không trả raw stack trace ra UI.
- Không hardcode API URL.

### Phải làm

- Giữ code nhỏ, dễ đọc.
- Tách retrieval logic khỏi router.
- Validate input question.
- Validate output từ Gemini.
- Có fallback khi không có context.
- UI có loading/error/empty state.
- Text user-facing bằng tiếng Việt.
- Code/comments/variable names bằng tiếng Anh.
- Ghi rõ rủi ro còn lại nếu chưa hoàn hảo.

---

## 15. Suggested Minimal File Changes

Nếu project đúng như `CLAUDE.md`, implementation tối thiểu có thể gồm:

```text
CREATE backend/core/rag.py
CREATE backend/data/rag_docs/aura_overview.md
CREATE backend/data/rag_docs/psychology_frameworks.md
MODIFY backend/routers/api.py
MODIFY backend/core/prompts.py
MODIFY frontend/lib/types.ts
MODIFY frontend/lib/api.ts
CREATE frontend/app/rag/page.tsx
MODIFY frontend/components/Navigation.tsx
```

Nếu file thực tế khác, agent phải thích nghi theo project thực tế, không ép theo danh sách này.

---

## 16. Seed Documents Đề Xuất

Nếu chưa có tài liệu RAG, tạo seed docs ngắn, đúng sự thật, dễ test.

### `backend/data/rag_docs/aura_overview.md`

Nội dung nên bao gồm:

- AURA là AI life coach cá nhân hóa.
- AURA không phải chatbot motivational.
- AURA dùng multi-agent pipeline.
- Morning pipeline gồm wellness check, psychology insight, task generator.
- Evening reflection lưu lại dữ liệu.
- Weekly letter tổng kết 7 ngày.
- MVP hiện là single-user, JSON storage.

### `backend/data/rag_docs/psychology_frameworks.md`

Nội dung nên bao gồm 8 framework:

- 80/20 Pareto
- Behavioral Activation
- Implementation Intention
- Habit Stacking
- Self Compassion
- Progress Principle
- Two Minute Rule
- Dunning-Kruger

Không viết nội dung y khoa/therapy quá mạnh. AURA là coaching/support tool, không phải medical/therapy product.

---

## 17. Manual Test Scenarios

Sau khi implement, test ít nhất các case sau:

### Case 1 — Câu hỏi có context

Question:

```text
AURA khác chatbot motivational ở điểm nào?
```

Expected:

- Có answer tiếng Việt.
- Có sources.
- Confidence high hoặc medium.
- used_context true.

### Case 2 — Câu hỏi về framework

Question:

```text
Implementation Intention dùng khi nào?
```

Expected:

- Trả lời dựa trên psychology framework doc.
- Có source từ `psychology_frameworks.md`.

### Case 3 — Câu hỏi không có context

Question:

```text
Giá cổ phiếu NVIDIA hôm nay là bao nhiêu?
```

Expected:

- Không bịa.
- Nói không đủ dữ liệu trong tài liệu hiện có.
- sources rỗng hoặc rất thấp.
- confidence low.
- used_context false.

### Case 4 — Empty input

Question rỗng hoặc toàn khoảng trắng.

Expected:

- Frontend không submit hoặc backend trả 400.
- UI hiển thị lỗi dễ hiểu.

---

## 18. Interview Explanation Notes

Sau khi làm xong, user có thể giải thích feature này trong phỏng vấn như sau:

> I added a RAG Lab page to AURA as a learning and demo feature. The goal is to let users ask questions based on AURA's internal documents instead of asking the LLM to answer from general memory. The backend first retrieves relevant chunks from local markdown documents, then builds a grounded prompt for Gemini. If no relevant context is found, the system returns a low-confidence answer instead of hallucinating. For the MVP, I used a simple lexical retriever because it is deterministic, easy to debug, and enough to demonstrate the RAG pipeline before moving to vector embeddings later.

Bản tiếng Việt:

> Em thêm một page RAG Lab vào AURA để demo cách hệ thống trả lời dựa trên tài liệu nội bộ thay vì để LLM tự trả lời theo trí nhớ chung. Backend sẽ tìm các đoạn tài liệu liên quan trước, sau đó đưa context đó vào prompt cho Gemini. Nếu không tìm thấy context phù hợp, hệ thống sẽ nói rõ là không đủ dữ liệu thay vì bịa. Với MVP, em dùng lexical retrieval đơn giản vì dễ debug, dễ giải thích, và đủ để chứng minh flow RAG trước khi nâng cấp lên embedding/vector database sau.

---

## 19. Final Report Format Cho Agent

Khi hoàn thành, agent phải trả lời theo format:

```text
Completed:
- ...

Changed files:
- ...

Verification:
- command: ...
  result: pass/fail
- command: ...
  result: pass/fail

Remaining risks:
- ...

How to test manually:
- ...
```

Không báo “done” chung chung nếu chưa chạy verification.
