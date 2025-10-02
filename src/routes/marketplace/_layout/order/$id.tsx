import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { useAuthStore } from '@/stores/authStore'
import { db, type RefundRequest } from '@/lib/data'
import { fetchJson } from '@/lib/http'

export const Route = createFileRoute('/marketplace/_layout/order/$id')({
  component: OrderDetail,
})

function OrderDetail() {
  const { id } = useParams({ from: '/marketplace/_layout/order/$id' })
  const me = useAuthStore((s) => s.auth.user as any | null)
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(id)}`)
        if (!res.ok) {
          if (mounted) setStatus(res.status)
          throw new Error(`HTTP ${res.status}`)
        }
        const json = await res.json()
        if (mounted) setData(json)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load order')
      }
    })()
    return () => { mounted = false }
  }, [id])

  // Compute hooks unconditionally to keep hook order stable
  const isBuyer = useMemo(() => {
    if (!me || !data) return false
    const uid = (me.id as number | undefined) ?? undefined
    if (!uid) return false
    return data.buyerId === uid
  }, [me, data])
  const isSeller = useMemo(() => {
    if (!me || !data) return false
    const uid = (me.id as number | undefined) ?? undefined
    if (!uid) return false
    return data.sellerId === uid || (data.items || []).some((it: any) => it?.product?.ownerId === uid)
  }, [me, data])

  // Local dialog state for proposing alternates (keep hooks before any returns)
  const [proposeOpen, setProposeOpen] = useState(false)
  const [localProposals, setLocalProposals] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([])
  const [refundReason, setRefundReason] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [selectedRefundItem, setSelectedRefundItem] = useState<string>('order')
  const [submittingRefund, setSubmittingRefund] = useState(false)
  useEffect(() => {
    // Preload proposals from current order once data arrives
    try {
      const firstSvc = (data?.items || []).find((it: any) => it?.product?.type === 'service')
      const arr = firstSvc?.appointmentAlternates ? JSON.parse(firstSvc.appointmentAlternates) : []
      setLocalProposals(Array.isArray(arr) ? arr : [])
    } catch {
      setLocalProposals([])
    }
  }, [data])

  useEffect(() => {
    if (!isBuyer || typeof db.listRefundRequests !== 'function') return
    let mounted = true
    ;(async () => {
      try {
        const list = (await db.listRefundRequests?.('buyer')) ?? []
        if (mounted) setRefundRequests(list.filter((item) => item.orderId === id))
      } catch {
        if (mounted) setRefundRequests([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [id, isBuyer])

  if (error) {
    if (status === 401 || status === 403) {
      return (
        <div className='mx-auto max-w-4xl px-4 py-8 text-sm text-gray-700'>
          <div className='text-lg font-semibold mb-2'>Sign in to view this order</div>
          <div className='mb-3'>This order is only visible to the buyer or seller. If you checked out as a guest, use your tracking link.</div>
          <div className='flex gap-2'>
            <Link to='/sign-in' search={{ redirect: `/marketplace/order/${id}` }} className='rounded-md border px-3 py-2'>Sign in</Link>
            <Link to='/marketplace/order/track' className='rounded-md border px-3 py-2'>Track with code</Link>
          </div>
        </div>
      )
    }
    return <div className='mx-auto max-w-4xl px-4 py-8 text-sm text-red-600'>Error: {error}</div>
  }
  if (!data) return <div className='mx-auto max-w-4xl px-4 py-8 text-sm text-gray-500'>Loading order…</div>

  const isService = (item: any) => item.product?.type === 'service'
  const hasService = (data.items || []).some((it: any) => isService(it))
  const paymentMade = ['paid', 'shipped', 'completed'].includes(data.status)
  const firstService = (data.items || []).find((it: any) => it?.product?.type === 'service')
  let proposals: string[] = []
  try { proposals = firstService?.appointmentAlternates ? JSON.parse(firstService.appointmentAlternates) : [] } catch {}
  function addProposal() {
    if (!selectedDate || !selectedTime) return
    const y = selectedDate.getFullYear()
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const d = String(selectedDate.getDate()).padStart(2, '0')
    const t = selectedTime.padStart(5, '0')
    const isoLike = `${y}-${m}-${d}T${t}`
    setLocalProposals((cur) => Array.from(new Set([isoLike, ...cur])))
  }

  const refundableItems = useMemo(() => data?.items ?? [], [data])
  const hasPendingRefund = useMemo(
    () => refundRequests.some((item) => item.status === 'requested' || item.status === 'reviewing'),
    [refundRequests]
  )

  function refundStatusLabel(status: RefundRequest['status']) {
    return status.replace('_', ' ')
  }

  function refundBadgeClasses(status: RefundRequest['status']) {
    switch (status) {
      case 'requested':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'reviewing':
        return 'bg-sky-50 text-sky-700 border-sky-200'
      case 'accepted':
      case 'refunded':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  async function submitRefundRequest() {
    if (!isBuyer || typeof db.createRefundRequest !== 'function') return
    if (hasPendingRefund) {
      window.alert('You already have a refund request awaiting review.')
      return
    }
    if (!refundReason.trim()) {
      window.alert('Please describe the issue before submitting a refund request.')
      return
    }
    setSubmittingRefund(true)
    try {
      const payload: { orderId: string; orderItemId?: string; amount?: number; reason: string } = {
        orderId: id,
        reason: refundReason.trim(),
      }
      if (selectedRefundItem !== 'order') payload.orderItemId = selectedRefundItem
      if (refundAmount) {
        const amountValue = Number(refundAmount)
        if (Number.isFinite(amountValue) && amountValue > 0) payload.amount = Math.round(amountValue)
      }
      const created = await db.createRefundRequest?.(payload)
      if (created) {
        setRefundRequests((prev) => [created, ...prev])
        setRefundReason('')
        setRefundAmount('')
        setSelectedRefundItem('order')
      }
    } catch (err) {
      window.alert((err as Error)?.message ?? 'Unable to submit refund request right now.')
    } finally {
      setSubmittingRefund(false)
    }
  }

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <div className='mb-2 text-sm'><Link to='/marketplace/my-orders' className='underline'>Back to My Orders</Link></div>
      <h1 className='text-2xl font-bold'>Order #{String(data.id).slice(0, 6)}</h1>
      <div className='mt-2 text-sm text-gray-600'>
        Status: <span className='capitalize font-semibold'>{data.status}</span>
      </div>
      <div className='mt-1 text-sm text-gray-600'>Placed: {new Date(data.createdAt).toLocaleString()}</div>
      {data.address ? (
        <div className='mt-1 text-sm text-gray-600'>Posting address: <span className='font-medium'>{data.address}</span></div>
      ) : null}

      <div className='mt-3 text-sm text-gray-600'>
        Payment: <span className={paymentMade ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>{paymentMade ? 'Paid' : 'Not paid'}</span>
      </div>

      {/* Buyer details */}
      <div className='mt-3 rounded-2xl border p-4'>
        <div className='mb-2 text-lg font-semibold'>Buyer</div>
        <div className='grid gap-1 text-sm'>
          <div>Name: <span className='font-medium'>{data.buyer?.name || data.buyer?.email || '—'}</span></div>
          <div>Email: <span className='font-medium'>{data.buyer?.email || '—'}</span></div>
          <div>Phone: <span className='font-medium'>{data.customerPhone || data.buyer?.phoneNo || '—'}</span></div>
          <div>Address: <span className='font-medium'>{data.address || '—'}</span></div>
        </div>
      </div>

      <div className='mt-6 rounded-2xl border p-4'>
        <div className='mb-3 text-lg font-semibold'>Items</div>
        <div className='space-y-2 text-sm'>
          {(data.items || []).map((it: any) => (
            <div key={it.id} className='rounded-md border p-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  {it.product?.img ? <img src={it.product.img} className='h-10 w-10 rounded object-cover' /> : null}
                  <div className='font-medium'>{it.title}</div>
                </div>
                <div>A${it.price * it.quantity}</div>
              </div>
              <div className='text-xs text-gray-500'>Qty: {it.quantity}</div>
              {(isService(it) || it.appointmentAt || it.appointmentStatus) && (
                <div className='text-xs text-gray-500'>Appointment: {it.appointmentAt ? new Date(it.appointmentAt).toLocaleString() : 'pending'} {it.appointmentStatus ? `(${it.appointmentStatus})` : ''}</div>
              )}
            </div>
          ))}
        </div>
        <div className='mt-3 flex items-center justify-between font-semibold'>
          <span>Total</span>
          <span>A${data.total}</span>
        </div>
      </div>

      {/* Buyer: Accept seller's proposed alternates */}
  {isBuyer && hasService && proposals.length > 0 && data.status === 'pending' && (
    <div className='mt-4 rounded-2xl border p-4'>
      <div className='mb-2 text-lg font-semibold'>Seller Proposed Alternate Times</div>
      <div className='mb-2 text-sm text-gray-600'>Choose one of the proposed slots to schedule your appointment.</div>
      <div className='flex flex-wrap gap-2'>
        {proposals.map((p) => (
          <button
            key={p}
            className='rounded-md border px-3 py-1.5 text-sm'
            onClick={async () => {
              setWorking(true)
              try {
                await fetchJson(`/api/orders/${data.id}/appointment/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: p }) })
                location.reload()
              } finally {
                setWorking(false)
              }
            }}
          >
            {new Date(p).toLocaleString()}
          </button>
        ))}
      </div>
    </div>
  )}

      {isBuyer ? (
        <section className='mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h2 className='text-lg font-semibold text-slate-900'>Refunds & disputes</h2>
            <span className='text-xs text-slate-500'>Requests route to the seller support console.</span>
          </div>
          {refundRequests.length ? (
            <ul className='mt-4 space-y-3'>
              {refundRequests.map((request) => (
                <li key={request.id} className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <div className='flex flex-wrap items-start justify-between gap-2'>
                    <div>
                      <div className='text-sm font-semibold text-slate-900'>{request.reason}</div>
                      <div className='text-xs text-slate-500'>Submitted {new Date(request.createdAt).toLocaleString()}</div>
                      {request.amount ? <div className='text-xs text-slate-500'>Requested amount: A${request.amount}</div> : null}
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${refundBadgeClasses(request.status)}`}>
                      {refundStatusLabel(request.status)}
                    </span>
                  </div>
                  {request.resolution ? (
                    <p className='mt-2 text-xs text-slate-500'>Resolution: {request.resolution}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className='mt-4 text-sm text-slate-500'>You haven’t raised any disputes for this order.</p>
          )}
          <div className='mt-6 grid gap-3 md:grid-cols-2'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
              Apply to
              <select
                value={selectedRefundItem}
                onChange={(event) => setSelectedRefundItem(event.target.value)}
                className='mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-sm'
              >
                <option value='order'>Entire order</option>
                {refundableItems.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.title} · A${item.price * item.quantity}
                  </option>
                ))}
              </select>
            </label>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
              Requested amount (optional)
              <input
                type='number'
                min={0}
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                className='mt-1 w-full rounded-md border border-slate-200 p-2 text-sm'
                placeholder='Leave blank for full amount'
              />
            </label>
          </div>
          <div className='mt-4'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Describe the issue</label>
            <textarea
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
              rows={4}
              className='mt-1 w-full rounded-md border border-slate-200 p-3 text-sm'
              placeholder='Explain what went wrong so the seller can respond quickly.'
            />
          </div>
          <div className='mt-3 flex items-center gap-3 text-xs'>
            <button
              disabled={submittingRefund || hasPendingRefund}
              className='rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60'
              onClick={submitRefundRequest}
            >
              {submittingRefund ? 'Submitting…' : 'Submit refund request'}
            </button>
            {hasPendingRefund ? <span className='text-slate-500'>An existing refund is awaiting review.</span> : null}
          </div>
        </section>
      ) : null}

      {/* Actions (buyer + seller) */}
      <div className='mt-6 flex flex-wrap gap-2'>
        {isSeller && (data.items || []).some((it: any) => it?.product?.type === 'service') && data.status === 'pending' && (
          <button disabled={working} className='rounded-md bg-black px-3 py-2 text-sm text-white' onClick={async () => {
            setWorking(true); try { await fetchJson(`/api/orders/${data.id}/confirm-appointment`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }); location.reload() } finally { setWorking(false) }
          }}>Confirm Appointment</button>
        )}
        {isSeller && (data.items || []).some((it: any) => it?.product?.type === 'service') && data.status === 'scheduled' && (
          <button disabled={working} className='rounded-md border px-3 py-2 text-sm' onClick={async () => {
            setWorking(true); try { await fetchJson(`/api/orders/${data.id}/complete-service`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }); location.reload() } finally { setWorking(false) }
          }}>Mark Service Completed</button>
        )}
        {isSeller && hasService && (
          <Dialog open={proposeOpen} onOpenChange={(o) => setProposeOpen(o)}>
            <DialogTrigger asChild>
              <button className='rounded-md border px-3 py-2 text-sm'>Reject & Propose</button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Propose Alternate Times</DialogTitle>
              </DialogHeader>
              {firstService?.appointmentAt ? (
                <div className='mb-2 text-xs text-gray-600'>Buyer requested: <span className='font-medium'>{new Date(firstService.appointmentAt).toLocaleString()}</span></div>
              ) : null}
              <div className='grid gap-3'>
                <div className='grid gap-2'>
                  <div className='text-sm font-medium'>Pick date and time</div>
                  <div className='flex flex-col gap-2 md:flex-row'>
                    <Calendar mode='single' selected={selectedDate as any} onSelect={setSelectedDate as any} />
                    <div className='md:w-56'>
                      <input
                        type='time'
                        className='w-full rounded-md border p-2 text-sm'
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                      />
                      <button className='mt-2 w-full rounded-md border px-3 py-1.5 text-sm' onClick={addProposal}>Add</button>
                    </div>
                  </div>
                </div>
                <div className='text-sm'>
                  <div className='mb-1 font-medium'>Current proposals</div>
                  {localProposals.length === 0 ? (
                    <div className='text-gray-500'>No proposals added yet.</div>
                  ) : (
                    <ul className='space-y-1'>
                      {localProposals.map((p) => (
                        <li key={p} className='flex items-center justify-between rounded border p-2'>
                          <span>{new Date(p).toLocaleString?.() || p}</span>
                          <button className='rounded-md border px-2 py-1 text-xs' onClick={() => setLocalProposals((cur) => cur.filter((x) => x !== p))}>Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <DialogFooter>
                <button
                  disabled={working || localProposals.length === 0}
                  className='rounded-md bg-black px-3 py-2 text-sm text-white'
                  onClick={async () => {
                    setWorking(true)
                    try {
                      await fetchJson(`/api/orders/${data.id}/appointment/reject-propose`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ proposals: localProposals }),
                      })
                      location.reload()
                    } finally {
                      setWorking(false)
                    }
                  }}
                >
                  Send Proposals
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {isSeller && !((data.items || []).some((it: any) => it?.product?.type === 'service')) && data.status === 'paid' && (
          <button disabled={working} className='rounded-md bg-black px-3 py-2 text-sm text-white' onClick={async () => {
            setWorking(true); try { const updated = await db.shipOrder?.(data.id, true); if (updated) location.reload() } finally { setWorking(false) }
          }}>Confirm Shipped</button>
        )}
        {isBuyer && data.status === 'shipped' && (
          <button disabled={working} className='rounded-md border px-3 py-2 text-sm' onClick={async () => {
            setWorking(true); try { const updated = await db.confirmReceived?.(data.id); if (updated) location.reload() } finally { setWorking(false) }
          }}>Confirm Received</button>
        )}
        {isBuyer && hasService && data.status === 'completed' && (
          <button disabled={working} className='rounded-md bg-black px-3 py-2 text-sm text-white' onClick={async () => {
            setWorking(true); try { await fetchJson(`/api/orders/${data.id}/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }); location.reload() } finally { setWorking(false) }
          }}>Pay Now</button>
        )}
      </div>
    </div>
  )
}
