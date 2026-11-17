/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F8F4E8',
        ink: '#09090B',
        acid: '#D2E823',
        acidHover: '#BCE010',
      },
      fontFamily: {
        dela: ['"Dela Gothic One"', 'cursive', 'sans-serif'],
        space: ['"Space Grotesk"', 'sans-serif'],
      },
      boxShadow: {
        'hard-xs': '1px 1px 0px 0px #09090B',
        'hard-sm': '2px 2px 0px 0px #09090B',
        'hard': '4px 4px 0px 0px #09090B',
        'hard-lg': '8px 8px 0px 0px #09090B',
        'hard-xl': '12px 12px 0px 0px #09090B',
        'hard-acid': '6px 6px 0px 0px #D2E823',
      },
      animation: {
        'marquee': 'marquee 20s linear infinite',
        'float': 'float 3s ease-in-out infinite alternate',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%': { transform: 'translateY(0px)' },
          '100%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

