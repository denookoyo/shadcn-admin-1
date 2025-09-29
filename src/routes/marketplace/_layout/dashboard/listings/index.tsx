import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Filter, PlusCircle, MoreVertical } from 'lucide-react'
import { db, type Product } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function SellerListingsPage() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const prods = await db.listProducts()
        if (!mounted) return
        setProducts(prods)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const myNumericId = (user as any)?.id ?? (user as any)?.uid

  const mine = useMemo(() => {
    return products.filter((product: any) => {
      if (typeof product?.ownerId === 'number') return myNumericId != null && Number(product.ownerId) === Number(myNumericId)
      if (typeof product?.ownerId === 'string') return product.ownerId === ns
      return false
    })
  }, [products, ns, myNumericId])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return mine
    return mine.filter((product) => [product.title, product.slug, product.barcode, product.type].some((field) => field?.toLowerCase?.().includes(term)))
  }, [mine, query])

  return (
    <div className='mx-auto max-w-6xl space-y-8 px-4 py-10'>
      <header className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-semibold text-slate-900'>Catalogue manager</h1>
          <p className='mt-1 text-sm text-slate-600'>Launch, optimise, and organise your Hedgetech listings from a single workspace.</p>
        </div>
        <Link
          to='/marketplace/dashboard/listings/new'
          className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500'
        >
          <PlusCircle className='h-4 w-4' /> New listing
        </Link>
      </header>

      <section className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Active listings</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>{mine.length}</div>
          <p className='text-xs text-slate-500'>Keep at least 5 listings live to unlock featured placement.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Services</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>{mine.filter((p) => p.type === 'service').length}</div>
          <p className='text-xs text-slate-500'>Enable instant booking for faster conversion.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Average price</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>
            {mine.length ? `A$${(mine.reduce((sum, p) => sum + p.price, 0) / mine.length).toFixed(2)}` : '—'}
          </div>
          <p className='text-xs text-slate-500'>Review pricing quarterly to stay competitive.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Images missing</div>
          <div className='mt-2 text-2xl font-semibold text-slate-900'>{mine.filter((p) => !p.img).length}</div>
          <p className='text-xs text-slate-500'>Add hero imagery to keep the trust badge.</p>
        </div>
      </section>

      <section className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex flex-1 items-center gap-2'>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Search by title, slug, SKU…'
              className='max-w-sm'
            />
            <Button variant='outline' className='gap-2 text-xs'>
              <Filter className='h-4 w-4' /> Filters
            </Button>
          </div>
          <span className='text-xs text-slate-500'>Showing {filtered.length} of {mine.length} listings</span>
        </div>

        <div className='mt-4 w-full overflow-x-auto'>
          <table className='w-full min-w-[720px] text-sm'>
            <thead>
              <tr className='border-b text-left text-xs uppercase tracking-wide text-slate-400'>
                <th className='py-2 pr-4'>Product</th>
                <th className='py-2 pr-4'>Type</th>
                <th className='py-2 pr-4'>Price</th>
                <th className='py-2 pr-4'>Barcode</th>
                <th className='py-2 pr-4'>Created</th>
                <th className='py-2 pr-4 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className='py-10 text-center text-xs text-slate-500'>Loading listings…</td>
                </tr>
              ) : null}
              {!loading && !filtered.length ? (
                <tr>
                  <td colSpan={6} className='py-12 text-center text-xs text-slate-500'>No listings found. Try another search or create one above.</td>
                </tr>
              ) : null}
              {filtered.map((product) => {
                const createdAt = (product as any)?.createdAt ? new Date((product as any).createdAt) : null
                return (
                  <tr key={product.id} className='border-b text-slate-600 hover:bg-slate-50'>
                    <td className='py-3 pr-4'>
                      <div className='flex items-center gap-3'>
                        {product.img ? <img src={product.img} alt='' className='h-10 w-10 rounded-xl object-cover' /> : <div className='h-10 w-10 rounded-xl bg-slate-100' />}
                        <div className='space-y-1'>
                          <div className='font-semibold text-slate-900'>{product.title}</div>
                          <div className='text-xs text-slate-400'>/{product.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className='py-3 pr-4 capitalize'>{product.type}</td>
                    <td className='py-3 pr-4 text-emerald-700'>A${product.price}</td>
                    <td className='py-3 pr-4 text-xs text-slate-400'>{product.barcode || '—'}</td>
                    <td className='py-3 pr-4 text-xs text-slate-400'>{createdAt ? createdAt.toLocaleDateString() : '—'}</td>
                    <td className='py-3 pr-0 text-right'>
                      <div className='inline-flex items-center gap-2'>
                        <Link
                          to='/marketplace/dashboard/listings/product'
                          search={{ id: product.id }}
                          className='inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'
                        >
                          Edit
                        </Link>
                        <button className='rounded-full border border-slate-200 p-1 text-slate-400 hover:text-slate-700'>
                          <MoreVertical className='h-4 w-4' />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/listings/')({
  component: SellerListingsPage,
})
