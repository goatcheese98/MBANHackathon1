import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './app/**/*.{js,ts,jsx,tsx}',
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
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        light: {
          'primary': '#1e293b',
          'primary-content': '#ffffff',
          'secondary': '#64748b',
          'secondary-content': '#ffffff',
          'accent': '#3b82f6',
          'accent-content': '#ffffff',
          'neutral': '#374151',
          'neutral-content': '#ffffff',
          'base-100': '#f9fafb',
          'base-200': '#f3f4f6',
          'base-300': '#e5e7eb',
          'base-content': '#1f2937',
          'info': '#3b82f6',
          'info-content': '#ffffff',
          'success': '#22c55e',
          'success-content': '#ffffff',
          'warning': '#f59e0b',
          'warning-content': '#ffffff',
          'error': '#ef4444',
          'error-content': '#ffffff',
        },
      },
      'dark',
      'cupcake',
      'synthwave',
    ],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
  },
};
