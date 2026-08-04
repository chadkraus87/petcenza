import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Render check for the medication rounds page.
 *
 * The parsing itself is covered in medSchedule.test.ts. What this pins down is the wiring: that
 * every bucket the planner can produce actually reaches the screen. The bug worth catching is a
 * medication that parses into a group the page forgets to render — it would vanish from the list
 * with no error anywhere, which for a prescription is the worst possible failure mode.
 */

const mockMeds = vi.hoisted(() => ({ current: [] as unknown[] }))

vi.mock('@/hooks/useMedSchedule', () => ({
  useMedSchedule: () => ({ data: mockMeds.current, isLoading: false, error: null })
}))
vi.mock('@/hooks/usePetPhotos', () => ({
  usePrimaryPhotos: () => ({ data: {} })
}))

import MedSchedulePage from '@/features/medications/MedSchedulePage'

const med = (over: Record<string, unknown>) => ({
  id: 'm1', pet_id: 'p1', petId: 'p1', petName: 'Biscuit',
  name: 'Apoquel', dosage: '5.4mg', frequency: 'Twice daily',
  starts_on: '2026-01-01', ends_on: null, instructions: null,
  prescriber_id: null, pharmacy: null, refill_due_on: null,
  side_effects: null, notes: null, updated_at: '2026-01-01', ...over
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><MedSchedulePage /></MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => { mockMeds.current = [] })

describe('MedSchedulePage', () => {
  it('groups a twice-daily med into morning and evening', () => {
    mockMeds.current = [med({})]
    renderPage()
    expect(screen.getByText('Morning')).toBeInTheDocument()
    expect(screen.getByText('Evening')).toBeInTheDocument()
    expect(screen.getAllByText('Apoquel')).toHaveLength(2)
  })

  it('shows which pet each dose belongs to', () => {
    mockMeds.current = [
      med({ id: 'a', petId: 'p1', petName: 'Biscuit', frequency: 'Once daily' }),
      med({ id: 'b', petId: 'p2', petName: 'Mochi', name: 'Gabapentin', frequency: 'Once daily' })
    ]
    renderPage()
    expect(screen.getByText('for Biscuit')).toBeInTheDocument()
    expect(screen.getByText('for Mochi')).toBeInTheDocument()
  })

  it('flags meds that must be given with food', () => {
    mockMeds.current = [med({ frequency: 'Once daily with food' })]
    renderPage()
    expect(screen.getByText('With food')).toBeInTheDocument()
  })

  it('separates as-needed meds from scheduled doses', () => {
    mockMeds.current = [med({ name: 'Trazodone', frequency: 'As needed for anxiety' })]
    renderPage()
    expect(screen.getByText('As needed')).toBeInTheDocument()
    expect(screen.queryByText('Morning')).not.toBeInTheDocument()
  })

  it('separates longer-cycle meds', () => {
    mockMeds.current = [med({ name: 'NexGard', frequency: 'Monthly' })]
    renderPage()
    expect(screen.getByText('On a longer cycle')).toBeInTheDocument()
    expect(screen.getByText('NexGard')).toBeInTheDocument()
  })

  it('surfaces unparseable frequencies instead of dropping them', () => {
    mockMeds.current = [med({ name: 'Mystery pill', frequency: 'ask Dr. Patel' })]
    renderPage()
    expect(screen.getByText('Needs a clearer schedule')).toBeInTheDocument()
    expect(screen.getByText('Mystery pill')).toBeInTheDocument()
  })

  it('renders every med somewhere, whatever the mix', () => {
    mockMeds.current = [
      med({ id: 'a', name: 'Alpha', frequency: 'BID' }),
      med({ id: 'b', name: 'Bravo', frequency: 'PRN' }),
      med({ id: 'c', name: 'Charlie', frequency: 'Weekly' }),
      med({ id: 'd', name: 'Delta', frequency: 'whenever' })
    ]
    renderPage()
    for (const name of ['Alpha', 'Bravo', 'Charlie', 'Delta']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    }
  })

  it('says so plainly when nothing is prescribed', () => {
    renderPage()
    expect(screen.getByText(/Nobody is on medication right now/)).toBeInTheDocument()
  })
})
