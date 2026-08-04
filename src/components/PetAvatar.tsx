import { useEffect, useState } from 'react'

/**
 * A pet's profile photo, falling back to their initial.
 *
 * Lives on its own rather than inside PetList because the dashboard uses it too, and PetList is a
 * lazy-loaded route — importing from it would pull that whole route into the dashboard chunk.
 */
export function PetAvatar({ name, url, size = 'md' }: {
  name: string
  url?: string
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'w-10 h-10 text-base' : 'w-16 h-16 text-2xl'
  // Signed URLs last an hour. If one expires while the page is still open, fall back to the
  // initial rather than leaving a broken-image icon on screen.
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [url])

  // Decorative in both branches: the pet's name is always right beside it in the markup.
  if (url && !failed) {
    return (
      <img src={url} alt="" aria-hidden loading="lazy" onError={() => setFailed(true)}
        className={`${dim} rounded-full object-cover border border-line shrink-0 bg-wave`} />
    )
  }
  return (
    <span aria-hidden
      className={`${dim} rounded-full grid place-items-center shrink-0 bg-wave text-ink/50 font-display`}>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
