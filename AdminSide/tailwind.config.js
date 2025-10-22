/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#135918',
          50: '#f0f9f1',
          100: '#dcf2de',
          200: '#bce5c1',
          300: '#8fd399',
          400: '#5cb96a',
          500: '#3a9f47',
          600: '#2b8037',
          700: '#24652e',
          800: '#1f5227',
          900: '#135918',
          light: '#a8c3a0',
        },
        secondary: {
          DEFAULT: '#333333',
          50: '#f9f9f9',
          100: '#f3f3f3',
          200: '#e7e7e7',
          300: '#d1d1d1',
          400: '#b4b4b4',
          500: '#9a9a9a',
          600: '#818181',
          700: '#6a6a6a',
          800: '#5a5a5a',
          900: '#333333',
        },
        cream: {
          DEFAULT: '#fffcf0',
          50: '#fffcf0',
          100: '#fef9e3',
          200: '#fdf2c7',
          300: '#fbe8a6',
          400: '#f8d975',
          500: '#f5c842',
          600: '#e6b532',
          700: '#c19527',
          800: '#9d7622',
          900: '#7f5f1f',
        },
      },
    },
  },
  plugins: [],
}
