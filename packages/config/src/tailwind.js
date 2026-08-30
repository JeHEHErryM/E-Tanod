/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dce7fd',
          200: '#c0d4fb',
          300: '#94b7f7',
          400: '#6290f0',
          500: '#3d6be8',
          600: '#284dcc',
          700: '#223da5',
          800: '#213583',
          900: '#1f2f6c',
        },
        safety: {
          DEFAULT: '#0f766e',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
