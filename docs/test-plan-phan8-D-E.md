# AURA — Test Plan Phần 8 (Milestone D + E)

> Ngày: 2026-04-20
> Bao phủ: Phần 8D (Backend Medium) + Phần 8E (Frontend Medium)
> Mục tiêu: Smoke test + regression test toàn bộ tính năng mới trước khi gộp vào main.

---

## 0. Chuẩn bị môi trường

**0.1 Khởi động stack**

```bash
docker compose up -d
# hoặc nếu chưa có image:
docker compose up -d --build
```

Đợi ~20s, sau đó kiểm tra:

```bash
curl -s http://localhost/api/profile | head -c 200
# kỳ vọng: JSON profile của user "herman"
```

**0.2 Backup dữ liệu**

```bash
cp backend/data/history.json backend/data/history.backup.json
cp backend/data/profile.json backend/data/profile.backup.json
```

→ Để restore sau test: `cp *.backup.json` ngược lại.

**0.3 Mở browser**
- Chrome / Edge, mở DevTools (F12) → tab **Console** + **Application**
- Truy cập http://localhost

---

## PHẦN 1 — MILESTONE D (Backend)

Test từng endpoint mới bằng curl / DevTools Network.

### D1. `POST /api/task/friction` — ghi nhận lý do skip

**D1.1 Happy path**
```bash
curl -X POST http://localhost/api/task/friction \
  -H "Content-Type: application/json" \
  -d '{"task_index": 0, "reason": "tired", "note": "buổi chiều mệt"}'
```
- [ ] HTTP 200
- [ ] Response: `{"success": true, "task": {..., "friction": {"reason":"tired", ...}}}`
- [ ] `backend/data/history.json` → entry hôm nay → `tasks[0].friction.reason == "tired"`
- [ ] `logged_at` là ISO timestamp

**D1.2 Invalid reason**
```bash
curl -X POST http://localhost/api/task/friction \
  -H "Content-Type: application/json" \
  -d '{"task_index": 0, "reason": "lazy"}'
```
- [ ] HTTP 400
- [ ] Body chứa `reason phải là một trong ['distracted', 'forgot', 'no_meaning', 'tired']`

**D1.3 task_index ngoài phạm vi**
```bash
curl -X POST http://localhost/api/task/friction \
  -H "Content-Type: application/json" \
  -d '{"task_index": 99, "reason": "tired"}'
```
- [ ] HTTP 404
- [ ] Message tiếng Việt: "task_index 99 out of range..."

**D1.4 Chỉ định ngày quá khứ** (optional)
```bash
curl -X POST http://localhost/api/task/friction \
  -H "Content-Type: application/json" \
  -d '{"task_index": 0, "reason": "distracted", "date": "2026-04-16"}'
```
- [ ] Ghi vào entry `2026-04-16`, không ảnh hưởng hôm nay

---

### D2. `POST /api/task/first-action` — stamp first tick

**D2.1 Lần đầu gọi**
```bash
curl -X POST http://localhost/api/task/first-action \
  -H "Content-Type: application/json" \
  -d '{"task_index": 0}'
```
- [ ] HTTP 200
- [ ] Task có `first_action_at` (ISO) và `first_action_delay_minutes` (int ≥ 0)
- [ ] Delay tính từ `created_at` của task → đúng giá trị (phút)

**D2.2 Idempotent — gọi lần 2**
- [ ] Gọi lại cùng payload → `first_action_at` KHÔNG đổi
- [ ] Không ghi đè `first_action_delay_minutes`

**D2.3 task không có `created_at` (legacy)**
- Mở `history.json`, xoá `created_at` trên 1 task legacy → gọi endpoint → `first_action_at` được set nhưng `first_action_delay_minutes` vắng mặt (không crash).

---

### D3. `POST /api/task/retry-easier` — swap task nhẹ hơn

**D3.1 Happy path**
```bash
curl -X POST http://localhost/api/task/retry-easier \
  -H "Content-Type: application/json" \
  -d '{"task_index": 0}'
```
- [ ] HTTP 200
- [ ] Response chứa `task` mới, `new_energy_level` = `original_energy - 2` (min = 1), `encouragement` tiếng Việt
- [ ] Task mới có `replaced_from` = snapshot task cũ (title, implementation, difficulty…)
- [ ] `history.json` entry hôm nay: tasks[0] bị thay, không mất dữ liệu cũ (nằm trong `replaced_from`)

