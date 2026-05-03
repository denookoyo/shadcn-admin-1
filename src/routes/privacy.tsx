import { createFileRoute } from '@tanstack/react-router'
import { LegalPageShell } from '@/features/legal/legal-page-shell'

function PrivacyPage() {
  return (
    <LegalPageShell
      title='Privacy policy'
      description='How Hedgetech collects, uses, and protects marketplace account, order, and support data.'
    >
      <div className='space-y-6'>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>What we collect</h2>
          <p>We collect the account, order, support, and seller verification information required to operate the marketplace, including contact details, delivery details, and listing data submitted by sellers.</p>
        </section>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>How we use it</h2>
          <p>We use this information to authenticate users, process orders, route support requests, coordinate seller approvals, and maintain marketplace safety and operational records.</p>
        </section>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>Sharing</h2>
          <p>Buyer details are shared with the relevant seller only to fulfil an order or schedule a service. Administrative users may access support and verification information when handling operations or disputes.</p>
        </section>
        <section>
          <h2 className='text-lg font-semibold text-slate-900'>Contact</h2>
          <p>For privacy requests, contact <a className='font-semibold text-emerald-700' href='mailto:support@hedgetech.market'>support@hedgetech.market</a>.</p>
        </section>
      </div>
    </LegalPageShell>
  )
}

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})
