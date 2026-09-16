import { Link } from 'react-router-dom'
import { PawPrint } from 'lucide-react'

/**
 * Every public contact address, in one place. A privacy policy whose contact bounces fails
 * CalOPPA outright, so these must be real, monitored inboxes. public/.well-known/security.txt is a
 * static file and has to be kept in step by hand.
 */
// ponytail: one shared inbox until the LLC and a real domain exist; split these then.
const INBOX = 'kraushaustech@gmail.com'
export const CONTACT = { support: INBOX, privacy: INBOX, security: INBOX } as const

/** The legal operator — a person until the LLC is formed. Update this line when it is. */
export const OPERATOR = 'Chad Kraus'

/**
 * Shown next to every control that can CREATE an account — including "Continue with Google", which
 * signs a brand-new user up without ever visiting the sign-up form. Placed before the buttons, not
 * after, so the terms are seen before the click that accepts them.
 */
export function ConsentNotice() {
  return (
    <p className="text-xs text-muted leading-relaxed mb-3">
      By continuing you agree to our{' '}
      <Link className="text-moss underline" to="/legal/terms">Terms</Link> and{' '}
      <Link className="text-moss underline" to="/legal/privacy">Privacy Policy</Link>.
      PetCenza keeps records — it does not give veterinary advice.
    </p>
  )
}

/**
 * Shared shell for the public legal pages.
 *
 * These must be reachable WITHOUT an account: payment processors, Apple and Google all check the
 * URL before a human ever signs in, and a privacy policy behind a login is not a published
 * privacy policy. So they live outside <Protected>.
 */
export function LegalShell({ title, updated, children }: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 font-display text-xl mb-8 text-ink">
          <PawPrint size={20} aria-hidden /> PetCenza
        </Link>

        <article className="surface p-6 sm:p-8">
          <h1 className="mb-1">{title}</h1>
          <p className="text-sm text-muted mb-6">Last updated {updated}</p>
          <div className="prose-legal space-y-4 text-ink/80">{children}</div>
        </article>

        <nav className="flex flex-wrap gap-4 justify-center mt-6 text-sm text-muted">
          <Link to="/legal/privacy" className="inline-flex items-center min-h-11 hover:text-moss">Privacy</Link>
          <Link to="/legal/terms" className="inline-flex items-center min-h-11 hover:text-moss">Terms</Link>
          <Link to="/legal/delete-account" className="inline-flex items-center min-h-11 hover:text-moss">Delete your account</Link>
          <Link to="/legal/accessibility" className="inline-flex items-center min-h-11 hover:text-moss">Accessibility</Link>
          <a href="/third-party-licenses.txt" className="inline-flex items-center min-h-11 hover:text-moss">Licenses</a>
          <a href={`mailto:${CONTACT.support}`} className="inline-flex items-center min-h-11 hover:text-moss">Support</a>
        </nav>
      </div>
    </main>
  )
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl text-ink mt-8 mb-2">{children}</h2>
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed">{children}</p>
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1 text-[15px] leading-relaxed">{children}</ul>
}