**D3.2 Không có morning entry**
- Sửa history.json → xoá entry hôm nay → gọi endpoint
- [ ] HTTP 404 "Không tìm thấy morning entry"
- Restore file sau test

**D3.3 energy tối thiểu**
- Sửa `energy_level` thành 1 trong morning → gọi retry-easier
- [ ] `new_energy_level` = 1 (không xuống 0 hay -1)

**D3.4 task_index ngoài phạm vi**
- [ ] HTTP 404 "task_index ngoài phạm vi"

---

### D4. `GET /api/pattern-radar?days=7|30`

**D4.1 days = 7**
```bash
curl -s "http://localhost/api/pattern-radar?days=7"
```
- [ ] HTTP 200
- [ ] Response: `{"days": 7, "counts": {"framework_name": count, ...}}`
- [ ] Tổng count ≤ 7 (số ngày có morning entry trong 7 ngày gần nhất)

**D4.2 days = 30**
```bash
curl -s "http://localhost/api/pattern-radar?days=30"
```
- [ ] Tổng count ≤ 30

**D4.3 days invalid**
```bash
curl -s "http://localhost/api/pattern-radar?days=15"
```
- [ ] HTTP 400 "days phải là 7 hoặc 30"

---

### D5. `GET /api/energy-mood-matrix`

```bash
curl -s http://localhost/api/energy-mood-matrix
```
- [ ] HTTP 200
- [ ] Response: `{"data": [{date, mood, energy}, …]}`
- [ ] Thứ tự oldest → newest (ngày cũ nhất ở đầu)
- [ ] Chỉ chứa ngày có morning entry
- [ ] Max 7 entries

---

### D6. `GET /api/framework-diversity`

```bash
curl -s http://localhost/api/framework-diversity
```
- [ ] HTTP 200
- [ ] Response: `{"counts": {...}}` — giống pattern-radar?days=7

---

### D7. Persistence + contract

- [ ] `GET /api/today` sau khi đã log friction → trả về task có field `friction`
- [ ] `POST /api/morning` (sáng mới) → task được stamp `created_at` tự động
- [ ] Swagger UI `http://localhost/api/docs` hiển thị đủ 5 endpoint mới

---

## PHẦN 2 — MILESTONE E (Frontend)

Test trên Chrome desktop (1440px) + mobile emulator iPhone SE (375px).

### E1. Checklist — First-action auto-tracking

**E1.1 First tick fires POST**
1. Vào `/checklist` (cần có morning entry hôm nay; nếu chưa có, check-in sáng trước).
2. Mở DevTools → **Network** tab → filter `first-action`.
3. Tick task #1 lần đầu.
- [ ] Có request `POST /api/task/first-action` với `{"task_index": 0, "date": "YYYY-MM-DD"}`
- [ ] HTTP 200

**E1.2 Dedupe client-side**
1. Untick task #1 → tick lại.
- [ ] **KHÔNG** có request thứ 2 (đã có stamp ở localStorage `aura_first_action_YYYY-MM-DD`)

**E1.3 Reload page**
1. Refresh trang → tick task khác lần đầu.
- [ ] Có request cho task mới
- [ ] Task cũ không fire lại

**E1.4 Verify DB**
```bash
curl -s http://localhost/api/today | python -m json.tool | grep -A2 first_action
```
- [ ] Task có `first_action_at` + `first_action_delay_minutes`

---

### E2. Checklist — "Task quá sức" (retry-easier)

**E2.1 Swap thành công**
1. Ở `/checklist`, ở 1 task chưa tick → click **"Task quá sức"**
2. Chờ ~2-5s (gọi Agent 3)
- [ ] Button hiện "Đang đổi…"
- [ ] Task hiển thị dim (opacity 0.5) trong lúc loading
- [ ] Task được thay bằng version mới (title/implementation khác)
- [ ] Xuất hiện chip **"Đã thay nhẹ hơn"** trên task mới
- [ ] Banner vàng hiện ra ở cuối list với câu encouragement trong ~4s rồi tự ẩn

**E2.2 Offline / backend lỗi**
1. `docker compose stop backend` → click "Task quá sức".
- [ ] Banner encouragement hiện error message; UI không crash.
2. Start lại: `docker compose start backend`.

