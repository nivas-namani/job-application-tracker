import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 12px 35px rgba(21, 20, 28, 0.08)',
        card: '0 1px 2px rgba(21, 20, 28, 0.05)'
      },
      colors: {
        ink: '#14141c',
        muted: '#6b6b7a',
        violet: '#5b3df5',
        canvas: '#f8f8fb',
        column: '#f2f2f7'
      }
    }
  },
  plugins: []
} satisfies Config;
