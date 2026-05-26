# AURA — Plan Polish 7 Ngày (21 Session)

> Mỗi session = 1 giờ (bao gồm thời gian test)
> Mỗi ngày = 3 session
> Mục tiêu: Demo-ready cho phỏng vấn AgileOps JD5
> Nguyên tắc: MỖI SESSION MỞ CHAT CLAUDE CODE MỚI. Không kéo dài chat cũ.

---

## NGÀY 1 — Dọn nợ kỹ thuật

### Session 1.1 — Gỡ auth shell (quyết định chiến lược)

**Tại sao làm đầu tiên:** Auth hiện tại là "ảo giác bảo mật" — có login page nhưng không enforce gì. Gỡ bỏ = thể hiện biết ưu tiên, không over-engineer.

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md và docs/plan.md.
Review cho thấy auth (JWT, login, register) đã build nhưng KHÔNG 
enforce trên API routes. Tôi quyết định gỡ bỏ auth để cam kết 
single-user MVP demo.

Liệt kê TẤT CẢ file liên quan đến auth:
- Backend: JWT logic, accounts table, auth routes, seed script
- Frontend: /login page, /register page, auth middleware

Chưa xóa gì. Cho tôi danh sách file + dòng code sẽ xóa.
```

Sau khi agent liệt kê → review → approve:
```
Thực hiện. Root "/" redirect thẳng đến /onboarding (nếu chưa 
có profile) hoặc /morning (nếu có rồi).
Commit: "refactor: remove auth shell, commit to single-user MVP"
```

**Done khi:**
- `docker-compose up --build` chạy OK
- Vào localhost → không thấy login, vào thẳng app
- `git grep -i "jwt\|login\|register"` không còn kết quả trong code chính

---

### Session 1.2 — Dọn data layer (xóa SQLite thừa)

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md. Sau khi gỡ auth, kiểm tra SQLite còn dùng 
cho gì không. Review nói SQLite có schema (users, daily_entries, 
tasks) nhưng KHÔNG được sử dụng — data chạy qua JSON files.

Tôi muốn xóa toàn bộ SQLite layer không dùng:
- Xóa database.py (hoặc file tạo schema)
- Xóa volume mount database trong docker-compose nếu có
- Giữ nguyên memory.py (JSON read/write)
- Thêm comment trong memory.py: "# v2: migrate to SQLite for multi-user"

Liệt kê file sẽ đụng trước.
```

**Done khi:**
- Không còn file `.db` hay SQLite import trong codebase
- App vẫn chạy bình thường, data persist qua JSON
- Commit: `refactor: remove unused SQLite layer, keep JSON for MVP`

---

### Session 1.3 — Fix JWT_SECRET + env var audit

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md. Sau khi dọn auth, kiểm tra còn sót security 
issue nào không:

