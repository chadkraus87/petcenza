# PetCenza design system

The source of truth for how PetCenza looks and behaves. Derived from the shipped code, not from
intentions: tokens live in `tailwind.config.ts`, shared styles in `src/index.css`, and shared
components in `src/components/ui/primitives.tsx`. If this file and the code disagree, the code is
right and this file needs updating.

## What the interface is for

One question, the moment the app opens: **does anything need attention today?** Across every pet
in a home, for every person who cares for them.

- **Mode: operate.** People are completing a task, often anxiously and one-handed. Scanability,
  consistency and honesty outrank expression.
- **Safety over tidiness.** A missed dose matters more than a clean list. Nothing a user entered
  is ever silently dropped, hidden or guessed at.
- **Honest by default.** Every claim on screen (reminders, backups, privacy, offline) must be
  true in the code. Insights are "worth mentioning to your vet", never a diagnosis.

## Two surfaces

| Surface | Where | Background |
|---|---|---|
| **Welcome** | Sign-in, sign-up, legal, invite, vet share | Illustrated artwork (`bg-app.webp` portrait under 768px, `bg-wide.webp` above) behind a paper scrim |
| **App** | Everything signed in (inside `.app-shell`) | Soft `wave` to `paper` tint. No artwork: it competed with records and sat under headers on phones |

The switch is CSS only: `body:has(.app-shell)::before` replaces the artwork, so app screens never
download it.

## Colour

| Token | Hex | Role | Rules |
|---|---|---|---|
| `ink` | `#154A5C` | Primary text, **the one primary button colour**, dark chrome | 9.7:1 on white |
| `moss` | `#227695` | Links, accents, selected states | Never a primary button fill |
| `paper` | `#EFF6F9` | Page background | |
| `card` | `#FFFFFF` | Surfaces | |
| `line` | `#CFE3EA` | Borders, dividers | |
| `muted` | `#487280` | Secondary text | 5.26:1 on card, 4.81:1 on paper |
| `wave` | `#D9EFF3` | Subtle fills, hover, avatar placeholders | |
| `calm` | `#7FC4D4` | Informational accent | Fills and icons, not body text |
| `signal` | `#A8641A` | Needs attention, due soon | 4.66:1 on white |
| `alert` | `#C4462F` | Urgent, overdue, severe allergy, destructive | 4.92:1 on white |
| `coral` | `#FD9582` | Decorative only (hearts, memorial) | Too light for text |

**Never use `text-ink/NN` for text.** Ink at 40 to 70% opacity fails WCAG AA for body text (50% is
2.6:1). Use `text-muted`. Opacity on ink is fine for fills, shadows and dividers.

Meaning is never carried by colour alone: urgency rows pair colour with a distinct icon and a
visible label.

## Type

- **Display:** Bricolage Grotesque (variable), on `h1` to `h3`.
- **Body:** Public Sans (variable).
- **Self-hosted** via `@fontsource-variable`. Never Google Fonts: the CSP is `font-src 'self'`, and
  a Google request would send visitors' IPs to a third party the privacy policy doesn't list.

| Role | Style |
|---|---|
| Page title | `h1` base: `text-3xl md:text-4xl tracking-tight` (use `PageHeader`) |
| Title on a single-card screen (sign-in, invite, share) | `text-2xl` |
| Section heading | `h2`, `text-lg` or `text-xl` |
| Secondary text | `text-sm text-muted` |

Headings balance their lines (`text-wrap: balance`). Copy is sentence case.

## Shape and spacing

- **Radius:** surfaces `rounded-card` (14px); controls `rounded-lg` (8px); chips, avatars and tab
  indicators `rounded-full`. No other radii.
- **Page gutters:** `px-4 py-6 sm:px-6 lg:px-8`, centred, `max-w-3xl` to `max-w-6xl` by content.
- **App grid column:** `minmax(0, 1fr)`, never `1fr`. A plain `1fr` column's minimum is its
  content, and a wide child (the pet tab strip) pushed pages off-screen.

## Components

### Surfaces and controls (`src/index.css`)

| Class | Use |
|---|---|
| `.surface` | Every card |
| `.btn` + `.btn-primary` | The main action. One per view where possible |
| `.btn-secondary` | Everything else a button does |
| `.btn-ghost` | Low-emphasis inline actions and links styled as buttons |
| `.btn-danger` / `.btn-danger-outline` | Destructive actions |
| `.btn-icon` | Icon-only buttons. Always `aria-label` |
| `.field` | Inputs and selects (`Field.tsx` wraps it with label and error) |

