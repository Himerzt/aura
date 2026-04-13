import type { Config } from "tailwindcss";

/**
 * AURA GLOW — Design Tokens
 *
 * Concept: minimal, linear-like layout; background aura reacts to mood_state.
 * Dark mode default, light mode supported via [data-theme="light"].
 *
 * Fonts: Sora (headings) + DM Sans (body). Inter/Roboto/Arial are banned.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Base surfaces (dark default) ──
        'bg-primary':   '#0a0a0f',
        'bg-surface':   '#12121a',
        'text-primary': '#e8e8ed',
        'text-secondary': '#8888a0',

        // ── 5 Mood Aura palettes ──
        mood: {
          energized:   { DEFAULT: '#ff8c42', soft: '#ffb347' },
          stable:      { DEFAULT: '#64b5f6', soft: '#e0e7ff' },
          anxious:     { DEFAULT: '#b388ff', soft: '#80cbc4' },
          overwhelmed: { DEFAULT: '#ef5350', soft: '#c62828' },
          numb:        { DEFAULT: '#78909c', soft: '#b0bec5' },
        },
      },
      fontFamily: {
        // Heading — Sora, wide tracking, 600-700
        display: ['Sora', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'system-ui', 'sans-serif'],
        // Body — DM Sans
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        // Reveal
        'fade-in':       'fadeIn 0.5s ease forwards',
        'slide-up':      'slideUp 0.6s ease forwards',
        'slide-in-r':    'slideInRight 0.4s ease forwards',

        // Aura background — speed varies per mood
        'aura-fast':     'auraDrift 14s ease-in-out infinite alternate',
        'aura-medium':   'auraDrift 22s ease-in-out infinite alternate',
        'aura-slow':     'auraDrift 36s ease-in-out infinite alternate',
        'aura-jitter':   'auraJitter 2.8s ease-in-out infinite',
        'aura-breathe':  'auraBreathe 6s ease-in-out infinite',

        // Gradient text sweep for AURA logo
        'gradient-pan':  'gradientPan 10s linear infinite',

        // Typing indicator
        'typing-dot':    'typingDot 1.4s ease-in-out infinite',

        // Interactions
        'check-pop':     'checkPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'scale-in':      'scaleIn 0.2s ease forwards',

        // Loading shimmer
        'shimmer':       'shimmer 1.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },

        // Drifting blobs — same keyframe reused at different speeds
        auraDrift: {
          '0%':   { transform: 'translate(0%, 0%) scale(1)' },
          '50%':  { transform: 'translate(3%, -4%) scale(1.08)' },
          '100%': { transform: 'translate(-3%, 4%) scale(0.96)' },
        },
        auraJitter: {
          '0%, 100%': { transform: 'translate(0px, 0px)' },
          '25%':      { transform: 'translate(1px, -1px)' },
          '50%':      { transform: 'translate(-1px, 1px)' },
          '75%':      { transform: 'translate(1px, 1px)' },
        },
        auraBreathe: {
          '0%, 100%': { opacity: '0.85', transform: 'scale(1)' },
          '50%':      { opacity: '1',    transform: 'scale(1.03)' },
        },

        gradientPan: {
          '0%':   { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },

        typingDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)',    opacity: '0.35' },
          '30%':           { transform: 'translateY(-4px)', opacity: '1' },
        },

        checkPop: {
          '0%':   { transform: 'scale(0)' },
          '60%':  { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },

        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      backdropBlur: {
        'card': '14px',
        'aura': '80px',
      },
      boxShadow: {
        'glow-mood':  '0 0 32px var(--mood-glow)',
        'card':       '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-light': '0 4px 24px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
