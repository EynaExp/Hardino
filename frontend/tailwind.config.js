/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#000000',
          800: '#0a0a0a',
          700: '#111111',
          600: '#1a1a1a',
          500: '#222222',
          400: '#444444',
          300: '#888888',
        },
        neon: {
          green: '#00ff88',
          blue: '#00ff88',
          red: '#ff4444',
          orange: '#ff8800',
          yellow: '#ffcc00',
        },
      },
    },
  },
  plugins: [],
}
