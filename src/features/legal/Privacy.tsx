import { LegalShell, H2, P, UL } from './LegalPage'

/**
 * Privacy policy.
 *
 * Written against the ACTUAL schema and the actual subprocessor list rather than from a template,
 * because under FTC Section 5 this document is an enforceable promise: describing practices the
 * code doesn't have is itself the violation. Anything claimed here is verifiable in the repo.
 *
 * NOTE FOR REVIEW: has not been reviewed by a lawyer. See docs/LAUNCH_CHECKLIST.md.
 */
export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="10 August 2026">
      <P>
        PetCenza is a place to keep your pets' health records. This policy explains what we store,
        why, and what control you have. We have tried to write it in plain language rather than
        legalese.
      </P>

      <H2>The short version</H2>
      <UL>
        <li>We store the pet records you enter, and your account details. Nothing else.</li>
        <li>We do not sell or share your personal information. There are no advertising trackers
          and no analytics in this app.</li>
        <li>You can export everything, at any time, in one click — free.</li>
        <li>You can delete your account yourself, and it is permanent.</li>
      </UL>

      <H2>What we collect</H2>
      <UL>
        <li><strong>Account:</strong> your email address, display name, and timezone.</li>
        <li><strong>Pet records:</strong> everything you choose to enter — species, breed, birth
          date, vaccinations, medications, vet visits, weights, allergies, feeding and nutrition,
          grooming, behaviour notes, and free-text notes.</li>
        <li><strong>Uploads:</strong> photos and documents you upload, including scanned records
          from your veterinarian.</li>
        <li><strong>Contacts you enter about other people:</strong> your vet's and emergency
          contacts' names, phone numbers and addresses. See below.</li>
        <li><strong>Security metadata:</strong> sign-in timestamps and, for abuse prevention, a
          one-way hash of your IP address. We do not store raw IP addresses.</li>
      </UL>

      <H2>What we do not do</H2>
      <P>
        We do not sell or rent your personal information. We do not share it for advertising. We
        run no analytics, advertising pixels, or third-party tracking scripts of any kind — you can
        verify this yourself in the public source code.
      </P>

      <H2>Information you provide about other people</H2>
      <P>
        When you add a veterinarian or an emergency contact, you are entering someone else's
        personal details. We store them so they appear in your records and on the emergency screen,
        and we display them to people you have shared that pet with. We never contact them, and we
        never market to them. Please only add people who are content for you to keep their details.
      </P>

      <H2>Sharing and vet links</H2>
      <P>
        You control who sees a pet. When you invite someone, they get the access level you chose —
        viewer, editor, or co-owner — and you can change or revoke it at any time.
      </P>
      <P>
        <strong>Vet share links work differently and you should understand them.</strong> A vet
        share link is a public web address that shows a read-only health summary for one pet to
        anyone who opens it, without signing in. That is deliberate — it is how a vet or a boarding
        kennel can see what they need without creating an account. It also means anyone who
        receives or forwards the link can view that summary until it expires or you revoke it.
        Links expire automatically, and you can revoke one at any time from the pet's sharing
        screen. Please send them directly to the person who needs them.
      </P>

      <H2>Who processes data for us</H2>
      <UL>
        <li><strong>Supabase</strong> — database, authentication, and file storage.</li>
        <li><strong>Vercel</strong> — application hosting.</li>
        <li><strong>Resend</strong> — sending invitation and reminder emails.</li>
        <li><strong>Cloudflare</strong> — Turnstile, which tells humans from bots at sign-up.</li>
        <li><strong>Google</strong> — only if you choose to sign in with a Google account.</li>
      </UL>
      <P>
        Each is bound by its own data processing agreement. We will update this list before adding
        anyone to it.
      </P>

      <H2>Cookies and local storage</H2>
      <P>
        We use only what the app needs to function: a cookie to keep you signed in, and local
        browser storage that holds a copy of your records so the app works offline and a queue of
        changes made while you had no connection. There are no tracking or advertising cookies, so
        there is no consent banner to click.
      </P>

      <H2>Keeping it safe</H2>
      <P>
        Data is encrypted in transit and at rest. Access is enforced in the database itself, per
        pet and per person, rather than only in the app — so a bug in the interface cannot expose
        another household's records. You can turn on two-factor authentication in Settings.
        Uploaded files are checked against their real file contents, not just their name.
      </P>
      <P>
        We do not claim to be "HIPAA compliant." HIPAA governs human medical records and does not
        apply to veterinary information; any product telling you otherwise is misusing the term.
      </P>

      <H2>How long we keep it</H2>
      <P>
        Your records stay until you delete them or close your account. Deleting your account is
        immediate and permanent. Deleted data is purged from our encrypted backups within 30 days,
        after which nobody — including us — can recover it. If you have paid us, we keep the
        transaction record for as long as tax and accounting law requires, separately from your
        pet records.
      </P>

      <H2>Your choices</H2>
      <UL>
        <li><strong>Export:</strong> Settings → Your data → Download my data.</li>
        <li><strong>Correct or delete individual records:</strong> edit or remove them in the app.</li>
        <li><strong>Delete your account:</strong> Settings → Delete your account.</li>
        <li><strong>Ask us anything:</strong> <a className="text-moss underline"
          href="mailto:privacy@petcenza.com">privacy@petcenza.com</a>.</li>
      </UL>

      <H2>Children</H2>
      <P>
        PetCenza is not directed at children under 13 and we do not knowingly collect their
        information. If you believe a child has created an account, please contact us and we will
        remove it.
      </P>

      <H2>Where we operate</H2>
      <P>
        PetCenza is offered to residents of the United States, and data is processed there. It is
        not currently offered to residents of the European Economic Area or the United Kingdom.
      </P>

      <H2>Changes</H2>
      <P>
        If we change this policy in a way that materially affects you, we will tell you in the app
        or by email before it takes effect. The date at the top always reflects the current
        version.
      </P>

      <H2>Contact</H2>
      <P>
        <a className="text-moss underline" href="mailto:privacy@petcenza.com">privacy@petcenza.com</a>
      </P>
    </LegalShell>
  )
}
