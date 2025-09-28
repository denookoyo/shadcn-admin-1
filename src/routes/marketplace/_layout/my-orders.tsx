import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { PackageCheck, PackageSearch, Clock3, Truck } from 'lucide-react'
import { db, type Order } from '@/lib/data'

export const Route = createFileRoute('/marketplace/_layout/my-orders')({
  component: MyOrders,
})

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
      <h2 className='text-lg font-semibold text-slate-900'>{title}</h2>
      <div className='space-y-3'>{children}</div>
    </section>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className='flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between'>{children}</div>
}

function StatusPill({ children, intent }: { children: React.ReactNode; intent: 'emerald' | 'amber' | 'slate' }) {
  const classes =
    intent === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : intent === 'amber'
        ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : 'bg-slate-100 text-slate-700 border border-slate-200'
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{children}</span>
}

function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [guest, setGuest] = useState<Array<{ id: string; code: string; createdAt?: string }>>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const list = await db.listOrders()
        if (!mounted) return
        setOrders(list)
      } catch {
        if (!mounted) return
        setOrders([])
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()
    try {
      const raw = localStorage.getItem('guestOrders')
      const list = raw ? JSON.parse(raw) : []
      if (mounted) setGuest(Array.isArray(list) ? list : [])
    } catch {}
    return () => {
      mounted = false
    }
  }, [])

  const shipped = useMemo(() => orders.filter((order) => order.status === 'shipped'), [orders])
  const completed = useMemo(
    () => orders.filter((order: any) => order.status === 'completed' || order.status === 'paid'),
    [orders]
  )
  const pending = useMemo(
    () => orders.filter((order: any) => order.status === 'pending' || order.status === 'scheduled'),
    [orders]
  )

  if (loading) return <div className='mx-auto max-w-5xl px-4 py-12 text-sm text-slate-500'>Loading orders…</div>

  return (
    <div className='mx-auto max-w-5xl space-y-8 px-4 py-10'>
      <header className='rounded-3xl border border-emerald-100/60 bg-emerald-50/60 p-6 shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <span className='inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
              Hedgetech orders
            </span>
            <h1 className='mt-3 text-2xl font-semibold text-slate-900'>Track your active and historic orders</h1>
            <p className='mt-2 max-w-2xl text-sm text-slate-600'>Monitor fulfilment, confirm deliveries, and escalate issues directly from your Hedgetech workspace.</p>
          </div>
          <div className='flex items-center gap-3 rounded-2xl border border-white bg-white/80 px-4 py-3 text-xs text-slate-600 shadow-sm'>
            <PackageCheck className='h-4 w-4 text-emerald-600' />
            <div>
              <div className='font-semibold text-slate-800'>{orders.length} orders</div>
              <div>{completed.length} completed to date</div>
            </div>
          </div>
        </div>
      </header>

      {guest.length > 0 ? (
        <section className='rounded-3xl border border-dashed border-emerald-200 bg-white p-6 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h2 className='text-lg font-semibold text-slate-900'>Guest orders</h2>
              <p className='text-xs text-slate-500'>Use these codes to track orders placed without signing in.</p>
            </div>
            <Link to='/marketplace/order/track' className='rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50'>Track with code</Link>
          </div>
          <div className='mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2'>
            {guest.map((entry) => (
              <div key={entry.id} className='rounded-2xl border border-slate-200 p-3'>
                <div className='font-mono text-sm text-slate-900'>#{entry.id}</div>
                <div className='mt-1 text-xs text-slate-500'>Placed: {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}</div>
                <div className='mt-2 flex items-center gap-2'>
                  <a
                    href={`/marketplace/order/track?code=${encodeURIComponent(entry.code)}`}
                    className='rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white hover:bg-emerald-500'
                  >
                    Track
                  </a>
                  <button
                    className='rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-500 hover:border-emerald-200 hover:text-emerald-700'
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(entry.code)
                      } catch {}
                    }}
                  >
                    Copy code
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Section title='In progress'>
        {pending.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500'>No pending orders. Book a new service or purchase goods to see them here.</div>
        ) : (
          pending.map((order) => (
            <Row key={order.id}>
              <div>
                <div className='text-sm font-semibold text-slate-900'>Order #{order.id.slice(0, 6)}</div>
                <div className='text-xs text-slate-500'>Placed {new Date(order.createdAt).toLocaleString()}</div>
              </div>
              <div className='flex items-center gap-3'>
                <StatusPill intent='amber'>
                  <Clock3 className='h-3.5 w-3.5' /> {order.status}
                </StatusPill>
                <Link to='/marketplace/order/$id' params={{ id: order.id }} className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700'>View</Link>
              </div>
            </Row>
          ))
        )}
      </Section>

      <Section title='Shipped'>
        {shipped.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500'>No shipments in transit.</div>
        ) : (
          shipped.map((order) => (
            <Row key={order.id}>
              <div>
                <div className='text-sm font-semibold text-slate-900'>Order #{order.id.slice(0, 6)}</div>
                <div className='text-xs text-slate-500'>Items: {(order as any).items?.length || 0}</div>
              </div>
              <div className='flex items-center gap-3'>
                <StatusPill intent='emerald'>
                  <Truck className='h-3.5 w-3.5' /> On the way
                </StatusPill>
                <Link to='/marketplace/order/$id' params={{ id: order.id }} className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700'>Track</Link>
              </div>
            </Row>
          ))
        )}
      </Section>

      <Section title='Completed'>
        {completed.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500'>No completed orders yet. Your fulfilled orders will land here with receipts.</div>
        ) : (
          completed.map((order) => (
            <Row key={order.id}>
              <div>
                <div className='text-sm font-semibold text-slate-900'>Order #{order.id.slice(0, 6)}</div>
                <div className='text-xs text-slate-500'>Total: A${order.total}</div>
              </div>
              <div className='flex items-center gap-3'>
                <StatusPill intent='emerald'>
                  <PackageSearch className='h-3.5 w-3.5' /> Complete
                </StatusPill>
                <Link to='/marketplace/order/$id' params={{ id: order.id }} className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700'>View receipt</Link>
              </div>
            </Row>
          ))
        )}
      </Section>
    </div>
  )
}
