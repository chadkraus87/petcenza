import type { Config } from 'tailwindcss'

// PetCenza tokens — "field clinic" direction: spruce ink, paper surfaces, amber signal.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#22382F',        // deep spruce — primary text & chrome
        moss: '#4A6B5D',       // interactive / links
        paper: '#F6F7F4',      // app background
        card: '#FFFFFF',
        line: '#DDE3DD',
        signal: '#D89A2B',     // amber — reminders, due-soon
        alert: '#B23A2F',      // severe allergy / overdue
        calm: '#7FA8C9'        // info accents
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['"Public Sans"', 'system-ui', 'sans-serif']
      },
      borderRadius: { card: '14px' }
    }
  },
  plugins: []
} satisfies Config
