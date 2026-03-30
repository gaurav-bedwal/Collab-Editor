/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['"Outfit"', '"Plus Jakarta Sans"', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
        'sans': ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        'beige-soft': '#F5F5DC',     // soft beige
        'brown-light': '#D2B48C',    // light brown
        'brown-dark': '#5C4033',     // dark brown
        'cream-bg': '#FFFDD0',       // cream
        charcoal: '#5C4033',       // Replaced charcoal with dark brown for visibility
        
        // Semantic aliases
        primary: '#F5F5DC',
        secondary: '#D2B48C',
        accent: '#5C4033',
        background: '#FFFDD0',
        text: '#5C4033',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'blob': 'blob 10s infinite',
        'gradient-x': 'gradientX 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        gradientX: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
    },
  },
  safelist: [
    'w-7', 'h-7', 'w-8', 'h-8',
    'bg-red-50', 'bg-blue-50', 'bg-green-50', 'bg-amber-50',
    'text-red-500', 'text-blue-500', 'text-green-500', 'text-amber-500',
  ],
  plugins: [],
}
