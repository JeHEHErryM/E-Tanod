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
        // Ink — dark navy-teal for text & surfaces
        ink: {
          DEFAULT: '#0e2b2c',
          50: '#f3f7f7',
          100: '#e2eceb',
          200: '#c5d8d7',
          300: '#9bb9b8',
          400: '#6b9494',
          500: '#4a7575',
          600: '#3b5e5f',
          700: '#324d4e',
          800: '#2a3f40',
          900: '#1f3132',
          950: '#0e2b2c',
        },
        // Sand — warm off-white neutrals for a hand-crafted feel
        sand: {
          50: '#fbfaf8',
          100: '#f6f4ef',
          200: '#ece8df',
          300: '#ddd6c9',
          400: '#c4baaa',
          500: '#a8998a',
          600: '#8b7a6b',
        },
        safety: {
          DEFAULT: '#0f766e',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
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
