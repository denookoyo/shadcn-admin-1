import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { db, type Order } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'

function RevenueBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between text-xs text-slate-500'>
        <span>{label}</span>
        <span>A${value.toLocaleString()}</span>
      </div>
      <div className='h-2 rounded-full bg-slate-100'>
        <div className='h-2 rounded-full bg-emerald-500 transition-all' style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function SellerAnalyticsPage() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const list = await db.listOrders(ns)
        if (!mounted) return
        setOrders(list)
      } catch {
        if (mounted) setOrders([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [ns])

  const revenueByStatus = useMemo(() => {
    const map = new Map<string, number>()
    orders.forEach((order: any) => {
      const status = order.status || 'pending'
      map.set(status, (map.get(status) ?? 0) + order.total)
    })
    return Array.from(map.entries())
  }, [orders])

  const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0)
  const totalOrders = orders.length

  const bestDay = useMemo(() => {
    const map = new Map<string, number>()
    orders.forEach((order: any) => {
      const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown'
      map.set(date, (map.get(date) ?? 0) + order.total)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0]
  }, [orders])

  const maxRevenue = Math.max(...revenueByStatus.map(([, value]) => value), 0)

  const conversionRate = totalOrders ? Math.min((orders.filter((o: any) => o.status === 'completed').length / totalOrders) * 100, 100) : 0

  return (
    <div className='mx-auto max-w-6xl space-y-10 px-4 py-10'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold text-slate-900'>Analytics</h1>
        <p className='text-sm text-slate-600'>Understand pipeline performance and buyer behaviour across your Hedgetech channels.</p>
      </header>

      <section className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Total revenue</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>A${totalRevenue.toLocaleString()}</div>
          <p className='text-xs text-slate-500'>All statuses included.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Orders</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>{totalOrders}</div>
          <p className='text-xs text-slate-500'>Across POS and marketplace.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Conversion rate</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>{conversionRate.toFixed(1)}%</div>
          <p className='text-xs text-slate-500'>Completed orders vs placed.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Best day</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>{bestDay ? bestDay[0] : '—'}</div>
          <p className='text-xs text-slate-500'>A${bestDay ? bestDay[1].toLocaleString() : 0}</p>
        </div>
      </section>

      <section className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <div className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-slate-900'>Revenue by status</h2>
            <span className='text-xs text-slate-500'>Period: All time</span>
          </div>
          <div className='space-y-4'>
            {revenueByStatus.map(([status, value]) => (
              <RevenueBar key={status} label={status} value={value} max={maxRevenue} />
            ))}
            {!revenueByStatus.length ? <p className='text-xs text-slate-500'>No revenue recorded yet. Launch offerings to start capturing sales.</p> : null}
          </div>
        </div>

        <div className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-slate-900'>Channel mix</h2>
          <div className='mt-4 space-y-3 text-sm text-slate-600'>
            <div className='rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3'>
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-emerald-700'>Marketplace</span>
                <span>{totalOrders ? Math.round((orders.filter((o: any) => o.source !== 'POS').length / totalOrders) * 100) : 0}%</span>
              </div>
              <p className='text-xs text-slate-500'>Optimise PDP copy and rich media for better conversion.</p>
            </div>
            <div className='rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3'>
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-blue-700'>POS</span>
                <span>{totalOrders ? Math.round((orders.filter((o: any) => o.source === 'POS').length / totalOrders) * 100) : 0}%</span>
              </div>
              <p className='text-xs text-slate-500'>Use barcode workflows to keep queues moving.</p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-slate-700'>Repeat buyers</span>
                <span>{totalOrders ? Math.round((orders.filter((o: any) => o.repurchase).length / totalOrders) * 100) : 0}%</span>
              </div>
              <p className='text-xs text-slate-500'>Encourage subscription or bundles to lift repeat rate.</p>
            </div>
          </div>
        </div>
      </section>

      <section className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
        <h2 className='text-lg font-semibold text-slate-900'>Insights</h2>
        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <div className='rounded-3xl border border-slate-200 bg-slate-50 p-4'>
            <h3 className='text-sm font-semibold text-slate-900'>Basket size</h3>
            <p className='mt-2 text-sm text-slate-600'>Average order value currently sits at A$ {(totalOrders ? (totalRevenue / totalOrders).toFixed(2) : '0.00')}.</p>
            <p className='mt-1 text-xs text-slate-500'>Add cross-sell blocks to push bundles over A$250.</p>
          </div>
          <div className='rounded-3xl border border-slate-200 bg-slate-50 p-4'>
            <h3 className='text-sm font-semibold text-slate-900'>Fulfilment SLA</h3>
            <p className='mt-2 text-sm text-slate-600'>Keep average ship time under 48 hours to maintain Hedgetech priority badge.</p>
            <p className='mt-1 text-xs text-slate-500'>Automate notifications inside the Support console to stay ahead.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/analytics')({
  component: SellerAnalyticsPage,
})
