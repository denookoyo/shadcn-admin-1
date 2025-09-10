import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { db, type Order } from '@/lib/data'
import { fetchJson } from '@/lib/http'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='mt-6'>
      <h2 className='mb-2 text-lg font-semibold'>{title}</h2>
      <div className='space-y-3 rounded-2xl border p-4'>{children}</div>
    </section>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className='flex items-center justify-between rounded-xl border p-3'>{children}</div>
}

function OrdersPage() {
  const [sellerOrders, setSellerOrders] = useState<Order[]>([] as any)
  const [buyerOrders, setBuyerOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

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
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const isServiceOrder = (o: any) => o?.items?.some((it: any) => it?.product?.type === 'service')
  // Shop buckets
  const shopNeeds = useMemo(
    () => sellerOrders.filter((o: any) => (isServiceOrder(o) ? (o.status === 'pending' || o.status === 'scheduled') : o.status === 'paid')),
    [sellerOrders]
  )
  const shopFulfilled = useMemo(
    () => sellerOrders.filter((o: any) => (isServiceOrder(o) ? (o.status === 'completed' || o.status === 'paid') : (o.status === 'shipped' || o.status === 'completed' || o.status === 'paid'))),
    [sellerOrders]
  )

  // Seller (goods) buckets to avoid ReferenceErrors
  const sellerPaid = useMemo(
    () => sellerOrders.filter((o: any) => !isServiceOrder(o) && o.status === 'paid'),
    [sellerOrders]
  )
  const sellerShipped = useMemo(
    () => sellerOrders.filter((o: any) => !isServiceOrder(o) && o.status === 'shipped'),
    [sellerOrders]
  )
  const sellerCompleted = useMemo(
    () => sellerOrders.filter((o: any) => !isServiceOrder(o) && o.status === 'completed'),
    [sellerOrders]
  )

  // Buyer buckets
  const buyerAttention = useMemo(
    () => buyerOrders.filter((o: any) => (o.status === 'shipped') || (isServiceOrder(o) && o.status === 'completed')),
    [buyerOrders]
  )
  const buyerHistory = useMemo(
    () => buyerOrders.filter((o: any) => (!isServiceOrder(o) && o.status === 'completed') || (isServiceOrder(o) && o.status === 'paid')),
    [buyerOrders]
  )
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewFeedback, setReviewFeedback] = useState('')

  if (loading) return <div className='mx-auto max-w-4xl px-4 py-8 text-sm text-gray-500'>Loading orders…</div>

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>My Shop Orders</h1>
        <a href='/marketplace/dashboard/orders/all' className='rounded-md border px-3 py-2 text-sm'>All Orders</a>
      </div>

      {/* Seller: Requires Fulfillment */}
      
      <Section title='Requires Fulfillment (Shop)'>
        {shopNeeds.length === 0 && <div className='text-sm text-gray-500'>No orders requiring action.</div>}
        {shopNeeds.map((o: any) => (
          <Row key={o.id}>
            <div>
              <div className='text-sm font-medium'>Order #{o.id.slice(0,6)}</div>
              <div className='text-xs text-gray-500'>Buyer: {o.buyer?.name || o.buyer?.email || 'Unknown'} • Items: {o.items?.length || 0}</div>
            </div>
            <div className='flex items-center gap-2'>
              <div className='text-sm font-semibold'>A${o.total}</div>
              {isServiceOrder(o) ? (
                o.status === 'pending' ? (
                  <button className='rounded-md bg-black px-3 py-1.5 text-sm text-white' onClick={async()=>{ try{ await fetchJson(`/api/orders/${o.id}/confirm-appointment`,{method:'POST',headers:{'Content-Type':'application/json'}}); window.dispatchEvent(new CustomEvent('orders:changed')) }catch(_){} }}>Confirm Appt</button>
                ) : (
                  <button className='rounded-md border px-3 py-1.5 text-sm' onClick={async()=>{ try{ await fetchJson(`/api/orders/${o.id}/complete-service`,{method:'POST',headers:{'Content-Type':'application/json'}}); window.dispatchEvent(new CustomEvent('orders:changed')) }catch(_){} }}>Mark Completed</button>
                )
              ) : (
                <button className='rounded-md bg-black px-3 py-1.5 text-sm text-white' onClick={async()=>{ const ok=window.confirm('Confirm the order is paid and you are shipping it now?'); if(!ok) return; try{ await fetchJson(`/api/orders/${o.id}/ship`,{method:'POST',headers:{'Content-Type':'application/json'}}); window.dispatchEvent(new CustomEvent('orders:changed')) }catch(_){} }}>Confirm Shipped</button>
              )}
              <Link to='/marketplace/order/$id' params={{id:o.id}} className='rounded-md border px-3 py-1.5 text-sm'>View</Link>
            </div>
          </Row>
        ))}
      </Section>

      {/* Seller: Fulfilled */}
      <Section title='Fulfilled (Shop)'>
        {shopFulfilled.length === 0 && <div className='text-sm text-gray-500'>No fulfilled orders.</div>}
        {shopFulfilled.map((o: any) => (
          <Row key={o.id}>
            <div>
              <div className='text-sm font-medium'>Order #{o.id.slice(0,6)}</div>
              <div className='text-xs text-gray-500'>Buyer: {o.buyer?.name || o.buyer?.email || 'Unknown'} • Items: {o.items?.length || 0}</div>
            </div>
            <div className='flex items-center gap-2'>
              <div className='text-sm font-semibold'>A${o.total}</div>
              <Link to='/marketplace/order/$id' params={{id:o.id}} className='rounded-md border px-3 py-1.5 text-sm'>View</Link>
            </div>
          </Row>
        ))}
      </Section>
{/* Seller view: Goods */}
      <Section title='To Ship (Seller)'>
        {sellerPaid.length === 0 && (
          <div className='text-sm text-gray-500'>No orders to ship.</div>
        )}
        {sellerPaid.map((o: any) => (
          <Row key={o.id}>
            <div>
              <div className='text-sm font-medium'>Order #{o.id.slice(0, 6)}</div>
              <div className='text-xs text-gray-500'>Buyer: {o.buyer?.name || o.buyer?.email || 'Unknown'} • Items: {o.items?.length || 0}</div>
            </div>
            <div className='flex items-center gap-3'>
              <div className='text-sm font-semibold'>A${o.total}</div>
              <button
                className='rounded-lg bg-black px-3 py-1.5 text-sm text-white'
                onClick={async () => {
                  const ok = window.confirm('Confirm the order is paid and you are shipping it now?')
                  if (!ok) return
                  try {
                    const updated = await db.shipOrder?.(o.id, true)
                    if (!updated) return
                    setSellerOrders((cur) => cur.map((x: any) => (x.id === o.id ? updated : x)))
                    window.dispatchEvent(new CustomEvent('orders:changed'))
                  } catch {}
                }}
              >
                Confirm Shipped
              </button>
              <Link to='/marketplace/order/$id' params={{ id: o.id }} className='rounded-md border px-3 py-1.5 text-sm'>View</Link>
            </div>
          </Row>
        ))}
      </Section>

      <Section title='Shipped (Seller)'>
        {sellerShipped.length === 0 && (
          <div className='text-sm text-gray-500'>No shipped orders.</div>
        )}
        {sellerShipped.map((o: any) => (
          <Row key={o.id}>
            <div>
              <div className='text-sm font-medium'>Order #{o.id.slice(0, 6)}</div>
              <div className='text-xs text-gray-500'>Buyer: {o.buyer?.name || o.buyer?.email || 'Unknown'} • Items: {o.items?.length || 0}</div>
            </div>
            <div className='flex items-center gap-3'>
              <div className='text-sm font-semibold'>A${o.total}</div>
              <Link to='/marketplace/order/$id' params={{ id: o.id }} className='rounded-md border px-3 py-1.5 text-sm'>View</Link>
            </div>
          </Row>
        ))}
      </Section>

      <Section title='Completed (Seller)'>
        {sellerCompleted.length === 0 && (
          <div className='text-sm text-gray-500'>No completed orders.</div>
        )}
        {sellerCompleted.map((o: any) => (
          <Row key={o.id}>
            <div>
              <div className='text-sm font-medium'>Order #{o.id.slice(0, 6)}</div>
              <div className='text-xs text-gray-500'>Buyer: {o.buyer?.name || o.buyer?.email || 'Unknown'} • Items: {o.items?.length || 0}</div>
            </div>
            <div className='text-sm font-semibold'>A${o.total}</div>
          </Row>
        ))}
      </Section>

      
      {/* Buyer view */}
      <Section title='My Purchases: Requires Attention'>
        {buyerAttention.length === 0 && <div className='text-sm text-gray-500'>No purchases requiring action.</div>}
        {buyerAttention.map((o: any) => (
          <Row key={o.id}>
            <div>
              <div className='text-sm font-medium'>Order #{o.id.slice(0,6)}</div>
              <div className='text-xs text-gray-500'>Items: {o.items?.length || 0}</div>
            </div>
            <div className='flex items-center gap-2'>
              <div className='text-sm font-semibold'>A${o.total}</div>
              {o.status === 'shipped' ? (
                <button className='rounded-md border px-3 py-1.5 text-sm' onClick={async()=>{ try{ const updated=await db.confirmReceived?.(o.id); if(updated) setBuyerOrders((cur)=>cur.map((x)=>x.id===o.id?updated:x)) }catch{} }}>Confirm Received</button>
              ) : (
                <button className='rounded-md bg-black px-3 py-1.5 text-sm text-white' onClick={async()=>{ try{ await fetchJson(`/api/orders/${o.id}/pay`,{method:'POST',headers:{'Content-Type':'application/json'}}); setBuyerOrders((cur)=>cur.map((x)=>x.id===o.id?{...x,status:'paid'}:x)) }catch(_){} }}>Pay Now</button>
              )}
              <Link to='/marketplace/order/$id' params={{id:o.id}} className='rounded-md border px-3 py-1.5 text-sm'>View</Link>
            </div>
          </Row>
        ))}
      </Section>

      <Section title='My Purchases: History'>
        {buyerHistory.length === 0 && <div className='text-sm text-gray-500'>No completed purchases.</div>}
        {buyerHistory.map((o: any) => (
          <div key={o.id} className='rounded-xl border p-3'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm font-medium'>Order #{o.id.slice(0, 6)}</div>
                <div className='text-xs text-gray-500'>Items: {o.items?.length || 0}</div>
              </div>
              <div className='flex items-center gap-2'>
                <div className='text-sm font-semibold'>A${o.total}</div>
                <button
                  className='rounded-md border px-3 py-1.5 text-sm'
                  onClick={async () => {
                    setReviewOrderId(o.id)
                    setReviewRating(5)
                    setReviewFeedback('')
                    try {
                      const r = await db.getOrderReview?.(o.id)
                      if (r) { setReviewRating(r.rating); setReviewFeedback(r.feedback) }
                    } catch {}
                  }}
                >
                  Rate Seller
                </button>
              </div>
            </div>
            {reviewOrderId === o.id && (
              <div className='mt-3 rounded-lg border p-3'>
                <div className='mb-2 text-sm font-medium'>Your Rating</div>
                <div className='mb-2 flex items-center gap-1'>
                  {[1,2,3,4,5].map((n) => (
                    <button
                      key={n}
                      aria-label={`star-${n}`}
                      className={`h-6 w-6 rounded-full ${n <= reviewRating ? 'bg-amber-400' : 'bg-gray-200'}`}
                      onClick={() => setReviewRating(n)}
                    />
                  ))}
                </div>
                <textarea
                  className='w-full rounded-md border p-2 text-sm'
                  rows={3}
                  placeholder='Share your feedback'
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                />
                <div className='mt-2 flex justify-end gap-2'>
                  <button className='rounded-md px-3 py-1.5 text-sm' onClick={() => setReviewOrderId(null)}>Cancel</button>
                  <button
                    className='rounded-md bg-black px-3 py-1.5 text-sm text-white'
                    onClick={async () => {
                      try {
                        await db.submitOrderReview?.(o.id, reviewRating, reviewFeedback)
                        setReviewOrderId(null)
                      } catch {}
                    }}
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </Section>

    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/orders/')({
  component: OrdersPage,
})
