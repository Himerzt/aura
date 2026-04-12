import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'midnight': {
          900: '#080810',
          800: '#0C0C18',
          700: '#12121F',
          600: '#1A1A2E',
        },
        'amber':        '#F5A623',
        'ice':          '#A8C4E0',
        'sage':         '#8FB8A0',
        'rose-muted':   '#D4848A',
        'violet-muted': '#C4A8E0',
        'slate-cool':   '#5C6B7A',
        'ivory': {
          100: '#FAF7F2',
          200: '#F5F0E8',
          300: '#EDE7DC',
          400: '#E4DBCC',
        },
      },
      fontFamily: {
        // Primary luxury display — headlines, emotional copy
        display: ['Cormorant Garamond', 'Playfair Display', 'Georgia', 'serif'],
        // Secondary display — subheadings, insight text
        serif: ['Playfair Display', 'Georgia', 'serif'],
        // UI body text
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        // Reveal
        'fade-in':     'fadeIn 0.4s ease forwards',
        'slide-up':    'slideUp 0.5s ease forwards',
        'slide-in-r':  'slideInRight 0.4s ease forwards',

        // MoodOrb
        'glow-pulse':  'glowPulse 3s ease-in-out infinite',
        'aura-float':  'auraFloat 6s ease-in-out infinite',

        // Background aurora
        'aurora-shift': 'auroraShift 28s ease-in-out infinite alternate',

        // Loading / shimmer
        'shimmer':     'shimmer 1.5s linear infinite',

        // Interactions
        'check-pop':   'checkPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'scale-in':    'scaleIn 0.2s ease forwards',

        // Text glow pulse (for AURA logo)
        'glow-text':   'glowText 4s ease-in-out infinite',

        // Streak milestone
        'celebrate':   'celebrate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        // ── Reveal ──
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

        // ── MoodOrb ──
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px var(--tw-shadow-color)' },
          '50%':      { boxShadow: '0 0 60px var(--tw-shadow-color), 0 0 100px var(--tw-shadow-color)' },
        },
        auraFloat: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%':      { transform: 'translateY(-8px) scale(1.02)' },
        },

        // ── Aurora background ──
        auroraShift: {
          '0%':   { transform: 'translate(0%, 0%) rotate(0deg)' },
          '25%':  { transform: 'translate(2%, 3%) rotate(2deg)' },
          '50%':  { transform: 'translate(-2%, 1%) rotate(-1deg)' },
          '75%':  { transform: 'translate(1%, -2%) rotate(3deg)' },
          '100%': { transform: 'translate(-1%, 2%) rotate(-2deg)' },
        },

        // ── Loading ──
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },

        // ── Interactions ──
        checkPop: {
          '0%':   { transform: 'scale(0)' },
          '60%':  { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        celebrate: {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '60%':  { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },

        // ── Text glow ──
        glowText: {
          '0%, 100%': {
            textShadow: '0 0 20px rgba(245,166,35,0.3), 0 0 40px rgba(245,166,35,0.15)',
          },
          '50%': {
            textShadow: '0 0 30px rgba(245,166,35,0.5), 0 0 60px rgba(245,166,35,0.25)',
          },
        },
      },
      backdropBlur: {
        'card': '12px',
      },
      boxShadow: {
        'glow-amber': '0 0 20px rgba(245, 166, 35, 0.3)',
        'glow-ice':   '0 0 20px rgba(168, 196, 224, 0.3)',
        'glow-rose':  '0 0 20px rgba(212, 132, 138, 0.3)',
        'glow-violet':'0 0 20px rgba(196, 168, 224, 0.3)',
        'card':       '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-light': '0 4px 24px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
