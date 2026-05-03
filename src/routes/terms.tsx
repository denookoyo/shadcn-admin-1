import { createFileRoute } from '@tanstack/react-router'
import { LegalPageShell } from '@/features/legal/legal-page-shell'

function TermsPage() {
  return (
    <LegalPageShell
      title='Terms of service'
      description='The baseline rules for using Hedgetech Marketplace as a buyer, seller, or operations user.'
    >
      <div className='space-y-6'>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>Marketplace role</h2>
          <p>Hedgetech provides the marketplace software, seller operations workflow, buyer support tooling, and order tracking surface. Sellers remain responsible for the accuracy of listings, fulfilment promises, and their own payment instructions.</p>
        </section>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>Seller obligations</h2>
          <p>Sellers must provide accurate listing details, honour accepted orders, respond to support requests promptly, and maintain any business, tax, and identity documents requested during verification.</p>
        </section>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>Buyer obligations</h2>
          <p>Buyers must provide accurate contact and fulfilment details, pay sellers using the instructions supplied for the order, and avoid fraudulent chargeback or dispute behaviour.</p>
        </section>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>Suspension</h2>
          <p>Hedgetech may limit or suspend access to accounts, listings, or seller tooling where fraud, abuse, unsafe conduct, or repeated policy breaches are detected.</p>
        </section>
      </div>
    </LegalPageShell>
  )
}

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})
