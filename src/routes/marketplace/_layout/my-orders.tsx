import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { db, type Order } from '@/lib/data'

export const Route = createFileRoute('/marketplace/_layout/my-orders')({
  component: MyOrders,
})

function Row({ children }: { children: React.ReactNode }) {
  return <div className='flex items-center justify-between rounded-xl border p-3'>{children}</div>
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
        // Likely unauthenticated; continue to show guest orders
        if (!mounted) return
        setOrders([])
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()
    // Load guest orders from localStorage
    try {
      const raw = localStorage.getItem('guestOrders')
      const list = raw ? JSON.parse(raw) : []
      if (mounted) setGuest(Array.isArray(list) ? list : [])
    } catch {}
    return () => { mounted = false }
  }, [])

  const shipped = useMemo(() => orders.filter((o) => o.status === 'shipped'), [orders])
  const completed = useMemo(() => orders.filter((o: any) => o.status === 'completed' || o.status === 'paid'), [orders])
  const pending = useMemo(() => orders.filter((o: any) => o.status === 'pending' || o.status === 'scheduled'), [orders])

  if (loading) return <div className='mx-auto max-w-4xl px-4 py-8 text-sm text-gray-500'>Loading orders…</div>

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <h1 className='text-2xl font-bold'>My Orders</h1>
      {guest.length > 0 && (
        <div className='mt-3 rounded-2xl border p-4'>
          <div className='mb-2 text-lg font-semibold'>Guest Orders</div>
          <div className='mb-2 text-sm text-gray-600'>You checked out as a guest. Use these links to track your orders.</div>
          <div className='space-y-2 text-sm'>
            {guest.map((g) => (
              <div key={g.id} className='flex items-center justify-between rounded-lg border p-2'>
                <div>
                  <div className='font-mono text-xs'>#{g.id}</div>
                  <div className='text-xs text-gray-500'>Placed: {g.createdAt ? new Date(g.createdAt).toLocaleString() : '—'}</div>
                </div>
                <div className='flex items-center gap-2'>
                  <a
                    href={`/marketplace/order/track?code=${encodeURIComponent(g.code)}`}
                    className='rounded-md border px-3 py-1.5'
                  >
                    Track
                  </a>
                  <button
                    className='rounded-md border px-3 py-1.5'
                    onClick={() => { try { navigator.clipboard.writeText(g.code) } catch {} }}
                  >
                    Copy Code
                  </button>
                </div>
              </div>
            ))}
            {guest.length === 0 && <div className='text-gray-500'>No guest orders saved.</div>}
          </div>
        </div>
      )}

      <section className='mt-6'>
        <h2 className='mb-2 text-lg font-semibold'>In Progress</h2>
        <div className='space-y-3 rounded-2xl border p-4'>
          {pending.length === 0 && <div className='text-sm text-gray-500'>No pending orders.</div>}
          {pending.map((o) => (
            <Row key={o.id}>
              <div>
                <div className='text-sm font-medium'>Order #{o.id.slice(0, 6)}</div>
                <div className='text-xs text-gray-500'>Placed: {new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-xs capitalize'>{o.status}</span>
                <Link to='/marketplace/order/$id' params={{ id: o.id }} className='rounded-md border px-3 py-1.5 text-sm'>View</Link>
              </div>
            </Row>
          ))}
        </div>
      </section>

      <section className='mt-6'>
        <h2 className='mb-2 text-lg font-semibold'>Shipped</h2>
        <div className='space-y-3 rounded-2xl border p-4'>
          {shipped.length === 0 && <div className='text-sm text-gray-500'>No shipped orders.</div>}
          {shipped.map((o) => (
            <Row key={o.id}>
              <div>
                <div className='text-sm font-medium'>Order #{o.id.slice(0, 6)}</div>
                <div className='text-xs text-gray-500'>Items: {(o as any).items?.length || 0}</div>
              </div>
              <Link to='/marketplace/order/$id' params={{ id: o.id }} className='rounded-md border px-3 py-1.5 text-sm'>View</Link>
            </Row>
          ))}
        </div>
      </section>

      <section className='mt-6'>
        <h2 className='mb-2 text-lg font-semibold'>Completed</h2>
        <div className='space-y-3 rounded-2xl border p-4'>
          {completed.length === 0 && <div className='text-sm text-gray-500'>No completed orders.</div>}
          {completed.map((o) => (
            <Row key={o.id}>
              <div>
                <div className='text-sm font-medium'>Order #{o.id.slice(0, 6)}</div>
                <div className='text-xs text-gray-500'>Total: A${o.total}</div>
              </div>
              <Link to='/marketplace/order/$id' params={{ id: o.id }} className='rounded-md border px-3 py-1.5 text-sm'>View</Link>
            </Row>
          ))}
        </div>
      </section>
    </div>
  )
}
