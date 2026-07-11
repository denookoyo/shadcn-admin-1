import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { useAuthStore } from '@/stores/authStore'
import { db, type RefundRequest } from '@/lib/data'
import { fetchJson } from '@/lib/http'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { buildGangLedgerSignInUrl, marketplaceConsumerMode } from '@/lib/marketplace-consumer'
import type { PaymentRoute, StorePaymentSettings } from '@/lib/localdb'

export const Route = createFileRoute('/marketplace/_layout/order/$id')({
  component: OrderDetail,
})

function OrderDetail() {
  const { id } = useParams({ from: '/marketplace/_layout/order/$id' })
  const me = useAuthStore((s) => s.auth.user as any | null)
  const namespace = me?.email || (me as any)?.accountNo || 'guest'
  const isLiveDataEnabled =
    typeof window !== 'undefined' &&
    (((import.meta as any)?.env?.VITE_USE_API === 'true') || marketplaceConsumerMode)
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [working, setWorking] = useState(false)
  const [localFallback, setLocalFallback] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadOrder() {
      try {
        const order = await db.getOrder?.(id, namespace)
        if (!order) {
          throw new Error(isLiveDataEnabled ? 'Order not found.' : 'Unable to load this order in demo mode.')
        }
        if (mounted) {
          setData(order)
          setError(null)
          setStatus(null)
          setLocalFallback(!isLiveDataEnabled)
        }
      } catch (e: any) {
        if (mounted) {
          const message = String(e?.message || 'Failed to load order')
          const matchedStatus = message.match(/HTTP\s+(\d{3})/)
          setStatus(matchedStatus ? Number(matchedStatus[1]) : null)
          setError(message)
        }
      }
    }

    loadOrder()

    return () => {
      mounted = false
    }
  }, [id, namespace, isLiveDataEnabled])

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
  const [refundFeedback, setRefundFeedback] = useState<string | null>(null)
  const [paymentFeedback, setPaymentFeedback] = useState<string | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<StorePaymentSettings | null>(null)
  const [paymentRoute, setPaymentRoute] = useState<PaymentRoute>('platform')
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false)
  const [shipmentBarcodes, setShipmentBarcodes] = useState<Record<string, string>>({})
  const [shipmentBusy, setShipmentBusy] = useState(false)
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

  useEffect(() => {
    let mounted = true
    if (!isSeller || typeof db.getStorePaymentSettings !== 'function') return () => { mounted = false }
    db.getStorePaymentSettings()
      .then((result) => {
        if (!mounted) return
        setPaymentSettings(result?.paymentSettings || null)
        setPaymentRoute(result?.paymentSettings?.defaultPaymentRoute || 'platform')
      })
      .catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [isSeller])

  const refundableItems = useMemo(() => data?.items ?? [], [data])
  const hasPendingRefund = useMemo(
    () => refundRequests.some((item) => item.status === 'requested' || item.status === 'reviewing'),
    [refundRequests]
  )

  if (error) {
    if (status === 401 || status === 403) {
      return (
        <MarketplacePageShell width='default' className='space-y-3 text-sm text-slate-700' topSpacing='md' bottomSpacing='md'>
          <div className='text-lg font-semibold'>Sign in to view this order</div>
          <div>This order is only visible to the buyer or seller. If you checked out as a guest, use your tracking link.</div>
          <div className='flex gap-2'>
            {marketplaceConsumerMode ? (
              <a href={buildGangLedgerSignInUrl(`/marketplace/order/${id}`)} className='rounded-md border px-3 py-2'>
                Sign in with Gang Ledger
              </a>
            ) : (
              <Link to='/sign-in' search={{ redirect: `/marketplace/order/${id}` }} className='rounded-md border px-3 py-2'>Sign in</Link>
            )}
            <Link to='/marketplace/order/track' className='rounded-md border px-3 py-2'>Track with code</Link>
          </div>
        </MarketplacePageShell>
      )
    }
    return (
      <MarketplacePageShell width='default' className='text-sm text-red-600' topSpacing='md' bottomSpacing='md'>
        Error: {error}
      </MarketplacePageShell>
    )
  }
  if (!data) {
    return (
      <MarketplacePageShell width='default' className='text-sm text-slate-500' topSpacing='md' bottomSpacing='md'>
        Loading order…
      </MarketplacePageShell>
    )
  }

  const isService = (item: any) => item.product?.type === 'service'
  const hasService = (data.items || []).some((it: any) => isService(it))
  const goodsItems = (data.items || []).filter((it: any) => !isService(it))
  const paymentStatus = String(data.paymentStatus || '').toLowerCase() || 'pending'
  const paymentMade = paymentStatus === 'paid' || ['paid', 'shipped', 'completed', 'refunded'].includes(data.status)
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
      setRefundFeedback('You already have a refund request awaiting review.')
      return
    }
    if (!refundReason.trim()) {
      setRefundFeedback('Please describe the issue before submitting a refund request.')
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
        setRefundFeedback('Refund request submitted. Support will review it shortly.')
      }
    } catch (err) {
      setRefundFeedback((err as Error)?.message ?? 'Unable to submit refund request right now.')
    } finally {
      setSubmittingRefund(false)
    }
  }

  async function connectStripe() {
    try {
      setPaymentBusy(true)
      const response = await db.connectStripeAccount?.()
      if (response?.url) {
        window.location.href = response.url
        return
      }
      setPaymentFeedback('Unable to start Stripe onboarding.')
    } catch (err) {
      setPaymentFeedback((err as Error)?.message ?? 'Unable to start Stripe onboarding.')
    } finally {
      setPaymentBusy(false)
    }
  }

  async function requestPayment() {
    try {
      setPaymentBusy(true)
      const response = await db.requestOrderPayment?.(id, paymentRoute)
      if (response?.order) {
        setData(response.order)
        setPaymentFeedback('Payment request created.')
        setPaymentDialogOpen(false)
      }
    } catch (err) {
      setPaymentFeedback((err as Error)?.message ?? 'Unable to create payment request.')
    } finally {
      setPaymentBusy(false)
    }
  }

  async function cancelPaymentRequest() {
    try {
      setPaymentBusy(true)
      const updated = await db.cancelOrderPaymentRequest?.(id)
      if (updated) {
        setData(updated)
        setPaymentFeedback('Payment request cancelled.')
      }
    } catch (err) {
      setPaymentFeedback((err as Error)?.message ?? 'Unable to cancel payment request.')
    } finally {
      setPaymentBusy(false)
    }
  }

  function openShipmentDialog() {
    const next: Record<string, string> = {}
    for (const item of goodsItems) {
      next[item.id] = Array.isArray(item.shippedBarcodes) ? item.shippedBarcodes.join('\n') : ''
    }
    setShipmentBarcodes(next)
    setShipmentDialogOpen(true)
  }

  async function confirmShipment() {
    try {
      const shipmentItems = goodsItems.map((item: any) => {
        const barcodes = String(shipmentBarcodes[item.id] || '')
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean)
        if (barcodes.length !== Number(item.quantity || 0)) {
          throw new Error(`Enter ${item.quantity} barcode${item.quantity === 1 ? '' : 's'} for ${item.title}.`)
        }
        return {
          orderItemId: item.id,
          barcodes,
        }
      })
      setShipmentBusy(true)
      const updated = await db.shipOrder?.(data.id, { ackPaid: true, items: shipmentItems })
      if (updated) {
        setData(updated)
        setShipmentDialogOpen(false)
      }
    } catch (err) {
      setPaymentFeedback((err as Error)?.message ?? 'Unable to confirm shipment.')
    } finally {
      setShipmentBusy(false)
    }
  }

  return (
    <MarketplacePageShell width='default'>
      <div className='mb-2 text-sm'><Link to='/marketplace/my-orders' className='underline'>Back to My Orders</Link></div>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Order #{String(data.id).slice(0, 6)}</h1>
          <div className='mt-2 text-sm text-gray-600'>
            Status: <span className='font-semibold capitalize'>{data.status}</span>
          </div>
          <div className='mt-1 text-sm text-gray-600'>Placed: {new Date(data.createdAt).toLocaleString()}</div>
        </div>
      </div>
      {data.address ? (
        <div className='mt-1 text-sm text-gray-600'>Posting address: <span className='font-medium'>{data.address}</span></div>
      ) : null}

      <div className='mt-3 text-sm text-gray-600'>
        Payment: <span className={paymentMade ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>{paymentMade ? 'Paid' : paymentStatus.replace(/_/g, ' ')}</span>
      </div>
      {paymentFeedback ? (
        <div className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${paymentFeedback.toLowerCase().includes('unable') ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {paymentFeedback}
        </div>
      ) : null}
      {isSeller && paymentStatus === 'pending' ? (
        <button
          type='button'
          onClick={() => setPaymentDialogOpen(true)}
          className='mt-2 inline-flex items-center rounded-full border border-emerald-200 px-4 py-1 text-sm font-semibold text-emerald-700 hover:bg-emerald-50'
        >
          Request payment
        </button>
      ) : null}
      {paymentStatus === 'payment_requested' && data.paymentUrl ? (
        <div className='mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>
          <div className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>Payment requested</div>
          <p className='mt-1 text-xs text-emerald-700'>
            {isSeller ? 'Share or reopen the Stripe Checkout link below.' : 'Complete payment using the secure checkout link below.'}
          </p>
          <div className='mt-3 flex flex-wrap gap-2'>
            <a
              href={data.paymentUrl}
              target='_blank'
              rel='noreferrer'
              className='rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700'
            >
              Open checkout
            </a>
            <button
              type='button'
              className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700'
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(data.paymentUrl)
                  setPaymentFeedback('Payment link copied.')
                } catch {
                  setPaymentFeedback('Unable to copy the payment link.')
                }
              }}
            >
              Copy payment link
            </button>
            {isSeller ? (
              <button
                type='button'
                className='rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700'
                onClick={() => void cancelPaymentRequest()}
                disabled={paymentBusy}
              >
                Cancel payment request
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {localFallback ? (
        <div className='mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700'>
          Viewing demo data. Connect the API backend or sign in to see live fulfilment details.
        </div>
      ) : null}

      {/* Buyer details */}
      <div className='mt-3 rounded-2xl border p-4'>
        <div className='mb-2 text-lg font-semibold'>Buyer</div>
        <div className='grid gap-1 text-sm sm:grid-cols-2'>
          <div>Name: <span className='font-medium'>{data.buyer?.name || data.buyer?.email || '—'}</span></div>
          <div>Email: <span className='font-medium'>{data.buyer?.email || '—'}</span></div>
          <div>Phone: <span className='font-medium'>{data.customerPhone || data.buyer?.phoneNo || '—'}</span></div>
          <div className='sm:col-span-2'>Address: <span className='font-medium'>{data.address || '—'}</span></div>
        </div>
      </div>

      <div className='mt-6 rounded-2xl border p-4'>
        <div className='mb-3 text-lg font-semibold'>Items</div>
        <div className='space-y-2 text-sm'>
          {(data.items || []).map((it: any) => (
            <div key={it.id} className='rounded-md border p-2'>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex min-w-0 items-center gap-3'>
                  {it.product?.img ? <img src={it.product.img} className='h-10 w-10 shrink-0 rounded object-cover' /> : null}
                  <div className='font-medium'>{it.title}</div>
                </div>
                <div className='text-sm font-medium'>A${it.price * it.quantity}</div>
              </div>
              <div className='text-xs text-gray-500'>Qty: {it.quantity}</div>
              {Array.isArray(it.shippedBarcodes) && it.shippedBarcodes.length ? (
                <div className='mt-1 text-xs text-gray-500'>Shipped barcodes: {it.shippedBarcodes.join(', ')}</div>
              ) : null}
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
      {refundFeedback ? (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${refundFeedback.toLowerCase().includes('unable') || refundFeedback.toLowerCase().includes('already') || refundFeedback.toLowerCase().includes('please') ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {refundFeedback}
        </div>
      ) : null}

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
        {isSeller && !hasService && paymentMade && data.status === 'paid' && (
          <button disabled={working || shipmentBusy} className='rounded-md bg-black px-3 py-2 text-sm text-white' onClick={openShipmentDialog}>Confirm Shipped</button>
        )}
        {isBuyer && data.status === 'shipped' && (
          <button disabled={working} className='rounded-md border px-3 py-2 text-sm' onClick={async () => {
            setWorking(true); try { const updated = await db.confirmReceived?.(data.id); if (updated) location.reload() } finally { setWorking(false) }
          }}>Confirm Received</button>
        )}
        {isBuyer && paymentStatus === 'payment_requested' && data.paymentUrl ? (
          <a href={data.paymentUrl} target='_blank' rel='noreferrer' className='rounded-md bg-black px-3 py-2 text-sm text-white'>
            Open Checkout
          </a>
        ) : null}
      </div>
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request payment</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 text-sm text-slate-600'>
            <div className='text-xl font-semibold text-slate-900'>A${Number(data.total || 0).toFixed(2)}</div>
            <div className='text-xs text-slate-500'>Choose where the payment should be processed.</div>
            <label className='flex items-start gap-3 rounded-2xl border border-slate-200 p-4'>
              <input type='radio' name='payment-route' value='platform' checked={paymentRoute === 'platform'} onChange={() => setPaymentRoute('platform')} className='mt-1' />
              <div>
                <div className='font-semibold text-slate-900'>Gang Ledger Payments</div>
                <div className='text-xs text-slate-500'>Process through Gang Ledger&apos;s Stripe account.</div>
              </div>
            </label>
            <label className={`flex items-start gap-3 rounded-2xl border p-4 ${paymentSettings?.stripeChargesEnabled ? 'border-slate-200' : 'border-slate-100 bg-slate-50/70'}`}>
              <input
                type='radio'
                name='payment-route'
                value='connected_account'
                checked={paymentRoute === 'connected_account'}
                onChange={() => setPaymentRoute('connected_account')}
                className='mt-1'
                disabled={!paymentSettings?.stripeChargesEnabled}
              />
              <div className='flex-1'>
                <div className='font-semibold text-slate-900'>My Stripe Account</div>
                <div className='text-xs text-slate-500'>Receive payment through your connected Stripe account.</div>
                {!paymentSettings?.stripeConnectedAccountId ? <div className='mt-2 text-xs font-medium text-amber-700'>Connect Stripe first.</div> : null}
                {paymentSettings?.stripeConnectedAccountId && !paymentSettings?.stripeChargesEnabled ? (
                  <div className='mt-2 text-xs font-medium text-amber-700'>Finish Stripe verification to enable this route.</div>
                ) : null}
              </div>
            </label>
          </div>
          <DialogFooter className='flex-col gap-2 sm:flex-row sm:justify-between'>
            <div>
              {paymentRoute === 'connected_account' && !paymentSettings?.stripeChargesEnabled ? (
                <button type='button' className='rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700' onClick={() => void connectStripe()} disabled={paymentBusy}>
                  Connect my Stripe account
                </button>
              ) : null}
            </div>
            <div className='flex gap-2'>
              <button type='button' className='rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700' onClick={() => setPaymentDialogOpen(false)}>
                Cancel
              </button>
              <button
                type='button'
                className='rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60'
                disabled={paymentBusy || (paymentRoute === 'connected_account' && !paymentSettings?.stripeChargesEnabled)}
                onClick={() => void requestPayment()}
              >
                {paymentBusy ? 'Creating…' : 'Continue'}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={shipmentDialogOpen} onOpenChange={setShipmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm shipped</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 text-sm text-slate-600'>
            <p>Enter one barcode per line for each item being shipped.</p>
            {goodsItems.map((item: any) => (
              <label key={item.id} className='block space-y-2 rounded-2xl border border-slate-200 p-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='font-semibold text-slate-900'>{item.title}</div>
                  <div className='text-xs text-slate-500'>Quantity: {item.quantity}</div>
                </div>
                <textarea
                  rows={Math.max(3, Number(item.quantity || 1))}
                  value={shipmentBarcodes[item.id] || ''}
                  onChange={(event) =>
                    setShipmentBarcodes((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                  placeholder='One barcode per line'
                  className='w-full rounded-2xl border border-slate-200 p-3 text-sm'
                />
              </label>
            ))}
          </div>
          <DialogFooter className='flex-col gap-2 sm:flex-row sm:justify-end'>
            <button type='button' className='rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700' onClick={() => setShipmentDialogOpen(false)}>
              Cancel
            </button>
            <button
              type='button'
              className='rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60'
              disabled={shipmentBusy}
              onClick={() => void confirmShipment()}
            >
              {shipmentBusy ? 'Saving…' : 'Confirm shipped'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MarketplacePageShell>
  )
}
