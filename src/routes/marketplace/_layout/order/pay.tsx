import { useEffect, useState } from 'react'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

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
        const data = await res.json()
        if (mounted) setOrder(data)
      })
      .catch((err: any) => {
        if (mounted) setError(err?.message || 'Failed to load order')
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
      const data = await res.json()
      setOrder((prev) => (prev ? { ...prev, status: data.status || 'paid' } : prev))
      toast.success('Payment recorded. Thank you!')
    } catch (err: any) {
      toast.error(err?.message || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  if (!code) {
    return (
      <div className='mx-auto max-w-3xl px-4 py-10'>
        <h1 className='text-2xl font-semibold'>Complete Payment</h1>
        <p className='mt-1 text-sm text-muted-foreground'>Enter the checkout code from the assistant to view your invoice and finalise payment.</p>
        <div className='mt-6 flex gap-2'>
          <input
            className='flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none'
            placeholder='Enter payment code'
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <a className='rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white' href={`/marketplace/order/pay?code=${encodeURIComponent(input.trim())}`}>
            Continue
          </a>
        </div>
      </div>
    )
  }

  if (loading) return <div className='mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground'>Loading order…</div>
  if (error) return <div className='mx-auto max-w-3xl px-4 py-10 text-sm text-red-600'>Error: {error}</div>
  if (!order) return <div className='mx-auto max-w-3xl px-4 py-10 text-sm text-red-600'>Order not found.</div>

  const isPaid = ['paid', 'shipped', 'completed', 'refunded'].includes(order.status)

  return (
    <div className='mx-auto max-w-3xl px-4 py-10 space-y-6'>
      <header className='space-y-1'>
        <h1 className='text-2xl font-semibold'>Order #{order.id.slice(0, 8)}</h1>
        <p className='text-sm text-muted-foreground'>Placed {new Date(order.createdAt).toLocaleString()}</p>
      </header>

      <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='flex items-center justify-between text-sm font-semibold'>
          <span>Status</span>
          <span className={isPaid ? 'text-emerald-600' : 'text-amber-600'}>{order.status}</span>
        </div>
        <div className='mt-3 flex items-center justify-between text-sm'>
          <span>Total due</span>
          <span className='text-lg font-semibold'>A${order.total}</span>
        </div>
        {order.address ? <div className='mt-2 text-xs text-muted-foreground'>Ship to: {order.address}</div> : null}
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <h2 className='text-sm font-semibold'>Items</h2>
        <ul className='mt-3 space-y-2 text-sm'>
          {(order.items || []).map((item) => (
            <li key={item.id} className='flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2'>
              <span>{item.title}</span>
              <span>{item.quantity} × A${item.price}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className='flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm'>
        <div>
          <div className='font-semibold text-emerald-700'>Secure Hedgetech checkout</div>
          <div className='text-xs text-emerald-600'>Payment is recorded instantly and sellers are notified.</div>
        </div>
        <Button onClick={handlePay} disabled={isPaid || paying}>
          {isPaid ? 'Already paid' : paying ? 'Processing…' : 'Mark as paid'}
        </Button>
      </div>
    </div>
  )
}
