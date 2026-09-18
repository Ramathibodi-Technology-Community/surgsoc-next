import React from 'react'
import type { Metadata } from 'next'
import { getTermsContent } from '@/libs/site-content'

export const metadata: Metadata = {
  title: 'Terms & Privacy Policy | RASS',
  description:
    'Terms of service and privacy policy for the Ramathibodi Surgical Society platform, compliant with Thailand PDPA.',
}

export default async function TermsPage() {
  const termsContent = await getTermsContent()

  return (
    // Policy text is read, not scanned: one column at a 66ch measure, no cards.
    <article>
      <p className="label-mono mb-4 text-muted-foreground">Policy centre</p>
      <h1 className="type-h1 mb-6 max-w-[24ch]">Terms and privacy</h1>
      <p className="mb-[18px] max-w-[66ch] text-base leading-[1.8] text-secondary-foreground text-pretty">
        {termsContent.intro}
      </p>

      {termsContent.sections.map((section, index) => (
        <section key={`${section.title}-${index}`}>
          <h2 className="type-h2 mb-3 mt-8">{section.title}</h2>
          <p className="mb-[18px] max-w-[66ch] whitespace-pre-line text-base leading-[1.8] text-secondary-foreground text-pretty">
            {section.content}
          </p>
        </section>
      ))}
    </article>
  )
}
