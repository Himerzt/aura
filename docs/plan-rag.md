# AURA — RAG Lab Plan (Polishing Phase)
## Target: 3 sessions × 1 hour, 1 day

> Đọc `CLAUDE.md` và `updateRAG.md` trước khi bắt đầu.
> File này là kế hoạch chi tiết, không phải hướng dẫn implementation.

---

## 1. Tổng Quan

**Feature:** RAG Lab page (`/rag`)
**Mục tiêu:** Cho user hỏi thử AURA dựa trên tài liệu nội bộ (lexical retrieval + Gemini).
**Thời gian:** 3 sessions × 1 giờ trong 1 ngày.
**Scope:** Không phá vỡ MVP hiện tại, không thêm auth/database/vector DB.

---

## 2. Success Criteria

Mỗi criteria có ID để reference trong test case.

### SC-01: Navigation
> Sidebar/left navigation có item "RAG Lab" dẫn đến `/rag`.

**Test Case TC-01:**
1. Mở app → thấy sidebar.
2. Kiểm tra có text "RAG Lab" trong sidebar.
3. Click "RAG Lab" → URL chuyển sang `/rag`.
4. Page `/rag` render đúng.

**Pass condition:** Cả 4 bước đều pass.

---

### SC-02: Page Load & Empty State
> Page `/rag` load không lỗi, hiển thị empty state (chưa hỏi gì).

**Test Case TC-02:**
1. Navigate đến `/rag`.
2. Không có lỗi console (Error level).
3. Thấy heading "RAG Lab".
4. Thấy input/textarea để nhập câu hỏi.
5. Thấy button submit (không disabled khi input rỗng hoặc disabled? — tùy UX quyết định sau, nhưng phải có).

**Pass condition:** Không crash, empty state rõ ràng.

---

### SC-03: Backend API — Câu hỏi có context
> Backend trả về answer + sources khi câu hỏi match với tài liệu.

**Test Case TC-03:**
1. Gửi POST `/api/rag/query` với body `{"question": "AURA khác chatbot motivational ở đâu?"}`.
2. Response status 200.
3. Response có field `answer` (string, không rỗng).
4. Response có field `sources` (array, length ≥ 1).
5. Mỗi source có `title`, `chunk_id`, `preview`, `score`.
6. Response có field `confidence` ∈ {high, medium, low}.
7. Response có field `used_context` = true.
8. `answer` là tiếng Việt.

**Pass condition:** Cả 8 bước đều pass.

**Manual test command:**
```bash
curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question":"AURA khác chatbot motivational ở đâu?"}'
```

---

### SC-04: Backend API — Câu hỏi không có context
> Backend không bịa, trả lời rõ là không đủ dữ liệu.

**Test Case TC-04:**
1. Gửi POST `/api/rag/query` với body `{"question": "Giá cổ phiếu NVIDIA hôm nay là bao nhiêu?"}`.
2. Response status 200.
3. Response có field `answer` chứa nội dung dạng "chưa tìm thấy", "không đủ dữ liệu", hoặc tương tự — không phải answer tự bịa.
4. `used_context` = false hoặc `confidence` = "low".
5. `sources` = [] hoặc tất cả `score` < 0.2.

**Pass condition:** Cả 5 bước đều pass.

---

### SC-05: Backend API — Empty input
> Backend validate input, không crash.

**Test Case TC-05:**
1. Gửi POST `/api/rag/query` với body `{"question": ""}`.
2. Gửi POST `/api/rag/query` với body `{}`.
3. Gửi POST `/api/rag/query` với body `{"question": "   "}` (toàn khoảng trắng).
4. Tất cả response phải là HTTP 400 (hoặc 422), không phải 200.
5. Response có field `detail` mô tả lỗi.

**Pass condition:** Cả 5 bước đều pass.

---

### SC-06: Frontend — Submit & Loading
> User nhập câu hỏi → click submit → thấy loading → thấy kết quả.

**Test Case TC-06:**
1. Mở `/rag`.
2. Nhập "AURA là gì?".
3. Click button submit.
4. Thấy loading indicator (spinner/typing/disabled button).
5. Chờ response (backend đang chạy).
6. Thấy answer hiển thị.
7. Thấy sources hiển thị (nếu có).
8. Button submit re-enabled sau khi có kết quả.

**Pass condition:** Cả 8 bước đều pass.

---

### SC-07: Frontend — Error Handling
> Backend lỗi → frontend hiển thị error message thân thiện, không crash.

