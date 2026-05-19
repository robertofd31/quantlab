/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0a0a0f",
        secondary: "#12121a",
        card: "#1a1a2e",
        "card-hover": "#22223a",
        gold: {
          DEFAULT: "#f5a623",
          light: "#ffc857",
          dark: "#d4891c",
        },
        green: {
          DEFAULT: "#00d4aa",
          light: "#00ffcc",
        },
        red: {
          DEFAULT: "#ff4757",
          light: "#ff6b7a",
        },
        text: {
          primary: "#ffffff",
          secondary: "#a0a0b8",
          muted: "#6b6b80",
        },
        border: {
          DEFAULT: "#2a2a3e",
          light: "#3a3a52",
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