**E2.3 Double-click guard**
- Click 2 lần liên tục trên cùng task → chỉ gọi 1 request.

---

### E3. Checklist — Friction modal ("Bỏ qua")

**E3.1 Mở modal**
1. Ở task chưa tick → click **"Bỏ qua"**.
- [ ] Modal overlay xuất hiện (blur background)
- [ ] Title: "Điều gì cản bạn hôm nay?"
- [ ] Hiển thị 4 chips: Mệt / Bị phân tâm / Quên / Không thấy ý nghĩa
- [ ] Textarea ghi chú tuỳ chọn

**E3.2 Keyboard ESC**
- Nhấn `Esc` → modal đóng, không lưu.

**E3.3 Click backdrop**
- Click vùng tối ngoài modal → đóng.

**E3.4 Submit**
1. Chọn "Mệt" → nhập note "thử ghi chú tiếng Việt có dấu" → click **Lưu lý do**.
- [ ] Modal đóng
- [ ] Task hiện chip cam **"Skip: Mệt"**
- [ ] Check `history.json` hoặc `GET /api/today` → `tasks[i].friction.reason = "tired"`, note có dấu đầy đủ
- [ ] Button **Lưu lý do** disabled nếu chưa chọn chip

**E3.5 Body scroll lock**
- Khi modal mở → thân trang dưới không scroll được.

---

### E4. Checklist — Midday mood slider

**E4.1 Hiển thị**
- [ ] Slider nằm trên ProgressCard
- [ ] Giá trị default = `morning.energy_level`
- [ ] Label "Sáng: X" ở góc trái

**E4.2 Tương tác**
1. Kéo slider thành giá trị 8 (nếu sáng là 5).
- [ ] Hint thay đổi: "Đang lên 📈 — bạn vừa sạc được năng lượng."
2. Kéo xuống 2.
- [ ] Hint: "Đang xuống 📉 — có thể cần dừng lại 5 phút."
3. Về 5 (= sáng).
- [ ] Hint: "Ổn định so với sáng nay."

**E4.3 Persistence**
- Reload trang → slider giữ giá trị cuối (localStorage `aura_midday_mood_YYYY-MM-DD`).

---

### E5. Dashboard — Pattern radar (30 ngày)

1. Vào `/dashboard`.
- [ ] Card "Framework radar (30 ngày)" xuất hiện
- [ ] SVG spider chart có 8 trục tương ứng 8 framework
- [ ] Vùng polygon được tô mood color, outline rõ
- [ ] Label các framework có count ≥ 1 hiển thị `·N` (vd: "Progress ·4")
- [ ] Caption: "N ngày có framework trong 30 ngày qua"
- [ ] Không vỡ layout trên 375px (chart responsive)

**E5.1 Edge case — không có dữ liệu**
- Xoá `history.json` → reload → radar hiện text "Chưa có dữ liệu framework…" (không crash).
- Restore sau test.

---

### E6. Dashboard — Energy × Mood scatter

- [ ] Card "Năng lượng × Mood (7 ngày)" hiển thị
- [ ] Scatter plot — mỗi điểm 1 ngày, label MM-DD phía trên
- [ ] Hover điểm → tooltip "YYYY-MM-DD — mood / energy X" (title)
- [ ] Trục X: 5 label mood (Numb → Energ), trục Y: tick 2/5/8
- [ ] Caption chỉ định trục

**E6.1 Ít hơn 2 điểm**
- [ ] Card fallback hiện "Cần ít nhất 2 ngày…"

---

### E7. Dashboard — Framework diversity warning

**E7.1 Chưa đủ 5 ngày lặp**
- [ ] Card cảnh báo KHÔNG hiện nếu framework streak < 5

**E7.2 Khi lặp ≥ 5 ngày**
- Tạo mock: sửa `history.json` thành 5 ngày liên tiếp cùng `framework` → reload dashboard.
- [ ] Card cam xuất hiện: "AURA đã chọn X N ngày liên tiếp…"
- [ ] Gợi ý "mô tả kỹ hơn vào sáng mai"
- Restore history sau test.

---

### E8. Dashboard — First-action delay insight

**E8.1 Dưới 2 data points**
- [ ] Card ẩn nếu < 2 task có `first_action_delay_minutes`

