/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        mk: {
          green:  '#0FCB46',
          dark:   '#0A0E0B',
          cream:  '#F4F5F0',
          yellow: '#FFE249',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Archivo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
