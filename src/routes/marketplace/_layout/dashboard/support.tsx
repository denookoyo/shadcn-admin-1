import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, MessageCircle, RefreshCw, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { db, type RefundRequest, type SupportMessage, type SupportTicket, type SupportTicketStatus } from '@/lib/data'

function badgeClasses(status: string) {
  switch (status) {
    case 'open':
    case 'requested':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'in_progress':
    case 'reviewing':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'accepted':
    case 'resolved':
    case 'refunded':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'rejected':
    case 'closed':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

async function refreshSupportData() {
  const [ticketList, refundList] = await Promise.all([
    typeof db.listSupportTickets === 'function' ? db.listSupportTickets() : Promise.resolve([]),
    typeof db.listRefundRequests === 'function' ? db.listRefundRequests('seller') : Promise.resolve([]),
  ])
  return { tickets: ticketList, refunds: refundList }
}

function lastMessagePreview(ticket: SupportTicket): string {
  const messages = ticket.messages ?? []
  if (!messages.length) return 'No replies yet.'
  const last = messages[messages.length - 1]
  const author = last.author?.name || last.author?.email || 'Customer'
  return `${author}: ${last.body.slice(0, 120)}${last.body.length > 120 ? '…' : ''}`
}

async function appendLocalMessage(ticketId: string, body: string) {
  if (typeof db.replySupportTicket === 'function') {
    const message = await db.replySupportTicket(ticketId, body)
    return message
  }
  const now = new Date().toISOString()
  const message: SupportMessage = {
    id: `${ticketId}-${now}`,
    ticketId,
    authorId: 0,
    body,
    attachments: [],
    createdAt: now,
  }
  return message
}

async function updateLocalTicketStatus(ticketId: string, status: SupportTicketStatus) {
  if (typeof db.updateSupportTicketStatus === 'function') {
    return db.updateSupportTicketStatus(ticketId, status)
  }
  throw new Error('Ticket updates not supported offline')
}

async function updateLocalRefund(id: string, action: 'accept' | 'reject' | 'refund', notes?: string) {
  if (typeof db.reviewRefundRequest === 'function') {
    return db.reviewRefundRequest(id, action, notes)
  }
  throw new Error('Refund updates not supported offline')
}

async function createLocalTicket(subject: string, body: string) {
  if (typeof db.createSupportTicket === 'function') {
    return db.createSupportTicket({ subject, body })
  }
  const now = new Date().toISOString()
  const fallback: SupportTicket = {
    id: subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 12) || `ticket-${Date.now()}`,
    subject,
    type: 'general',
    status: 'open',
    priority: 'normal',
    orderId: null,
    orderItemId: null,
    requesterId: 0,
    sellerId: null,
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: `${now}-init` as string,
        ticketId: '',
        authorId: 0,
        body,
        attachments: [],
        createdAt: now,
      },
    ],
  }
  fallback.messages![0].ticketId = fallback.id
  return fallback
}

