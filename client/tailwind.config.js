/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      colors: {
        navy: {
          900: '#060f26',
          800: '#0b1f4d',
          700: '#132e6d',
          600: '#1e408a',
        },
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        brand: {
          blue: '#1b4dff',
          accent: '#00c6ff',
          dark: '#071630',
        }
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(11, 31, 77, 0.08), 0 2px 6px -1px rgba(11, 31, 77, 0.04)',
        'glow': '0 0 25px -5px rgba(14, 165, 233, 0.5)',
      }
    },
  },
  plugins: [],
};
