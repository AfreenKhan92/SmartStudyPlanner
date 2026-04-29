/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink:     'var(--color-ink)',
        surface: 'var(--color-surface)',
        card:    'var(--color-card)',
        border:  'var(--color-border)',
        muted:   'rgb(var(--color-muted) / <alpha-value>)',
        ghost:   'var(--color-ghost)',
        text:    'var(--color-text)',
        accent:  { DEFAULT: '#5b8df6', dim: '#3a6ae0' },
        teal:    { DEFAULT: '#2dd4bf', dim: '#0f9488' },
        amber:   { DEFAULT: '#fbbf24', dim: '#d97706' },
        rose:    { DEFAULT: '#fb7185', dim: '#e11d48' },
        emerald: { DEFAULT: '#34d399', dim: '#059669' },
      },
      boxShadow: {
        glow:  '0 0 20px rgba(91,141,246,0.15)',
        card:  'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      animation: {
        'fade-in':   'fadeIn 0.4s ease-out',
        'slide-up':  'slideUp 0.4s ease-out',
        'pulse-glow':'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseGlow: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
};
