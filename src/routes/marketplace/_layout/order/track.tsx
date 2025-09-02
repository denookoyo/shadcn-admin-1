import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

type TrackSearch = { code?: string }

export const Route = createFileRoute('/marketplace/_layout/order/track')({
  component: TrackOrder,
})

function TrackOrder() {
  const { code } = useSearch({ from: '/marketplace/_layout/order/track' }) as TrackSearch
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState<string>(code || '')

  // Compute steps unconditionally to keep hooks order stable
  const steps = useMemo(() => {
    const status = data?.status as string | undefined
    const service = (data?.items || []).some((it: any) => it?.product?.type === 'service')
    if (service) {
      return [
        { key: 'requested', label: 'Appointment Requested', done: ['pending', 'scheduled', 'completed', 'paid'].includes(status || '') },
        { key: 'scheduled', label: 'Appointment Scheduled', done: ['scheduled', 'completed', 'paid'].includes(status || '') },
        { key: 'completed', label: 'Service Completed', done: ['completed', 'paid'].includes(status || '') },
        { key: 'paid', label: 'Payment Made', done: (status || '') === 'paid' },
      ]
    }
    return [
      { key: 'placed', label: 'Order Placed', done: true },
      { key: 'paid', label: 'Payment Made', done: ['paid', 'shipped', 'completed'].includes(status || '') },
      { key: 'shipped', label: 'Shipped', done: ['shipped', 'completed'].includes(status || '') },
      { key: 'delivered', label: 'Delivered', done: (status || '') === 'completed' },
    ]
  }, [data])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!code) { setError('Missing code'); return }
      try {
        const res = await fetch(`/api/orders/track?code=${encodeURIComponent(code)}`)
        if (!res.ok) {
          // Friendly fallback: user might have pasted the order id instead of accessCode
          try {
            const raw = localStorage.getItem('guestOrders')
            const list = raw ? JSON.parse(raw) : []
            const found = Array.isArray(list) ? list.find((x: any) => String(x.id) === String(code)) : null
            if (found?.code && typeof window !== 'undefined') {
              location.replace(`/marketplace/order/track?code=${encodeURIComponent(found.code)}`)
              return
            }
          } catch {}
          throw new Error(`HTTP ${res.status}`)
        }
        const json = await res.json()
        if (mounted) setData(json)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load order')
      }
    })()
    return () => { mounted = false }
  }, [code])

  if (!code) return (
    <div className='mx-auto max-w-3xl px-4 py-10'>
      <h1 className='text-2xl font-bold'>Track Order</h1>
      <div className='mt-3 rounded-2xl border p-4'>
        <div className='mb-2 text-sm text-gray-600'>Enter the tracking code from your guest checkout receipt.</div>
        <div className='flex gap-2'>
          <input
            className='flex-1 rounded-md border p-2 text-sm'
            placeholder='Enter tracking code'
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <a
            className='rounded-md bg-black px-3 py-2 text-sm text-white'
            href={`/marketplace/order/track?code=${encodeURIComponent(input.trim())}`}
          >
            Track
          </a>
        </div>
      </div>
    </div>
  )
  if (error) return <div className='mx-auto max-w-3xl px-4 py-10 text-sm text-red-600'>Error: {error}</div>
  if (!data) return <div className='mx-auto max-w-3xl px-4 py-10 text-sm text-gray-500'>Loading order…</div>
  const isService = (o: any) => (o.items || []).some((it: any) => it?.product?.type === 'service')
  const service = isService(data)

  return (
    <div className='mx-auto max-w-3xl px-4 py-10'>
      <h1 className='text-2xl font-bold'>Order #{String(data.id).slice(0, 6)}</h1>
      <div className='mt-1 text-sm text-gray-600'>Placed: {new Date(data.createdAt).toLocaleString?.() || ''}</div>
      <div className='text-sm text-gray-600'>Status: <span className='font-semibold capitalize'>{data.status}</span></div>

      {/* Progress */}
      <div className='mt-4 rounded-2xl border p-4'>
        <div className='mb-2 text-lg font-semibold'>Tracking</div>
        <ul className='space-y-1 text-sm'>
          {steps.map((s) => (
            <li key={s.key} className='flex items-center gap-2'>
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${s.done ? 'bg-green-600 text-white border-green-600' : 'bg-gray-100 text-gray-600'}`}>{s.done ? '✓' : '•'}</span>
              <span className={s.done ? 'font-medium' : ''}>{s.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Items */}
      <div className='mt-4 rounded-2xl border p-4'>
        <div className='mb-3 text-lg font-semibold'>Items</div>
        <div className='space-y-2 text-sm'>
          {(data.items || []).map((it: any) => (
            <div key={it.id} className='rounded-md border p-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  {it.product?.img ? <img src={it.product.img} className='h-10 w-10 rounded object-cover' /> : null}
                  <div>
                    <div className='font-medium'>{it.title}</div>
                    <div className='text-xs text-gray-500'>{it.product?.type === 'service' ? 'Service' : 'Goods'}</div>
                  </div>
                </div>
                <div>A${it.price * it.quantity}</div>
              </div>
              <div className='text-xs text-gray-500'>Qty: {it.quantity}</div>
              {it.appointmentAt ? (
                <div className='text-xs text-gray-500'>Appointment: {new Date(it.appointmentAt).toLocaleString()} ({it.appointmentStatus || 'requested'})</div>
              ) : null}
            </div>
          ))}
        </div>
        <div className='mt-3 flex items-center justify-between font-semibold'>
          <span>Total</span>
          <span>A${data.total}</span>
        </div>
      </div>

      {/* Shipping address */}
      <div className='mt-4 rounded-2xl border p-4 text-sm'>
        <div className='mb-2 text-lg font-semibold'>Shipping</div>
        <div>Address: <span className='font-medium'>{data.address || '—'}</span></div>
        {service && (
          <div className='text-xs text-gray-600 mt-1'>For services, shipping doesn’t apply. Track appointment above.</div>
        )}
      </div>

      <div className='mt-4 text-sm text-gray-600'>Keep this link safely to check your order without an account.</div>
    </div>
  )
}
