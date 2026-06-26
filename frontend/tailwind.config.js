/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nature: {
          bg: '#FAF9F5',       // Warm linen cream background
          card: '#FFFFFF',     // Crisp white for card elements
          border: '#E2E8F0',   // Clean border slate
          borderSage: '#D1DDD4', // Soft sage/green-gray border
          text: '#1B3B2B',     // Rich deep forest green for primary typography
          textMuted: '#5C6E64', // Slate-sage muted green for body descriptions
          primary: '#2D5A27',  // Primary organic forest green (buttons, bold badges)
          primaryHover: '#1D3B19',
          leaf: '#3F7A48',     // Vibrant leaf green
          sage: '#84A98C',     // Calm sage green for accents
          sageLight: '#EAF0EB', // Pastel sage background fill
          gold: '#CDA03F',     // Muted organic amber/gold for warnings/criticals
          goldLight: '#FCF7EA', // Light amber background fill
          terracotta: '#B07D62', // Warm sandy terracotta clay color
          earth: '#7F5539',    // Natural bark brown
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'nature': '0 8px 30px rgba(45, 90, 39, 0.04)',
        'nature-lg': '0 10px 40px rgba(45, 90, 39, 0.08)',
        'nature-sm': '0 4px 15px rgba(45, 90, 39, 0.02)',
      }
    },
  },
  plugins: [],
}
