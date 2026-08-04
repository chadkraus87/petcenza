import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { PawPrint, LayoutDashboard, CalendarDays, Siren, Search, LogOut, WifiOff, Stethoscope, Settings, Pill } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRealtimeSync } from '@/hooks/useRealtime'
import { replay, watchConnectivity, pending } from '@/lib/outbox'
import SearchOverlay from './SearchOverlay'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pets', label: 'Pets', icon: PawPrint },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/meds', label: 'Meds', icon: Pill },
  { to: '/care-team', label: 'Care team', icon: Stethoscope },
  { to: '/emergency', label: 'Emergency', icon: Siren },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export default function AppShell() {
  const { signOut } = useAuth()
  const [online, setOnline] = useState(navigator.onLine)
  const [queued, setQueued] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      {/* Translucent so the artwork reads through the chrome; content cards stay solid. */}
      <aside className="hidden md:flex flex-col bg-ink/95 backdrop-blur-md text-paper p-4 gap-1 md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="font-display text-xl px-2 py-3 flex items-center gap-2"><PawPrint size={20} aria-hidden /> PetCenza</div>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-paper/15' : 'hover:bg-paper/10'}`}>
            <Icon size={16} aria-hidden /> {label}
          </NavLink>
        ))}
        <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-paper/10 text-left">
          <Search size={16} aria-hidden /> Search <kbd className="ml-auto text-[10px] opacity-60">⌘K</kbd>
        </button>
        <div className="mt-auto">
          {!online && <p className="flex items-center gap-2 text-xs text-signal px-3 py-2"><WifiOff size={14} aria-hidden /> Offline — changes will sync</p>}
          {online && queued > 0 && <p className="text-xs text-signal px-3 py-2">{queued} change{queued > 1 ? 's' : ''} syncing…</p>}
          <button onClick={signOut} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-paper/10 w-full">
            <LogOut size={16} aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <div className="pb-16 md:pb-0">
        <Outlet />
      </div>

      {/* Mobile tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-ink/95 backdrop-blur-md text-paper flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" aria-label="Primary">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} aria-label={label}
            className={({ isActive }) => `p-2 rounded-md ${isActive ? 'bg-paper/15' : ''}`}>
            <Icon size={20} aria-hidden />
          </NavLink>
        ))}
        <button aria-label="Search" onClick={() => setSearchOpen(true)} className="p-2"><Search size={20} aria-hidden /></button>
      </nav>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </div>
  )
}
