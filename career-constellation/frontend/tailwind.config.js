/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#252538',
        },
        cosmic: {
          blue: '#4ECDC4',
          pink: '#FF6B6B',
          purple: '#A29BFE',
          yellow: '#FECA57',
          cyan: '#48DBFB',
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(78, 205, 196, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(78, 205, 196, 0.8), 0 0 40px rgba(78, 205, 196, 0.4)' },
        },
      },
    },
  },
  plugins: [],
};
