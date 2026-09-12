/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1D4ED8",
          light: "#DBEAFE",
          dark: "#1E40AF",
          mid: "#93C5FD",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scan-paper': {
          '0%': { opacity: '0', transform: 'translate(0, -36px) scale(0.85)' },
          '8%': { opacity: '1', transform: 'translate(0, 0) scale(1)' },
          '38%': { opacity: '1', transform: 'translate(0, 0) scale(1)' },
          '42%': { opacity: '1', transform: 'translate(0, -6px) scale(1.02)' },
          '70%': { opacity: '0', transform: 'translate(8px, -172px) scale(0.32) rotate(8deg)' },
          '100%': { opacity: '0', transform: 'translate(8px, -172px) scale(0.32) rotate(8deg)' },
        },
        'scan-line-sweep': {
          '0%, 9%': { opacity: '0', transform: 'translateY(0)' },
          '10%': { opacity: '1', transform: 'translateY(0)' },
          '23%': { opacity: '1', transform: 'translateY(64px)' },
          '24%': { opacity: '1', transform: 'translateY(0)' },
          '37%': { opacity: '1', transform: 'translateY(64px)' },
          '38%, 100%': { opacity: '0', transform: 'translateY(0)' },
        },
        'scan-cloud-pulse': {
          '0%, 100%': { transform: 'translateY(0) scale(1)', filter: 'drop-shadow(0 0 0px rgba(29,78,216,0))' },
          '50%': { transform: 'translateY(-4px) scale(1)', filter: 'drop-shadow(0 0 0px rgba(29,78,216,0))' },
          '65%': { transform: 'translateY(-4px) scale(1.08)', filter: 'drop-shadow(0 0 16px rgba(29,78,216,0.55))' },
          '80%': { transform: 'translateY(-2px) scale(1.01)', filter: 'drop-shadow(0 0 4px rgba(29,78,216,0.25))' },
        },
        'scan-text': {
          '0%, 68%': { opacity: '0', transform: 'translateY(6px) scale(0.92)' },
          '76%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '92%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-4px) scale(0.96)' },
        },
        'scan-particle-1': {
          '0%, 43%': { opacity: '0', transform: 'translate(-10px, 0) scale(0.6)' },
          '47%': { opacity: '1', transform: 'translate(-6px, -34px) scale(0.9)' },
          '59%, 100%': { opacity: '0', transform: 'translate(2px, -112px) scale(0.4)' },
        },
        'scan-particle-2': {
          '0%, 49%': { opacity: '0', transform: 'translate(9px, 0) scale(0.6)' },
          '53%': { opacity: '1', transform: 'translate(11px, -44px) scale(0.9)' },
          '65%, 100%': { opacity: '0', transform: 'translate(4px, -122px) scale(0.4)' },
        },
        'scan-particle-3': {
          '0%, 55%': { opacity: '0', transform: 'translate(-4px, 0) scale(0.6)' },
          '59%': { opacity: '1', transform: 'translate(-9px, -52px) scale(0.9)' },
          '71%, 100%': { opacity: '0', transform: 'translate(0, -132px) scale(0.4)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out both',
        'scan-paper': 'scan-paper 6s ease-in-out infinite',
        'scan-line-sweep': 'scan-line-sweep 6s ease-in-out infinite',
        'scan-cloud-pulse': 'scan-cloud-pulse 6s ease-in-out infinite',
        'scan-text': 'scan-text 6s ease-in-out infinite',
        'scan-particle-1': 'scan-particle-1 6s ease-in-out infinite',
        'scan-particle-2': 'scan-particle-2 6s ease-in-out infinite',
        'scan-particle-3': 'scan-particle-3 6s ease-in-out infinite',
      },
    }
  },
  plugins: [],
}
