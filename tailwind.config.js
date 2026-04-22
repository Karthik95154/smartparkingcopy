/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8b5cf6', // Violet
          hover: '#7c3aed',
          light: '#c4b5fd',
        },
        success: {
          DEFAULT: '#10b981',
          hover: '#059669',
          light: '#d1fae5',
        },
        danger: {
          DEFAULT: '#f43f5e',
          hover: '#e11d48',
          light: '#ffe4e6',
        },
        warning: {
          DEFAULT: '#f59e0b',
          hover: '#d97706',
          light: '#fef3c7',
        },
        surface: 'rgba(255, 255, 255, 0.85)',
        background: '#020617', // slate-950
        glass: {
          panel: 'rgba(30, 41, 59, 0.7)', // slate-800 translucent
          border: 'rgba(255, 255, 255, 0.15)',
          card: 'rgba(255, 255, 255, 0.85)' // light card inside dark bg
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'abstract-dark': "url('/bg-dark.png')",
      }
    },
  },
  plugins: [],
}
