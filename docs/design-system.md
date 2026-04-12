# AURA Design System
## "Calm Luxury Dark" — Specification cho Frontend

> Đọc file này trước khi viết bất kỳ UI code nào.

---

## 1. Triết Lý Thiết Kế

**Core feeling:** Như đang ngồi trong một phòng tối yên tĩnh lúc 2 giờ sáng — không lo lắng, không bị phán xét. Ấm áp nhưng không ồn ào.

**Không phải:** Productivity app màu trắng chói lọi. Health app màu xanh lá cây nhựa. AI chatbot màu tím gradient.

**Là:** Minimalist luxury. Mỗi pixel có lý do tồn tại. Cảm giác như app được thiết kế riêng cho bạn.

---

## 2. Color Palette

```css
/* === BACKGROUNDS === */
--bg-void:        #080810;   /* Deepest background */
--bg-base:        #0C0C18;   /* Main app background */
--bg-surface:     #12121F;   /* Card surfaces */
--bg-elevated:    #1A1A2E;   /* Elevated elements, hover states */
--bg-overlay:     rgba(255, 255, 255, 0.04);  /* Glass overlay */

/* === BORDERS === */
--border-subtle:  rgba(255, 255, 255, 0.06);
--border-default: rgba(255, 255, 255, 0.10);
--border-strong:  rgba(255, 255, 255, 0.18);

/* === TEXT === */
--text-primary:   #F0EDE8;   /* Near-white, warm tint */
--text-secondary: #9B98A0;   /* Muted body text */
--text-tertiary:  #5C5965;   /* Placeholder, disabled */

/* === ACCENTS === */
--amber:          #F5A623;   /* Warm action color */
--amber-dim:      rgba(245, 166, 35, 0.15);
--amber-glow:     rgba(245, 166, 35, 0.30);

--ice:            #A8C4E0;   /* Cool secondary accent */
--ice-dim:        rgba(168, 196, 224, 0.12);

--sage:           #8FB8A0;   /* Positive/completion states */
--rose:           #D4848A;   /* Warning/risk states */

/* === MOOD COLORS (used for MoodOrb and badges) === */
--mood-energized:    #F5A623;   /* Warm amber */
--mood-stable:       #A8C4E0;   /* Cool ice blue */
--mood-anxious:      #C4A8E0;   /* Soft violet */
--mood-overwhelmed:  #D4848A;   /* Muted rose */
--mood-numb:         #5C6B7A;   /* Cold slate */
```

---

## 3. Typography

```css
/* Import trong layout.tsx */
/* Playfair Display: 400, 600 — Headlines, emotional copy */
/* DM Sans: 300, 400, 500 — Body, UI text */

--font-display: 'Playfair Display', Georgia, serif;
--font-body:    'DM Sans', system-ui, sans-serif;

/* Scale */
--text-xs:   0.75rem;   /* 12px — Labels, timestamps */
--text-sm:   0.875rem;  /* 14px — Secondary text */
--text-base: 1rem;      /* 16px — Body */
--text-lg:   1.125rem;  /* 18px — Emphasized body */
--text-xl:   1.25rem;   /* 20px — Card titles */
--text-2xl:  1.5rem;    /* 24px — Section headers */
--text-3xl:  1.875rem;  /* 30px — Page titles */
--text-4xl:  2.25rem;   /* 36px — Hero text */
```

**Usage rules:**
- `font-display` cho: page titles, mood labels, insight headers, encouragement copy
- `font-body` cho: tất cả còn lại
- Heading weight: 600 (display) hoặc 500 (body)
- Body weight: 300 cho long-form, 400 cho UI

---

## 4. Spacing & Layout

```css
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */

/* Container */
--container-max:  480px;   /* Mobile-first, single column */
--container-pad:  1.25rem; /* 20px horizontal padding */

/* Card */
--card-radius:  16px;
--card-padding: 24px;
```

---

## 5. Glass Morphism Cards

```css
/* Cách dùng cho tất cả card components */
.glass-card {
  background: var(--bg-overlay);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-default);
  border-radius: var(--card-radius);
  padding: var(--card-padding);
}

/* Hover state */
.glass-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--border-strong);
  transition: all 0.2s ease;
}
```

---

## 6. Animations

```css
/* Keyframes cần add vào tailwind.config.ts */

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 20px var(--glow-color, var(--amber-glow)); }
  50%       { box-shadow: 0 0 40px var(--glow-color, var(--amber-glow)),
                           0 0 80px var(--glow-color, var(--amber-dim)); }
}

@keyframes auraFloat {
  0%, 100% { transform: translateY(0px) scale(1); }
  50%       { transform: translateY(-6px) scale(1.02); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes checkPop {
  0%   { transform: scale(0); }
  60%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}
```

**Stagger pattern cho result reveal:**
```tsx
// Dùng animation-delay để stagger
<div style={{ animationDelay: '0ms' }}>   {/* MoodOrb */}
<div style={{ animationDelay: '200ms' }}> {/* InsightCard */}
<div style={{ animationDelay: '400ms' }}> {/* TaskCard(s) */}
```

