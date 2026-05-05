/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette: clean, professional, cold
        brand: {
          50:  '#f0f7ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          500: '#1b73e8',
          600: '#155cc1',
          700: '#0f4694',
        },
      },
    },
  },
  plugins: [],
};
