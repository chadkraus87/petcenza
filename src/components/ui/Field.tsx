import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { FieldError } from 'react-hook-form'

const base = 'w-full rounded-md border border-line px-3 py-2 bg-card'

export function TextField({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: FieldError }) {
  const id = props.id ?? props.name
  return (
    <div>
      <label htmlFor={id} className="block text-sm mb-1">{label}</label>
      <input id={id} className={base} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props} />
      {error && <p id={`${id}-err`} role="alert" className="text-xs text-alert mt-1">{error.message}</p>}
    </div>
  )
}

export function SelectField({ label, error, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: FieldError }) {
  const id = props.id ?? props.name
  return (
    <div>
      <label htmlFor={id} className="block text-sm mb-1">{label}</label>
      <select id={id} className={base} aria-invalid={!!error} {...props}>{children}</select>
      {error && <p role="alert" className="text-xs text-alert mt-1">{error.message}</p>}
    </div>
  )
}

export function TextArea({ label, error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: FieldError }) {
  const id = props.id ?? props.name
  return (
    <div>
      <label htmlFor={id} className="block text-sm mb-1">{label}</label>
      <textarea id={id} rows={3} className={base} aria-invalid={!!error} {...props} />
      {error && <p role="alert" className="text-xs text-alert mt-1">{error.message}</p>}
    </div>
  )
}
