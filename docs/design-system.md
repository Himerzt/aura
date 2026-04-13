# AURA Design System — "AURA GLOW" v2.1

> Rewrite 2026-04-13. Đọc file này trước khi viết bất kỳ UI code nào.
> File chính: `frontend/app/globals.css`, `frontend/tailwind.config.ts`, `frontend/lib/mood-context.tsx`.

---

## 1. Triết Lý Thiết Kế

**Core feeling:** Linear.app gặp northern lights. Layout cực tối giản, grid rộng rãi, không icon lộn xộn. Toàn bộ background là một hào quang (aura) mềm đổi màu + tốc độ theo `mood_state` của user. Giao diện như đang **thở** theo tâm trạng.

**Không phải:** Productivity app chói lọi. Health app xanh nhựa. Chatbot tím gradient sến.
**Là:** Ambient, minimal, mood-reactive. Mỗi pixel có lý do.

---

## 2. Color Tokens (CSS variables)

### 2.1 Surfaces + Text — contrast ≥ 4.5:1

| Token | Dark | Light |
|-------|------|-------|
| `--bg-primary`      | `#0a0a0f` | `#f5f4ef` |
| `--bg-surface`      | `#14141f` | `#ffffff` |
| `--bg-elevated`     | `#1c1c28` | `#fbfaf6` |
| `--bg-overlay`      | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.72)` |
| `--bg-overlay-hover`| `rgba(255,255,255,0.10)` | `rgba(255,255,255,0.88)` |
| `--border-subtle`   | `rgba(255,255,255,0.06)` | `rgba(20,20,40,0.07)` |
| `--border-default`  | `rgba(255,255,255,0.12)` | `rgba(20,20,40,0.14)` |
| `--border-strong`   | `rgba(255,255,255,0.22)` | `rgba(20,20,40,0.28)` |
| `--text-primary`    | `#f2f2f7` | `#13131f` |
| `--text-secondary`  | `#a8a8c0` | `#4f4f63` |
| `--text-tertiary`   | `#7a7a95` | `#74748a` |

**Lưu ý:** Light mode `--bg-overlay` là trắng đục (0.72 alpha), không phải bóng đen — để glass-card nổi rõ trên nền `#f5f4ef`.

### 2.2 Mood palette (5 states)

| Mood | `--mood-color` | `--mood-color-soft` | `--aura-speed` | `--aura-opacity` | Cảm giác |
|------|----------------|---------------------|---------------|------------------|----------|
| `energized`   | `#ff8c42` | `#ffb347` | 14s | 0.65 | Cháy nhẹ, dopamine buổi sáng |
| `stable`      | `#64b5f6` | `#a7d8ff` | 22s | 0.55 | Biển lặng, nhịp thở chậm |
| `anxious`     | `#b388ff` | `#80cbc4` | 18s | 0.58 | Tím rung + grain SVG |
| `overwhelmed` | `#ef5350` | `#ff8a80` | 12s | 0.62 | Đỏ dồn dập |
| `numb`        | `#78909c` | `#b0bec5` | 48s | 0.38 | Gần như chìm vào nền |

`--mood-glow` là alpha version của `--mood-color` (~0.35-0.55) dùng cho box-shadow và selection.

### 2.3 Typography

- **Heading** — `Sora` (Google), weight 600-700. Logo: `letter-spacing: 0.18em`.
- **Body** — `DM Sans`, weight 400-500.
- **Cấm:** Inter, Roboto, Arial, Cormorant, Playfair.

---

## 3. Mood Aura Background

### 3.1 Cơ chế
`<div class="aura-bg" aria-hidden>` được render ngay dưới `<body>`, fixed fullscreen, z-index 0, `filter: blur(90-120px)`, `opacity` theo mood. Pseudo-element `::before` + `::after` chứa 2 radial-gradient blob drift ngược chiều qua keyframe `auraDrift`, tốc độ lấy từ CSS var `--aura-speed`.

```css
.aura-bg::before { background: radial-gradient(closest-side, var(--mood-color), transparent 70%) 20% 30% / 60% 55%; }
.aura-bg::after  { background: radial-gradient(closest-side, var(--mood-color-soft), transparent 70%) 75% 70% / 55% 50%; }
```

### 3.2 Mood class apply
`MoodBody` (`frontend/lib/mood-context.tsx`) toggle class `mood-<state>` lên `<body>` mỗi khi `useMood().mood` đổi. Mỗi class override `--mood-color`, `--mood-color-soft`, `--mood-glow`, `--aura-speed`, `--aura-opacity` — toàn bộ CSS var con resolve lại mà không cần re-render React.

