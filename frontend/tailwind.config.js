/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#121212',
          800: '#1a1a1a',
          700: '#222222',
          600: '#2e2e2e',
          500: '#3a3a3a',
          400: '#666666',
          300: '#999999',
        },
        light: {
          900: '#f5f5f5',
          800: '#eeeeee',
          700: '#e0e0e0',
          600: '#cccccc',
          500: '#aaaaaa',
          400: '#777777',
          300: '#444444',
        },
        neon: {
          green: '#00ff88',
          red: '#ff4444',
          orange: '#ff8800',
          yellow: '#ffcc00',
        },
      },
    },
  },
  plugins: [],
}
