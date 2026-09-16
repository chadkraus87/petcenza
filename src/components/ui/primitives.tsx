import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

/**
 * The shared building blocks. Before these existed the card surface was copy-pasted 46 times,
 * primary buttons had 9 variants, and page titles came in 7 sizes. Radius rule: surfaces use
 * rounded-card (14px), controls rounded-lg (8px), chips rounded-full. Controls are at least 44px
 * tall so they're comfortable to tap.
 */

export type Variant = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'ghost'

// Styles live in index.css so plain elements and these components share one source. Written out
// literally: Tailwind only keeps classes it can find as whole strings, so `btn-${variant}` would be
// purged from production CSS.
const VARIANT: Record<Variant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  danger: 'btn btn-danger',
  'danger-outline': 'btn btn-danger-outline',
  ghost: 'btn btn-ghost'
}

export const buttonClass = (variant: Variant = 'primary', extra = '') => `${VARIANT[variant]} ${extra}`

export function Button({ variant = 'primary', className = '', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" {...props} className={buttonClass(variant, className)} />
}

export function ButtonLink({ variant = 'primary', className = '', ...props }: LinkProps & { variant?: Variant }) {
  return <Link {...props} className={buttonClass(variant, className)} />
}

export function Card({ children, className = '', as: Tag = 'section', ...rest }:
  { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' } & Record<string, unknown>) {
  return <Tag {...rest} className={`surface ${className}`}>{children}</Tag>
}

/** One title scale for every page. */
export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1>{title}</h1>
        {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

/** Empty states teach: what goes here, and the one action that fills it. */
export function EmptyState({ icon, title, children, action }:
  { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-8 px-4">
      {icon && <div className="grid place-items-center size-12 rounded-full bg-wave text-moss mb-1" aria-hidden>{icon}</div>}
      <p className="font-display text-lg">{title}</p>
      {children && <p className="text-sm text-muted max-w-sm">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Placeholder shaped like the content it stands in for. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`rounded-lg bg-line/70 motion-safe:animate-pulse ${className}`} />
}

export function PageSkeleton() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-48 mb-2" />
      <Skeleton className="h-4 w-64 mb-8" />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </main>
  )
}
