import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#000000',
        surface: {
          DEFAULT: '#09090b',
          subtle: '#121214',
          muted: '#18181b',
          border: '#27272a',
          hover: '#1f1f23',
        },
        primary: {
          DEFAULT: '#ffffff',
          foreground: '#000000',
        },
        grade: {
          excellent: '#22c55e', // 9-10
          good: '#3b82f6',      // 7-8
          average: '#eab308',   // 5-6
          low: '#f97316',       // 3-4
          critical: '#ef4444',  // 1-2
        }
      },
      fontFamily: {
        mono: ['SF Mono', 'ui-monospace', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