React equivalents (`Button`, `ButtonLink`, `Card`) render the same classes. Variant class names are
written out literally in `primitives.tsx` because Tailwind purges classes built from template
strings.

### Patterns (`src/components/ui/primitives.tsx` and friends)

- **`PageHeader`:** title, optional subtitle and actions. The only way to title a page.
- **`EmptyState`:** teaches rather than reports. Title, then *why this is worth filling in*, then at
  most one action. Every claim in the body must be true ("you'll get a reminder a week before the
  booster is due" is backed by the auto-reminder trigger).
- **`PageSkeleton` / `Skeleton`:** loading placeholders shaped like the content. No bare
  "Loading…" text on routes.
- **Toast (`showToast`):** one at a time, `role="status"`, sits above the phone tab bar. Carries an
  Undo where an action is reversible.
- **`Disclaimer`:** the standing medical and reminder disclaimers, placed next to the feature they
  describe. Wording lives in one constant so it can't drift.
- **`DoseToggle`:** a dose's status (Overdue, Due now, Later, or "Given 5:34 PM by you") plus its
  control. The same component on Today and on Medication rounds, so they can't disagree.
- **`PetAvatar`:** photo with explicit dimensions, falling back to the initial, including when a
  signed URL expires mid-session.

## Interaction rules

1. **44px minimum** for every tap target. Chips may be smaller visually (24px) with an invisible 44px
   hit area; **destructive icon buttons stay visibly 44px**, never an invisible hit area beside
   other controls.
2. **Destructive actions are undoable.** Record deletes hide immediately and send after a 6-second
   Undo window; nothing reaches the server or the offline queue until it closes. Closing the app
   inside the window keeps the record.
3. **Irreversible or permission-granting actions confirm:** ownership transfer, making someone a
   co-owner, account deletion (typed email).
4. **Offline-first.** Every write must survive being queued; show sync status on every screen size.
5. **Anything draggable has a non-drag path.** Calendar reminders can be moved with a date field.
6. **State that matters lives in the URL.** Pet sections are `?tab=…`, so Back, reload and links work.
7. **Focus is always visible:** a moss outline with a white inner ring, readable on any background.
   Skip link first in the tab order.
8. **Phones get five labelled tabs:** Today, Pets, Meds, Emergency, More. Emergency is one tap away
   on purpose.
9. **Emergency puts phone numbers first:** 24-hour clinic, then your vet, then personal contacts.

## Motion

CSS transitions only (colour, border, opacity, and a 1px press). No animation library.
`prefers-reduced-motion: reduce` disables all transitions and animations globally. Skeletons pulse
only under `motion-safe`.

## Accessibility baseline

WCAG 2.1 AA is the target; nothing has been independently audited, and the public accessibility
statement says so. Real `role="tablist"` tabs with arrow keys, labelled icon buttons, `aria-live`
toasts, form errors announced with `role="alert"`, decorative icons `aria-hidden`, and the
artwork removed under `prefers-contrast: more` and in print.

## Designing and reviewing

- `npm run dev:demo` runs every signed-in screen against in-memory sample data (no account needed).
  Add `?empty` for a brand-new account. Compiled out of every production build.
- Verify at 375px and desktop. Check for horizontal overflow and sub-44px targets before shipping.

## Decision log

| Date | Decision | Why |
|---|---|---|
| Sep 2026 | Artwork on welcome pages only | Competed with records; headers sat on illustrations on phones |
| Sep 2026 | Five labelled phone tabs, Emergency included | Eight unlabelled icons; emergency must not be behind a menu |
| Sep 2026 | Ink is the only primary button colour | Primary buttons were ink on some screens and moss on others |
| Sep 2026 | `text-muted` replaces ink opacity for text | 165 uses failed WCAG AA |
| Sep 2026 | Undo window for deletes, not confirm dialogs | Fast for tidying, forgiving for mistakes, safe offline |
| Sep 2026 | Pet page keeps its 15 sections, leads with a health summary | Summary answers most visits without an IA change |
| Sep 2026 | Shared dose log with "Mark given" | "Did you give her the pill?" is a household question |
