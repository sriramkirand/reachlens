export function Privacy() {
  return (
    <article className="prose mx-auto max-w-2xl space-y-3 p-6 text-sm leading-6">
      <h1 className="text-2xl font-semibold">Privacy notice</h1>
      <p>Reachlens helps organisations turn photos of business contacts into an outreach list. The organisation using Reachlens is the data controller for contact data it uploads; Reachlens acts as its processor.</p>
      <h2 className="font-semibold">What we process</h2>
      <p>Uploaded images, details read from them (name, employer, job title, contact details) and publicly listed professional profile links suggested for review.</p>
      <h2 className="font-semibold">Lawful basis</h2>
      <p>Each upload batch records the lawful basis (consent, legitimate interests or contract) chosen by the uploading organisation.</p>
      <h2 className="font-semibold">Retention</h2>
      <p>Images are deleted automatically after the organisation's retention period (30 days by default).</p>
      <h2 className="font-semibold">Your rights</h2>
      <p>Under UK GDPR you can ask for access to, correction of, or deletion of your data. Contact the organisation that approached you; they can export or delete your record from Reachlens.</p>
      <h2 className="font-semibold">Outreach</h2>
      <p>Reachlens never sends messages automatically. A person reviews and sends every message.</p>
      <p className="text-[var(--muted)]">Draft template: have this reviewed by your data protection adviser before launch.</p>
    </article>
  )
}
