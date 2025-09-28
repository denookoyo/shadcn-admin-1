import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  PackageSearch,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react'

import { db, type Order } from '@/lib/data'
import { fetchJson } from '@/lib/http'

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  scheduled: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  shipped: 'bg-blue-50 text-blue-700 border border-blue-200',
  completed: 'bg-slate-100 text-slate-700 border border-slate-200',
  cancelled: 'bg-rose-50 text-rose-700 border border-rose-200',
}

function formatCurrency(amount: number) {
  return `A$${amount.toLocaleString()}`
}

function getBuyerLabel(order: any) {
  return order?.buyer?.name || order?.buyer?.email || 'Guest'
}

function isServiceOrder(order: any) {
  return order?.items?.some((item: any) => item?.product?.type === 'service' || item?.type === 'service')
}

const MetricCard = ({
  label,
  value,
  icon: Icon,
  help,
  accent = 'slate',
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  help?: string
  accent?: 'emerald' | 'amber' | 'slate'
}) => {
  const accents: Record<typeof accent, string> = {
    emerald: 'border-emerald-200/60 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200/60 bg-amber-50 text-amber-900',
    slate: 'border-slate-200 bg-white text-slate-900',
  }

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${accents[accent]}`}>
      <div className='flex items-start justify-between text-sm font-semibold'>
        <span>{label}</span>
        <Icon className='h-4 w-4 opacity-70' />
      </div>
      <div className='mt-3 text-2xl font-semibold'>{value}</div>
      {help ? <p className='mt-1 text-xs text-slate-500'>{help}</p> : null}
    </div>
  )
}

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className='rounded-2xl border border-dashed border-slate-200 p-10 text-center'>
    <h3 className='text-sm font-semibold text-slate-700'>{title}</h3>
    <p className='mt-2 text-sm text-slate-500'>{description}</p>
  </div>
)

export default function OrdersPage() {
  const [sellerOrders, setSellerOrders] = useState<Order[]>([] as any)
  const [buyerOrders, setBuyerOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'seller' | 'buyer'>('seller')
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewFeedback, setReviewFeedback] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [asSeller, asBuyer] = await Promise.all([
          db.listSellerOrders?.().catch(() => [] as any[]),
          db.listOrders().catch(() => [] as Order[]),
        ])
        if (!mounted) return
        setSellerOrders((asSeller || []) as any)
        setBuyerOrders(asBuyer || [])
        if ((asSeller || []).length === 0 && (asBuyer || []).length > 0) setView('buyer')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const sellerNeedsAction = useMemo(
    () =>
      sellerOrders.filter((order: any) =>
        isServiceOrder(order)
          ? order.status === 'pending' || order.status === 'scheduled'
          : order.status === 'paid'
      ),
    [sellerOrders]
  )

  const sellerInMotion = useMemo(
    () =>
      sellerOrders.filter((order: any) =>
        isServiceOrder(order)
          ? order.status === 'scheduled'
          : order.status === 'shipped'
      ),
    [sellerOrders]
  )

  const sellerCompleted = useMemo(
    () => sellerOrders.filter((order: any) => order.status === 'completed'),
    [sellerOrders]
  )

  const buyerAttention = useMemo(
    () =>
      buyerOrders.filter((order: any) =>
        order.status === 'shipped' || (isServiceOrder(order) && order.status === 'completed')
      ),
    [buyerOrders]
  )

  const buyerHistory = useMemo(
    () =>
      buyerOrders.filter((order: any) =>
        (!isServiceOrder(order) && order.status === 'completed') ||
        (isServiceOrder(order) && (order.status === 'paid' || order.status === 'completed'))
      ),
    [buyerOrders]
  )

  const kpiData = useMemo(() => {
    const sellerRevenue = sellerOrders.reduce((sum: number, order: any) => sum + order.total, 0)
    const buyerSpend = buyerOrders.reduce((sum: number, order: any) => sum + order.total, 0)

    return view === 'seller'
      ? [
          {
            label: 'Orders requiring action',
            value: sellerNeedsAction.length,
            icon: AlertTriangle,
            accent: 'amber' as const,
            help: 'Pending fulfilment or appointments awaiting confirmation',
          },
          {
            label: 'Orders in motion',
            value: sellerInMotion.length,
            icon: Truck,
            accent: 'amber' as const,
            help: 'Shipments or upcoming service slots',
          },
          {
            label: 'Completed orders',
            value: sellerCompleted.length,
            icon: CheckCircle2,
            accent: 'emerald' as const,
            help: 'Delivered and confirmed by buyers',
          },
          {
            label: 'Marketplace revenue',
            value: formatCurrency(sellerRevenue),
            icon: Sparkles,
            help: 'Lifetime sales across the marketplace',
          },
        ]
      : [
          {
            label: 'Awaiting your action',
            value: buyerAttention.length,
            icon: AlertTriangle,
            accent: 'amber' as const,
            help: 'Confirm deliveries or complete service reviews',
          },
          {
            label: 'Active orders',
            value: buyerOrders.filter((order) => order.status !== 'completed').length,
            icon: PackageSearch,
            accent: 'amber' as const,
            help: 'Orders still moving through fulfilment',
          },
          {
            label: 'Completed purchases',
            value: buyerHistory.length,
            icon: CheckCircle2,
            accent: 'emerald' as const,
            help: 'All purchases completed on Hedgetech',
          },
          {
            label: 'Marketplace spend',
            value: formatCurrency(buyerSpend),
            icon: Sparkles,
            help: 'Total spend across your account',
          },
        ]
  }, [view, sellerNeedsAction, sellerInMotion, sellerCompleted, sellerOrders, buyerAttention, buyerHistory, buyerOrders])

  async function confirmShipment(orderId: string) {
    const ok = window.confirm('Confirm the order is paid and you are shipping it now?')
    if (!ok) return
    try {
      const updated = await db.shipOrder?.(orderId, true)
      if (updated) {
        setSellerOrders((current) => current.map((order: any) => (order.id === orderId ? updated : order)))
        window.dispatchEvent(new CustomEvent('orders:changed'))
      }
    } catch {}
  }

  if (loading) {
    return <div className='mx-auto max-w-5xl px-4 py-12 text-sm text-slate-500'>Loading orders…</div>
  }

  const renderSellerBoards = () => (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {kpiData.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className='grid gap-6 lg:grid-cols-[1.7fr_1fr]'>
        <div className='space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h2 className='text-lg font-semibold text-slate-900'>Fulfilment board</h2>
              <p className='text-xs text-slate-500'>Act on the next best orders to keep SLA promises.</p>
            </div>
            <Link
              to='/marketplace/dashboard/orders/all'
              className='inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
            >
              View all orders <ArrowUpRight className='ml-1 h-4 w-4' />
            </Link>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 shadow-sm'>
              <div className='flex items-center justify-between text-sm font-semibold text-amber-800'>
                <span>Requires attention</span>
                <span className='rounded-full bg-white/70 px-2 py-0.5 text-xs'>{sellerNeedsAction.length}</span>
              </div>
              {sellerNeedsAction.length === 0 ? (
                <EmptyState title='Nothing pending' description='All new orders are handled. Refresh to capture new ones.' />
              ) : (
                sellerNeedsAction.slice(0, 4).map((order: any) => (
                  <div key={order.id} className='rounded-xl border border-white/70 bg-white/80 p-3 text-sm shadow-sm'>
                    <div className='flex items-center justify-between text-xs text-amber-700'>
                      <span className='font-semibold'>#{order.id.slice(0, 6)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge[order.status] ?? ''}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className='mt-1 text-xs text-slate-500'>Buyer: {getBuyerLabel(order)} • {order.items?.length || 0} item(s)</div>
                    <div className='mt-2 flex items-center gap-2 text-xs'>
                      <button
                        className='rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500'
                        onClick={() => (isServiceOrder(order) ? openServiceAction(order) : confirmShipment(order.id))}
                      >
                        {isServiceOrder(order) ? 'Manage appointment' : 'Confirm shipped'}
                      </button>
                      <Link
                        to='/marketplace/order/$id'
                        params={{ id: order.id }}
                        className='inline-flex items-center rounded-full border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100'
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className='space-y-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 shadow-sm'>
              <div className='flex items-center justify-between text-sm font-semibold text-blue-800'>
                <span>In motion</span>
                <span className='rounded-full bg-white/70 px-2 py-0.5 text-xs'>{sellerInMotion.length}</span>
              </div>
              {sellerInMotion.length === 0 ? (
                <EmptyState title='No shipments yet' description='Orders ready for fulfilment will drop into this queue.' />
              ) : (
                sellerInMotion.slice(0, 4).map((order: any) => (
                  <div key={order.id} className='rounded-xl border border-white/70 bg-white/80 p-3 text-sm shadow-sm'>
                    <div className='flex items-center justify-between text-xs text-blue-700'>
                      <span className='font-semibold'>#{order.id.slice(0, 6)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge[order.status] ?? ''}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className='mt-1 text-xs text-slate-500'>Buyer: {getBuyerLabel(order)} • {order.items?.length || 0} item(s)</div>
                    <div className='mt-2 flex items-center gap-2 text-xs'>
                      <Link
                        to='/marketplace/order/$id'
                        params={{ id: order.id }}
                        className='inline-flex items-center rounded-full border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100'
                      >
                        Track progress
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className='space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm'>
          <h3 className='text-base font-semibold text-slate-900'>Operational checklist</h3>
          <div className='space-y-3 text-sm text-slate-600'>
            <div className='rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm'>
              <div className='font-semibold text-slate-900'>Confirm today’s appointments</div>
              <p className='text-xs text-slate-500'>Reach out 2 hours before service windows to lock preferences.</p>
            </div>
            <div className='rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm'>
              <div className='font-semibold text-slate-900'>Update tracking for new shipments</div>
              <p className='text-xs text-slate-500'>Set carrier and tracking IDs immediately after hand-off.</p>
            </div>
            <div className='rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm'>
              <div className='font-semibold text-slate-900'>Review feedback from recent buyers</div>
              <p className='text-xs text-slate-500'>Respond within 24 hours to maintain Hedgetech trust scores.</p>
            </div>
          </div>
        </div>
      </div>

      <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h3 className='text-base font-semibold text-slate-900'>Recently completed</h3>
            <p className='text-xs text-slate-500'>Finalise reviews and close the loop on fulfilment.</p>
          </div>
        </div>

        {sellerCompleted.length === 0 ? (
          <EmptyState title='No completed orders yet' description='Your fulfilled orders will appear here for post-sales follow-up.' />
        ) : (
          <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
            {sellerCompleted.slice(0, 6).map((order: any) => (
              <div key={order.id} className='rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm shadow-sm'>
                <div className='flex items-center justify-between text-xs text-slate-500'>
                  <span className='font-semibold text-slate-700'>#{order.id.slice(0, 6)}</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className='mt-2 text-xs text-slate-500'>Buyer: {getBuyerLabel(order)} • {order.items?.length || 0} item(s)</div>
                <div className='mt-3 flex items-center justify-between'>
                  <div className='text-sm font-semibold text-slate-900'>{formatCurrency(order.total)}</div>
                  <Link
                    to='/marketplace/order/$id'
                    params={{ id: order.id }}
                    className='inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
                  >
                    View receipt
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderBuyerBoards = () => (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {kpiData.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className='grid gap-6 lg:grid-cols-[1.7fr_1fr]'>
        <div className='space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h2 className='text-lg font-semibold text-slate-900'>Your purchases</h2>
              <p className='text-xs text-slate-500'>Track fulfilment, confirm deliveries, and request support.</p>
            </div>
          </div>

          <div className='space-y-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 shadow-sm'>
            <div className='flex items-center justify-between text-sm font-semibold text-blue-800'>
              <span>Awaiting your action</span>
              <span className='rounded-full bg-white/70 px-2 py-0.5 text-xs'>{buyerAttention.length}</span>
            </div>
            {buyerAttention.length === 0 ? (
              <EmptyState title='Up to date' description='We’ll surface orders here when action is needed.' />
            ) : (
              buyerAttention.slice(0, 5).map((order: any) => (
                <div key={order.id} className='rounded-xl border border-white/70 bg-white/90 p-3 text-sm shadow-sm'>
                  <div className='flex items-center justify-between text-xs text-blue-700'>
                    <span className='font-semibold'>#{order.id.slice(0, 6)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge[order.status] ?? ''}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className='mt-1 text-xs text-slate-500'>{order.items?.length || 0} item(s)</div>
                  <div className='mt-2 flex items-center gap-2 text-xs'>
                    {order.status === 'shipped' ? (
                      <button
                        className='rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500'
                        onClick={async () => {
                          try {
                            const updated = await db.confirmReceived?.(order.id)
                            if (updated) {
                              setBuyerOrders((current) => current.map((o) => (o.id === order.id ? (updated as Order) : o)))
                            }
                          } catch {}
                        }}
                      >
                        Confirm received
                      </button>
                    ) : (
                      <button
                        className='rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100'
                        onClick={async () => {
                          try {
                            await fetchJson(`/api/orders/${order.id}/pay`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                            })
                            setBuyerOrders((current) =>
                              current.map((o) => (o.id === order.id ? { ...o, status: 'paid' } : o))
                            )
                          } catch {}
                        }}
                      >
                        Pay now
                      </button>
                    )}
                    <Link
                      to='/marketplace/order/$id'
                      params={{ id: order.id }}
                      className='inline-flex items-center rounded-full border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100'
                    >
                      View details
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className='space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm'>
          <h3 className='text-base font-semibold text-slate-900'>Need a hand?</h3>
          <div className='space-y-3 text-sm text-slate-600'>
            <div className='rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm'>
              <div className='font-semibold text-slate-900'>Message the seller</div>
              <p className='text-xs text-slate-500'>Clarify delivery info or ask for scheduling changes in chat.</p>
              <a
                href='/_authenticated/chats/'
                className='mt-3 inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
              >
                Open chat <ArrowUpRight className='ml-1 h-4 w-4' />
              </a>
            </div>
            <div className='rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm'>
              <div className='font-semibold text-slate-900'>Browse help topics</div>
              <p className='text-xs text-slate-500'>Find self-serve answers for returns, payouts, and booking questions.</p>
              <a
                href='/_authenticated/help-center/'
                className='mt-3 inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
              >
                Visit help center <ArrowUpRight className='ml-1 h-4 w-4' />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h3 className='text-base font-semibold text-slate-900'>Order history</h3>
            <p className='text-xs text-slate-500'>Leave feedback to help other buyers choose with confidence.</p>
          </div>
        </div>

        {buyerHistory.length === 0 ? (
          <EmptyState title='No completed purchases yet' description='Completed orders will appear here for quick reference and receipts.' />
        ) : (
          <div className='mt-4 space-y-3'>
            {buyerHistory.map((order: any) => (
              <div key={order.id} className='rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm shadow-sm'>
                <div className='flex items-center justify-between text-xs text-slate-500'>
                  <span className='font-semibold text-slate-700'>#{order.id.slice(0, 6)}</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className='mt-1 text-xs text-slate-500'>{order.items?.length || 0} item(s)</div>
                <div className='mt-3 flex items-center justify-between gap-4'>
                  <div className='text-sm font-semibold text-slate-900'>{formatCurrency(order.total)}</div>
                  <div className='flex items-center gap-2'>
                    <button
                      className='inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
                      onClick={async () => {
                        setReviewOrderId(order.id)
                        setReviewRating(5)
                        setReviewFeedback('')
                        try {
                          const existing = await db.getOrderReview?.(order.id)
                          if (existing) {
                            setReviewRating(existing.rating)
                            setReviewFeedback(existing.feedback)
                          }
                        } catch {}
                      }}
                    >
                      <Star className='h-3.5 w-3.5' /> Rate seller
                    </button>
                    <Link
                      to='/marketplace/order/$id'
                      params={{ id: order.id }}
                      className='inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
                    >
                      View receipt
                    </Link>
                  </div>
                </div>

                {reviewOrderId === order.id ? (
                  <div className='mt-3 space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-4 text-xs'>
                    <div className='font-semibold text-slate-700'>How did the seller perform?</div>
                    <div className='flex items-center gap-2'>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className={`flex h-7 w-7 items-center justify-center rounded-full ${star <= reviewRating ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                          onClick={() => setReviewRating(star)}
                        >
                          <Star className='h-3.5 w-3.5 fill-current' />
                        </button>
                      ))}
                    </div>
                    <textarea
                      className='w-full rounded-md border border-slate-200 p-2 text-sm'
                      rows={3}
                      placeholder='Share your experience for other buyers'
                      value={reviewFeedback}
                      onChange={(event) => setReviewFeedback(event.target.value)}
                    />
                    <div className='flex justify-end gap-2'>
                      <button
                        className='rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600'
                        onClick={() => setReviewOrderId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className='rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500'
                        onClick={async () => {
                          try {
                            await db.submitOrderReview?.(order.id, reviewRating, reviewFeedback)
                            setReviewOrderId(null)
                          } catch {}
                        }}
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  function openServiceAction(order: any) {
    if (order.status === 'pending') {
      fetchJson(`/api/orders/${order.id}/confirm-appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(() => window.dispatchEvent(new CustomEvent('orders:changed')))
        .catch(() => {})
    } else {
      fetchJson(`/api/orders/${order.id}/complete-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(() => window.dispatchEvent(new CustomEvent('orders:changed')))
        .catch(() => {})
    }
  }

  return (
    <div className='mx-auto max-w-6xl space-y-10 px-4 py-10'>
      <section className='relative overflow-hidden rounded-3xl border border-emerald-100/70 bg-gradient-to-br from-[#102534] via-[#0f766e] to-[#34d399] px-6 py-10 text-white shadow-lg md:px-10'>
        <div className='absolute -left-24 top-12 hidden h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl md:block' />
        <div className='relative grid gap-8 lg:grid-cols-[1.6fr_1fr]'>
          <div className='space-y-5'>
            <span className='inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-50'>
              Hedgetech fulfilment orchestration
            </span>
            <h1 className='text-3xl font-semibold md:text-4xl'>
              {view === 'seller' ? 'Stay ahead of every order and appointment' : 'Keep your purchases moving smoothly'}
            </h1>
            <p className='max-w-2xl text-sm text-emerald-50/90 md:text-base'>
              {view === 'seller'
                ? 'Organise fulfilment, bookings, and buyer communication from a single Hedgetech control surface.'
                : 'Track fulfilment, confirm handovers, and share feedback without leaving the marketplace.'}
            </p>
            <div className='flex flex-wrap gap-3 text-sm font-semibold'>
              <button
                className={`rounded-full px-5 py-2 transition ${
                  view === 'seller'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'border border-white/40 text-white hover:bg-white/10'
                }`}
                onClick={() => setView('seller')}
              >
                Seller view
              </button>
              <button
                className={`rounded-full px-5 py-2 transition ${
                  view === 'buyer'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'border border-white/40 text-white hover:bg-white/10'
                }`}
                onClick={() => setView('buyer')}
              >
                Buyer view
              </button>
            </div>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            {kpiData.slice(0, 2).map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>
        </div>
      </section>

      {view === 'seller' ? renderSellerBoards() : renderBuyerBoards()}
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/orders/')({
  component: OrdersPage,
})
