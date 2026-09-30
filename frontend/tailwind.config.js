/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens backed by CSS vars
        app:     'var(--bg-app)',
        card:    'var(--bg-card)',
        card2:   'var(--bg-card2)',
        hover:   'var(--bg-hover)',
        line:    'var(--border)',
        fg:      'var(--text)',
        muted:   'var(--text-muted)',
        primary: 'var(--primary)',
        accent:  'var(--accent)',

        // Brand palette tokens
        'navy-900': 'var(--navy-900)',
        'navy-800': 'var(--navy-800)',
        'navy-700': 'var(--navy-700)',
        'navy-600': 'var(--navy-600)',
        'navy-500': 'var(--navy-500)',
        'navy-400': 'var(--navy-400)',
        'navy-300': 'var(--navy-300)',
        'navy-200': 'var(--navy-200)',
        'navy-100': 'var(--navy-100)',
        'navy-50':  'var(--navy-50)',

        'red-700':  'var(--red-700)',
        'red-600':  'var(--red-600)',
        'red-400':  'var(--red-400)',
        'red-300':  'var(--red-300)',
        'red-100':  'var(--red-100)',
        'red-50':   'var(--red-50)',

        success: {
          text: 'var(--badge-success-text)',
          bg:   'var(--badge-success-bg)',
          DEFAULT: 'var(--success-text)',
        },
        warning: {
          text: 'var(--badge-warning-text)',
          bg:   'var(--badge-warning-bg)',
          DEFAULT: 'var(--warning-text)',
        },
        danger: {
          text: 'var(--badge-danger-text)',
          bg:   'var(--badge-danger-bg)',
          DEFAULT: 'var(--danger-text)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-in':   'slideIn 0.3s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'spin-slow':  'spin 2s linear infinite',
        'count-up':   'countUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn:  { '0%': { opacity: '0', transform: 'translateX(20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        slideUp:  { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        countUp:  { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};