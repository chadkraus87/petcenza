import { Link } from 'react-router-dom'
import { LegalShell, H2, P, UL } from './LegalPage'

/**
 * Public account-deletion instructions.
 *
 * Google Play requires a deletion URL reachable WITHOUT installing the app or signing in, and
 * Apple expects the path to be discoverable. So this page explains the process and what happens,
 * and links into the in-app control — it does not try to delete anything itself.
 */
export default function DeleteAccountInfo() {
  return (
    <LegalShell title="Deleting your PetCenza account" updated="10 August 2026">
      <P>
        You can delete your PetCenza account yourself, at any time, without contacting us. It takes
        about thirty seconds.
      </P>

      <H2>How to do it</H2>
      <UL>
        <li>Sign in to PetCenza.</li>
        <li>Go to <strong>Settings</strong>.</li>
        <li>Scroll to <strong>Delete your account</strong>.</li>
        <li>Type your email address to confirm, then choose <strong>Permanently delete</strong>.</li>
      </UL>
      <P>
        <Link to="/settings" className="text-moss underline">Open Settings</Link> — you'll be asked
        to sign in first.
      </P>

      <H2>Take your records first</H2>
      <P>
        Deletion is permanent and there is no undo. The same Settings page has a{' '}
        <strong>Download my data</strong> button that gives you everything — every pet, every
        record, and links to your photos and documents — in one file. It's free, and it works
        whether or not you have a subscription. We'd rather you kept a copy.
      </P>

      <H2>What gets deleted</H2>
      <UL>
        <li>Your profile, email address, and settings.</li>
        <li>Pets only you own, and every record, photo and document attached to them.</li>
        <li>Your vets, emergency contacts, tags, and reminders.</li>
        <li>Any invitations you had sent that were still outstanding.</li>
      </UL>

      <H2>What does not get deleted</H2>
      <UL>
        <li>
          <strong>Pets you co-own with someone else.</strong> These pass to the other owner with
          their history intact. Closing your account never destroys records another person still
          depends on.
        </li>
        <li>
          <strong>Pets that were shared with you.</strong> They belong to someone else; only your
          access is removed.
        </li>
        <li>
          Transaction records, if you ever paid us. Tax and accounting law requires we keep those.
          They are kept separately from your pet records.
        </li>
      </UL>

      <H2>Timing</H2>
      <P>
        Deletion is immediate — the records are gone from the live service as soon as you confirm.
        Encrypted backups are rotated within 30 days, after which the data cannot be recovered by
        anyone, including us.
      </P>

      <H2>Need help?</H2>
      <P>
        If you can't get into your account to delete it, email{' '}
        <a className="text-moss underline" href="mailto:support@petcenza.com">support@petcenza.com</a>{' '}
        from the address on the account and we'll take care of it.
      </P>
    </LegalShell>
  )
}
