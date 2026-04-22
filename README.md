# AURA — Artificial Understanding & Resolving Assistant

> AI life coach cá nhân hóa dựa trên tâm lý học hành vi.

## Cài Đặt Nhanh

```bash
# 1. Clone dự án
git clone https://github.com/YOUR_USERNAME/aura-new.git
cd aura-new

# 2. Tạo file .env
cp .env.example .env
# Mở .env, điền GEMINI_API_KEY

# 3. Khởi động
docker-compose up --build

# 4. Mở trình duyệt
# http://localhost
```

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python 3.12)
- **AI:** Google Gemini 2.5 Flash
- **Data:** JSON files (profile.json + history.json)
- **Infrastructure:** Docker Compose + Nginx

## Cấu Trúc Dự Án

```
AURA_NEW/
├── CLAUDE.md              ← Context cho Claude Code
├── docs/
│   ├── plan.md            ← Kế hoạch build 8 phần
│   ├── design-system.md   ← Design tokens + specs
│   └── api-spec.md        ← API documentation
├── .claude/
│   └── commands/          ← Slash commands cho Claude Code
├── backend/               ← FastAPI + 4 agents
└── frontend/              ← Next.js app
```

## Bắt Đầu Với Claude Code

```
Hãy đọc CLAUDE.md và docs/plan.md.
Tóm tắt dự án và hỏi nếu có câu hỏi. Chưa làm gì cả.
```

## Psychology Frameworks

AURA không phải chatbot motivational — nó chọn đúng framework can thiệp tâm lý theo trạng thái thực tế của người dùng: 80/20 Pareto, Behavioral Activation, Implementation Intention, Habit Stacking, Self-Compassion, Progress Principle, 2-Minute Rule, Dunning-Kruger Awareness.
