import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { db } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'

type AllOrder = any

function AllOrdersPage() {
  const [orders, setOrders] = useState<AllOrder[]>([])
  const [loading, setLoading] = useState(true)
  const user = useAuthStore((s) => s.auth.user as any | null)
  const myId = (user?.id as number | undefined) ?? undefined

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const all = await db.listAllOrders?.()
        if (!mounted) return
        setOrders(all || [])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className='mx-auto max-w-5xl px-4 py-8 text-sm text-gray-500'>Loading all orders…</div>

  return (
    <div className='mx-auto max-w-5xl px-4 py-8'>
      <h1 className='text-2xl font-bold'>All Orders</h1>
      <div className='mt-4 w-full overflow-x-auto rounded-2xl border'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b text-left text-xs text-gray-500'>
              <th className='py-2 pr-4'>Order</th>
              <th className='py-2 pr-4'>Date</th>
              <th className='py-2 pr-4'>Buyer</th>
              <th className='py-2 pr-4'>Seller</th>
              <th className='py-2 pr-4'>Items</th>
              <th className='py-2 pr-4'>Total</th>
              <th className='py-2 pr-4'>Status</th>
              <th className='py-2 pr-4 text-right'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className='border-b'>
                <td className='py-2 pr-4 font-mono text-xs'>{o.id}</td>
                <td className='py-2 pr-4'>{new Date(o.createdAt).toLocaleString()}</td>
                <td className='py-2 pr-4'>{o.buyer?.name || o.buyer?.email || o.buyerId || '—'}</td>
                <td className='py-2 pr-4'>{o.seller?.name || o.seller?.email || o.sellerId || '—'}</td>
                <td className='py-2 pr-4'>{o.items?.length || 0}</td>
                <td className='py-2 pr-4'>A${o.total}</td>
                <td className='py-2 pr-4 capitalize'>{o.status}</td>
                <td className='py-2 pr-4 text-right'>
                  {(o.status === 'paid' && myId && (o.sellerId === myId)) ? (
                    <button
                      className='rounded-md bg-black px-3 py-1.5 text-white'
                      onClick={async () => {
                        const ok = window.confirm('Acknowledge payment and mark this order as shipped?')
                        if (!ok) return
                        try {
                          const updated = await db.shipOrder?.(o.id, true)
                          if (!updated) return
                          setOrders((cur) => cur.map((x) => (x.id === o.id ? updated : x)))
                          window.dispatchEvent(new CustomEvent('orders:changed'))
                        } catch {}
                      }}
                    >
                      Mark Shipped
                    </button>
                  ) : (o.status === 'shipped' && myId && (o.buyerId === myId)) ? (
                    <button
                      className='rounded-md border px-3 py-1.5'
                      onClick={async () => {
                        try {
                          const updated = await db.confirmReceived?.(o.id)
                          if (!updated) return
                          setOrders((cur) => cur.map((x) => (x.id === o.id ? updated : x)))
                          window.dispatchEvent(new CustomEvent('orders:changed'))
                        } catch {}
                      }}
                    >
                      Confirm Received
                    </button>
                  ) : null}
                  <div className='inline-flex gap-2 pl-2'>
                    {o.status === 'pending' && (
                      <button
                        className='rounded-md border px-2 py-1 text-xs'
                        onClick={async () => {
                          try {
                            const updated = await db.adminUpdateOrderStatus?.(o.id, 'paid')
                            if (!updated) return
                            setOrders((cur) => cur.map((x) => (x.id === o.id ? updated : x)))
                            window.dispatchEvent(new CustomEvent('orders:changed'))
                          } catch {}
                        }}
                      >
                        Confirm
                      </button>
                    )}
                    {o.status === 'paid' && (
                      <button
                        className='rounded-md border px-2 py-1 text-xs'
                        onClick={async () => {
                          try {
                            const updated = await db.adminUpdateOrderStatus?.(o.id, 'shipped')
                            if (!updated) return
                            setOrders((cur) => cur.map((x) => (x.id === o.id ? updated : x)))
                            window.dispatchEvent(new CustomEvent('orders:changed'))
                          } catch {}
                        }}
                      >
                        Posted
                      </button>
                    )}
                    {o.status === 'shipped' && (
                      <button
                        className='rounded-md border px-2 py-1 text-xs'
                        onClick={async () => {
                          try {
                            const updated = await db.adminUpdateOrderStatus?.(o.id, 'completed')
                            if (!updated) return
                            setOrders((cur) => cur.map((x) => (x.id === o.id ? updated : x)))
                            window.dispatchEvent(new CustomEvent('orders:changed'))
                          } catch {}
                        }}
                      >
                        Complete
                      </button>
                    )}
                    <button
                      className='rounded-md border px-2 py-1 text-xs text-red-600'
                      onClick={async () => {
                        const ok = window.confirm('Delete this order?')
                        if (!ok) return
                        try {
                          await db.adminDeleteOrder?.(o.id)
                          setOrders((cur) => cur.filter((x) => x.id !== o.id))
                          window.dispatchEvent(new CustomEvent('orders:changed'))
                        } catch {}
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td className='py-6 text-center text-gray-500' colSpan={8}>No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/orders/all')({
  component: AllOrdersPage,
})

