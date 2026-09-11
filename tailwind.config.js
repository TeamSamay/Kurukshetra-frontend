/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fdfdfb',
          100: '#fbfbf8',
          200: '#f6f6f2',
          300: '#efefe9',
          400: '#e5e5dc',
        },
        brand: {
          yellow: '#f8c858',
          yellowLight: '#fde89c',
          yellowDark: '#e5b138',
          dark: '#1e1e22',
          darkCard: '#1f1f21',
          darkHover: '#2a2a2f',
          accent: '#2563eb',
        },
        soc: {
          bg:     '#f6f6f2',
          panel:  '#ffffff',
          border: '#e8eaed',
          hover:  '#f0f1f3',
        }
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
        '4xl': '36px',
        'pill': '9999px',
      },
      boxShadow: {
        'soft-card': '0 8px 30px -4px rgba(0, 0, 0, 0.03), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        'float-card': '0 20px 40px -10px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'pill-dark': '0 4px 14px rgba(0, 0, 0, 0.2)',
        'pill-yellow': '0 4px 14px rgba(248, 200, 88, 0.35)',
      }
    },
  },
  plugins: [],
}
