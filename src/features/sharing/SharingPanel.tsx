import { useState } from 'react'
import { Crown, Copy, Check, Trash2, Link2, LogOut, Stethoscope, Eye } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { fmtDate } from '@/lib/format'
import {
  usePetMembers, usePetInvitations, useIsPetOwner,
  useCreateInvitation, useRevokeInvitation, useUpdateMemberRole, useRemoveMember,
  useVetShareLinks, useCreateVetShareLink, useRevokeVetShareLink
} from '@/hooks/useSharing'
import type { ShareRole } from '@/types/db'

const ROLE_HELP: Record<string, string> = {
  viewer: 'Can read everything about this pet. Cannot change anything.',
  editor: 'Can add and edit records — meds, weights, visits, photos.'
}

export default function SharingPanel({ petId, petName }: { petId: string; petName: string }) {
  const { user } = useAuth()
  const { data: isOwner } = useIsPetOwner(petId)
  const { data: members } = usePetMembers(petId)
  const { data: invitations } = usePetInvitations(petId)
  const createInvite = useCreateInvitation(petId)
  const revokeInvite = useRevokeInvitation(petId)
  const updateRole = useUpdateMemberRole(petId)
  const removeMember = useRemoveMember(petId)

  const [role, setRole] = useState<Exclude<ShareRole, 'owner'>>('viewer')
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const vetLinks = useVetShareLinks(petId)
  const createVetLink = useCreateVetShareLink(petId)
  const revokeVetLink = useRevokeVetShareLink(petId)
  const [vetLabel, setVetLabel] = useState('')
  const [vetDays, setVetDays] = useState(7)

  const inviteUrl = (token: string) => `${location.origin}/invite/${token}`
  const vetUrl = (token: string) => `${location.origin}/share/${token}`

  async function copy(token: string, url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(token)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setError('Could not copy — select the link and copy it manually.')
    }
  }

  async function invite() {
    setError(null)
    try { await createInvite.mutateAsync({ role, email }); setEmail('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not create the invitation') }
  }

  return (
    <section>
      <h2 className="text-xl mb-1">Sharing</h2>
      <p className="text-sm text-ink/60 mb-4">
        Give someone else access to {petName} — a partner, a family member, or a pet sitter.
      </p>
      {error && <p role="alert" className="text-sm text-alert mb-4">{error}</p>}

      {/* ---------------------------------------------------------- members */}
      <ul className="space-y-2 mb-6">
        {members?.map(m => {
          const isMe = m.user_id === user?.id
          return (
            <li key={m.user_id} className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium flex items-center gap-2 truncate">
                  {m.display_name || m.email || 'Member'}
                  {isMe && <span className="text-xs text-ink/50">(you)</span>}
                  {m.is_owner && (
                    <span className="inline-flex items-center gap-1 text-xs text-moss">
                      <Crown size={12} aria-hidden /> Owner
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink/50 truncate">
                  {m.email}
                  {m.expires_at && <> · access ends {fmtDate(m.expires_at)}</>}
                </p>
              </div>

              {!m.is_owner && (
                <div className="flex items-center gap-2 shrink-0">
                  {isOwner ? (
                    <>
                      <select
                        aria-label={`Role for ${m.display_name || m.email}`}
                        value={m.role}
                        onChange={e => updateRole.mutate({ userId: m.user_id, role: e.target.value as 'viewer' | 'editor' })}
                        className="rounded-md border border-line px-2 py-1 text-sm bg-card">
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button onClick={() => removeMember.mutate(m.user_id)} className="text-alert"
                        aria-label={`Remove ${m.display_name || m.email}`}>
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : isMe ? (
                    <button onClick={() => removeMember.mutate(m.user_id)}
                      className="inline-flex items-center gap-1 text-sm text-alert">
                      <LogOut size={14} aria-hidden /> Leave
                    </button>
                  ) : (
                    <span className="text-sm text-ink/50 capitalize">{m.role}</span>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* ------------------------------------------------ owner-only controls */}
      {isOwner && (
        <>
          <div className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5 mb-6">
            <h3 className="font-medium mb-3">Invite someone</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="invite-role" className="block text-sm mb-1">Access level</label>
                <select id="invite-role" value={role}
                  onChange={e => setRole(e.target.value as 'viewer' | 'editor')}
                  className="w-full rounded-md border border-line px-3 py-2 bg-card">
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <p className="text-xs text-ink/50 mt-1">{ROLE_HELP[role]}</p>
              </div>
              <div>
                <label htmlFor="invite-email" className="block text-sm mb-1">
                  Lock to an email <span className="text-ink/50">(optional)</span>
                </label>
                <input id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="them@example.com"
                  className="w-full rounded-md border border-line px-3 py-2" />
                <p className="text-xs text-ink/50 mt-1">
                  Only this address can redeem the link. Leave blank for anyone with the link.
                </p>
              </div>
            </div>
            <button onClick={invite} disabled={createInvite.isPending}
              className="mt-3 rounded-md bg-ink text-paper px-5 py-2 text-sm disabled:opacity-50">
              {createInvite.isPending ? 'Creating…' : 'Create invite link'}
            </button>
          </div>

          {invitations && invitations.length > 0 && (
            <>
              <h3 className="font-medium mb-2">Pending invites</h3>
              <ul className="space-y-2">
                {invitations.map(inv => (
                  <li key={inv.id} className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm flex items-center gap-2">
                        <Link2 size={14} className="text-ink/40 shrink-0" aria-hidden />
                        <span className="capitalize">{inv.role}</span>
                        {inv.invited_email && <span className="text-ink/60 truncate">· {inv.invited_email}</span>}
                      </p>
                      <p className="text-xs text-ink/50">Expires {fmtDate(inv.expires_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => copy(inv.token, inviteUrl(inv.token))}
                        className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm">
                        {copied === inv.token
                          ? <><Check size={14} className="text-moss" aria-hidden /> Copied</>
                          : <><Copy size={14} aria-hidden /> Copy link</>}
                      </button>
                      <button onClick={() => revokeInvite.mutate(inv.id)} className="text-alert"
                        aria-label="Revoke invitation">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          {/* ------------------------------------------------- vet-share links */}
          <div className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5 mt-6">
            <h3 className="font-medium flex items-center gap-2 mb-1">
              <Stethoscope size={16} className="text-moss" aria-hidden /> Vet links
            </h3>
            <p className="text-sm text-ink/60 mb-3">
              A read-only summary — allergies, current meds, vaccinations, recent weights and
              visits — that a vet can open without an account. No sign-in, no editing, and it
              expires on its own. Anyone with the link can view it, so send it directly.
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label htmlFor="vet-label" className="block text-sm mb-1">Label (for your reference)</label>
                <input id="vet-label" value={vetLabel} onChange={e => setVetLabel(e.target.value)}
                  placeholder="Dr. Vasquez — dental consult"
                  className="w-full rounded-md border border-line px-3 py-2" />
              </div>
              <div>
                <label htmlFor="vet-days" className="block text-sm mb-1">Expires in</label>
                <select id="vet-days" value={vetDays} onChange={e => setVetDays(Number(e.target.value))}
                  className="rounded-md border border-line px-3 py-2 bg-card">
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
              <button
                onClick={() => createVetLink.mutate({ label: vetLabel, days: vetDays }, { onSuccess: () => setVetLabel('') })}
                disabled={createVetLink.isPending}
                className="rounded-md bg-moss text-paper px-5 py-2 text-sm disabled:opacity-50">
                {createVetLink.isPending ? 'Creating…' : 'Create vet link'}
              </button>
            </div>

            {vetLinks.data && vetLinks.data.length > 0 && (
              <ul className="space-y-2 mt-4">
                {vetLinks.data.map(l => (
                  <li key={l.id} className="rounded-md border border-line p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{l.label || 'Vet link'}</p>
                      <p className="text-xs text-ink/50 flex items-center gap-2">
                        Expires {fmtDate(l.expires_at)}
                        <span className="inline-flex items-center gap-1">
                          <Eye size={11} aria-hidden /> {l.view_count}
                          {l.last_viewed_at && <> · last {fmtDate(l.last_viewed_at)}</>}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => copy(l.token, vetUrl(l.token))}
                        className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm">
                        {copied === l.token
                          ? <><Check size={14} className="text-moss" aria-hidden /> Copied</>
                          : <><Copy size={14} aria-hidden /> Copy link</>}
                      </button>
                      <button onClick={() => revokeVetLink.mutate(l.id)} className="text-alert"
                        aria-label="Revoke vet link">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {isOwner === false && (
        <p className="text-sm text-ink/50">
          This pet is shared with you. Only the owner can invite others or change access.
        </p>
      )}
    </section>
  )
}
