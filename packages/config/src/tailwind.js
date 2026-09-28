/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand — deep emerald-teal "barangay security" identity
        brand: {
          50: '#eefbf7',
          100: '#d5f4ea',
          200: '#aee8d7',
          300: '#7cd5be',
          400: '#49baa1',
          500: '#2b9d87',
          600: '#1e7f6e',
          700: '#1a665a',
          800: '#185149',
          900: '#0f3b36',
          950: '#08221f',
        },
        // Ink — dark navy-teal for text & surfaces (CSS-variable driven so the
        // whole ramp flips in dark mode. Values are RGB triplets).
        ink: {
          DEFAULT: 'rgb(var(--ink-950) / <alpha-value>)',
          50: 'rgb(var(--ink-50) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          950: 'rgb(var(--ink-950) / <alpha-value>)',
        },
        // Sand — warm off-white neutrals (CSS-variable driven, themifies in dark)
        sand: {
          50: 'rgb(var(--sand-50) / <alpha-value>)',
          100: 'rgb(var(--sand-100) / <alpha-value>)',
          200: 'rgb(var(--sand-200) / <alpha-value>)',
          300: 'rgb(var(--sand-300) / <alpha-value>)',
          400: 'rgb(var(--sand-400) / <alpha-value>)',
          500: 'rgb(var(--sand-500) / <alpha-value>)',
          600: 'rgb(var(--sand-600) / <alpha-value>)',
        },
        safety: {
          DEFAULT: '#0f766e',
        },
      },
      fontFamily: {
        sans: ['Aileron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Aileron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        medium: '600',
        black: '800',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 45, 43, 0.04), 0 4px 16px rgba(16, 45, 43, 0.06)',
        'card-hover': '0 2px 4px rgba(16, 45, 43, 0.05), 0 12px 32px rgba(16, 45, 43, 0.10)',
        panel: '0 1px 2px rgba(13, 43, 42, 0.06), 0 8px 28px rgba(13, 43, 42, 0.08)',
        soft: '0 2px 10px rgba(16, 45, 43, 0.05)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      maxWidth: {
        '8xl': '88rem',
      },
    },
  },
  plugins: [],
};
