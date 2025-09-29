import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Applicant = {
  id: string
  name: string
  email: string
  business: string
  documents: string[]
  stage: 'test' | 'preview' | 'production'
  status: 'pending' | 'approved' | 'rejected'
}

const initialApplicants: Applicant[] = [
  {
    id: 's-9001',
    name: 'Lumen Interiors',
    email: 'ops@lumeninteriors.au',
    business: 'ABN 33 440 980 112',
    documents: ['Company registration.pdf', 'Bank verification.pdf'],
    stage: 'test',
    status: 'pending',
  },
  {
    id: 's-9002',
    name: 'Volt Services',
    email: 'hello@voltservices.io',
    business: 'ABN 92 118 447 009',
    documents: ['Insurance certificate.pdf'],
    stage: 'preview',
    status: 'pending',
  },
]

function ApprovalsPage() {
  const [applicants, setApplicants] = useState(initialApplicants)

  function update(id: string, status: Applicant['status']) {
    setApplicants((current) => current.map((applicant) => (applicant.id === id ? { ...applicant, status } : applicant)))
  }

  return (
    <div className='mx-auto max-w-5xl space-y-8 px-4 py-10'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold text-slate-900'>Seller approvals</h1>
        <p className='text-sm text-slate-600'>Review onboarding applications and control which environment each merchant can access.</p>
      </header>

      <section className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='space-y-4'>
          {applicants.map((applicant) => (
            <div key={applicant.id} className='rounded-3xl border border-slate-200 bg-slate-50 p-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <div className='text-sm font-semibold text-slate-900'>{applicant.name}</div>
                  <div className='text-xs text-slate-500'>{applicant.email} · {applicant.business}</div>
                </div>
                <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600'>
                  Stage: {applicant.stage}
                </span>
              </div>
              <div className='mt-3 space-y-2 text-xs text-slate-500'>
                <div>Supporting docs:</div>
                <ul className='list-disc pl-5'>
                  {applicant.documents.map((doc) => (
                    <li key={doc}>{doc}</li>
                  ))}
                </ul>
              </div>
              <div className='mt-4 flex flex-wrap items-center gap-2 text-xs'>
                <Button size='sm' variant='secondary' onClick={() => update(applicant.id, 'approved')}>
                  Approve and move to {applicant.stage === 'production' ? 'production' : 'next stage'}
                </Button>
                <Button size='sm' variant='outline' onClick={() => update(applicant.id, 'rejected')}>
                  Reject
                </Button>
                <Button size='sm' variant='ghost' onClick={() => update(applicant.id, 'pending')}>
                  Mark as pending
                </Button>
              </div>
              {applicant.status !== 'pending' ? (
                <p className='mt-2 text-xs font-semibold text-emerald-700'>Decision recorded: {applicant.status}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/approvals')({
  component: ApprovalsPage,
})
