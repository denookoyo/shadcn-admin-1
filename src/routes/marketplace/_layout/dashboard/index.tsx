import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { db, type Product, type Order } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

function SellerDashboard() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ title: '', price: 0, type: 'goods' as Product['type'], seller: 'You', img: '', slug: '', barcode: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const prods = await db.listProducts()
      const ords = await db.listOrders(ns)
      if (!mounted) return
      setProducts(prods)
      setOrders(ords)
    })()
    return () => { mounted = false }
  }, [ns])

  const mine = useMemo(() => {
    const myNumeric = (user as any)?.id ?? (user as any)?.uid
    return products.filter((p: any) => {
      if (typeof p?.ownerId === 'number') return myNumeric != null && Number(p.ownerId) === Number(myNumeric)
      if (typeof p?.ownerId === 'string') return p.ownerId === ns
      return false
    })
  }, [products, ns, user])
  const totalRevenue = useMemo(() => orders.reduce((a, o) => a + o.total, 0), [orders])

  async function handleSave() {
    const payload = { title: form.title, price: Number(form.price) || 0, type: form.type, seller: form.seller || 'You', img: form.img, slug: form.slug || slugify(form.title), ownerId: ns, barcode: form.barcode?.trim() || undefined }
    if (editing) {
      const updated = await db.updateProduct(editing.id, payload)
      if (updated) setProducts((ps) => ps.map((p) => (p.id === updated.id ? updated : p)))
    } else {
      const created = await db.createProduct(payload)
      setProducts((ps) => [created, ...ps])
    }
    setOpen(false)
    setEditing(null)
    setForm({ title: '', price: 0, type: 'goods', seller: 'You', img: '', slug: '', barcode: '' })
  }

  async function handleDelete(id: string) {
    await db.deleteProduct(id)
    setProducts((ps) => ps.filter((p) => p.id !== id))
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
        <div className='flex items-center gap-2'>
          <Link to='/marketplace/dashboard/pos' className='rounded-md border px-3 py-2 text-sm'>Open POS</Link>
          <Link to='/marketplace/dashboard/labels' className='rounded-md border px-3 py-2 text-sm'>Print Labels</Link>
          <Link to='/marketplace/dashboard/import' className='rounded-md border px-3 py-2 text-sm'>Import CSV</Link>
          <Link to='/marketplace/dashboard/orders' className='rounded-md border px-3 py-2 text-sm'>View Orders</Link>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit product' : 'Add product'}</DialogTitle>
            </DialogHeader>
            <div className='grid gap-3'>
              <div>
                <Label htmlFor='title'>Title</Label>
                <Input id='title' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugify(e.target.value) })} />
              </div>
        <div className='grid gap-3 md:grid-cols-3'>
                <div>
                  <Label htmlFor='price'>Price (A$)</Label>
                  <Input id='price' type='number' value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
                <div>
                  <Label htmlFor='type'>Type</Label>
                  <select id='type' className='w-full rounded-md border px-3 py-2' value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Product['type'] })}>
                    <option value='goods'>Goods</option>
                    <option value='service'>Service</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor='seller'>Seller</Label>
                  <Input id='seller' value={form.seller} onChange={(e) => setForm({ ...form, seller: e.target.value })} />
                </div>
              </div>
              <div className='grid gap-3 md:grid-cols-3'>
                <div>
                  <Label htmlFor='barcode'>Barcode</Label>
                  <Input id='barcode' value={form.barcode} onChange={(e)=>setForm({ ...form, barcode: e.target.value })} placeholder='e.g., 6161105450154' />
                </div>
                <div className='flex items-end'>
                  <Button type='button' variant='outline' onClick={async ()=>{
                    // Try BarcodeDetector if supported
                    // @ts-ignore
                    const BD = (window as any).BarcodeDetector
                    // @ts-ignore
                    if (!BD) { alert('Camera barcode scanning is not supported on this browser. Use a USB/BT scanner or type the code.'); return }
                    try {
                      // @ts-ignore
                      const detector = new BD({ formats: ['ean_13','ean_8','code_128','code_39','upc_a','qr_code'] })
                      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                      const video = document.createElement('video')
                      video.srcObject = stream
                      await video.play()
                      // Try a few frames
                      let found = ''
                      for (let i=0;i<50 && !found;i++) {
                        // @ts-ignore
                        const codes = await detector.detect(video)
                        if (codes && codes.length) found = codes[0].rawValue
                        await new Promise(r=>setTimeout(r, 120))
                      }
                      stream.getTracks().forEach(t=>t.stop())
                      if (found) setForm((f)=>({ ...f, barcode: found }))
                      else alert('No barcode detected. Try again in better lighting.')
                    } catch (e) {
                      alert('Failed to scan barcode. Please type it manually.')
                    }
                  }}>Scan via Camera</Button>
                </div>
              </div>
              <div>
                <Label htmlFor='img'>Image URL</Label>
                <Input id='img' value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder='https://images…' />
              </div>
              <div>
                <Label htmlFor='slug'>Slug</Label>
                <Input id='slug' value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant='ghost' onClick={() => { setOpen(false) }}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Save changes' : 'Create product'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <Card>
          <CardHeader><CardTitle>My products ({mine.length})</CardTitle></CardHeader>
          <CardContent>
            <div className='w-full overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b text-left text-xs text-gray-500'>
                    <th className='py-2 pr-4'>Title</th>
                    <th className='py-2 pr-4'>Type</th>
                    <th className='py-2 pr-4'>Price</th>
                    <th className='py-2 pr-4 text-right'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map((p) => (
                    <tr key={p.id} className='border-b'>
                      <td className='py-2 pr-4'>
                        <div className='flex items-center gap-2'>
                          {p.img && <img src={p.img} className='h-8 w-8 rounded object-cover' alt='' />}
                          <div className='font-medium'>{p.title}</div>
                        </div>
                      </td>
                      <td className='py-2 pr-4'>{p.type}</td>
                      <td className='py-2 pr-4'>A${p.price}</td>
                      <td className='py-2 pr-0 text-right'>
                        <Button variant='outline' size='sm' className='mr-2' onClick={() => { setEditing(p); setForm({ title: p.title, price: p.price, type: p.type, seller: p.seller, img: p.img, slug: p.slug, barcode: (p as any).barcode || '' }); setOpen(true) }}>Edit</Button>
                        <Button variant='destructive' size='sm' onClick={() => handleDelete(p.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                  {mine.length === 0 && (
                    <tr><td colSpan={4} className='py-6 text-center text-gray-500'>You have no products yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>My orders ({orders.length})</CardTitle></CardHeader>
          <CardContent>
            <div className='w-full overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b text-left text-xs text-gray-500'>
                    <th className='py-2 pr-4'>Order ID</th>
                    <th className='py-2 pr-4'>Date</th>
                    <th className='py-2 pr-4'>Items</th>
                    <th className='py-2 pr-4'>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className='border-b'>
                      <td className='py-2 pr-4 font-mono text-xs'>{o.id}</td>
                      <td className='py-2 pr-4'>{new Date(o.createdAt).toLocaleString()}</td>
                      <td className='py-2 pr-4'>{o.items.length}</td>
                      <td className='py-2 pr-4'>A${o.total}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={4} className='py-6 text-center text-gray-500'>No orders yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className='mt-4 text-sm text-gray-600'>Total Revenue: <span className='font-semibold'>A${totalRevenue}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/')({
  component: SellerDashboard,
})
