import { forwardRef } from 'react'
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { FieldError } from 'react-hook-form'

/**
 * Form primitives.
 *
 * These MUST forward refs. They're used as `<TextField {...register('name')} />`, and
 * react-hook-form's register() returns a `ref` alongside name/onChange/onBlur. React does not
 * pass `ref` through props to a plain function component, so without forwardRef the ref is
 * silently dropped and RHF never gets a handle on the underlying element.
 *
 * The visible symptom was a form showing "Required" under fields that clearly had values —
 * worst for <select>, where an untouched default never fires onChange, so RHF held no value for
 * it at all and validation failed on every submit.
 */

const base = 'w-full rounded-md border border-line px-3 py-2 bg-card'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: FieldError }

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, ...props }, ref) {
    const id = props.id ?? props.name
    return (
      <div>
        <label htmlFor={id} className="block text-sm mb-1">{label}</label>
        <input ref={ref} id={id} className={base} aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined} {...props} />
        {error && <p id={`${id}-err`} role="alert" className="text-xs text-alert mt-1">{error.message}</p>}
      </div>
    )
  }
)

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: FieldError }

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ label, error, children, ...props }, ref) {
    const id = props.id ?? props.name
    return (
      <div>
        <label htmlFor={id} className="block text-sm mb-1">{label}</label>
        <select ref={ref} id={id} className={base} aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined} {...props}>{children}</select>
        {error && <p id={`${id}-err`} role="alert" className="text-xs text-alert mt-1">{error.message}</p>}
      </div>
    )
  }
)

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: FieldError }

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ label, error, ...props }, ref) {
    const id = props.id ?? props.name
    return (
      <div>
        <label htmlFor={id} className="block text-sm mb-1">{label}</label>
        <textarea ref={ref} id={id} rows={3} className={base} aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined} {...props} />
        {error && <p id={`${id}-err`} role="alert" className="text-xs text-alert mt-1">{error.message}</p>}
      </div>
    )
  }
)