**E8.2 Bình thường**
- Sau khi tick vài task ở E1, quay lại dashboard.
- [ ] Card xuất hiện với giá trị trung bình (vd "3m" hoặc "0.4h")
- [ ] Caption: "trung bình từ khi tạo → tick"
- [ ] Tone message dựa trên số lượng & delay

**E8.3 Warning mode (≥ 3 ngày có avg > 3h)**
- Mock `history.json`: set `first_action_delay_minutes = 300` (5h) cho task trong 3+ ngày khác nhau → reload.
- [ ] Border chuyển cam, message: "Có vẻ bạn đang phân tích quá nhiều…"
- Restore.

---

### E9. Evening — IF-THEN pre-commit

**E9.1 UI**
1. Vào `/evening`, submit reflection → scroll xuống ResultView.
- [ ] Card "Pre-commit cho ngày mai" xuất hiện (thay card Letter cũ)
- [ ] 2 input inline: **"Ngày mai lúc [____] tôi sẽ [________]"**
- [ ] Nút **Khoá IF-THEN** disabled đến khi cả 2 field đều có text

**E9.2 Lưu**
1. Nhập: `7h sáng` · `đi bộ 10 phút sau khi pha cà phê` → click **Khoá IF-THEN**.
- [ ] Status → "Đã khoá ✓"
- [ ] localStorage: `aura_precommit_<NGÀY MAI>` = JSON `{when, what}`
- [ ] localStorage: `aura_letter_<NGÀY MAI>` = chuỗi "Ngày mai lúc 7h sáng tôi sẽ đi bộ…" (để tương thích lùi)

**E9.3 Reload → khôi phục**
- [ ] Refresh trang evening → input giữ nguyên giá trị + status "Đã khoá ✓"

**E9.4 Edit sau khi đã khoá**
- Sửa 1 field → status chuyển về nút **Khoá IF-THEN** có thể click tiếp.

**E9.5 Legacy format**
- Set trực tiếp `aura_letter_<NGÀY MAI>` = "text cũ" (không JSON) trong localStorage → reload evening.
- [ ] "what" prefill bằng text cũ (không crash trên `JSON.parse`).

---

### E10. Morning — Surface pre-commit sáng hôm sau

1. Chờ sang ngày hôm sau (hoặc mock: sửa localStorage key `aura_precommit_<HÔM NAY>` trực tiếp với JSON `{"when":"7h","what":"đi bộ"}`).
2. Vào `/morning`.
- [ ] Banner "Đêm qua bạn đã khoá" hiện phía trên input
- [ ] Nội dung: "Ngày mai lúc **7h** tôi sẽ **đi bộ**." (AURA vẫn dùng "Ngày mai" vì đó là câu gốc; chấp nhận được)
- [ ] Click **"Dùng làm input sáng nay"** → textarea được prefill với câu hoàn chỉnh
- [ ] Không có pre-commit → banner không hiện (kiểm tra bằng cách xoá key)

---

### E11. Morning — Gentle re-entry (miss ≥ 3 ngày)

**E11.1 Miss < 3 ngày**
- Đảm bảo có morning entry trong 2 ngày gần nhất → vào `/morning`.
- [ ] **KHÔNG** có banner "Chào mừng trở lại"

**E11.2 Miss ≥ 3 ngày**
- Mock: xoá 3 entries gần nhất khỏi `history.json` (giữ lại entry cũ hơn) → reload `/morning`.
- [ ] Banner xuất hiện: "Chào mừng trở lại · N ngày vắng"
- [ ] Câu hỏi: "Hôm nay bạn muốn bắt đầu lại bằng điều gì nhỏ nhất?"
- [ ] 2 nút: **Dùng câu gợi ý** + **Tôi tự viết**
- Click "Dùng câu gợi ý" → textarea prefill: "Tôi muốn bắt đầu lại bằng một điều nhỏ nhất có thể."
- Click "Tôi tự viết" → banner đóng
- Restore sau test.

---

### E12. PWA — Installable

**E12.1 Manifest served**
```bash
curl -s http://localhost/manifest.webmanifest | head -5
```
- [ ] HTTP 200, Content-Type phù hợp
- [ ] JSON chứa `name`, `icons`, `start_url`

**E12.2 Icons served**
- [ ] `GET /icon-192.svg` → 200
- [ ] `GET /icon-512.svg` → 200

