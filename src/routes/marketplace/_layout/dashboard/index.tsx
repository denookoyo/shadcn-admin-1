import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Plus, ScanLine, PackageCheck, PackageOpen, PackageSearch } from 'lucide-react'
import { db, type Product, type Order } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

type FormState = {
  title: string
  price: number
  type: Product['type']
  seller: string
  img: string
  slug: string
  barcode: string
}

function KpiCard({ label, value, delta, accent }: { label: string; value: string; delta?: string; accent: 'emerald' | 'slate' | 'amber' }) {
  const accentClasses =
    accent === 'emerald'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
      : accent === 'amber'
        ? 'border-amber-100 bg-amber-50 text-amber-800'
        : 'border-slate-200 bg-white text-slate-700'
  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${accentClasses}`}>
      <div className='text-xs font-semibold uppercase tracking-wide text-current/80'>{label}</div>
      <div className='mt-2 text-2xl font-semibold text-current'>{value}</div>
      {delta ? <div className='text-xs text-current/70'>{delta}</div> : null}
    </div>
  )
}

function SellerDashboard() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>({ title: '', price: 0, type: 'goods', seller: 'You', img: '', slug: '', barcode: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const prods = await db.listProducts()
      const ords = await db.listOrders(ns)
      if (!mounted) return
      setProducts(prods)
      setOrders(ords)
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

  async function handleSave() {
    const payload = {
      title: form.title,
      price: Number(form.price) || 0,
      type: form.type,
      seller: form.seller || 'You',
      img: form.img,
      slug: form.slug || slugify(form.title),
      ownerId: ns,
      barcode: form.barcode?.trim() || undefined,
    }

    if (editing) {
      const updated = await db.updateProduct(editing.id, payload)
      if (updated) setProducts((list) => list.map((product) => (product.id === updated.id ? updated : product)))
    } else {
      const created = await db.createProduct(payload)
      setProducts((list) => [created, ...list])
    }

    setOpen(false)
    setEditing(null)
    setForm({ title: '', price: 0, type: 'goods', seller: 'You', img: '', slug: '', barcode: '' })
  }

  async function handleDelete(id: string) {
    await db.deleteProduct(id)
    setProducts((list) => list.filter((product) => product.id !== id))
  }

  return (
    <div className='mx-auto max-w-7xl space-y-8 px-4 py-10'>
      <header className='rounded-3xl border border-emerald-100/60 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 px-6 py-10 shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-6'>
          <div className='space-y-3'>
            <span className='inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>Seller cockpit</span>
            <h1 className='text-3xl font-semibold text-slate-900'>Manage your Hedgetech storefront</h1>
            <p className='max-w-xl text-sm text-slate-600'>Track your pipeline, launch new listings, and fulfil orders from a single Hedgetech workspace.</p>
            <div className='flex flex-wrap gap-2 text-xs'>
              <Link to='/marketplace/dashboard/pos' className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50'>
                <ScanLine className='h-3.5 w-3.5' /> Open POS
              </Link>
              <Link to='/marketplace/dashboard/orders' className='inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'>
                <PackageSearch className='h-3.5 w-3.5' /> View orders
              </Link>
              <Link to='/marketplace/dashboard/import' className='inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'>
                Import catalogue
              </Link>
            </div>
          </div>
          <div className='grid w-full max-w-xs gap-3 text-sm text-slate-600'>
            <div className='rounded-3xl border border-emerald-100 bg-white/90 p-4 shadow-sm'>
              <div className='text-xs font-semibold uppercase tracking-wide text-emerald-600'>Quick start</div>
              <p className='mt-1 text-sm text-slate-600'>Bring your first product online in minutes, sync inventory later.</p>
              <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setEditing(null) }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setOpen(true)} className='mt-4 w-full rounded-full'><Plus className='mr-2 h-4 w-4' /> Add product</Button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-xl max-h-[85vh] grid-rows-[auto,minmax(0,1fr),auto] overflow-hidden'>
                  <DialogHeader>
                    <DialogTitle>{editing ? 'Edit product' : 'Add product'}</DialogTitle>
                  </DialogHeader>
                  <div className='grid gap-4 overflow-y-auto pr-2'>
                    <div>
                      <Label htmlFor='title'>Title</Label>
                      <Input id='title' value={form.title} onChange={(event) => setForm((state) => ({ ...state, title: event.target.value, slug: slugify(event.target.value) }))} />
                    </div>
                    <div className='grid gap-3 md:grid-cols-3'>
                      <div>
                        <Label htmlFor='price'>Price (A$)</Label>
                        <Input id='price' type='number' value={form.price} onChange={(event) => setForm((state) => ({ ...state, price: Number(event.target.value) }))} />
                      </div>
                      <div>
                        <Label htmlFor='type'>Type</Label>
                        <select
                          id='type'
                          className='w-full rounded-md border px-3 py-2'
                          value={form.type}
                          onChange={(event) => setForm((state) => ({ ...state, type: event.target.value as Product['type'] }))}
                        >
                          <option value='goods'>Goods</option>
                          <option value='service'>Service</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor='seller'>Seller</Label>
                        <Input id='seller' value={form.seller} onChange={(event) => setForm((state) => ({ ...state, seller: event.target.value }))} />
                      </div>
                    </div>
                    <div className='grid gap-3 md:grid-cols-3'>
                      <div>
                        <Label htmlFor='barcode'>Barcode</Label>
                        <Input id='barcode' value={form.barcode} onChange={(event) => setForm((state) => ({ ...state, barcode: event.target.value }))} placeholder='Optional' />
                      </div>
                      <div className='flex items-end'>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={async () => {
                            const Detector = (window as any).BarcodeDetector
                            if (!Detector) {
                              alert('Camera barcode scanning is not supported on this browser. Use a hardware scanner or type the code.')
                              return
                            }
                            try {
                              const detector = new Detector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'qr_code'] })
                              const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                              const video = document.createElement('video')
                              video.srcObject = stream
                              await video.play()
                              let found = ''
                              for (let i = 0; i < 50 && !found; i += 1) {
                                const codes = await detector.detect(video)
                                if (codes?.length) found = codes[0].rawValue
                                await new Promise((resolve) => setTimeout(resolve, 120))
                              }
                              stream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
                              if (found) setForm((state) => ({ ...state, barcode: found }))
                              else alert('No barcode detected. Try again with stable lighting.')
                            } catch (error) {
                              console.error(error)
                              alert('Failed to scan barcode. Please type it manually.')
                            }
                          }}
                        >
                          Scan barcode
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor='img'>Image URL</Label>
                      <Input id='img' value={form.img} onChange={(event) => setForm((state) => ({ ...state, img: event.target.value }))} placeholder='https://…' />
                    </div>
                    <div>
                      <Label htmlFor='slug'>Slug</Label>
                      <Input id='slug' value={form.slug} onChange={(event) => setForm((state) => ({ ...state, slug: event.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant='ghost' onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>{editing ? 'Save changes' : 'Create product'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className='rounded-3xl border border-emerald-100 bg-white/90 p-4 text-xs text-slate-600 shadow-sm'>
              <div className='font-semibold text-slate-800'>Need help onboarding?</div>
              <p className='mt-1'>Jump into the Hedgetech seller academy or schedule a setup session.</p>
              <a href='#' className='mt-2 inline-flex items-center text-emerald-700 hover:underline'>View guides →</a>
            </div>
          </div>
        </div>
      </header>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <KpiCard label='Revenue to date' value={`A$${totalRevenue.toFixed(2)}`} delta='+8.4% vs last week' accent='emerald' />
        <KpiCard label='Active orders' value={`${pendingOrders.length}`} delta={`${shippedOrders.length} awaiting handover`} accent='amber' />
        <KpiCard label='Completed orders' value={`${completedOrders.length}`} delta='Keep feedback requests flowing' accent='slate' />
        <KpiCard label='Published listings' value={`${mine.length}`} delta='Sync more via CSV import' accent='slate' />
      </div>

      <div className='grid gap-6 lg:grid-cols-[1.7fr_1fr]'>
        <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h2 className='text-lg font-semibold text-slate-900'>My listings</h2>
              <p className='text-xs text-slate-500'>Manage availability, pricing, and fulfilment.</p>
            </div>
            <Button variant='outline' className='rounded-full border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600' onClick={() => { setEditing(null); setForm({ title: '', price: 0, type: 'goods', seller: 'You', img: '', slug: '', barcode: '' }); setOpen(true) }}>
              <Plus className='mr-2 h-4 w-4' /> New listing
            </Button>
          </div>
          <div className='mt-4 w-full overflow-x-auto'>
            <table className='w-full min-w-[600px] text-sm'>
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
                {mine.map((product) => {
                  const lastTouched = (product as any)?.updatedAt ?? (product as any)?.createdAt
                  return (
                  <tr key={product.id} className='border-b text-slate-600'>
                    <td className='py-3 pr-4'>
                      <div className='flex items-center gap-3'>
                        {product.img ? <img src={product.img} alt='' className='h-10 w-10 rounded-2xl object-cover' /> : <div className='h-10 w-10 rounded-2xl bg-slate-100' />}
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
                        <Button
                          variant='outline'
                          size='sm'
                          className='rounded-full border-slate-200 px-3 text-xs'
                          onClick={() => {
                            setEditing(product)
                            setForm({
                              title: product.title,
                              price: product.price,
                              type: product.type,
                              seller: product.seller,
                              img: product.img,
                              slug: product.slug,
                              barcode: (product as any).barcode || '',
                            })
                            setOpen(true)
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant='destructive' size='sm' className='rounded-full px-3 text-xs' onClick={() => handleDelete(product.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )})}
                {mine.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='py-10 text-center text-xs text-slate-500'>No listings yet. Add your first product to start selling.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside className='space-y-4'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Order pipeline</h2>
            <div className='mt-3 grid gap-3 text-sm text-slate-600'>
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
                to='/marketplace/dashboard/orders'
                className='mt-2 inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'
              >
                Manage orders
              </Link>
            </div>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Grow your business</h2>
            <ul className='mt-3 space-y-2 text-xs'>
              <li>• Invite teammates to collaborate in the cockpit.</li>
              <li>• Connect logistics and invoicing integrations.</li>
              <li>• Enable instant booking for service listings.</li>
            </ul>
            <a href='#' className='mt-3 inline-flex items-center text-emerald-700 hover:underline'>View seller academy →</a>
          </div>
        </aside>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/')({
  component: SellerDashboard,
})