**Test Case TC-07:**
1. Tắt backend server.
2. Mở `/rag`, nhập câu hỏi, click submit.
3. Thấy error message rõ ràng (không stack trace).
4. Page không crash, vẫn có thể nhập câu hỏi khác.
5. Restart backend, submit lại → hoạt động bình thường.

**Pass condition:** Cả 5 bước đều pass.

---

### SC-08: Confidence Display
> UI hiển thị confidence level rõ ràng.

**Test Case TC-08:**
1. Hỏi câu có context rõ → confidence nên là "high" hoặc "medium".
2. Hỏi câu không có context → confidence phải là "low".
3. Confidence hiển thị bằng text hoặc visual cue (badge/tag/color).

**Pass condition:** Confidence hiển thị đúng, đúng ngữ cảnh.

---

### SC-09: Sources Preview
> UI hiển thị từng source với title + preview.

**Test Case TC-09:**
1. Hỏi câu có context.
2. Thấy danh sách sources.
3. Mỗi source có `title` hiển thị (tên file .md).
4. Mỗi source có `preview` hiển thị (đoạn text ngắn, không phải toàn bộ chunk).
5. Preview không quá dài (nên ≤ 200 chars hoặc có truncate).

**Pass condition:** Cả 5 bước đều pass.

---

### SC-10: No Hallucination in UI
> Answer không chứa source không có thật.

**Test Case TC-10:**
1. Hỏi câu không liên quan đến AURA/psychology.
2. Answer không đề cập đến tài liệu không tồn tại.
3. Answer không bịa chi tiết cụ thể (số liệu, ngày tháng, tên người...) nếu không có trong docs.

**Pass condition:** Không hallucination.

---

### SC-11: Other Pages Not Broken
> Morning / Checklist / Evening / Dashboard vẫn hoạt động.

**Test Case TC-11:**
1. Navigate qua Morning, Checklist, Evening, Dashboard.
2. Không có lỗi console (Error level) trên mỗi page.
3. Page content render đúng.

**Pass condition:** Cả 3 bước đều pass trên tất cả 4 pages.

---

### SC-12: Build Pass
> Frontend build không lỗi.

**Test Case TC-12:**
```bash
cd frontend
npm run build
```
Exit code phải = 0.

**Pass condition:** Build thành công.

---

## 3. Session Plan

### Session 1: Backend Core (1 giờ)
**Mục tiêu:** Có endpoint `/api/rag/query` chạy được, pass TC-03, TC-04, TC-05.

**Tasks:**
- [ ] Inspect project: đọc `backend/routers/api.py`, `backend/agents/_gemini.py`, `backend/core/prompts.py`
- [ ] Tạo `backend/data/rag_docs/` directory
- [ ] Tạo `backend/data/rag_docs/aura_overview.md` (seed doc)
- [ ] Tạo `backend/data/rag_docs/psychology_frameworks.md` (seed doc)
- [ ] Tạo `backend/core/rag.py`:
  - [ ] `load_rag_documents()`
  - [ ] `chunk_document()`
  - [ ] `retrieve_relevant_chunks()` — lexical scoring
  - [ ] `run_rag_query()` — gọi Gemini
- [ ] Thêm RAG prompt vào `backend/core/prompts.py`
- [ ] Thêm route `POST /api/rag/query` vào `backend/routers/api.py`
- [ ] Verify: chạy `curl` test TC-03, TC-04, TC-05

**Target:** Backend pass TC-03, TC-04, TC-05.

---

### Session 2: Frontend + Integration (1 giờ)
**Mục tiêu:** Có page `/rag` chạy được, pass TC-01, TC-02, TC-06, TC-08, TC-09.

**Tasks:**
- [ ] Thêm types vào `frontend/lib/types.ts` (`RagSource`, `RagResponse`)
- [ ] Thêm `queryRag()` vào `frontend/lib/api.ts`
- [ ] Tạo `frontend/app/rag/page.tsx`:
  - [ ] Header "RAG Lab" + subtitle
  - [ ] Input card (textarea + button)
  - [ ] Loading state
  - [ ] Answer card với confidence badge
  - [ ] Sources card với preview
  - [ ] Error state
  - [ ] Empty state
- [ ] Thêm nav item "RAG Lab" vào `frontend/components/Navigation.tsx`
- [ ] Verify: mở browser, pass TC-01, TC-02, TC-06, TC-08, TC-09

**Target:** UI chạy đẹp, integration hoạt động.

---

### Session 3: Polish + Verification (1 giờ)
**Mục tiêu:** Pass tất cả 12 criteria, build pass.

