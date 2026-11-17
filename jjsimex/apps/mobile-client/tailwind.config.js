/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0D0D0D',
          card: '#1A1A1A',
          card2: '#2A2A2A',
          orange: '#22C55E',
          'orange-dark': '#C2600A',
          green: '#22C55E',
          red: '#EF4444',
          gray: '#9CA3AF',
          border: '#2A2A2A',
        },
      },
      fontFamily: {
        sora: ['Sora_400Regular'],
        'sora-bold': ['Sora_700Bold'],
      },
    },
  },
  plugins: [],
};