---

## 7. Component Specifications

### MoodOrb

```tsx
// Orb tròn 120px, glow color theo mood
// Mood → color mapping:
const moodColors = {
  energized:    { primary: '#F5A623', glow: 'rgba(245,166,35,0.4)' },
  stable:       { primary: '#A8C4E0', glow: 'rgba(168,196,224,0.3)' },
  anxious:      { primary: '#C4A8E0', glow: 'rgba(196,168,224,0.3)' },
  overwhelmed:  { primary: '#D4848A', glow: 'rgba(212,132,138,0.3)' },
  numb:         { primary: '#5C6B7A', glow: 'rgba(92,107,122,0.2)' },
}

// Animation: glowPulse 3s ease-in-out infinite + auraFloat 6s ease-in-out infinite
// Inner: blurred circle, Outer: sharp ring
```

### TaskCard

```tsx
// Glass card với left border accent (amber)
// Uncompleted: border-l-2 border-amber
// Completed: border-l-2 border-sage, text line-through opacity-60, checkmark animation

// Structure:
// [checkbox] Title
//            Implementation intention (smaller, ice-blue text)
//            [duration badge] [framework badge]
```

### InsightCard

```tsx
// Wider glass card
// Top: framework name badge (uppercase, letter-spacing wide)
// Main: explanation text (font-display italic, text-lg)
// Bottom: "Tại sao điều này xảy ra" — expandable collapsible

// Border: subtle gradient từ amber/ice tùy framework
```

### StreakDisplay

```tsx
// Compact component cho dashboard
// Large number (font-display, 4xl) + "ngày liên tiếp"
// Shield icons dưới (filled = available shields)
// If streak = 0: không show shame — show "Hôm nay là ngày đầu"
```

### ChatBubble (onboarding)

```tsx
// AURA bubble: trái, background bg-elevated, rounded-tl-sm
// User bubble: phải, background amber-dim, rounded-tr-sm
// Typing indicator: 3 dots bounce animation
// Fade-in từng bubble
```

---

## 8. Navigation

**Desktop (≥768px):** Sidebar trái, 240px wide
```
Logo AURA (top)
---
◉ Dashboard
☀ Morning
✓ Checklist  
◐ Evening
---
● Streak badge (bottom)
```

**Mobile (<768px):** Bottom navigation bar
```
[Dashboard] [Morning] [Checklist] [Evening]
Icon + label nhỏ
Active: amber color + dot indicator
```

---

## 9. Loading States

**Skeleton loading (data fetch):**
```css
/* Shimmer effect trên placeholder */
background: linear-gradient(90deg,
  var(--bg-surface) 25%,
  var(--bg-elevated) 50%,
  var(--bg-surface) 75%
);
background-size: 200% auto;
animation: shimmer 1.5s linear infinite;
```

**Pipeline loading (Morning check-in — 3-5 giây):**
- MoodOrb pulsing glow (color: tím neutral)
- Text: "AURA đang lắng nghe..." → "Nhận diện pattern..." → "Chuẩn bị kế hoạch..."
- Cycle 3 messages với fade transition

---

## 10. Error States

```tsx
// Friendly error — không show raw error message
// Icon: ⚠ hoặc 🌙 (soft)
// Title: "Kết nối bị gián đoạn"
// Message: "AURA đang gặp sự cố nhỏ. Thử lại sau vài giây nhé."
// Button: "Thử lại" (retry action)
```

---

## 11. Tailwind Config Additions

```ts
// tailwind.config.ts
extend: {
  colors: {
    'midnight': {
      900: '#080810',
      800: '#0C0C18',
      700: '#12121F',
      600: '#1A1A2E',
    },
    'amber': '#F5A623',
    'ice': '#A8C4E0',
    'sage': '#8FB8A0',
    'rose-muted': '#D4848A',
  },
  fontFamily: {
    display: ['Playfair Display', 'Georgia', 'serif'],
    body: ['DM Sans', 'system-ui', 'sans-serif'],
  },
  animation: {
    'fade-in':    'fadeIn 0.4s ease forwards',
    'slide-up':   'slideUp 0.5s ease forwards',
    'glow-pulse': 'glowPulse 3s ease-in-out infinite',
    'aura-float': 'auraFloat 6s ease-in-out infinite',
    'shimmer':    'shimmer 1.5s linear infinite',
    'check-pop':  'checkPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  },
  keyframes: {
    fadeIn:    { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
    slideUp:   { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
    glowPulse: { '0%, 100%': { boxShadow: '0 0 20px var(--tw-shadow-color)' }, '50%': { boxShadow: '0 0 60px var(--tw-shadow-color)' } },
    auraFloat: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
    shimmer:   { '0%': { backgroundPosition: '-200% center' }, '100%': { backgroundPosition: '200% center' } },
    checkPop:  { '0%': { transform: 'scale(0)' }, '60%': { transform: 'scale(1.3)' }, '100%': { transform: 'scale(1)' } },
  },
}
```
