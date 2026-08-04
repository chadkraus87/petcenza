import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextField, SelectField, TextArea } from '@/components/ui/Field'

/**
 * Regression guard for the "Required under a filled-in field" bug.
 *
 * The Field primitives are used as `<TextField {...register('name')} />`. register() returns a
 * `ref`, and React drops `ref` for plain function components — so without forwardRef, RHF never
 * saw the elements. The nastiest case was a <select> left on its default: no onChange ever
 * fires, so RHF held no value at all and validation failed no matter what the user did.
 */

const schema = z.object({
  name: z.string().min(1, 'Required'),
  species: z.enum(['dog', 'cat']),
  notes: z.string().optional()
})
type Values = z.infer<typeof schema>

function Harness({ onValid }: { onValid: (v: Values) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { species: 'dog' }
  })
  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <TextField label="Name" error={errors.name} {...register('name')} />
      <SelectField label="Species" error={errors.species} {...register('species')}>
        <option value="dog">dog</option>
        <option value="cat">cat</option>
      </SelectField>
      <TextArea label="Notes" {...register('notes')} />
      <button type="submit">Save</button>
    </form>
  )
}

describe('Field primitives with react-hook-form', () => {
  it('submits a typed value and an UNTOUCHED select default', async () => {
    const user = userEvent.setup()
    const onValid = vi.fn()
    render(<Harness onValid={onValid} />)

    await user.type(screen.getByLabelText('Name'), 'Red')
    // Species is deliberately left alone — this is the case that used to fail.
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onValid).toHaveBeenCalledTimes(1)
    expect(onValid.mock.calls[0][0]).toMatchObject({ name: 'Red', species: 'dog' })
  })

  it('does not show a validation error on a field that has a value', async () => {
    const user = userEvent.setup()
    render(<Harness onValid={vi.fn()} />)

    await user.type(screen.getByLabelText('Name'), 'Red')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('still reports genuinely empty required fields', async () => {
    const user = userEvent.setup()
    const onValid = vi.fn()
    render(<Harness onValid={onValid} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onValid).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent('Required')
  })

  it('captures a changed select and a textarea', async () => {
    const user = userEvent.setup()
    const onValid = vi.fn()
    render(<Harness onValid={onValid} />)

    await user.type(screen.getByLabelText('Name'), 'Mochi')
    await user.selectOptions(screen.getByLabelText('Species'), 'cat')
    await user.type(screen.getByLabelText('Notes'), 'Indoor only')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onValid.mock.calls[0][0]).toMatchObject({
      name: 'Mochi', species: 'cat', notes: 'Indoor only'
    })
  })
})
