import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * Deleting a health record must be undoable. The contract: the row disappears at once, but no
 * delete is sent until the undo window closes; Undo sends nothing at all; and the delete still
 * happens if the panel unmounts first (e.g. the user switches tabs).
 */

const deleteEq = vi.hoisted(() => vi.fn(async () => ({ error: null })))
const lastToast = vi.hoisted(() => ({ undo: undefined as undefined | (() => void) }))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: () => ({ delete: () => ({ eq: deleteEq }), select: () => ({}) }) }
}))
vi.mock('@/lib/outbox', () => ({ enqueue: vi.fn() }))
vi.mock('@/components/ui/Toast', () => ({
  showToast: (_m: string, onUndo?: () => void) => { lastToast.undo = onUndo; return 1 }
}))

import { useDeleteRow } from '@/hooks/usePetRecords'

const rows = [{ id: 'm1', name: 'Levothyroxine' }, { id: 'm2', name: 'Carprofen' }]

function setup() {
  const qc = new QueryClient()
  qc.setQueryData(['medications', 'p1'], rows)
  const wrapper = ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  return { qc, ...renderHook(() => useDeleteRow('medications', 'p1'), { wrapper }) }
}

beforeEach(() => { vi.useFakeTimers(); deleteEq.mockClear(); Object.defineProperty(navigator, 'onLine', { value: true, configurable: true }) })
afterEach(() => vi.useRealTimers())

describe('useDeleteRow (undoable)', () => {
  it('sends nothing until the undo window closes, then deletes', async () => {
    const { result } = setup()
    act(() => result.current.mutate('m1'))
    await act(async () => { vi.advanceTimersByTime(5900) })
    expect(deleteEq).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(deleteEq).toHaveBeenCalledWith('id', 'm1')
  })

  it('Undo cancels the delete entirely', async () => {
    const { result } = setup()
    act(() => result.current.mutate('m1'))
    act(() => lastToast.undo!())
    await act(async () => { vi.advanceTimersByTime(10_000) })
    expect(deleteEq).not.toHaveBeenCalled()
  })

  it('still deletes if the panel unmounts during the undo window', async () => {
    const { result, unmount } = setup()
    act(() => result.current.mutate('m2'))
    unmount()
    await act(async () => { vi.advanceTimersByTime(6100) })
    expect(deleteEq).toHaveBeenCalledWith('id', 'm2')
  })
})

describe('useDeleteRow cache behaviour', () => {
  it('removes the row from view immediately and puts it back in place on Undo', () => {
    const { qc, result } = setup()
    act(() => result.current.mutate('m1'))
    expect(qc.getQueryData<{ id: string }[]>(['medications', 'p1'])!.map(r => r.id)).toEqual(['m2'])
    act(() => lastToast.undo!())
    expect(qc.getQueryData<{ id: string }[]>(['medications', 'p1'])!.map(r => r.id)).toEqual(['m1', 'm2'])
  })
})
