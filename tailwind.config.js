/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"Roboto Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        ink: {
          900: '#1a2035',
          800: '#202940',
          700: '#344767',
          500: '#67748e',
          400: '#7b809a',
          300: '#adb5bd',
        },
        brand: {
          50: '#fde8f0',
          400: '#ec407a',
          500: '#e91e63',
          600: '#d81b60',
        },
        canvas: '#f0f2f5',
      },
      boxShadow: {
        card: '0 20px 27px 0 rgba(0,0,0,0.05)',
        raised: '0 4px 20px 0 rgba(0,0,0,0.14), 0 7px 10px -5px rgba(233,30,99,0.4)',
        soft: '0 2px 6px -1px rgba(0,0,0,0.12)',
      },
      backgroundImage: {
        'brand-grad': 'linear-gradient(195deg, #ec407a, #d81b60)',
        'dark-grad': 'linear-gradient(195deg, #42424a, #191919)',
        'info-grad': 'linear-gradient(195deg, #49a3f1, #1A73E8)',
        'success-grad': 'linear-gradient(195deg, #66BB6A, #43A047)',
        'warn-grad': 'linear-gradient(195deg, #FFA726, #FB8C00)',
      },
    },
  },
  plugins: [],
}
