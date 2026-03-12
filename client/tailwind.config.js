/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        village: {
          950: '#0e0c0a',
          900: '#1a1612',
          850: '#221e18',
          800: '#2a2420',
          750: '#342e28',
          700: '#3e3630',
          600: '#5a4e42',
          500: '#7a6a58',
          400: '#9a8a78',
          300: '#b8a890',
          200: '#d4c4aa',
        },
      },
    },
  },
  plugins: [],
};