**E12.3 Chrome DevTools → Application tab**
- Mở trang bất kỳ → **Application** → **Manifest**
- [ ] Hiển thị manifest không lỗi
- [ ] Icons preview hiển thị 2 size
- [ ] Lighthouse PWA audit (chạy ở chế độ incognito + production build):
  ```bash
  # trong frontend/
  npx next build && npx next start
  # rồi Lighthouse → tab PWA → kỳ vọng "Installable" ✓
  ```

**E12.4 Service worker (chỉ production)**
- Build prod, start prod → vào site → DevTools **Application → Service Workers**
- [ ] `sw.js` activated (dev mode KHÔNG register — cố ý)
- Offline → `/dashboard` vẫn load shell
- API call trả về `{"offline":true}` với status 503 khi không có mạng

---

### E13. Regression — Các tính năng cũ không gãy

Kiểm tra nhanh sau khi merge:
- [ ] Onboarding flow vẫn hoàn thành được
- [ ] `/morning` check-in bình thường — pipeline Agent 1→2→3 chạy, task hiện ra
- [ ] Crisis mode (input "tôi muốn chết") vẫn kích hoạt SupportCard, không pipeline
- [ ] `/checklist` Silent mode (energy ≤ 3) vẫn hiện đúng (3 emoji)
- [ ] `/evening` submit → Agent 4 trả kết quả, pattern card + tomorrow question
- [ ] Streak display đúng, MilestoneToast xuất hiện lần đầu qua 7/30/60/100
- [ ] Dark ↔ Light theme toggle
- [ ] Mobile bottom nav hoạt động trên 375px

---

## PHẦN 3 — Acceptance Criteria (plan.md Phần 8)

### Backend (D)
- [x] 3 endpoint chính mới có trong `/api/docs` (`/api/task/retry-easier`, `/api/task/friction`, `/api/pattern-radar`)
- [x] Retry-easier không mất data task cũ (lưu `replaced_from`)
- [x] `log_friction`, `track_time_to_first_action`, `get_framework_diversity_7d`, `get_energy_mood_matrix_7d` đều có trong `core/memory.py`

### Frontend (E)
- [x] "Task quá sức" button gọi retry-easier + animation swap
- [x] Friction log modal preset chips
- [x] Time-to-first-action indicator (insight warning ≥ 3 ngày > 3h)
- [x] Midday mood re-check slider
- [x] Pattern radar chart (spider 8 framework)
- [x] Framework diversity indicator (cảnh báo > 5 ngày liên tiếp)
- [x] Energy × mood correlation chart (scatter)
- [x] Tomorrow pre-commit IF-THEN
- [x] Gentle re-entry flow (miss ≥ 3 ngày)
- [x] PWA installable (manifest + SW + icons)

### Ngoài scope Milestone E (chủ động skip)
- **Implementation intention countdown (live)**: Task hiện chưa có structured trigger time. Free-text "khi…" trong `implementation` không parse được giờ. Để hậu kỳ.
- **Reminder neo vào daily_anchor via push notification**: Cần Notification API + user gesture permission flow. Để tách milestone PWA+ riêng.

---

## PHẦN 4 — Cleanup sau khi test

```bash
# Restore data nếu đã mock
cp backend/data/history.backup.json backend/data/history.json
cp backend/data/profile.backup.json backend/data/profile.json
rm backend/data/*.backup.json

# Xoá state localStorage nếu cần (trong DevTools Console)
Object.keys(localStorage).filter(k => k.startsWith('aura_')).forEach(k => localStorage.removeItem(k))

# Shutdown
docker compose down
```

---

## PHẦN 5 — Known Issues / Notes

1. **SW chỉ register trong production** — dev mode (`npm run dev`) không cache, không offline, không cần unregister khi debug.
2. **Manifest `themeColor`** đã chuyển sang `viewport` export (Next.js 15 breaking change).
3. **Legacy `aura_letter_*` key** vẫn được sync từ pre-commit → Checklist `LetterFromYesterday` component đọc key cũ nên vẫn hiển thị; không cần migrate.
4. **`track_first_action` trên legacy task không có `created_at`**: chỉ stamp `first_action_at`, không có `delay_minutes` — fallback im lặng (không throw).
5. **Radar labels bị shorten** xuống từ đầu tiên cho compact (vd "Progress" thay vì "Progress Principle"). Đủ để user nhận biết trên 280px.
