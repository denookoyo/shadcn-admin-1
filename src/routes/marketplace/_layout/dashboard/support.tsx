import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, MessageCircle, RefreshCw, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { db, type RefundRequest, type SupportMessage, type SupportTicket, type SupportTicketStatus } from '@/lib/data'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { listSellerApplications, reviewSellerApplication, type SellerApplication } from '@/features/sellers/verification'
import { useAuthStore } from '@/stores/authStore'
import { ensureSellerRouteAccess } from '@/features/sellers/access'

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

function sellerStatusClasses(status: SellerApplication['status']) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

async function refreshSupportData(includeSellerApps: boolean) {
  const [ticketList, refundList, sellerList] = await Promise.all([
    typeof db.listSupportTickets === 'function' ? db.listSupportTickets() : Promise.resolve([]),
    typeof db.listRefundRequests === 'function' ? db.listRefundRequests('seller') : Promise.resolve([]),
    includeSellerApps ? listSellerApplications() : Promise.resolve([]),
  ])
  return { tickets: ticketList, refunds: refundList, sellerApps: sellerList }
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
  const { user } = useAuthStore((s) => s.auth)
  const isAdmin = Boolean((user as any)?.isAdmin) || String((user as any)?.role ?? '').toLowerCase() === 'admin'
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [refunds, setRefunds] = useState<RefundRequest[]>([])
  const [sellerApps, setSellerApps] = useState<SellerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [ticketDraft, setTicketDraft] = useState({ open: false, subject: '', body: '' })
  const [replyDraft, setReplyDraft] = useState<{ ticket: SupportTicket | null; body: string }>({ ticket: null, body: '' })
  const [refundDecision, setRefundDecision] = useState<{ refund: RefundRequest | null; action: 'accept' | 'reject' | 'refund'; notes: string }>({
    refund: null,
    action: 'accept',
    notes: '',
  })
  const [sellerDecision, setSellerDecision] = useState<{ app: SellerApplication | null; action: 'approve' | 'reject'; notes: string }>({
    app: null,
    action: 'approve',
    notes: '',
  })

  async function load() {
    setLoading(true)
    try {
      const { tickets: ticketList, refunds: refundList, sellerApps: appList } = await refreshSupportData(isAdmin)
      setTickets(ticketList)
      setRefunds(refundList)
      setSellerApps(appList)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load support data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [isAdmin])

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
  const pendingSellerApps = useMemo(() => sellerApps.filter((app) => app.status !== 'approved'), [sellerApps])

  async function handleCreateTicket() {
    if (!ticketDraft.subject.trim() || !ticketDraft.body.trim()) return
    setActionBusy(true)
    try {
      const created = await createLocalTicket(ticketDraft.subject.trim(), ticketDraft.body.trim())
      setTickets((prev) => [created, ...prev])
      setTicketDraft({ open: false, subject: '', body: '' })
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create support ticket')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleTicketReply() {
    if (!replyDraft.ticket || !replyDraft.body.trim()) return
    setActionBusy(true)
    try {
      const message = await appendLocalMessage(replyDraft.ticket.id, replyDraft.body.trim())
      setTickets((prev) =>
        prev.map((item) =>
          item.id === replyDraft.ticket?.id
            ? {
                ...item,
                messages: [...(item.messages ?? []), message],
                updatedAt: message.createdAt,
              }
            : item
        )
      )
      setReplyDraft({ ticket: null, body: '' })
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to send reply')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleTicketStatus(ticket: SupportTicket, status: SupportTicketStatus) {
    setActionBusy(true)
    try {
      const updated = await updateLocalTicketStatus(ticket.id, status)
      setTickets((prev) => prev.map((item) => (item.id === ticket.id ? updated : item)))
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update ticket status')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleRefundAction() {
    if (!refundDecision.refund) return
    setActionBusy(true)
    try {
      const updated = await updateLocalRefund(refundDecision.refund.id, refundDecision.action, refundDecision.notes.trim() || undefined)
      setRefunds((prev) => prev.map((item) => (item.id === refundDecision.refund?.id ? updated : item)))
      setRefundDecision({ refund: null, action: 'accept', notes: '' })
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update refund request')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleSellerReviewAction() {
    if (!sellerDecision.app) return
    setActionBusy(true)
    try {
      const updated = await reviewSellerApplication(sellerDecision.app.id, sellerDecision.action, sellerDecision.notes.trim() || undefined)
      setSellerApps((prev) => prev.map((item) => (item.id === sellerDecision.app?.id ? updated : item)))
      setSellerDecision({ app: null, action: 'approve', notes: '' })
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to review seller application')
    } finally {
      setActionBusy(false)
    }
  }

  if (!isAdmin) {
    return (
      <MarketplacePageShell width='default' className='space-y-8' topSpacing='lg' bottomSpacing='lg'>
        <header>
          <div className='inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800'>
            Admin only
          </div>
          <h1 className='mt-3 text-3xl font-semibold text-slate-900'>Support console locked</h1>
          <p className='text-sm text-slate-600'>Only Hedgetech administrators can review tickets, refunds, and seller applications. Contact support if you need to escalate a buyer issue.</p>
        </header>
        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <p className='text-sm text-slate-600'>You can still open a support conversation from the buyer dashboard or track your seller verification progress.</p>
          <div className='mt-4 flex flex-wrap gap-3 text-sm'>
            <Button asChild className='rounded-full'>
              <Link to='/marketplace/dashboard/verification' search={{ redirect: '' }}>
                View seller verification
              </Link>
            </Button>
            <Button asChild variant='outline' className='rounded-full'>
              <Link to='/marketplace/my-orders'>Open buyer support</Link>
            </Button>
          </div>
        </div>
      </MarketplacePageShell>
    )
  }

  return (
    <MarketplacePageShell width='default' className='space-y-10'>
      <header className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-semibold text-slate-900'>Support console</h1>
          <p className='text-sm text-slate-600'>Manage refunds, escalations, and buyer disputes in one workspace.</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={load} className='rounded-full'>
            <RefreshCw className='mr-2 h-4 w-4' />Refresh
          </Button>
          <Button size='sm' onClick={() => setTicketDraft({ open: true, subject: '', body: '' })} className='rounded-full'>
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
                  <Button size='sm' variant='secondary' onClick={() => setReplyDraft({ ticket, body: '' })}>
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
                        <Button
                          size='sm'
                          variant='secondary'
                          onClick={() => setRefundDecision({ refund, action: 'accept', notes: refund.resolution ?? '' })}
                        >
                          Accept
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => setRefundDecision({ refund, action: 'reject', notes: refund.resolution ?? '' })}
                        >
                          Reject
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => setRefundDecision({ refund, action: 'refund', notes: refund.resolution ?? '' })}
                        >
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

      <section className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-slate-900'>Seller verification queue</h2>
          <span className='text-xs text-slate-500'>{pendingSellerApps.length} awaiting review</span>
        </div>
        <div className='space-y-3'>
          {pendingSellerApps.length === 0 ? (
            <div className='rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500'>
              No pending seller applications. Approved sellers appear automatically once support reviews them.
            </div>
          ) : (
            pendingSellerApps.map((app) => (
              <div key={app.id} className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <div className='text-sm font-semibold text-slate-900'>{app.companyName}</div>
                    <div className='text-xs text-slate-500'>{app.email}</div>
                    <div className='text-xs text-slate-500'>Submitted {format(new Date(app.submittedAt), 'PP p')}</div>
                    {app.location ? <div className='text-xs text-slate-500'>Counties: {app.location}</div> : null}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${sellerStatusClasses(app.status)}`}>
                    {app.status === 'pending' ? 'Pending review' : 'Needs update'}
                  </span>
                </div>
                {app.pitch ? <p className='mt-3 text-sm text-slate-600'>{app.pitch}</p> : null}
                {app.documents && app.documents.length ? (
                  <p className='mt-2 text-xs text-slate-500'>Docs: {app.documents.join(' • ')}</p>
                ) : null}
                <div className='mt-4 flex flex-wrap gap-2 text-xs'>
                  <Button
                    size='sm'
                    variant='secondary'
                    onClick={() => setSellerDecision({ app, action: 'approve', notes: app.reviewerNotes ?? '' })}
                  >
                    Approve
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setSellerDecision({ app, action: 'reject', notes: app.reviewerNotes ?? '' })}
                  >
                    Request changes
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <Dialog open={ticketDraft.open} onOpenChange={(open) => setTicketDraft((current) => ({ ...current, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a support ticket</DialogTitle>
            <DialogDescription>Create an internal support issue for operations follow-up.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <Input
              placeholder='Subject'
              value={ticketDraft.subject}
              onChange={(event) => setTicketDraft((current) => ({ ...current, subject: event.target.value }))}
            />
            <Textarea
              placeholder='Describe the issue or next step'
              rows={5}
              value={ticketDraft.body}
              onChange={(event) => setTicketDraft((current) => ({ ...current, body: event.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setTicketDraft({ open: false, subject: '', body: '' })}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket} disabled={actionBusy || !ticketDraft.subject.trim() || !ticketDraft.body.trim()}>
              {actionBusy ? 'Saving…' : 'Create ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(replyDraft.ticket)} onOpenChange={(open) => { if (!open) setReplyDraft({ ticket: null, body: '' }) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to ticket</DialogTitle>
            <DialogDescription>{replyDraft.ticket ? `Add a reply to ${replyDraft.ticket.subject}.` : 'Add a reply to this ticket.'}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder='Type your response'
            rows={5}
            value={replyDraft.body}
            onChange={(event) => setReplyDraft((current) => ({ ...current, body: event.target.value }))}
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setReplyDraft({ ticket: null, body: '' })}>
              Cancel
            </Button>
            <Button onClick={handleTicketReply} disabled={actionBusy || !replyDraft.body.trim()}>
              {actionBusy ? 'Sending…' : 'Send reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(refundDecision.refund)} onOpenChange={(open) => { if (!open) setRefundDecision({ refund: null, action: 'accept', notes: '' }) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {refundDecision.action === 'accept'
                ? 'Accept refund request'
                : refundDecision.action === 'reject'
                  ? 'Reject refund request'
                  : 'Mark refund as paid'}
            </DialogTitle>
            <DialogDescription>
              {refundDecision.refund ? `Update order ${refundDecision.refund.orderId} with a clear decision note.` : 'Update this refund request.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder='Resolution note shown to internal teams and the buyer'
            rows={4}
            value={refundDecision.notes}
            onChange={(event) => setRefundDecision((current) => ({ ...current, notes: event.target.value }))}
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setRefundDecision({ refund: null, action: 'accept', notes: '' })}>
              Cancel
            </Button>
            <Button onClick={handleRefundAction} disabled={actionBusy}>
              {actionBusy ? 'Saving…' : 'Save decision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(sellerDecision.app)} onOpenChange={(open) => { if (!open) setSellerDecision({ app: null, action: 'approve', notes: '' }) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sellerDecision.action === 'approve' ? 'Approve seller' : 'Request seller changes'}</DialogTitle>
            <DialogDescription>
              {sellerDecision.app ? `Review ${sellerDecision.app.companyName} and capture the decision note.` : 'Review this seller application.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={sellerDecision.action === 'approve' ? 'Optional approval note' : 'Explain what the seller needs to update'}
            rows={4}
            value={sellerDecision.notes}
            onChange={(event) => setSellerDecision((current) => ({ ...current, notes: event.target.value }))}
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setSellerDecision({ app: null, action: 'approve', notes: '' })}>
              Cancel
            </Button>
            <Button onClick={handleSellerReviewAction} disabled={actionBusy}>
              {actionBusy ? 'Saving…' : sellerDecision.action === 'approve' ? 'Approve seller' : 'Request changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MarketplacePageShell>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/support')({
  beforeLoad: ({ location }) => ensureSellerRouteAccess(location),
  component: SupportConsolePage,
})
