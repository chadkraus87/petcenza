import { LegalShell, H2, P, UL, CONTACT } from './LegalPage'

/**
 * Accessibility statement. Deliberately claims no formal conformance: nothing has been
 * independently audited, and saying otherwise would be a false statement, not a safe harbour.
 */
export default function Accessibility() {
  return (
    <LegalShell title="Accessibility" updated="16 September 2026">
      <P>
        PetCenza should work for everyone who looks after an animal, including people who use a
        screen reader, navigate by keyboard, magnify their screen, or need higher contrast.
      </P>

      <H2>What we aim for</H2>
      <P>
        We design to the Web Content Accessibility Guidelines (WCAG) 2.1, level AA. PetCenza has not
        been independently audited, so we don't claim full conformance — but here is what we do:
      </P>
      <UL>
        <li>Text colours are checked against the WCAG AA contrast ratio for their size.</li>
        <li>Controls are native buttons, links and form fields, so they work with a keyboard.</li>
        <li>Form fields have labels, and errors are announced to screen readers.</li>
        <li>Decorative images and icons are hidden from assistive technology; meaningful ones are
          labelled.</li>
        <li>We avoid conveying information by colour alone.</li>
        <li>The artwork background is removed when your system asks for more contrast, and when
          printing.</li>
      </UL>

      <H2>Known limitations</H2>
      <UL>
        <li>
          Moving a reminder to a different day by dragging it on the calendar needs a mouse. With a
          keyboard or touchscreen you can snooze a reminder later from the reminders list, but not
          yet move it to an earlier date. We're fixing this.
        </li>
      </UL>

      <H2>Tell us what doesn't work</H2>
      <P>
        If something in PetCenza is hard or impossible for you to use, we want to know — it's a
        bug, and we treat it as one. Email{' '}
        <a className="text-moss underline" href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a>{' '}
        and describe what you were trying to do and what assistive technology you use, if any. We
        aim to reply within five business days.
      </P>
    </LegalShell>
  )
}
