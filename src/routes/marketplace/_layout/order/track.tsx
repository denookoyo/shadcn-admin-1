import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'

type TrackSearch = { code?: string }

type TrackedOrderProduct = {
  type?: 'goods' | 'service'
  img?: string | null
}

type TrackedOrderItem = {
  id: string
  title: string
  quantity: number
  price: number
  product?: TrackedOrderProduct | null
  appointmentAt?: string | null
  appointmentStatus?: string | null
}

type TrackedOrder = {
  id: string | number
  status: string
  createdAt?: string
  total: number
  items?: TrackedOrderItem[]
  address?: string | null
  seller?: { name?: string | null; email?: string | null; paymentInstructions?: string | null } | null
  sellerPaymentInstructions?: string | null
}

export const Route = createFileRoute('/marketplace/_layout/order/track')({
  component: TrackOrder,
})

function TrackOrder() {
  const { code } = useSearch({ from: '/marketplace/_layout/order/track' }) as TrackSearch
  const [data, setData] = useState<TrackedOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState<string>(code || '')

  // Compute steps unconditionally to keep hooks order stable
  const steps = useMemo(() => {
    const status = data?.status ?? ''
    const items = data?.items ?? []
    const hasService = items.some((item) => item.product?.type === 'service')
    if (hasService) {
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
      if (!code) {
        setError('Missing code')
        return
      }
      try {
        const res = await fetch(`/api/orders/track?code=${encodeURIComponent(code)}`)
        if (!res.ok) {
          // Friendly fallback: user might have pasted the order id instead of accessCode
          try {
            const raw = localStorage.getItem('guestOrders')
            const parsed: unknown = raw ? JSON.parse(raw) : []
            const list = Array.isArray(parsed) ? (parsed as Array<{ id?: unknown; code?: string }>) : []
            const found = list.find((entry) => entry?.id != null && String(entry.id) === String(code))
            if (found?.code && typeof window !== 'undefined') {
              location.replace(`/marketplace/order/track?code=${encodeURIComponent(found.code)}`)
              return
            }
          } catch {
            // ignore fallback parsing issues silently
          }
          throw new Error(`HTTP ${res.status}`)
        }
        const json: TrackedOrder = await res.json()
        if (mounted) setData(json)
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load order')
      }
    })()
    return () => { mounted = false }
  }, [code])

  if (!code) {
    return (
      <MarketplacePageShell width='narrow' className='space-y-6'>
        <header className='space-y-2 text-center'>
          <div className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
            Guest tracking
          </div>
          <h1 className='text-2xl font-semibold text-slate-900'>Track your Hedgetech order</h1>
          <p className='text-sm text-slate-600'>Enter the code from your checkout receipt to see live fulfilment updates.</p>
        </header>
        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='text-sm font-semibold text-slate-900'>Tracking code</div>
          <p className='mt-1 text-xs text-slate-500'>Codes look like <span className='font-mono font-semibold text-slate-700'>HT-AB12CD</span> and were sent to your email.</p>
          <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
            <input
              className='flex-1 rounded-full border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200'
              placeholder='Enter tracking code'
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <a
              className='inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500'
              href={`/marketplace/order/track?code=${encodeURIComponent(input.trim())}`}
            >
              Track order
            </a>
          </div>
        </div>
      </MarketplacePageShell>
    )
  }
  if (error) {
    return (
      <MarketplacePageShell width='narrow' className='text-sm text-red-600' topSpacing='md' bottomSpacing='md'>
        Error: {error}
      </MarketplacePageShell>
    )
  }
  if (!data) {
    return (
      <MarketplacePageShell width='narrow' className='text-sm text-slate-500' topSpacing='md' bottomSpacing='md'>
        Loading order…
      </MarketplacePageShell>
    )
  }
  const service = (data?.items ?? []).some((item) => item.product?.type === 'service')

  return (
    <MarketplacePageShell width='default' className='space-y-6'>
      <header className='space-y-2'>
        <div className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
          Guest tracking
        </div>
        <h1 className='text-2xl font-semibold text-slate-900'>Order #{String(data.id).slice(0, 6)}</h1>
        <div className='text-sm text-slate-600'>
          Placed {data.createdAt ? new Date(data.createdAt).toLocaleString?.() : ''}
        </div>
        <div className='text-sm text-slate-600'>
          Status:{' '}
          <span className='font-semibold capitalize text-emerald-700'>
            {data.status}
          </span>
        </div>
      </header>

      <section className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <div className='space-y-6'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Tracking progress</h2>
            <ul className='mt-4 space-y-2 text-sm text-slate-600'>
              {steps.map((step) => (
                <li key={step.key} className='flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3'>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${step.done ? 'border-emerald-200 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-500'}`}>
                    {step.done ? '✓' : '•'}
                  </span>
                  <span className={step.done ? 'font-semibold text-slate-800' : ''}>{step.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <h2 className='text-lg font-semibold text-slate-900'>Items</h2>
              <span className='text-sm font-semibold text-emerald-700'>Total A${data.total}</span>
            </div>
            <div className='mt-4 space-y-3 text-sm text-slate-600'>
              {(data.items ?? []).map((item) => (
                <div key={item.id} className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      {item.product?.img ? <img src={item.product.img} className='h-12 w-12 rounded-xl object-cover' alt={item.title} /> : null}
                      <div>
                        <div className='text-sm font-semibold text-slate-900'>{item.title}</div>
                        <div className='text-xs text-slate-500'>{item.product?.type === 'service' ? 'Service' : 'Goods'} • Qty {item.quantity}</div>
                      </div>
                    </div>
                    <div className='text-sm font-semibold text-emerald-700'>A${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                  {item.appointmentAt ? (
                    <div className='mt-2 text-xs text-slate-500'>
                      Appointment {new Date(item.appointmentAt).toLocaleString()} • {item.appointmentStatus || 'requested'}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className='space-y-4'>
          <div className='rounded-3xl border border-emerald-100 bg-emerald-50 p-6 text-sm text-emerald-800 shadow-sm'>
            <div className='text-base font-semibold text-emerald-900'>Pay the seller directly</div>
            {data.sellerPaymentInstructions ? (
              <>
                <p className='mt-2 text-xs text-emerald-700'>Use these instructions to transfer payment. Include your order ID so the seller can reconcile it quickly.</p>
                <pre className='mt-3 whitespace-pre-wrap break-words rounded-2xl border border-emerald-100 bg-white/80 p-3 text-[11px] text-emerald-900'>
                  {data.sellerPaymentInstructions}
                </pre>
              </>
            ) : (
              <p className='mt-2 text-xs text-emerald-700'>Your seller will send payment instructions shortly. Reply to their email if you need them resent.</p>
            )}
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
            <h2 className='text-base font-semibold text-slate-900'>Shipping & fulfilment</h2>
            <div className='mt-2 text-sm'>
              Address:{' '}
              <span className='font-semibold text-slate-900'>{data.address || '—'}</span>
            </div>
            {service ? (
              <div className='mt-2 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700'>
                This order contains services. Appointment details are shown in the tracker above.
              </div>
            ) : (
              <div className='mt-2 text-xs text-slate-500'>Shipping partners will update this timeline as parcels move through the network.</div>
            )}
          </div>
        </aside>
      </section>
    </MarketplacePageShell>
  )
}
