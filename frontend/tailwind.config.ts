import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          light:   '#60A5FA',
          dark:    '#1D4ED8',
          glow:    '#3B82F6',
        },
        navy: {
          DEFAULT: '#1A2D6B',
          light:   '#2D4A9E',
          dark:    '#0F1B45',
        },
        dark: {
          bg:      '#060B18',
          surface: '#0D1427',
          raised:  '#122040',
          border:  '#1A2E52',
        },
        light: {
          bg:      '#EDEDEF',
          surface: '#F8F8FA',
          border:  '#D8D8DC',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-barlow)', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs':  ['0.625rem', { lineHeight: '0.875rem' }],
        '8xl':  ['5.5rem',   { lineHeight: '1',       letterSpacing: '-0.02em' }],
        '9xl':  ['7rem',     { lineHeight: '1',       letterSpacing: '-0.02em' }],
        '10xl': ['8.5rem',   { lineHeight: '0.95',   letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        sm:      '0.375rem',
        lg:      '0.75rem',
        xl:      '1rem',
        '2xl':   '1.5rem',
      },
      boxShadow: {
        'glow-sm': '0 0 12px 0 rgba(37, 99, 235, 0.25)',
        'glow':    '0 0 24px 0 rgba(37, 99, 235, 0.35)',
        'glow-lg': '0 0 48px 0 rgba(37, 99, 235, 0.40)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-24px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in':      'fade-in 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.4s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
