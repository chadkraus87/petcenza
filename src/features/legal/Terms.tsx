import { LegalShell, H2, P, UL } from './LegalPage'

/**
 * Terms of service.
 *
 * The two clauses that matter most are the veterinary disclaimer and the reminder-delivery
 * disclaimer. A missed reminder leading to a missed dose is the most probable claim against a
 * product like this, so that clause is stated plainly and is repeated in-app next to the feature
 * itself rather than only living here.
 *
 * NOTE FOR REVIEW: the limitation of liability, warranty disclaimer and dispute sections need a
 * licensed attorney before charging money. See docs/LAUNCH_CHECKLIST.md.
 */
export default function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="10 August 2026">
      <P>
        These terms are the agreement between you and PetCenza. By creating an account you accept
        them.
      </P>

      <H2>PetCenza is a record-keeping tool, not veterinary advice</H2>
      <P>
        <strong>
          PetCenza does not provide veterinary advice, diagnosis, or treatment. It organises
          information you enter. It is not a veterinarian and cannot assess your animal.
        </strong>{' '}
        Always follow your veterinarian's instructions, and contact them with any question about
        your pet's health. In an emergency, call your vet or an emergency animal hospital
        immediately — do not rely on this app.
      </P>
      <P>
        Anything the app highlights — a booster coming due, a change in weight, a refill date — is
        arithmetic performed on the records you typed in. It is a prompt to talk to your vet, never
        a clinical judgement.
      </P>

      <H2>Reminders are best-effort</H2>
      <P>
        <strong>
          Do not rely on PetCenza as your only reminder for a critical medication or vaccination.
        </strong>{' '}
        Whether a reminder reaches you depends on your device, your operating system, your
        notification settings, your network, and your email provider — most of which we do not
        control. Reminders may be delayed, duplicated, or not delivered at all. Keep a second
        method for anything that matters.
      </P>

      <H2>Medication schedules are interpreted from your text</H2>
      <P>
        When you record a medication frequency, PetCenza tries to read it and lay the doses out
        across the day. It handles common phrasings, but it is not infallible — and where it cannot
        confidently interpret something, it says so and shows the medication separately rather than
        guessing. Always check the schedule against your prescription label and your vet's
        directions. We do not convert or round dosage amounts; the app shows exactly what you
        entered.
      </P>

      <H2>Your records are yours</H2>
      <P>
        You keep all rights to what you put in. You grant us only the permission needed to run the
        service: to store your content, display it back to you and to people you have shared it
        with, back it up, and transmit it at your request. We do not use your content for anything
        else, and we do not train anything on it.
      </P>
      <P>
        You can export everything at any time, free, whether or not you have an active
        subscription. This will not change.
      </P>

      <H2>Sharing is your responsibility</H2>
      <P>
        You decide who to invite and who to send a vet share link to. A vet share link is viewable
        by anyone who has it, without an account, until it expires or you revoke it. You are
        responsible for who receives one.
      </P>
      <P>
        When you enter someone else's details — your vet, an emergency contact — you confirm you
        are entitled to do so, and you agree to cover us for any claim arising from that entry.
      </P>

      <H2>Acceptable use</H2>
      <UL>
        <li>Don't upload anything unlawful, or anything you don't have the right to upload.</li>
        <li>Don't try to reach records that aren't yours, or probe the service for weaknesses
          without telling us first — see our security contact.</li>
        <li>Don't resell or redistribute the service.</li>
        <li>One account per person. Sharing is what the collaborator roles are for.</li>
      </UL>

      <H2>Official records</H2>
      <P>
        In most places the official medical record belongs to the veterinary practice that created
        it. PetCenza is your personal copy for your own use. It is not an official or certified
        record, and should not be relied on as one for legal, insurance, or regulatory purposes.
      </P>

      <H2>Availability</H2>
      <P>
        We work to keep PetCenza running but we do not guarantee it will be uninterrupted or
        error-free. The service is provided <strong>as is</strong>, without warranties of any kind,
        including merchantability or fitness for a particular purpose, to the fullest extent the
        law allows.
      </P>

      <H2>Limitation of liability</H2>
      <P>
        To the fullest extent permitted by law, our total liability to you for any claim relating
        to PetCenza is limited to the amount you paid us in the twelve months before the claim. We
        are not liable for indirect, incidental, special, or consequential damages. Some
        jurisdictions do not allow these limits, in which case they apply only as far as the law
        permits.
      </P>

      <H2>Closing your account</H2>
      <P>
        You can delete your account yourself at any time in Settings. It is immediate and
        permanent. Pets you co-own pass to the other owner rather than being destroyed. We may
        suspend an account that breaks these terms, and we will tell you why where we reasonably
        can.
      </P>
      <P>
        If we ever have to discontinue PetCenza, we will give at least 90 days' notice and keep
        export working throughout.
      </P>

      <H2>Changes</H2>
      <P>
        We may update these terms. If a change materially affects you we will give notice in the
        app or by email before it takes effect.
      </P>

      <H2>Contact</H2>
      <P>
        <a className="text-moss underline" href="mailto:support@petcenza.com">support@petcenza.com</a>
      </P>
    </LegalShell>
  )
}
