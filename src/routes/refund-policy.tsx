import { createFileRoute } from '@tanstack/react-router'
import { LegalPageShell } from '@/features/legal/legal-page-shell'

function RefundPolicyPage() {
  return (
    <LegalPageShell
      title='Refund policy'
      description='How Hedgetech handles refund requests, seller disputes, and buyer resolution workflow.'
    >
      <div className='space-y-6'>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>How refunds are requested</h2>
          <p>Buyers submit refund requests from the order detail page with the reason, requested amount, and any item-specific context needed for review.</p>
        </section>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>Review process</h2>
          <p>Refunds are reviewed by the seller and marketplace operations. Statuses may move through requested, reviewing, accepted, rejected, or refunded depending on the evidence and order state.</p>
        </section>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>Direct payment note</h2>
          <p>Because payments are made directly to sellers, an approved refund may require direct remittance from the seller to the buyer unless otherwise coordinated by operations.</p>
        </section>
      </div>
    </LegalPageShell>
  )
}

export const Route = createFileRoute('/refund-policy')({
  component: RefundPolicyPage,
})
