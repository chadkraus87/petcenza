import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

/**
 * "A new version is available" toast.
 *
 * The service worker precaches the app shell, so without this an already-open tab keeps serving
 * the previous build after a deploy — the change looks like it never shipped. Registration uses
 * `prompt` mode, so the new worker waits until the user opts in rather than swapping content out
 * mid-edit.
 *
 * Also surfaces the offline-ready state once, since this app is explicitly offline-capable and
 * that's worth telling people.
 */
export default function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW()

  if (!offlineReady && !needRefresh) return null

  const dismiss = () => { setOfflineReady(false); setNeedRefresh(false) }

  return (
    <div role="status" aria-live="polite"
      className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,26rem)]
                 bg-ink text-paper rounded-card shadow-lg px-4 py-3 flex items-center gap-3">
      <p className="text-sm flex-1">
        {needRefresh ? 'A new version of PetCenza is ready.' : 'Ready to work offline.'}
      </p>
      {needRefresh && (
        <button onClick={() => void updateServiceWorker(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-paper text-ink px-3 py-1.5 text-sm font-medium">
          <RefreshCw size={14} aria-hidden /> Update
        </button>
      )}
      <button onClick={dismiss} aria-label="Dismiss" className="text-paper/70 hover:text-paper">
        <X size={16} />
      </button>
    </div>
  )
}