`mood-anxious` override thêm: `animation: auraJitter 2.8s` + grain SVG data URI (feTurbulence).
`mood-numb` override `--aura-blur: 120px` để chìm thêm.

Transition mood: `transition: opacity 0.8s ease, filter 0.8s ease`.

---

## 4. Animation Library

Tất cả keyframe khai báo trong `globals.css`. Utility class `.anim-*` dùng trực tiếp trong JSX.

| Keyframe | Utility class | Dùng khi | Duration |
|----------|---------------|----------|----------|
| `auraDrift`    | (auto, `.aura-bg`)        | 2 blob background | var(--aura-speed) |
| `auraJitter`   | (auto, `.mood-anxious`)   | Rung anxious | 2.8s |
| `gradientPan`  | `.gradient-text`          | Logo sweep | 10s |
| `typingDot`    | `.typing-dot`             | Chat indicator | 1.4s |
| `shimmer`      | `.skeleton`               | Skeleton loading | 1.5s |
| `fadeIn`       | `.anim-fade-in`           | Entry nhẹ | 0.5s |
| `fadeInUp`     | `.anim-fade-in-up`        | Entry section | 0.6s |
| `fadeInScale`  | `.anim-fade-in-scale`     | Card reveal | 0.5s |
| `slideInLeft`  | `.anim-slide-left`        | Bubble aura | 0.5s |
| `slideInRight` | `.anim-slide-right`       | Bubble user | 0.5s |
| `floatY`       | `.anim-float`             | Orb/decor nhẹ nhàng | 4s loop |
| `breathe`      | `.anim-breathe`           | MoodOrb breathing | 5s loop |
| `pulseGlow`    | `.anim-pulse-glow`        | CTA attention | 2.4s loop |
| `sheen`        | (auto, `.btn-mood:hover`) | Sweep shine button | 0.9s once |
| `sonarPing`    | `.sonar-ping`             | Attention ring | 2s loop |
| `rotateSlow`   | `.anim-rotate-slow`       | Decor rotate | 24s loop |
| `wobble`       | `.anim-wobble`            | Error shake | 1.2s loop |

### 4.1 Stagger helper
```html
<div class="stagger">
  <Card />  <!-- fade-in-up delay 0.05s -->
  <Card />  <!-- delay 0.15s -->
  <Card />  <!-- delay 0.25s -->
</div>
```
Hỗ trợ tối đa 8 con.

### 4.2 Hover helpers
- `.hover-lift` — translateY(-3px) + box-shadow `0 12px 32px var(--mood-glow)`
- `.hover-glow-text` — text color → mood-color + text-shadow mood-glow

### 4.3 Accessibility
`@media (prefers-reduced-motion: reduce)` → tất cả animation giảm về 0.01ms. Người dùng bật "reduce motion" trong OS sẽ không bị rung, không bị drift.

---

## 5. Component Specs

### 5.1 Glass Card (`.glass-card`)
```
backdrop-filter: blur(16px) saturate(140%)
background: var(--bg-overlay)
border: 1px var(--border-default)
border-radius: 16px
padding: 24px
hover: border-color mood, translateY(-2px), box-shadow 0 0 36px var(--mood-glow)
```

### 5.2 Surface Card (`.surface-card`)
Solid `var(--bg-surface)`, dùng khi cần opacity 100% (bảng data, form dài).

### 5.3 Button Primary (`.btn-mood`) — **prominence-focused**
```
padding: 14px 28px
min-height: 48px
border-radius: 14px
border: 1.5px solid color-mix(mood 70%, transparent)
background: linear-gradient(135deg, var(--mood-color), var(--mood-color-soft))
color: var(--btn-text)  /* #0a0a0f cả 2 mode */
font-weight: 600
box-shadow:
  0 4px 16px var(--mood-glow),
  0 12px 40px -8px var(--mood-glow),
  inset 0 1px 0 rgba(255,255,255,0.3)
```
**Hover:** translateY(-2px) + scale(1.015) + brightness(1.08) + sheen sweep qua `::before`.
**Active:** scale(0.98).
**Disabled:** opacity 0.45, grayscale 0.2.

### 5.4 Button Ghost (`.btn-ghost`)
Border `--border-strong`, background overlay blur. Hover → border + text đổi thành `--mood-color`, glow 24px.

