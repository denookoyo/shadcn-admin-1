import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, PackageCheck, PackageOpen, PackageSearch, ScanLine, ArrowUpRight } from 'lucide-react'
import { db, type Product, type Order } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { StageBadge } from '@/components/stage-badge'
import { Button } from '@/components/ui/button'

type Highlight = { heading: string; body: string; href: string }

type StatTileProps = {
  label: string
  value: string
  helper?: string
  trend?: string
}

function StatTile({ label, value, helper, trend }: StatTileProps) {
  return (
    <div className='rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:shadow-md'>
      <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>{label}</div>
      <div className='mt-3 flex items-baseline gap-2'>
        <span className='text-2xl font-semibold text-slate-900'>{value}</span>
        {trend ? <span className='text-xs font-semibold text-emerald-600'>{trend}</span> : null}
      </div>
      {helper ? <div className='mt-2 text-xs text-slate-500'>{helper}</div> : null}
    </div>
  )
}

function SellerDashboard() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [prods, ords] = await Promise.all([db.listProducts(), db.listOrders(ns)])
        if (!mounted) return
        setProducts(prods)
        setOrders(ords)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [ns])

  const myNumericId = (user as any)?.id ?? (user as any)?.uid

  const mine = useMemo(() => {
    return products.filter((product: any) => {
      if (typeof product?.ownerId === 'number') return myNumericId != null && Number(product.ownerId) === Number(myNumericId)
      if (typeof product?.ownerId === 'string') return product.ownerId === ns
      return false
    })
  }, [products, ns, myNumericId])

  const totalRevenue = useMemo(() => orders.reduce((acc, order) => acc + order.total, 0), [orders])
  const pendingOrders = useMemo(() => orders.filter((order: any) => ['pending', 'scheduled'].includes(order.status)), [orders])
  const completedOrders = useMemo(() => orders.filter((order: any) => ['completed', 'paid'].includes(order.status)), [orders])
  const shippedOrders = useMemo(() => orders.filter((order) => order.status === 'shipped'), [orders])

  const highlights: Highlight[] = [
    {
      heading: 'Analyse performance',
      body: 'Visualise conversion, repeat buyers, and channel contribution across time periods.',
      href: '/marketplace/dashboard/analytics',
    },
    {
      heading: 'Generate reports',
      body: 'Export settlement-ready CSVs and automate weekly digests for your finance stack.',
      href: '/marketplace/dashboard/reports',
    },
    {
      heading: 'Resolve support tickets',
      body: 'Track refunds, escalations, and policy breaches all in one queue.',
      href: '/marketplace/dashboard/support',
    },
  ]

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this listing? You can’t undo this action.')
    if (!confirmed) return
    await db.deleteProduct(id)
    setProducts((list) => list.filter((product) => product.id !== id))
  }

  return (
    <div className='mx-auto max-w-7xl space-y-10 px-4 py-10'>
      <section className='rounded-4xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/40 px-8 py-10 shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-6'>
          <div className='space-y-4'>
            <div className='flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
              <StageBadge />
              Seller cockpit
            </div>
            <h1 className='text-3xl font-semibold text-slate-900'>Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
            <p className='max-w-xl text-sm text-slate-600'>Monitor trading health, coordinate fulfilment, and launch new listings with workflow blocks tailored for Hedgetech merchants.</p>
            <div className='flex flex-wrap gap-2 text-xs'>
              <Link to='/marketplace/dashboard/pos' className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700'>
                <ScanLine className='h-3.5 w-3.5' /> Open POS
              </Link>
              <Link to='/marketplace/dashboard/listings/new' className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500'>
                Launch listing
              </Link>
              <Link to='/marketplace/dashboard/orders' className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700'>
                <PackageSearch className='h-3.5 w-3.5' /> Manage orders
              </Link>
            </div>
          </div>
          <div className='grid w-full max-w-sm gap-4 text-sm text-slate-600'>
            <div className='rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-sm'>
              <div className='text-xs font-semibold uppercase tracking-wide text-emerald-600'>Health summary</div>
              <div className='mt-3 space-y-3 text-sm'>
                <div className='flex items-center justify-between'>
                  <span>Net promoter score</span>
                  <span className='font-semibold text-slate-900'>64</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span>Fulfilment SLA</span>
                  <span className='font-semibold text-slate-900'>92%</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span>Escalations (7d)</span>
                  <span className='font-semibold text-amber-600'>2</span>
                </div>
              </div>
              <Link to='/marketplace/dashboard/support' className='mt-4 inline-flex items-center text-xs font-semibold text-emerald-700 hover:underline'>View health console →</Link>
            </div>
            <div className='rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm'>
              <div className='font-semibold text-slate-900'>Need onboarding help?</div>
              <p className='mt-1 text-xs text-slate-500'>Join the Hedgetech seller academy or book a white-glove setup session.</p>
              <a href='#' className='mt-3 inline-flex items-center text-xs font-semibold text-emerald-700 hover:underline'>Browse playbooks →</a>
            </div>
          </div>
        </div>
      </section>

      <section className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatTile label='Revenue to date' value={`A$${totalRevenue.toFixed(2)}`} trend='+8.4% wow' helper='Includes POS + marketplace settlements' />
        <StatTile label='Active orders' value={`${pendingOrders.length}`} helper={`${shippedOrders.length} awaiting pickup`} />
        <StatTile label='Completed orders' value={`${completedOrders.length}`} helper='Encourage feedback to boost trust' />
        <StatTile label='Published listings' value={`${mine.length}`} helper='Keep inventory synced for fast checkout' />
      </section>

      <section className='grid gap-6 lg:grid-cols-[1.7fr_1fr]'>
        <div className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h2 className='text-lg font-semibold text-slate-900'>Listings</h2>
              <p className='text-xs text-slate-500'>Spotlight key SKUs and keep pricing sharp.</p>
            </div>
            <Link to='/marketplace/dashboard/listings' className='inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'>
              Manage catalogue
            </Link>
          </div>
          <div className='mt-4 w-full overflow-x-auto'>
            <table className='w-full min-w-[640px] text-sm'>
              <thead>
                <tr className='border-b text-left text-xs uppercase tracking-wide text-slate-400'>
                  <th className='py-2 pr-4'>Listing</th>
                  <th className='py-2 pr-4'>Type</th>
                  <th className='py-2 pr-4'>Price</th>
                  <th className='py-2 pr-4'>Updated</th>
                  <th className='py-2 pr-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mine.slice(0, 6).map((product) => {
                  const lastTouched = (product as any)?.updatedAt ?? (product as any)?.createdAt
                  return (
                    <tr key={product.id} className='border-b text-slate-600'>
                      <td className='py-3 pr-4'>
                        <div className='flex items-center gap-3'>
                          {product.img ? <img src={product.img} alt='' className='h-10 w-10 rounded-xl object-cover' /> : <div className='h-10 w-10 rounded-xl bg-slate-100' />}
                          <div>
                            <div className='font-semibold text-slate-900'>{product.title}</div>
                            <div className='text-xs text-slate-400'>Slug: {product.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className='py-3 pr-4 capitalize'>{product.type}</td>
                      <td className='py-3 pr-4 text-emerald-700'>A${product.price}</td>
                      <td className='py-3 pr-4 text-xs text-slate-400'>{lastTouched ? new Date(lastTouched).toLocaleDateString?.() : '—'}</td>
                      <td className='py-3 pr-0 text-right'>
                        <div className='inline-flex gap-2'>
                          <Link
                            to='/marketplace/dashboard/listings/product'
                            search={{ id: product.id }}
                            className='inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'
                          >
                            Edit
                          </Link>
                          <Button variant='destructive' size='sm' className='rounded-full px-3 text-xs' onClick={() => handleDelete(product.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!loading && mine.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='py-10 text-center text-xs text-slate-500'>No listings yet. Launch your first product to start selling.</td>
                  </tr>
                ) : null}
                {loading ? (
                  <tr>
                    <td colSpan={5} className='py-10 text-center text-xs text-slate-500'>Loading catalogue…</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className='space-y-4'>
          <div className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Operational board</h2>
            <div className='mt-3 space-y-3 text-sm text-slate-600'>
              <div className='flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3'>
                <div className='flex items-center gap-2 font-semibold text-amber-700'>
                  <PackageOpen className='h-4 w-4' /> Pending fulfilment
                </div>
                <span>{pendingOrders.length}</span>
              </div>
              <div className='flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3'>
                <div className='flex items-center gap-2 font-semibold text-emerald-700'>
                  <PackageCheck className='h-4 w-4' /> Completed this week
                </div>
                <span>{completedOrders.length}</span>
              </div>
              <div className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
                <div className='flex items-center gap-2 font-semibold text-slate-600'>
                  <PackageSearch className='h-4 w-4' /> Awaiting pickup
                </div>
                <span>{shippedOrders.length}</span>
              </div>
              <Link
                to='/marketplace/dashboard/support'
                className='inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline'
              >
                View escalations →
              </Link>
            </div>
          </div>

          <div className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Next best actions</h2>
            <ul className='mt-3 space-y-3 text-sm text-slate-600'>
              {highlights.map((item) => (
                <li key={item.heading} className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <div className='text-sm font-semibold text-slate-900'>{item.heading}</div>
                      <p className='text-xs text-slate-500'>{item.body}</p>
                    </div>
                    <Link to={item.href} className='inline-flex items-center text-xs font-semibold text-emerald-700 hover:underline'>
                      Go <ArrowUpRight className='ml-1 h-3 w-3' />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-slate-900'>Momentum</h2>
            <p className='text-xs text-slate-500'>Snapshot of week-over-week velocity pulled from your marketplace data.</p>
          </div>
          <Link to='/marketplace/dashboard/analytics' className='inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline'>
            Dive into analytics →
          </Link>
        </div>
        <div className='mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <div className='rounded-3xl border border-slate-200 bg-slate-50 p-4'>
            <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>
              <TrendingUp className='h-4 w-4 text-emerald-600' /> Conversion rate
            </div>
            <div className='mt-3 text-2xl font-semibold text-slate-900'>3.8%</div>
            <p className='mt-2 text-xs text-slate-500'>+0.6pts vs last period. Optimise PDP assets to keep momentum.</p>
          </div>
          <div className='rounded-3xl border border-slate-200 bg-slate-50 p-4'>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Returning buyers</div>
            <div className='mt-3 text-2xl font-semibold text-slate-900'>41%</div>
            <p className='mt-2 text-xs text-slate-500'>Triggered by re-engagement emails sent on Monday.</p>
          </div>
          <div className='rounded-3xl border border-slate-200 bg-slate-50 p-4'>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Avg. fulfilment time</div>
            <div className='mt-3 text-2xl font-semibold text-slate-900'>1.8 days</div>
            <p className='mt-2 text-xs text-slate-500'>Goal is to remain under 2.5 days to keep Hedgetech priority badge.</p>
          </div>
          <div className='rounded-3xl border border-slate-200 bg-slate-50 p-4'>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Net settlements</div>
            <div className='mt-3 text-2xl font-semibold text-slate-900'>A$ {(Math.max(totalRevenue - 12500, 0)).toLocaleString()}</div>
            <p className='mt-2 text-xs text-slate-500'>Next payout scheduled for Friday 4pm AEST.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/')({
  component: SellerDashboard,
})
