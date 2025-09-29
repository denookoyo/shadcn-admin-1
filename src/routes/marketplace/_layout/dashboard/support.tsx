import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

type RefundTicket = {
  id: string
  orderId: string
  customer: string
  amount: number
  reason: string
  status: 'open' | 'approved' | 'declined'
}

 type Escalation = {
  id: string
  topic: string
  owner: string
  priority: 'low' | 'medium' | 'high'
  status: 'open' | 'investigating' | 'resolved'
 }

const seedRefunds: RefundTicket[] = [
  { id: 'r-001', orderId: '#A9021', customer: 'Jamie Ryder', amount: 189, reason: 'Damaged on arrival', status: 'open' },
  { id: 'r-002', orderId: '#A8990', customer: 'Harper Singh', amount: 75, reason: 'Incorrect size', status: 'approved' },
  { id: 'r-003', orderId: '#A8877', customer: 'Noah Zhao', amount: 42, reason: 'Missing accessories', status: 'open' },
]

const seedEscalations: Escalation[] = [
  { id: 'e-201', topic: 'Late fulfilment', owner: 'Support Squad', priority: 'high', status: 'investigating' },
  { id: 'e-202', topic: 'Policy breach review', owner: 'Compliance', priority: 'medium', status: 'open' },
  { id: 'e-203', topic: 'Chargeback evidence', owner: 'Finance', priority: 'low', status: 'resolved' },
]

function badgeClasses(status: string) {
  switch (status) {
    case 'open':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'approved':
    case 'resolved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'declined':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'investigating':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

 function SupportConsolePage() {
  const [refunds, setRefunds] = useState(seedRefunds)
  const [escalations, setEscalations] = useState(seedEscalations)

  const openRefunds = useMemo(() => refunds.filter((ticket) => ticket.status === 'open').length, [refunds])
  const openEscalations = useMemo(() => escalations.filter((incident) => incident.status !== 'resolved').length, [escalations])

  function updateRefundStatus(id: string, status: RefundTicket['status']) {
    setRefunds((current) => current.map((ticket) => (ticket.id === id ? { ...ticket, status } : ticket)))
  }

  function updateEscalationStatus(id: string, status: Escalation['status']) {
    setEscalations((current) => current.map((incident) => (incident.id === id ? { ...incident, status } : incident)))
  }

  return (
    <div className='mx-auto max-w-5xl space-y-10 px-4 py-10'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold text-slate-900'>Support console</h1>
        <p className='text-sm text-slate-600'>Oversee refunds, escalations, and policy disputes to keep Hedgetech buyers confident.</p>
      </header>

      <section className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Open refunds</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>{openRefunds}</div>
          <p className='text-xs text-slate-500'>Aim to resolve within 72 hours.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Escalations</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>{openEscalations}</div>
          <p className='text-xs text-slate-500'>Investigations shared with compliance.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Chargebacks (30d)</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>2</div>
          <p className='text-xs text-slate-500'>Upload compelling evidence to contest.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Satisfaction</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>4.6 ★</div>
          <p className='text-xs text-slate-500'>Maintain above 4.2 to keep marketplace priority.</p>
        </div>
      </section>

      <section className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-slate-900'>Refund requests</h2>
          <span className='text-xs text-slate-500'>Queue updates auto-sync with finance.</span>
        </div>
        <div className='space-y-3'>
          {refunds.map((ticket) => (
            <div key={ticket.id} className='rounded-3xl border border-slate-200 bg-slate-50 p-4'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                  <div className='text-sm font-semibold text-slate-900'>{ticket.customer}</div>
                  <div className='text-xs text-slate-500'>Order {ticket.orderId} · A${ticket.amount}</div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses(ticket.status)}`}>{ticket.status}</span>
              </div>
              <p className='mt-2 text-sm text-slate-600'>{ticket.reason}</p>
              <div className='mt-3 flex flex-wrap gap-2 text-xs'>
                <Button size='sm' variant='secondary' onClick={() => updateRefundStatus(ticket.id, 'approved')}>
                  Approve
                </Button>
                <Button size='sm' variant='outline' onClick={() => updateRefundStatus(ticket.id, 'declined')}>
                  Decline
                </Button>
                <Button size='sm' variant='ghost' onClick={() => updateRefundStatus(ticket.id, 'open')}>
                  Re-open
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-slate-900'>Escalations & disputes</h2>
          <span className='text-xs text-slate-500'>Escalations resolved feed back into SLA dashboards.</span>
        </div>
        <div className='space-y-3'>
          {escalations.map((incident) => (
            <div key={incident.id} className='rounded-3xl border border-slate-200 bg-slate-50 p-4'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                  <div className='text-sm font-semibold text-slate-900'>{incident.topic}</div>
                  <div className='text-xs text-slate-500'>Owner: {incident.owner}</div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses(incident.status)}`}>{incident.status}</span>
              </div>
              <div className='mt-2 flex items-center justify-between text-xs text-slate-500'>
                <span>Priority: {incident.priority}</span>
                <div className='flex gap-2'>
                  <button className='rounded-full border border-slate-200 px-3 py-1 hover:border-emerald-200 hover:text-emerald-700' onClick={() => updateEscalationStatus(incident.id, 'investigating')}>
                    Investigating
                  </button>
                  <button className='rounded-full border border-slate-200 px-3 py-1 hover:border-emerald-200 hover:text-emerald-700' onClick={() => updateEscalationStatus(incident.id, 'resolved')}>
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
 }

 export const Route = createFileRoute('/marketplace/_layout/dashboard/support')({
  component: SupportConsolePage,
 })
