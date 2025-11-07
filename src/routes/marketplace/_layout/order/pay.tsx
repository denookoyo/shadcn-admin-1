import { useEffect, useState } from 'react'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'

export const Route = createFileRoute('/marketplace/_layout/order/pay')({
  component: PayOrderRoute,
})

type PaySearch = { code?: string }

type OrderSummary = {
  id: string
  status: string
  total: number
  createdAt: string
  customerName?: string | null
  customerEmail?: string | null
  address?: string | null
  items?: { id: string; title: string; quantity: number; price: number }[]
}

function PayOrderRoute() {
  const { code } = useSearch({ from: '/marketplace/_layout/order/pay' }) as PaySearch
  const [input, setInput] = useState<string>(code || '')
  const [order, setOrder] = useState<OrderSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (!code) return
    let mounted = true
    setLoading(true)
    setError(null)
    fetch(`/api/orders/track?code=${encodeURIComponent(code)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: OrderSummary = await res.json()
        if (mounted) setOrder(data)
      })
      .catch((err: unknown) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load order')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [code])

  const handlePay = async () => {
    if (!order?.id || !code) return
    setPaying(true)
    try {
      const res = await fetch('/api/orders/pay-with-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!res.ok) throw new Error(`Payment failed (${res.status})`)
      const data = (await res.json()) as Pick<OrderSummary, 'status'>
      setOrder((prev) => (prev ? { ...prev, status: data.status || 'paid' } : prev))
      toast.success('Payment recorded. Thank you!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  if (!code) {
    return (
      <MarketplacePageShell width='narrow' className='space-y-6'>
        <header className='space-y-2 text-center'>
          <div className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
            Secure payment
          </div>
          <h1 className='text-2xl font-semibold text-slate-900'>Complete your Hedgetech payment</h1>
          <p className='text-sm text-slate-600'>Paste the code issued by the assistant to load your invoice and confirm payment.</p>
        </header>
        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='text-sm font-semibold text-slate-900'>Payment code</div>
          <p className='mt-1 text-xs text-slate-500'>Codes look like <span className='font-mono font-semibold text-slate-700'>HT-PAY-1234</span> and are unique per invoice.</p>
          <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
            <input
              className='flex-1 rounded-full border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200'
              placeholder='Enter payment code'
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <a className='inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500' href={`/marketplace/order/pay?code=${encodeURIComponent(input.trim())}`}>
              Continue
            </a>
          </div>
        </div>
      </MarketplacePageShell>
    )
  }

  if (loading) {
    return (
      <MarketplacePageShell width='narrow' className='text-sm text-muted-foreground' topSpacing='md' bottomSpacing='md'>
        Loading order…
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
  if (!order) {
    return (
      <MarketplacePageShell width='narrow' className='text-sm text-red-600' topSpacing='md' bottomSpacing='md'>
        Order not found.
      </MarketplacePageShell>
    )
  }

  const isPaid = ['paid', 'shipped', 'completed', 'refunded'].includes(order.status)

  return (
    <MarketplacePageShell width='narrow' className='space-y-6'>
      <header className='space-y-2'>
        <div className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
          Invoice payment
        </div>
        <h1 className='text-2xl font-semibold text-slate-900'>Order #{order.id.slice(0, 8)}</h1>
        <p className='text-sm text-slate-600'>Placed {new Date(order.createdAt).toLocaleString()}</p>
      </header>

      <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Status</div>
            <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold ${isPaid ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>
              {order.status}
            </div>
          </div>
          <div className='text-right'>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Amount due</div>
            <div className='mt-2 text-2xl font-semibold text-slate-900'>A${order.total}</div>
          </div>
        </div>
        {order.address ? <div className='mt-4 text-xs text-slate-500'>Ship to: <span className='font-semibold text-slate-800'>{order.address}</span></div> : null}
      </section>

      <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
        <h2 className='text-lg font-semibold text-slate-900'>Items</h2>
        <ul className='mt-4 space-y-3 text-sm text-slate-600'>
          {(order.items || []).map((item) => (
            <li key={item.id} className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3'>
              <span className='font-semibold text-slate-900'>{item.title}</span>
              <span className='text-sm font-semibold text-emerald-700'>{item.quantity} × A${item.price}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className='flex flex-col gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='font-semibold text-emerald-800'>Secure Hedgetech checkout</div>
          <div className='text-xs text-emerald-600'>Payment is recorded instantly and sellers are notified.</div>
        </div>
        <Button onClick={handlePay} disabled={isPaid || paying} className='rounded-full px-5'>
          {isPaid ? 'Already paid' : paying ? 'Processing…' : 'Mark as paid'}
        </Button>
      </div>
    </MarketplacePageShell>
  )
}
