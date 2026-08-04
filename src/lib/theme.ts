/**
 * Palette values for consumers that can't use Tailwind classes — Recharts takes real colour
 * strings, not class names. Keep these in sync with tailwind.config.ts; they were previously
 * duplicated as loose hex literals inside the chart and silently kept the old scheme after a
 * redesign.
 */
export const theme = {
  ink: '#154A5C',
  moss: '#227695',
  paper: '#EFF6F9',
  card: '#FFFFFF',
  line: '#CFE3EA',
  signal: '#A8641A',
  alert: '#C4462F',
  calm: '#7FC4D4',
  coral: '#FD9582',
  wave: '#D9EFF3'
} as const