### 5.5 Button Danger (`.btn-danger`)
Gradient 135° `#ef5350 → #ff7043`, text trắng, shadow đỏ.

### 5.6 Input Underline (`.input-underline`)
Transparent bg, `border-bottom: 1.5px var(--border-default)`. Focus → border-bottom mood + shadow 24px glow.

### 5.7 Chat Bubbles
- `.bubble-user` — phải, `color-mix(mood 22%, transparent)`, border tint mood 38%, radius 18/18/4/18, shadow mood
- `.bubble-aura` — trái, glassmorphism, border default, radius 18/18/18/4

### 5.8 Typing dot (`.typing-dot`)
7px circle, `background: var(--mood-color)`, `box-shadow: 0 0 10px var(--mood-glow)`, keyframe `typingDot 1.4s`.

### 5.9 Gradient Text (`.gradient-text`)
Dùng cho logo AURA. Background-clip text, gradient 5 stop đi qua `var(--text-primary)` giữa nên không bao giờ biến mất trên light/dark. Animation `gradientPan 10s`.

---

## 6. Spacing + Layout

- **Container max-width:** 640px (onboarding, morning, evening). Dashboard có thể rộng hơn.
- **Card padding:** 24px default.
- **Section gap:** ≥ 24px.
- **Scrollbar:** 6px, thumb `--border-strong`, hover → `--mood-color`.

---

## 7. Mood State Management

```tsx
// frontend/lib/mood-context.tsx
const { mood, setMood } = useMood()  // 'energized' | 'stable' | 'anxious' | 'overwhelmed' | 'numb'
setMood('anxious')  // body class = mood-anxious, aura đổi trong 0.8s
```

- `MoodProvider` wrap trong `app/layout.tsx`
- `MoodBody` là client component duy nhất re-render khi mood đổi; add/remove class `mood-*` trên `<body>` qua `useEffect`
- Default mood: `stable` (trang onboarding set thủ công vì chưa biết mood user)
- Khi `/api/morning` trả về `mood_state` → trang morning gọi `setMood(result.mood_state)`

---

## 8. Light / Dark Mode

- Default: Dark (`:root` == `[data-theme="dark"]`).
- Toggle: `frontend/lib/theme-context.tsx` → `[data-theme="light"]` trên `<html>`, persist vào `localStorage`.
- Tất cả màu trong v2.1 đã check WCAG AA (4.5:1) cho `text-primary` và `text-secondary` trên `bg-primary` ở cả 2 mode.
- `--btn-text` giữ nguyên `#0a0a0f` cả 2 mode vì mood gradient luôn đủ sáng.

---

## 9. File References

| File | Vai trò |
|------|---------|
| `frontend/app/globals.css`           | CSS vars, keyframes, `.aura-bg`, `.mood-*`, tất cả component utility |
| `frontend/tailwind.config.ts`        | Token mirror + Tailwind keyframes/animations |
| `frontend/lib/mood-context.tsx`      | `MoodProvider`, `MoodBody`, `useMood()` |
| `frontend/lib/theme-context.tsx`     | Dark/Light toggle |
| `frontend/app/layout.tsx`            | Load fonts Sora + DM Sans, wrap providers, render `.aura-bg` |
| `frontend/components/ui/Button.tsx`  | Wrapper cho `.btn-mood` / `.btn-ghost` / `.btn-danger` |
| `frontend/components/Navigation.tsx` | Sidebar + mobile bar, gradient-text logo |

---

## 10. Do / Don't

**DO**
- Luôn dùng CSS var thay vì hardcode màu (`var(--mood-color)`, không `#64b5f6`)
- Thêm `.anim-fade-in-up` hoặc `.stagger` cho entrance
- Dùng `.glass-card` cho 90% container; `.surface-card` khi cần opacity 100%
- Respect `prefers-reduced-motion` — không thêm animation ngoài library
- Test cả light + dark mode trước khi coi là xong

**DON'T**
- Không hardcode `#fff`, `#000` cho text (dùng `var(--text-primary)`)
- Không dùng Inter/Roboto/Arial/Cormorant/Playfair
- Không tạo button raw `<button>` — luôn qua `<Button />` hoặc class `.btn-mood`
- Không thêm `background: rgba(255,255,255,...)` cho card — dùng `var(--bg-overlay)`
- Không override `--mood-color` ngoài file `mood-*` class