function SupportConsolePage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [refunds, setRefunds] = useState<RefundRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const { tickets: ticketList, refunds: refundList } = await refreshSupportData()
      setTickets(ticketList)
      setRefunds(refundList)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load support data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openTicketCount = useMemo(() => tickets.filter((ticket) => ticket.status !== 'resolved' && ticket.status !== 'closed').length, [tickets])
  const activeRefundCount = useMemo(
    () => refunds.filter((refund) => ['requested', 'reviewing', 'accepted'].includes(refund.status)).length,
    [refunds]
  )
  const resolvedRate = useMemo(() => {
    if (!tickets.length) return '—'
    const closed = tickets.filter((ticket) => ticket.status === 'resolved' || ticket.status === 'closed').length
    return `${Math.round((closed / tickets.length) * 100)}%`
  }, [tickets])

  async function handleCreateTicket() {
    const subject = window.prompt('Ticket subject')
    if (!subject) return
    const body = window.prompt('Describe the issue')
    if (!body) return
    const created = await createLocalTicket(subject, body)
    setTickets((prev) => [created, ...prev])
  }

  async function handleTicketReply(ticket: SupportTicket) {
    const body = window.prompt('Reply to customer', '')
    if (!body) return
    const message = await appendLocalMessage(ticket.id, body)
    setTickets((prev) =>
      prev.map((item) =>
        item.id === ticket.id
          ? {
              ...item,
              messages: [...(item.messages ?? []), message],
              updatedAt: message.createdAt,
            }
          : item
      )
    )
  }

  async function handleTicketStatus(ticket: SupportTicket, status: SupportTicketStatus) {
    const updated = await updateLocalTicketStatus(ticket.id, status)
    setTickets((prev) => prev.map((item) => (item.id === ticket.id ? updated : item)))
  }

  async function handleRefundAction(refund: RefundRequest, action: 'accept' | 'reject' | 'refund') {
    const notes = window.prompt('Add an optional resolution note', refund.resolution ?? '')
    const updated = await updateLocalRefund(refund.id, action, notes ?? undefined)
    setRefunds((prev) => prev.map((item) => (item.id === refund.id ? updated : item)))
  }

  return (
    <div className='mx-auto max-w-5xl space-y-10 px-4 py-10'>
      <header className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-semibold text-slate-900'>Support console</h1>
          <p className='text-sm text-slate-600'>Manage refunds, escalations, and buyer disputes in one workspace.</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={load} className='rounded-full'>
            <RefreshCw className='mr-2 h-4 w-4' />Refresh
          </Button>
          <Button size='sm' onClick={handleCreateTicket} className='rounded-full'>
            <MessageCircle className='mr-2 h-4 w-4' />New ticket
          </Button>
        </div>
      </header>

      <section className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Open tickets</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>{openTicketCount}</div>
          <p className='text-xs text-slate-500'>Aim to respond within 2 hours.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Active refunds</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>{activeRefundCount}</div>
          <p className='text-xs text-slate-500'>Coordinate with finance for payouts.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Resolution rate</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>{resolvedRate}</div>
          <p className='text-xs text-slate-500'>Tickets resolved in the last 30 days.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <ShieldCheck className='h-4 w-4 text-emerald-600' /> Buyer confidence
          </div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>4.6 ★</div>
          <p className='text-xs text-slate-500'>Maintain above 4.2 for marketplace spotlight.</p>
        </div>
      </section>

      {error ? (
        <div className='rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          <AlertTriangle className='mr-2 inline h-4 w-4' /> {error}
        </div>
      ) : null}

      {loading ? (
        <div className='rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500'>Loading support queue…</div>
      ) : null}

      <section className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-slate-900'>Support tickets</h2>
          <span className='text-xs text-slate-500'>Tickets sync across buyer & seller dashboards.</span>
        </div>
        <div className='space-y-3'>
          {tickets.length === 0 ? (
            <div className='rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500'>
              No support tickets yet. Buyers can raise requests from their order detail page.
            </div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <div className='text-sm font-semibold text-slate-900'>{ticket.subject}</div>
                    <div className='text-xs text-slate-500'>#{ticket.id.slice(0, 8)} • {ticket.type}</div>
                    {ticket.orderId ? (
                      <div className='text-xs text-slate-500'>Order {ticket.orderId}</div>
                    ) : null}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${badgeClasses(ticket.status)}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
                <p className='mt-3 text-xs text-slate-600'>{lastMessagePreview(ticket)}</p>
                <div className='mt-4 flex flex-wrap gap-2 text-xs'>
                  <Button size='sm' variant='secondary' onClick={() => handleTicketReply(ticket)}>
                    Reply
                  </Button>
                  {ticket.status !== 'resolved' ? (
                    <Button size='sm' variant='outline' onClick={() => handleTicketStatus(ticket, 'resolved')}>
                      Mark resolved
                    </Button>
                  ) : (
                    <Button size='sm' variant='outline' onClick={() => handleTicketStatus(ticket, 'open')}>
                      Re-open
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-slate-900'>Refunds & disputes</h2>
          <span className='text-xs text-slate-500'>Coordinate resolutions with marketplace operations.</span>
        </div>
        <div className='space-y-3'>
          {refunds.length === 0 ? (
            <div className='rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500'>
              No refund requests currently open.
            </div>
          ) : (
            refunds.map((refund) => {
              const buyerName = refund.buyer?.name || refund.buyer?.email || 'Buyer'
              return (
                <div key={refund.id} className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-semibold text-slate-900'>{buyerName}</div>
                      <div className='text-xs text-slate-500'>Order {refund.orderId}{refund.orderItem?.title ? ` • ${refund.orderItem.title}` : ''}</div>
                      <div className='text-xs text-slate-500'>Requested {format(new Date(refund.createdAt), 'PP p')}</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${badgeClasses(refund.status)}`}>
                      {refund.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className='mt-3 text-sm text-slate-600'>{refund.reason}</p>
                  {refund.resolution ? (
                    <p className='mt-2 text-xs text-slate-500'>Resolution notes: {refund.resolution}</p>
                  ) : null}
                  <div className='mt-4 flex flex-wrap gap-2 text-xs'>
                    {refund.status === 'requested' || refund.status === 'reviewing' ? (
                      <>
                        <Button size='sm' variant='secondary' onClick={() => handleRefundAction(refund, 'accept')}>
                          Accept
                        </Button>
                        <Button size='sm' variant='outline' onClick={() => handleRefundAction(refund, 'reject')}>
                          Reject
                        </Button>
                        <Button size='sm' variant='ghost' onClick={() => handleRefundAction(refund, 'refund')}>
                          Mark refunded
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/support')({
  component: SupportConsolePage,
})
