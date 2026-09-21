/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0e1a',
          800: '#111827',
          700: '#1a2234',
          600: '#243044',
          500: '#374357',
          400: '#6b7a94',
          300: '#9ca8b8',
        },
        neon: {
          green: '#00ff88',
          blue: '#00bbff',
          red: '#ff4444',
          orange: '#ff8800',
          yellow: '#ffcc00',
        },
      },
    },
  },
  plugins: [],
}