1. Grep "secret\|SECRET\|hardcode\|password" trong toàn bộ 
   backend/*.py — có giá trị nào bị hardcode không?
2. Grep "localhost:8000\|localhost:3000" trong frontend/ — 
   có URL nào hardcode thay vì đọc env var?
3. Kiểm tra .env.example có đầy đủ tất cả biến cần thiết không.
   Nếu chưa có file này, tạo mới.
4. Kiểm tra .gitignore có chặn .env, *.db, __pycache__, .next, 
   node_modules chưa.

Báo kết quả, tôi sẽ quyết định fix gì.
```

**Done khi:**
- `.env.example` tồn tại, liệt kê đủ env vars (không có giá trị thật)
- Không còn secret hardcode
- Frontend API URL đọc từ `NEXT_PUBLIC_API_URL` env var
- Commit: `fix: remove hardcoded secrets, add .env.example`

---

## NGÀY 2 — Loading UX (điểm yếu 5/10 → target 8/10)

### Session 2.1 — Progress indicator cho /morning

**Bối cảnh:** Review cho Loading 5/10. Morning pipeline 3 Gemini calls = 5-15 giây, chỉ có typing dot. Recruiter sẽ nghĩ app bị đơ.

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md và frontend/app/morning/page.tsx.

Thay loading state hiện tại bằng "perceived progress" — 3 dòng 
text cycle mỗi 4 giây khi đang chờ API:

1. "Đang đọc cảm xúc của bạn..."
2. "Tìm pattern tâm lý phù hợp..."
3. "Chuẩn bị task cho hôm nay..."

Yêu cầu:
- Fade transition giữa các dòng (opacity 0→1, duration 500ms)
- Giữ MoodOrb animation đang có
- Cleanup timer khi component unmount hoặc API trả về
- Nếu API lỗi: dừng cycle, hiện error message tiếng Việt

Đề xuất trước khi code.
```

**Done khi:**
- Submit cảm xúc → thấy 3 dòng text chạy mượt
- API trả về → dừng cycle, hiện kết quả
- Test trên Chrome DevTools throttle "Slow 3G" — vẫn mượt
- Commit: `feat(ux): add 3-step progress indicator for morning pipeline`

---

### Session 2.2 — Dashboard progressive loading

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md và frontend/app/dashboard/page.tsx.

Vấn đề: Dashboard gọi 10 API song song (Promise.all), nếu 1 
API chậm thì cả trang chờ. Tôi muốn:

1. Mỗi section fetch riêng lẻ (không Promise.all)
2. Section nào load xong thì fade in ngay
3. Skeleton placeholder cho section đang load
4. Ưu tiên load: greeting + streak trước, chart + letter sau

Giữ layout hiện tại, chỉ thay đổi cách fetch data.
```

**Done khi:**
- Dashboard mở → skeleton hiện ngay → từng card fade in khi data về
- Không còn trắng trang chờ tất cả API
- Commit: `feat(ux): progressive loading for dashboard sections`

---

### Session 2.3 — Error handling khi API fail

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md. Test các edge case sau, báo tôi behavior hiện tại:

1. Tắt backend container → vào /morning submit → hiện gì?
2. Nhập chuỗi rỗng hoặc chỉ whitespace ở /morning → có validate?
3. Nhập 5000 ký tự → có giới hạn?
4. /dashboard khi chưa có history (ngày đầu tiên) → trống hay crash?

Với mỗi case fail, fix:
- Error message bằng tiếng Việt, thân thiện, có nút "Thử lại"
- Validate input ở frontend trước khi gọi API
- Giới hạn textarea max 2000 ký tự, hiện counter
```

**Done khi:**
- Tắt backend → user thấy "Không kết nối được. Thử lại sau." + nút retry
- Chuỗi rỗng → nút submit disabled
- Textarea có character counter
- Commit: `fix(ux): add error handling, input validation, char limit`

---

## NGÀY 3 — First-time experience (6/10 → target 8/10)

### Session 3.1 — Empty states cho dashboard

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md. Xóa backend/data/history.json (để test user mới).
Chạy app, vào /dashboard.

Với mỗi card/chart trống, thêm empty state thân thiện:
- Mood chart 7 ngày → "Sau vài ngày, pattern cảm xúc sẽ hiện ở đây"
- Weekly letter → "Cuối tuần đầu tiên, AURA sẽ viết thư cho bạn"
- Pattern radar → "Dần dần AURA sẽ nhận ra pattern của bạn"
- Streak → hiện "Ngày 1" với animation nhẹ

Tone: neutral, không cheerlead. Không dùng emoji.
Sau khi xong, restore lại history.json từ git.
```

**Done khi:**
- User mới vào dashboard → mọi section có text hướng dẫn, không trống
- Tone nhất quán, không cheerful quá
- Commit: `feat(ux): add empty states for first-time dashboard`

---

### Session 3.2 — Tooltip giải thích framework + energy

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md. User lần đầu thấy "behavioral_activation" hoặc 
"energy 3/10" không hiểu nghĩa.

Thêm tooltip (hover trên desktop, tap trên mobile):
1. FrameworkTag component → tooltip 1 câu tiếng Việt giải thích 
   framework (lấy từ CLAUDE.md phần trigger)
2. EnergyBar component → tooltip: "Mức năng lượng bạn tự đánh giá. 
   AURA dựa vào đây để chọn số lượng và độ khó task."
3. MoodOrb hoặc mood label → tooltip giải thích mood state

Dùng Tailwind + CSS thuần, không thêm thư viện.
Accessible: aria-describedby cho screen reader.
```

**Done khi:**
- Hover/tap FrameworkTag → hiện giải thích 1 câu
- Hover/tap EnergyBar → hiện mô tả
- Mobile: tap outside → đóng tooltip
- Commit: `feat(ux): add tooltips for framework, energy, mood`

---

### Session 3.3 — Navigation fixes nhỏ

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md. Fix 4 UX nhỏ từ review mục 5.6:

1. Thêm nút "← Quay lại" từ /checklist về /morning (hoặc /dashboard)
2. Thêm confirm dialog khi user đóng tab có textarea đang gõ dở 
   (beforeunload event, chỉ active khi textarea.length > 0)
3. Ambient audio ở /evening: thêm toggle icon nhỏ góc phải trên, 
   nhớ preference trong localStorage
4. Kiểm tra flow redirect: user quay lại app ngày sau → có bị 
   ép onboarding lại không? Nếu có thì fix.

Làm từng cái, test xong cái này mới làm cái sau.
```

**Done khi:**
- Mỗi fix hoạt động đúng
- 4 commits riêng biệt, message rõ ràng
- Flow onboarding → morning → checklist → evening → dashboard mượt

---

## NGÀY 4 — Mobile + Responsive

### Session 4.1 — Dashboard mobile optimization

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md. Review nói dashboard 10+ card trên mobile = 
scroll fatigue, radar chart / scatter chart khó đọc trên 
màn hình nhỏ.

Fix cho mobile (< 768px):
1. Collapse radar chart + energy scatter vào accordion — 
   mặc định đóng, tap để mở
2. Greeting + streak + mood chart giữ nguyên (quan trọng nhất)
3. Weekly letter: hiện excerpt 2 dòng, tap "Đọc thêm" để expand
4. Kiểm tra touch target tối thiểu 44px cho tất cả nút

Không thay đổi layout desktop.
```

**Done khi:**
- Mở Chrome DevTools → iPhone SE (375px) → dashboard scroll hợp lý
- Accordion mở/đóng mượt
- Không có nút bị quá nhỏ để tap
- Commit: `fix(mobile): optimize dashboard for small screens`

---

### Session 4.2 — Test responsive toàn app

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md. Kiểm tra responsive trên 2 breakpoint: 
375px (iPhone SE) và 768px (iPad).

Với MỖI trang (onboarding, morning, checklist, evening, dashboard):
- Screenshot mental: layout có bị vỡ không?
- Text có bị tràn container không?
- Input/textarea có đủ rộng để gõ thoải mái?
- Nút CTA có đủ lớn (44px+)?

Báo tôi danh sách vấn đề tìm được, kèm file:line.
Chỉ fix những vấn đề thực sự gây khó dùng.
```

**Done khi:**
- Không có layout vỡ trên 375px và 768px
- Tất cả input/textarea usable trên mobile
- Commit: `fix(responsive): fix layout issues on 375px and 768px`

---

### Session 4.3 — Dark/light theme consistency check

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md. Grep trong frontend/ tìm:
- "bg-white", "text-black", "border-gray" — có thể leak light 
  theme trong dark mode
- "text-white", "bg-black" — có thể leak dark theme trong light mode

Liệt kê file:line có vấn đề.
Với mỗi chỗ: thay bằng Tailwind dark: variant hoặc semantic color.

Kiểm tra contrast ratio >= 4.5:1 cho text chính.
```

**Done khi:**
- Chuyển dark/light mode → không có element nào "nhảy" màu sai
- Text đọc được rõ ở cả 2 mode
- Commit: `fix(theme): ensure dark/light mode consistency`

---

## NGÀY 5 — README + Seed Data

### Session 5.1 — Viết README case study (phần 1: structure + hero)

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md và review.md (nếu có trong docs/review/).

Viết lại README.md hoàn toàn. Tiếng Anh. Cấu trúc:

1. Hero: tên + 1 câu tagline + badge tech stack
2. Problem: 3 câu — người burnout gặp gì, chatbot thông thường 
   thiếu gì
3. Solution: AURA là agentic pipeline, không phải chatbot. 
   Diagram ASCII: user input → 5 agents → structured output
4. Psychology Layer: bảng 8 framework + trigger (ngắn gọn)
5. Tech decisions: tại sao Next.js, FastAPI, Gemini, JSON
6. How to run: docker-compose up — xong
7. Screenshots placeholder: [sẽ thêm sau]
8. Lessons learned: 3 bài học thẳng thắn
9. Limitations: single-user, no auth (by design for MVP)
10. Roadmap v2: auth, SQLite, streaming, notification

Viết đến mục 5 trước. Khoảng 200 dòng. Chưa viết mục 6-10.
```

**Done khi:**
- README có mục 1-5, đọc chuyên nghiệp
- Diagram ASCII pipeline rõ ràng
- Commit: `docs: rewrite README as case study (part 1)`

---

### Session 5.2 — README phần 2 + .env.example

**Câu lệnh Claude Code:**
```
Đọc README.md vừa viết. Tiếp tục viết mục 6-10:

6. How to run locally (prerequisites + 3 lệnh)
7. [Screenshots] — để placeholder, tôi sẽ chụp sau
8. Lessons learned — 3-5 bài học từ review process:
   - Dùng subagent review phát hiện auth shell giả
   - Chọn JSON thay SQLite để không over-engineer MVP
   - Loading UX quan trọng hơn thêm feature
9. Known limitations
10. Roadmap v2

Cập nhật .env.example đầy đủ.
Tổng README khoảng 300-400 dòng.
```

**Done khi:**
- README hoàn chỉnh, recruiter đọc 2 phút hiểu AURA là gì
- `.env.example` có đủ biến
- Commit: `docs: complete README case study`

---

### Session 5.3 — Seed demo data 10 ngày

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md. Tạo script backend/scripts/seed_demo.py:

Tạo history.json với 10 ngày dữ liệu mẫu, bao gồm:
- Ngày 1-2: energy thấp (2-3), mood numb, framework behavioral_activation
- Ngày 3-4: energy tăng nhẹ (4-5), mood anxious, framework 80_20
- Ngày 5-6: energy ổn (5-6), mood stable, bắt đầu có streak
- Ngày 7: weekly letter xuất hiện
- Ngày 8-10: energy dao động, có 1 ngày miss task (shame spiral detection)

Data phải realistic — text tiếng Việt, task titles thực tế 
(ví dụ "Đi bộ 10 phút sau bữa sáng"), implementation intention đầy đủ.

Chạy script → overwrite history.json → test dashboard có đủ data.
```

**Done khi:**
- Chạy `python seed_demo.py` → history.json có 10 ngày
- Dashboard hiện đầy đủ: chart, streak, pattern, weekly letter
- Commit: `feat: add seed script with 10-day demo data`

---

## NGÀY 6 — Deploy + Demo Video

### Session 6.1 — Chuẩn bị code cho production

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md. Chuẩn bị deploy lên Railway (2 services riêng, 
không dùng docker-compose trên Railway).

Cần thay đổi:
1. frontend/lib/api.ts: API URL phải đọc từ env var 
   NEXT_PUBLIC_API_URL, không hardcode localhost
2. backend/main.py: CORS accept cả localhost (dev) VÀ domain 
   Railway (prod). Đọc ALLOWED_ORIGINS từ env var, mặc định 
   "http://localhost:3000"
3. Backend Dockerfile: đảm bảo chạy standalone, expose port 8000
4. Frontend Dockerfile: build + start, expose port 3000
5. Thêm rate limiting cơ bản: 10 requests/phút cho /api/morning 
   (dùng slowapi hoặc custom middleware đơn giản)

Liệt kê thay đổi trước khi code.
```

**Done khi:**
- `docker-compose up --build` vẫn chạy local OK
- Env vars linh hoạt cho cả dev và prod
- Rate limiting active
- Commit: `feat: prepare for Railway deployment`

---

### Session 6.2 — Deploy lên Railway

**Không cần Claude Code — làm trên browser:**

1. Đăng ký railway.com → link GitHub → nhận $5 trial credit
2. New Project → Add Service → Deploy from GitHub → chọn repo `aura`
3. Service backend:
   - Root directory: `/backend`
   - Add env vars: `GOOGLE_API_KEY`, `ALLOWED_ORIGINS=https://[frontend-url]`
   - Deploy → copy URL backend
4. Service frontend:
   - Root directory: `/frontend`
   - Add env var: `NEXT_PUBLIC_API_URL=https://[backend-url]`
   - Deploy → copy URL frontend
5. Test: mở URL frontend → chạy morning → check dashboard

**Troubleshoot hay gặp:**
- Build fail → check Dockerfile có đúng không, Railway log rõ lỗi
- CORS error → check ALLOWED_ORIGINS có đúng URL frontend
- 502 → backend chưa start xong, đợi 30 giây

**Done khi:**
- URL live trên internet, bất kỳ ai mở được
- Full flow hoạt động: morning → checklist → evening → dashboard
- README cập nhật link live demo

---

### Session 6.3 — Chụp screenshot + bắt đầu quay video

**Chụp screenshot cho README:**
- 4 ảnh: onboarding, morning (có kết quả), checklist, dashboard (có data)
- Dark mode, dữ liệu demo seed sẵn
- Crop gọn, không cần cả browser frame
- Lưu vào `docs/screenshots/` → commit → cập nhật README

**Chuẩn bị quay video:**
- Viết script nói (tiếng Anh hoặc Việt):
  - 0:00-0:15: Hook — AURA giải quyết gì
  - 0:15-0:45: Onboarding (tăng tốc 2x)
  - 0:45-1:45: Morning flow tốc độ thật
  - 1:45-2:15: Checklist + Evening quickcut
  - 2:15-2:45: Dashboard
  - 2:45-3:00: Kết — tech stack + pipeline diagram
- Tool: Loom (dễ nhất, auto upload) hoặc OBS (free)

**Done khi:**
- README có 4 screenshot
- Script video viết xong trên giấy
- Commit: `docs: add screenshots to README`

---

## NGÀY 7 — Final Check + Publish

### Session 7.1 — Quay video demo

**Không cần Claude Code.**

- Chạy app trên URL Railway live (không phải localhost)
- Seed data sẵn 10 ngày
- Quay theo script → 3 phút
- Quay 2-3 lần, chọn take tốt nhất
- Upload Loom hoặc YouTube Unlisted
- Cập nhật README: link video

**Done khi:**
- Video 3 phút, chất lượng rõ, không lag
- Link video trong README

---

### Session 7.2 — Final test + git log cleanup

**Câu lệnh Claude Code:**
```
Đọc CLAUDE.md. Final check trước khi publish:

1. Chạy docker-compose down && docker-compose up --build 
   → tất cả chạy OK?
2. Xóa history.json + profile.json → chạy seed_demo.py → 
   test full flow fresh
3. git log --oneline — liệt kê cho tôi xem tất cả commits
4. Kiểm tra không có file thừa: *.pyc, .DS_Store, node_modules 
   trong git
5. README có đầy đủ: link live demo, screenshot, video, 
   how to run, .env.example

Báo tôi kết quả từng mục.
```

**Done khi:**
- Tất cả 5 check pass
- Git log đọc như một câu chuyện
- Repo sạch, không có file thừa

---

### Session 7.3 — Publish + LinkedIn

**Công việc:**

1. Đảm bảo GitHub repo = Public (hoặc invite recruiter nếu Private)
2. Viết GitHub repo description: "AI life coach with 5-agent pipeline + 8 psychology frameworks. Built in 9 days."
3. Thêm topics: `ai`, `fastapi`, `nextjs`, `gemini`, `psychology`, `agentic-ai`
4. Viết LinkedIn post:

```
Built AURA — an AI life coach that actually understands 
why you're stuck.

Not a motivational chatbot. It's a 5-agent pipeline that:
→ Detects your psychological patterns (learned helplessness, 
  shame spiral, analysis paralysis...)
→ Picks the right framework (Behavioral Activation, 80/20, 
  Implementation Intention...)
→ Generates micro-tasks you can actually do today

Tech: Next.js + FastAPI + Gemini API + Docker
Built in 9 days with Claude Code.

Live demo: [link]
Source: [link]
3-min walkthrough: [link]

#AI #AgenticAI #Psychology #FastAPI #NextJS
```

5. Cập nhật CV/resume: thêm AURA vào mục Projects

**Done khi:**
- Repo public với description + topics
- LinkedIn post đã đăng
- CV cập nhật

---

## Tóm tắt — Ma trận ưu tiên

| Ngày | Theme | Session 1 | Session 2 | Session 3 |
|------|-------|-----------|-----------|-----------|
| 1 | Dọn nợ | Gỡ auth | Dọn SQLite | Fix secrets + env |
| 2 | Loading UX | Morning progress | Dashboard lazy load | Error handling |
| 3 | First-time UX | Empty states | Tooltips | Nav fixes |
| 4 | Mobile | Dashboard mobile | Responsive test | Theme check |
| 5 | Content | README pt.1 | README pt.2 | Seed data |
| 6 | Deploy | Prep code | Railway deploy | Screenshots |
| 7 | Publish | Quay video | Final test | Publish + LinkedIn |

## Nguyên tắc xuyên suốt

1. **Mở chat Claude Code MỚI mỗi session** — context window sạch = agent chính xác hơn
2. **Mỗi session bắt đầu bằng:** "Đọc CLAUDE.md. [Mô tả task]."
3. **Commit sau MỖI session** — git log = bằng chứng process
4. **Không thêm feature mới** — chỉ polish cái đang có
5. **Nếu session kẹt > 30 phút 1 vấn đề:** dừng, bỏ qua, ghi note, sang task tiếp
6. **Test trên mobile sau mỗi thay đổi UI** — Chrome DevTools > Toggle Device

## Nếu bị trễ — cái nào bỏ được?

| Ưu tiên | Không thể bỏ | Có thể hoãn sang v2 |
|---------|-------------|-------------------|
| Bắt buộc | Ngày 1 (dọn nợ), Session 2.1 (morning loading), Session 5.1-5.2 (README), Session 6.2 (deploy) | |
| Nên có | Ngày 3 (first-time UX), Session 6.3 + 7.1 (video) | |
| Nice | Ngày 4 (mobile polish), Session 4.3 (theme check) | Có thể bỏ nếu hết thời gian |

---

*Plan tạo: 2026-04-22 — Dựa trên review.md từ subagent + CLAUDE.md + plan.md*
