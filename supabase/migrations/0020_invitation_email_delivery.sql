-- ============================================================================
-- Track invitation email delivery.
--
-- Invitations have always been link-based: the owner creates one and sends the URL however they
-- like. That still works and remains the fallback. This adds an optional "email it for me" path,
-- so the owner records when a message actually went out and the UI can say so.
--
-- Only set by the send-invite edge function (service role). Nothing about it grants access — the
-- token is still the only capability.
-- ============================================================================

alter table public.pet_invitations
  add column email_sent_at timestamptz,
  add column email_send_count integer not null default 0;

-- The owner already has full RLS access to their own invitation rows, so no policy changes are
-- needed. The columns are informational.

comment on column public.pet_invitations.email_sent_at is
  'When the invitation was last emailed by the send-invite function. Null means link-only.';

-- Bookkeeping after a successful send. A function rather than a client-side read-then-write so
-- the increment is atomic, and so the edge function needs no direct write access to the table.
create or replace function public.mark_invitation_emailed(p_id uuid)
returns void
language sql security definer set search_path = public as $$
  update public.pet_invitations
     set email_sent_at = now(),
         email_send_count = email_send_count + 1
   where id = p_id;
$$;

-- Called only by the send-invite edge function, which holds the service key. It bypasses RLS, so
-- no client role may execute it.
revoke execute on function public.mark_invitation_emailed(uuid) from public, anon, authenticated;
grant execute on function public.mark_invitation_emailed(uuid) to service_role;
