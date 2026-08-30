/** @type {import('tailwindcss').Config} */
const base = require('@e-tanod/config/tailwind');
module.exports = {
  ...base,
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};
