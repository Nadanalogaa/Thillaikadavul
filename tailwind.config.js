/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        serif: ['Tangerine', 'cursive'],
      },
      colors: {
        'brand-primary': '#1a237e', // Indigo 900
        'brand-secondary': '#ffc107', // Amber 500
        'brand-light': '#e8eaf6', // Indigo 50
        'brand-dark': '#0d113d',
        'brand-purple': '#7B61FF',
        'light-purple': '#F4F2FF',
        'background': '#F7F8FC',
        'dark-text': '#1F2937',
        'light-text': '#6B7280',
      },
      animation: {
        'carousel-fade-in-down': 'fadeInDown 1s ease-out',
        'carousel-fade-in-up': 'fadeInUp 1s ease-out',
      },
      keyframes: {
        fadeInDown: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    }
  },
  plugins: [],
}