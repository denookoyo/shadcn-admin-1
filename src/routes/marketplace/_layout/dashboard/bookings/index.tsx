import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertCircle, CalendarClock, Clock3, Loader2 } from 'lucide-react'
import { db, type Order } from '@/lib/data'

export const Route = createFileRoute('/marketplace/_layout/dashboard/bookings/')({
  component: BookingsPage,
})

type SellerOrderItem = Order['items'][number] & {
  id?: string
  appointmentAt?: string | null
  appointmentStatus?: string | null
  appointmentAlternates?: string | null
  product?: { id: string; type?: 'goods' | 'service' } | null
}

type SellerOrder = Omit<Order, 'items'> & {
  items: SellerOrderItem[]
  buyer?: { id: number; name?: string | null; email: string }
}

type ScheduleEntry = {
  orderId: string
  itemId: string
  productId: string
  title: string
  appointmentAt: string | null
  appointmentStatus: string
  appointmentAlternates?: string | null
  buyerLabel: string
  createdAt: string
}

const dateHeadingFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

function normaliseStatus(status?: string | null) {
  return (status || '').toLowerCase()
}

function parseAlternates(value?: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function BookingsPage() {
  const hasSellerApi = typeof db.listSellerOrders === 'function'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<SellerOrder[]>([])

  useEffect(() => {
    let mounted = true
    if (!hasSellerApi) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const data = await db.listSellerOrders!()
        if (!mounted) return
        setOrders(data as SellerOrder[])
      } catch (err: unknown) {
        if (!mounted) return
        const message = err instanceof Error ? err.message : 'Unable to load bookings'
        setError(message)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [hasSellerApi])

  const entries = useMemo<ScheduleEntry[]>(() => {
    const list: ScheduleEntry[] = []
    for (const order of orders) {
      const buyerLabel = order.buyer?.name || order.buyer?.email || 'Buyer'
      for (const item of order.items ?? []) {
        const type = item.product?.type || 'goods'
        if (type !== 'service') continue
        list.push({
          orderId: order.id,
          itemId: item.id ?? `${order.id}:${item.productId}`,
          productId: item.productId,
          title: item.title,
          appointmentAt: item.appointmentAt ?? null,
          appointmentStatus: normaliseStatus(item.appointmentStatus) || order.status,
          appointmentAlternates: item.appointmentAlternates,
          buyerLabel,
          createdAt: order.createdAt,
        })
      }
    }
    return list
  }, [orders])

  const scheduledByDay = useMemo(() => {
    const grouped = new Map<string, ScheduleEntry[]>()
    for (const entry of entries) {
      if (!entry.appointmentAt) continue
      const status = entry.appointmentStatus
      if (!['confirmed', 'scheduled'].includes(status)) continue
      const dayKey = entry.appointmentAt.slice(0, 10)
      if (!grouped.has(dayKey)) grouped.set(dayKey, [])
      grouped.get(dayKey)!.push(entry)
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, items]) => ({ day, items: items.sort((a, b) => (a.appointmentAt! > b.appointmentAt! ? 1 : -1)) }))
  }, [entries])

  const pendingEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        const status = entry.appointmentStatus
        if (entry.appointmentAt && ['confirmed', 'scheduled'].includes(status)) return false
        return ['requested', 'pending', 'proposed', ''].includes(status)
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [entries])

  if (!hasSellerApi) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-10'>
        <div className='rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800'>
          <AlertCircle className='mb-2 h-5 w-5' />
          Connect to the live API to manage service bookings. In local demo mode, booking workflows are disabled.
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-5xl px-4 py-10'>
      <header className='mb-8 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-wide text-emerald-600'>Operations</p>
          <h1 className='text-2xl font-semibold text-slate-900'>Service schedule</h1>
          <p className='mt-1 text-sm text-slate-600'>Track confirmed appointments and respond to new booking requests without leaving your dashboard.</p>
        </div>
      </header>

      {loading ? (
        <div className='flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 text-sm text-slate-500'>
          <Loader2 className='mr-3 h-5 w-5 animate-spin text-emerald-600' /> Loading your bookings…
        </div>
      ) : error ? (
        <div className='rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-600'>
          <div className='flex items-center gap-2 font-semibold'><AlertCircle className='h-4 w-4' />Unable to load bookings</div>
          <p className='mt-2 text-xs'>{error}</p>
          <button
            type='button'
            className='mt-4 inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100'
            onClick={() => {
              setLoading(true)
              setError(null)
              ;(async () => {
                try {
                  const data = await db.listSellerOrders!()
                  setOrders(data as SellerOrder[])
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Unable to load bookings'
                  setError(message)
                } finally {
                  setLoading(false)
                }
              })()
            }}
          >
            Retry
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className='rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500'>
          You don’t have any service bookings yet. Publish a service listing to start accepting appointments.
        </div>
      ) : (
        <div className='space-y-10'>
          <section className='space-y-4'>
            <div className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
              <CalendarClock className='h-4 w-4 text-emerald-600' /> Upcoming schedule
            </div>
            {scheduledByDay.length === 0 ? (
              <div className='rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500'>
                No confirmed appointments yet. Confirm incoming requests to populate your schedule.
              </div>
            ) : (
              <div className='space-y-4'>
                {scheduledByDay.map(({ day, items }) => {
                  const heading = dateHeadingFormatter.format(new Date(`${day}T00:00:00`))
                  return (
                    <div key={day} className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
                      <div className='mb-4 flex items-center justify-between text-sm text-slate-600'>
                        <span className='font-semibold text-slate-900'>{heading}</span>
                        <span>{items.length} booking{items.length > 1 ? 's' : ''}</span>
                      </div>
                      <ul className='space-y-3'>
                        {items.map((entry) => {
                          const timeLabel = entry.appointmentAt ? timeFormatter.format(new Date(entry.appointmentAt)) : '—'
                          return (
                            <li key={entry.itemId} className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3'>
                              <div className='flex flex-col gap-1 text-sm text-slate-700'>
                                <div className='font-semibold text-slate-900'>{timeLabel} • {entry.title}</div>
                                <div className='text-xs text-slate-500'>Buyer: {entry.buyerLabel}</div>
                              </div>
                              <Link
                                to='/marketplace/dashboard/order/$id'
                                params={{ id: entry.orderId }}
                                className='inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50'
                              >
                                Manage order
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className='space-y-4'>
            <div className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
              <Clock3 className='h-4 w-4 text-emerald-600' /> Requests awaiting action
            </div>
            {pendingEntries.length === 0 ? (
              <div className='rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500'>
                You’re all caught up. New booking requests will appear here when buyers propose times.
              </div>
            ) : (
              <div className='space-y-3'>
                {pendingEntries.map((entry) => {
                  const alternates = parseAlternates(entry.appointmentAlternates)
                  return (
                    <div key={entry.itemId} className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div>
                          <div className='text-sm font-semibold text-slate-900'>{entry.title}</div>
                          <div className='text-xs text-slate-500'>Buyer: {entry.buyerLabel}</div>
                        </div>
                        <span className='rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700'>
                          {entry.appointmentStatus === 'proposed' ? 'Awaiting buyer confirmation' : 'Action required'}
                        </span>
                      </div>
                      <div className='mt-3 space-y-2 text-xs text-slate-600'>
                        {entry.appointmentAt ? (
                          <div>Preferred time: {timeFormatter.format(new Date(entry.appointmentAt))} on {dateHeadingFormatter.format(new Date(entry.appointmentAt))}</div>
                        ) : (
                          <div>Buyer requested a time. Confirm, reject, or propose alternatives.</div>
                        )}
                        {alternates.length ? (
                          <div>
                            Proposed options:
                            <ul className='mt-1 list-inside list-disc'>
                              {alternates.map((iso: string) => (
                                <li key={iso}>{dateHeadingFormatter.format(new Date(iso))} at {timeFormatter.format(new Date(iso))}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                      <div className='mt-4 flex flex-wrap gap-2'>
                        <Link
                          to='/marketplace/dashboard/order/$id'
                          params={{ id: entry.orderId }}
                          className='inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50'
                        >
                          Review request
                        </Link>
                        <Link
                          to='/marketplace/dashboard/listings/product'
                          search={{ id: entry.productId }}
                          className='inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'
                        >
                          Edit service hours
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
