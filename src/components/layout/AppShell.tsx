import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { PawPrint, LayoutDashboard, CalendarDays, Siren, Search, LogOut, WifiOff, Stethoscope, Settings, Pill, Menu, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRealtimeSync } from '@/hooks/useRealtime'
import { replay, watchConnectivity, pending } from '@/lib/outbox'
import SearchOverlay from './SearchOverlay'
import ErrorBoundary from './ErrorBoundary'

const nav = [
  { to: '/', label: 'Today', icon: LayoutDashboard },
  { to: '/pets', label: 'Pets', icon: PawPrint },
  { to: '/meds', label: 'Meds', icon: Pill },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/care-team', label: 'Care team', icon: Stethoscope },
  { to: '/emergency', label: 'Emergency', icon: Siren },
  { to: '/settings', label: 'Settings', icon: Settings }
]

// Decision (Sep 2026): five labelled tabs on phones. Emergency stays one tap away on purpose —
// nobody should be digging through a menu while their pet is in trouble.
const TABS = ['/', '/pets', '/meds', '/emergency']
const MORE = nav.filter(n => !TABS.includes(n.to))

export default function AppShell() {
  const { signOut } = useAuth()
  const { pathname } = useLocation()
  const [online, setOnline] = useState(navigator.onLine)
  const [queued, setQueued] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const more = useRef<HTMLDialogElement>(null)
  useRealtimeSync()

  useEffect(() => {
    const refreshQueue = () => void pending().then(p => setQueued(p.length))
    refreshQueue()
    const offOnline = watchConnectivity(async () => {
      setOnline(true)
      const { ok } = await replay()
      if (ok) refreshQueue()
    })
    const onOffline = () => setOnline(false)
    window.addEventListener('offline', onOffline)
    const t = setInterval(refreshQueue, 15_000)
    return () => { offOnline(); window.removeEventListener('offline', onOffline); clearInterval(t) }
  }, [])

  useEffect(() => { more.current?.close() }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app-shell min-h-screen md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      {/* Keyboard users would otherwise tab through every sidebar link on every page. */}
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 btn btn-primary">
        Skip to main content
      </a>
      {/* Translucent so the artwork reads through the chrome; content cards stay solid. */}
      <aside className="hidden md:flex flex-col bg-ink/95 backdrop-blur-md text-paper p-4 gap-1 md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="font-display text-xl px-2 py-3 flex items-center gap-2"><PawPrint size={20} aria-hidden /> PetCenza</div>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 min-h-10 text-sm ${isActive ? 'bg-paper/15 font-medium' : 'hover:bg-paper/10'}`}>
            <Icon size={16} aria-hidden /> {label}
          </NavLink>
        ))}
        <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-paper/10 text-left">
          <Search size={16} aria-hidden /> Search <kbd className="ml-auto text-[10px] opacity-60">⌘K</kbd>
        </button>
        <div className="mt-auto">
          {!online && <p className="flex items-center gap-2 text-xs text-signal px-3 py-2"><WifiOff size={14} aria-hidden /> Offline — changes will sync</p>}
          {online && queued > 0 && <p className="text-xs text-signal px-3 py-2">{queued} change{queued > 1 ? 's' : ''} syncing…</p>}
          <button onClick={signOut} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-paper/10 w-full">
            <LogOut size={16} aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <div id="content" tabIndex={-1} className="pb-24 md:pb-0 focus:outline-none">
        {/* The sidebar shows sync status on desktop; phones had no indicator at all. */}
        {(!online || queued > 0) && (
          <p role="status" className="md:hidden flex items-center justify-center gap-2 bg-signal/10 text-signal text-xs px-4 py-2">
            {!online
              ? <><WifiOff size={14} aria-hidden /> Offline — changes will sync when you reconnect</>
              : <>{queued} change{queued > 1 ? 's' : ''} syncing…</>}
          </p>
        )}
        <ErrorBoundary key={pathname}><Outlet /></ErrorBoundary>
      </div>

      {/* Mobile tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-ink text-paper grid grid-cols-5 pb-[env(safe-area-inset-bottom)]" aria-label="Primary">
        {nav.filter(n => TABS.includes(n.to)).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 min-h-14 text-[11px] ${isActive ? 'text-paper font-semibold' : 'text-paper/70'}`}>
            {({ isActive }) => (<>
              <span className={`grid place-items-center h-7 w-12 rounded-full ${isActive ? 'bg-paper/15' : ''}`}><Icon size={20} aria-hidden /></span>
              {label}
            </>)}
          </NavLink>
        ))}
        <button onClick={() => more.current?.showModal()} aria-haspopup="dialog"
          className="flex flex-col items-center justify-center gap-0.5 min-h-14 text-[11px] text-paper/70">
          <span className="grid place-items-center h-7 w-12"><Menu size={20} aria-hidden /></span>
          More
        </button>
      </nav>

      {/* Native <dialog>: focus trapping, Escape to close and inert background come for free. */}
      <dialog ref={more} aria-label="More"
        onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close() }}
        // Native Escape handling is inconsistent across mobile browsers; don't rely on it alone.
        onKeyDown={e => { if (e.key === 'Escape') e.currentTarget.close() }}
        className="md:hidden m-0 mt-auto w-full max-w-none rounded-t-card bg-card p-0 text-ink backdrop:bg-ink/40 overscroll-contain">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="font-display text-lg">More</p>
          <button onClick={() => more.current?.close()} aria-label="Close" className="grid place-items-center size-11 rounded-lg hover:bg-wave">
            <X size={20} aria-hidden />
          </button>
        </div>
        {/* Bottom padding keeps the last item clear of where the tab bar was: a double-tap on More
            otherwise landed its second tap squarely on Sign out. */}
        <ul className="px-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {MORE.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} className="flex items-center gap-3 rounded-lg px-3 min-h-12 hover:bg-wave">
                <Icon size={20} className="text-moss" aria-hidden /> {label}
              </NavLink>
            </li>
          ))}
          <li>
            <button onClick={() => { more.current?.close(); setSearchOpen(true) }} className="flex w-full items-center gap-3 rounded-lg px-3 min-h-12 hover:bg-wave">
              <Search size={20} className="text-moss" aria-hidden /> Search
            </button>
          </li>
          <li className="mt-2 pt-2 border-t border-line">
            <button onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-lg px-3 min-h-12 hover:bg-wave text-alert">
              <LogOut size={20} aria-hidden /> Sign out
            </button>
          </li>
        </ul>
      </dialog>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </div>
  )
}
