import { Link } from 'react-router-dom'
import { PawPrint } from 'lucide-react'

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

        <article className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-6 sm:p-8">
          <h1 className="text-3xl mb-1">{title}</h1>
          <p className="text-sm text-muted mb-6">Last updated {updated}</p>
          <div className="prose-legal space-y-4 text-ink/80">{children}</div>
        </article>

        <nav className="flex flex-wrap gap-4 justify-center mt-6 text-sm text-muted">
          <Link to="/legal/privacy" className="hover:text-moss">Privacy</Link>
          <Link to="/legal/terms" className="hover:text-moss">Terms</Link>
          <Link to="/legal/delete-account" className="hover:text-moss">Delete your account</Link>
          <a href="mailto:support@petcenza.com" className="hover:text-moss">Support</a>
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