**Tasks:**
- [ ] TC-07: Error handling — tắt backend, kiểm tra UI graceful
- [ ] TC-10: Hallucination check — hỏi câu vặt, xem answer
- [ ] TC-11: Navigate các page khác, check no crash
- [ ] TC-12: `npm run build` pass
- [ ] TC-01 (lại): Nav item còn đó
- [ ] Fix any remaining issues
- [ ] Commit code

**Target:** Tất cả 12 TC pass, green build.

---

## 4. Milestones

| Milestone | Điều kiện | Khi nào |
|-----------|-----------|---------|
| **M1: Backend Ready** | TC-03, TC-04, TC-05 pass | Sau Session 1 |
| **M2: UI Ready** | TC-01, TC-02, TC-06 pass | Sau Session 2 |
| **M3: All Green** | Tất cả 12 TC pass + build pass | Sau Session 3 |

---

## 5. Criteria Priority

| Priority | Criteria | Lý do |
|----------|----------|-------|
| P0 (Must have) | SC-03, SC-04, SC-05 | Backend đúng logic |
| P0 (Must have) | SC-01, SC-02 | Navigation + page load |
| P0 (Must have) | SC-11, SC-12 | Không phá app khác + build |
| P1 (Should have) | SC-06, SC-07, SC-08, SC-09 | UX đầy đủ |
| P2 (Nice to have) | SC-10 | Hallucination guard |

**Quy tắc:** Nếu kẹt ở P0 → skip P1/P2 → ghi note. Không delay M3 vì P1/P2.

---

## 6. Risk Register

| Risk | Xác suất | Impact | Mitigation |
|------|----------|--------|------------|
| Gemini API key hết quota/test limit | Thấp | Cao | Backend có try/except, fallback message |
| Seed doc content quá ngắn → TC-04 fail | Trung bình | Thấp | Thêm 2-3 docs nếu cần |
| Nav item conflict với existing route | Thấp | Cao | Kiểm tra `app/` folder trước |
| Frontend build lỗi vì TypeScript strict | Trung bình | Trung bình | Dùng `// @ts-ignore` nếu cần nhanh, fix sau |
| CORS issue khi frontend gọi backend | Thấp | Cao | Kiểm tra `ALLOWED_ORIGINS` env var |

---

## 7. Dependencies & Prerequisites

- [x] Project AURA MVP hoàn thành (frontend + backend + Gemini)
- [x] Docker Compose hoặc local dev environment sẵn sàng
- [ ] `.env` có `GEMINI_API_KEY` (phải có, không có thì fail ngay)
- [ ] `npm run build` trên frontend đang pass (baseline trước khi thêm RAG)

**Trước Session 1:** verify baseline:

```bash
# Backend baseline
cd backend && python -c "from main import app; print('OK')"

# Frontend baseline
cd frontend && npm run build
```

Nếu baseline fail → fix baseline trước, không bắt đầu RAG.

---

## 8. Definition of Done

Feature RAG Lab được xem là **DONE** khi:

1. Tất cả 12 criteria pass hoặc được ghi rõ reason tại sao skip.
2. `npm run build` pass trên frontend.
3. `curl` test TC-03 → pass.
4. Code đã commit.
5. File `updateRAG.md` được update phần progress (hoặc ghi completion note).

---

## 9. Quick Reference — Test Command

### Backend test nhanh

```bash
# Test 1: Câu hỏi có context
curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question":"AURA khác chatbot motivational ở đâu?"}'

# Test 2: Câu hỏi không có context
curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question":"Giá cổ phiếu NVIDIA hôm nay là bao nhiêu?"}'

# Test 3: Empty input
curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question":""}'

# Test 4: Câu hỏi về framework
curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question":"Implementation Intention dùng khi nào?"}'
```

---

## 10. Progress Tracking

| Criteria | TC | Session 1 | Session 2 | Session 3 |
|----------|----|-----------|-----------|-----------|
| SC-01 | TC-01 | - | done | - |
| SC-02 | TC-02 | - | done | - |
| SC-03 | TC-03 | done | - | - |
| SC-04 | TC-04 | done | - | - |
| SC-05 | TC-05 | done | - | - |
| SC-06 | TC-06 | - | done | - |
| SC-07 | TC-07 | - | - | done |
| SC-08 | TC-08 | - | done | - |
| SC-09 | TC-09 | - | done | - |
| SC-10 | TC-10 | - | - | done |
| SC-11 | TC-11 | - | - | done |
| SC-12 | TC-12 | - | - | done |
