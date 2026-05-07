# =============================================================
# AURA — Vercel Deployment Guide
# =============================================================
#
# AURA gồm 2 phần deploy riêng:
#   1. Frontend (Next.js 15) → deploy lên Vercel
#   2. Backend  (FastAPI)    → deploy lên Railway (hoặc Render/Fly.io)
#
# Lý do backend không deploy lên Vercel:
#   - Pipeline morning chạy 3 Gemini agents liên tiếp (60-120s),
#     vượt giới hạn Vercel Python Functions (10-30s).
#   - Vercel là ephemeral filesystem — không lưu được profile.json / history.json.
#   - uvicorn/FastAPI cần persistent process — không phù hợp với serverless model.
#
# THAY ĐỔI KIẾN TRÚC NÀY LÀ VI PHẠM CLAUDE.md — backend phải deploy riêng.
# =============================================================

## 1. Deploy Backend lên Railway

### Cách 1: Qua GitHub (khuyến nghị)

1. Đẩy code lên GitHub repo (backend folder ở root):
   ```
   your-github-org/aura-backend/
     ├── backend/
     ├── Dockerfile
     ├── Dockerfile
     ├── requirements.txt
     └── .env (không commit — dùng Railway env vars)
   ```

2. Tạo project mới trên Railway: https://railway.app
   - Connect GitHub repo → chọn repo `aura-backend`
   - Root Directory: `backend` (nếu repo chỉ chứa backend)
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port 8000`

3. Thêm Environment Variables trên Railway:
   ```
   GEMINI_API_KEY=AIza...
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   # DATABASE_PROVIDER=supabase          # uncomment nếu dùng Supabase
   # SUPABASE_URL=https://xxx.supabase.co
   # SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

4. Lấy Backend Public URL: Railway sẽ cấp URL dạng
   `https://aura-backend.up.railway.app`

### Cách 2: Clone repo backend

```bash
git clone https://github.com/your-org/aura-backend.git
cd aura-backend/backend
pip install -r requirements.txt
```

Railway sẽ auto-detect Dockerfile nếu có.

---

## 2. Deploy Frontend lên Vercel

### Cách nhanh: Vercel CLI

```bash
npm i -g vercel
cd AURA_NEW/frontend
vercel
```

### Cách qua GitHub:

1. Push code lên GitHub (hoặc dùng repo hiện tại).
2. Vào https://vercel.com → Import Project → chọn repo.
3. Root Directory: `frontend` (vì repo chứa cả frontend + backend).
4. Framework: `Next.js`.
5. Environment Variables cần thêm:

```
NEXT_PUBLIC_API_URL = https://your-backend.up.railway.app
```

6. Deploy!

---

## 3. Thiết lập Domain tùy chỉnh (tùy chọn)

### Backend (Railway)
- Mặc định: `https://aura-backend.up.railway.app`
- Custom domain: Railway Dashboard → Settings → Networking → Custom Domain

### Frontend (Vercel)
- Vercel Dashboard → Settings → Domains → Add Domain
- Trỏ DNS record tới Vercel.

### Cập nhật CORS backend
Sau khi có domain, update `ALLOWED_ORIGINS` trên Railway:
```
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```
Nếu dùng custom domain:
```
ALLOWED_ORIGINS=https://aura.yourdomain.com
```

---

## 4. Kết nối Database (Supabase) — Optional

Xem docs/VERCEL_MIGRATION.md để biết chi tiết.

---

## 5. Troubleshooting

### Lỗi "Cannot connect to backend"
- Kiểm tra `NEXT_PUBLIC_API_URL` đúng chưa.
- Kiểm tra `ALLOWED_ORIGINS` trên Railway chứa Vercel URL.
- Kiểm tra Railway backend đang running (không sleep mode).

### Lỗi CORS
- `ALLOWED_ORIGINS` phải match CHÍNH XÁC frontend URL (có https, không có trailing slash).
- Nhiều origins thì phân cách bằng dấu phẩy.

### Cold start chậm
- Railway free tier: service sleep sau 30 phút không active.
- Dùng Railway Pro hoặc thử UptimeRobot để keep alive.

---

## 6. Architecture Summary

```
                                    ┌─────────────────────────┐
                                    │       Vercel            │
                                    │   Next.js Frontend      │
                                    │   Port 3000             │
                                    │                         │
                                    │   /api/* → proxy to     │
                                    │   BACKEND_ORIGIN env    │
                                    └────────────┬────────────┘
                                                 │ fetch(NEXT_PUBLIC_API_URL)
                                                 │ https://aura-backend.up.railway.app
                                                 ▼
                                    ┌─────────────────────────┐
                                    │       Railway           │
                                    │   FastAPI Backend       │
                                    │   Port 8000 (uvicorn)   │
                                    │                         │
                                    │   /health               │
                                    │   /api/*                │
                                    └────────────┬────────────┘
                                                 │ HTTPS
                                                 ▼
                                    ┌─────────────────────────┐
                                    │    Google Gemini API    │
                                    │    gemini-3.1-flash-lite│
                                    └─────────────────────────┘
```
