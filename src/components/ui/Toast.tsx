import { useEffect, useState } from 'react'

/**
 * A single global toast with an optional Undo. Kept as a tiny module-level store rather than a
 * context so any hook can raise one without threading providers through the tree.
 */
interface Toast { id: number; message: string; onUndo?: () => void }

let toasts: Toast[] = []
const listeners = new Set<(t: Toast[]) => void>()
const emit = () => listeners.forEach(l => l(toasts))
let seq = 0

export function showToast(message: string, onUndo?: () => void, ms = 6000) {
  const t = { id: ++seq, message, onUndo }
  toasts = [...toasts, t]; emit()
  setTimeout(() => dismiss(t.id), ms)
  return t.id
}

export function dismiss(id: number) {
  toasts = toasts.filter(t => t.id !== id); emit()
}

export function Toaster() {
  const [list, setList] = useState<Toast[]>(toasts)
  useEffect(() => { listeners.add(setList); return () => { listeners.delete(setList) } }, [])
  if (list.length === 0) return null
  const t = list[list.length - 1]
  return (
    // Sits above the phone tab bar. role=status so screen readers hear it without stealing focus.
    <div role="status" aria-live="polite"
      className="fixed inset-x-0 bottom-20 md:bottom-6 z-40 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg bg-ink text-paper pl-4 pr-2 py-2 shadow-lg shadow-ink/20 max-w-md">
        <span className="text-sm">{t.message}</span>
        {t.onUndo && (
          <button onClick={() => { t.onUndo!(); dismiss(t.id) }}
            className="btn min-h-10 px-3 text-paper underline underline-offset-4 hover:bg-paper/10">
            Undo
          </button>
        )}
      </div>
    </div>
  )
}
