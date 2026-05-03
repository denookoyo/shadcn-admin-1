import { createFileRoute } from '@tanstack/react-router'
import { LegalPageShell } from '@/features/legal/legal-page-shell'

function ContactPage() {
  return (
    <LegalPageShell
      title='Contact Hedgetech'
      description='Operational, support, and seller onboarding contact points for the live marketplace.'
    >
      <div className='space-y-6'>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>Support</h2>
          <p>Email <a className='font-semibold text-emerald-700' href='mailto:support@hedgetech.market'>support@hedgetech.market</a> for order issues, seller onboarding questions, or dispute handling.</p>
        </section>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>Seller operations</h2>
          <p>Email <a className='font-semibold text-emerald-700' href='mailto:sellers@hedgetech.market'>sellers@hedgetech.market</a> for verification, listing operations, catalogue imports, and real estate onboarding.</p>
        </section>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>Response targets</h2>
          <p>Seller verification and support requests are reviewed during business hours, with operational responses targeted within one business day.</p>
        </section>
      </div>
    </LegalPageShell>
  )
}

export const Route = createFileRoute('/contact')({
  component: ContactPage,
})
