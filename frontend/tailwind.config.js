/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#FF5E1A',
          hover: '#E04D12',
          light: '#FFF0EA',
          soft: '#FF8C5A',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          muted: '#52525B',
        },
        warm: '#F9F8F6',
        line: '#E5E7EB',
      },
      boxShadow: {
        soft: '0 8px 30px rgb(0 0 0 / 0.04)',
        hover: '0 20px 40px rgb(255 94 26 / 0.10)',
        card: '0 20px 40px rgb(0 0 0 / 0.06)',
        dropdown: '0 10px 40px rgb(0 0 0 / 0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in': 'scale-in 0.4s ease-out both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
