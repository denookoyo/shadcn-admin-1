import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Filter, PlusCircle, MoreVertical } from 'lucide-react'
import { db, type Product } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { ensureSellerRouteAccess } from '@/features/sellers/access'

function SellerListingsPage() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [stockProductId, setStockProductId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [supplierReference, setSupplierReference] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [barcodeLines, setBarcodeLines] = useState('')
  const [stockBusy, setStockBusy] = useState(false)
  const [stockFeedback, setStockFeedback] = useState<string | null>(null)

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

  async function submitStockIntake() {
    if (!stockProductId) {
      setStockFeedback('Choose a listing before recording stock.')
      return
    }
    const barcodes = barcodeLines
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
    const quantity = Number(stockQuantity || 0)
    if (!barcodes.length && (!Number.isFinite(quantity) || quantity <= 0)) {
      setStockFeedback('Enter at least one barcode or a quantity.')
      return
    }
    try {
      setStockBusy(true)
      await db.createStockIntake?.({
        productId: stockProductId,
        supplierName,
        supplierReference,
        unitCost: unitCost ? Number(unitCost) : undefined,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : undefined,
        barcodes,
      })
      const refreshed = await db.listProducts()
      setProducts(refreshed)
      setStockFeedback('Stock purchase recorded.')
      setSupplierName('')
      setSupplierReference('')
      setUnitCost('')
      setStockQuantity('')
      setBarcodeLines('')
      setStockDialogOpen(false)
    } catch (error) {
      setStockFeedback(error instanceof Error ? error.message : 'Unable to record stock purchase.')
    } finally {
      setStockBusy(false)
    }
  }

  return (
    <MarketplacePageShell width='wide' className='space-y-8'>
      <header className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-semibold text-slate-900'>Catalogue manager</h1>
          <p className='mt-1 text-sm text-slate-600'>Launch, optimise, and organise your Hedgetech listings from a single workspace.</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700'
            onClick={() => {
              setStockProductId(mine[0]?.id || '')
              setStockFeedback(null)
              setStockDialogOpen(true)
            }}
          >
            Record stock purchase
          </button>
          <Link
            to='/marketplace/dashboard/listings/new'
            className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500'
          >
            <PlusCircle className='h-4 w-4' /> New listing
          </Link>
        </div>
      </header>

      {stockFeedback ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${stockFeedback.toLowerCase().includes('recorded') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {stockFeedback}
        </div>
      ) : null}

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

      <section className='rounded-4xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex w-full flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center'>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Search by title, slug, SKU…'
              className='max-w-sm'
            />
            <Button variant='outline' className='gap-2 text-xs sm:w-auto'>
              <Filter className='h-4 w-4' /> Filters
            </Button>
          </div>
          <span className='text-xs text-slate-500'>Showing {filtered.length} of {mine.length} listings</span>
        </div>

        <div className='mt-4 hidden w-full overflow-x-auto md:block'>
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

        <div className='mt-4 space-y-3 md:hidden'>
          {loading ? (
            <div className='rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500'>
              Loading listings…
            </div>
          ) : null}
          {!loading && !filtered.length ? (
            <div className='rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500'>
              No listings found. Try another search or create one above.
            </div>
          ) : null}
          {filtered.map((product) => {
            const createdAt = (product as any)?.createdAt ? new Date((product as any).createdAt) : null
            return (
              <article key={product.id} className='rounded-3xl border border-slate-200 p-4 shadow-sm'>
                <div className='flex items-start gap-3'>
                  {product.img ? <img src={product.img} alt='' className='h-14 w-14 shrink-0 rounded-2xl object-cover' /> : <div className='h-14 w-14 shrink-0 rounded-2xl bg-slate-100' />}
                  <div className='min-w-0 flex-1'>
                    <div className='text-sm font-semibold text-slate-900'>{product.title}</div>
                    <div className='truncate text-xs text-slate-400'>/{product.slug}</div>
                    <div className='mt-2 flex flex-wrap gap-2 text-xs text-slate-500'>
                      <span className='rounded-full bg-slate-100 px-2 py-1 capitalize'>{product.type}</span>
                      <span className='rounded-full bg-emerald-50 px-2 py-1 text-emerald-700'>A${product.price}</span>
                    </div>
                  </div>
                </div>
                <div className='mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500'>
                  <div>
                    <div className='font-semibold text-slate-700'>Barcode</div>
                    <div>{product.barcode || '—'}</div>
                  </div>
                  <div>
                    <div className='font-semibold text-slate-700'>Created</div>
                    <div>{createdAt ? createdAt.toLocaleDateString() : '—'}</div>
                  </div>
                </div>
                <div className='mt-4 flex gap-2'>
                  <Link
                    to='/marketplace/dashboard/listings/product'
                    search={{ id: product.id }}
                    className='inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'
                  >
                    Edit
                  </Link>
                  <button className='rounded-full border border-slate-200 px-3 py-2 text-slate-400 hover:text-slate-700'>
                    <MoreVertical className='h-4 w-4' />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record stock purchase</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 text-sm text-slate-600'>
            <label className='block space-y-2'>
              <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Listing</span>
              <select
                value={stockProductId}
                onChange={(event) => setStockProductId(event.target.value)}
                className='w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm'
              >
                <option value=''>Select a listing</option>
                {mine.filter((product) => product.type !== 'service').map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title}
                  </option>
                ))}
              </select>
            </label>
            <div className='grid gap-3 sm:grid-cols-2'>
              <label className='block space-y-2'>
                <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Supplier name</span>
                <Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder='Wholesaler or vendor' />
              </label>
              <label className='block space-y-2'>
                <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Supplier reference</span>
                <Input value={supplierReference} onChange={(event) => setSupplierReference(event.target.value)} placeholder='Invoice or PO number' />
              </label>
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              <label className='block space-y-2'>
                <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Unit cost (optional)</span>
                <Input type='number' min='0' step='0.01' value={unitCost} onChange={(event) => setUnitCost(event.target.value)} placeholder='0.00' />
              </label>
              <label className='block space-y-2'>
                <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Manual quantity (optional)</span>
                <Input type='number' min='0' step='1' value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} placeholder='Used when barcodes are not available' />
              </label>
            </div>
            <label className='block space-y-2'>
              <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Barcodes</span>
              <textarea
                rows={8}
                value={barcodeLines}
                onChange={(event) => setBarcodeLines(event.target.value)}
                placeholder='One barcode per line'
                className='w-full rounded-2xl border border-slate-200 p-3 text-sm'
              />
            </label>
          </div>
          <DialogFooter className='flex-col gap-2 sm:flex-row sm:justify-end'>
            <button type='button' className='rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700' onClick={() => setStockDialogOpen(false)}>
              Cancel
            </button>
            <button
              type='button'
              className='rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60'
              disabled={stockBusy}
              onClick={() => void submitStockIntake()}
            >
              {stockBusy ? 'Saving…' : 'Save stock purchase'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MarketplacePageShell>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/listings/')({
  beforeLoad: ({ location }) => ensureSellerRouteAccess(location),
  component: SellerListingsPage,
})
