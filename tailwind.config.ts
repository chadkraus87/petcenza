import type { Config } from 'tailwindcss'

// PetCenza tokens — sampled directly from the background artwork (public/bg-wide.webp).
// Every foreground/background pairing was contrast-checked: ink 8.9:1 on paper, moss 5.1:1 and
// alert 4.9:1 on card, signal 4.7:1 on card — all WCAG AA or better. The pastel tones straight
// out of the artwork are far too light to use as text, so ink/moss/signal/alert are darkened
// members of the same hue families. Re-check contrast if you retune them.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#154A5C',        // deep teal — primary text & dark chrome
        moss: '#227695',       // interactive / links (token name kept to avoid churn)
        paper: '#EFF6F9',      // page background, matches the artwork's pale wash
        card: '#FFFFFF',
        line: '#CFE3EA',       // soft teal borders
        signal: '#A8641A',     // due-soon / refill ochre
        alert: '#C4462F',      // overdue, severe allergy
        calm: '#7FC4D4',       // info accent, the artwork's mid waves
        coral: '#FD9582',      // decorative accent (the hearts) — fills only, too light for text
        wave: '#D9EFF3'        // artwork mid-wave tone, for subtle fills
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
