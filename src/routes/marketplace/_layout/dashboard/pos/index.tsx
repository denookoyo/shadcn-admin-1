import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { db, type Product } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useUiStore } from '@/stores/uiStore'

type CartLine = { id: string; title: string; price: number; quantity: number; productId: string; type?: Product['type'] }

function PosPage() {
  const { user } = useAuthStore((s) => s.auth)
  const hideChrome = useUiStore((s) => s.hideMarketplaceChrome)
  const setHideChrome = useUiStore((s) => s.setHideMarketplaceChrome)
  const [products, setProducts] = useState<Product[]>([])
  const [q, setQ] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [barcodeInput, setBarcodeInput] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'card'>('cash')
  const [submitting, setSubmitting] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [editingLine, setEditingLine] = useState<CartLine | null>(null)
  const [lineQuantity, setLineQuantity] = useState('1')
  const [linePrice, setLinePrice] = useState('0')

  useEffect(() => { (async () => setProducts(await db.listProducts()))() }, [])
  // No-op: POS can request/exit fullscreen via buttons; we don't need to track state.
  useEffect(() => {
    return () => { setHideChrome(false); if (document.fullscreenElement) document.exitFullscreen?.().catch(()=>{}) }
  }, [setHideChrome])

  useEffect(() => {
    if (editingLine) {
      setLineQuantity(String(editingLine.quantity))
      setLinePrice(editingLine.price.toString())
    } else {
      setLineQuantity('1')
      setLinePrice('0')
    }
  }, [editingLine])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    // Only products belonging to the logged-in user
    const myNumeric = (user as any)?.id ?? (user as any)?.uid
    const own = products.filter((p: any) => {
      if (typeof p?.ownerId === 'number') return myNumeric != null && Number(p.ownerId) === Number(myNumeric)
      if (typeof p?.ownerId === 'string') return p.ownerId === (user?.email || (user as any)?.accountNo)
      return false
    })
    if (!term) return own
    return own.filter((p) => (p.title?.toLowerCase().includes(term) || p.slug?.toLowerCase().includes(term) || p.seller?.toLowerCase?.().includes(term)))
  }, [q, products, user])

  const subtotal = cart.reduce((a, c) => a + c.price * c.quantity, 0)
  const taxes = 0 // extend later (GST)
  const total = subtotal + taxes

  function addToCart(p: Product) {
    setCart((cur) => {
      const idx = cur.findIndex((c) => c.productId === p.id)
      if (idx === -1) return [{ id: `ci_${Date.now()}`, productId: p.id, title: p.title, price: p.price, quantity: 1, type: p.type }, ...cur]
      const next = [...cur]
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 }
      return next
    })
  }

  function inc(id: string, delta: number) {
    setCart((cur) => cur.map((c) => (c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c)))
  }
  function removeLine(id: string) { setCart((cur) => cur.filter((c) => c.id !== id)) }
  function clearCart() { setCart([]) }

  function updateLineFromDialog() {
    if (!editingLine) return
    const parsedQty = Number(lineQuantity)
    const nextQuantity = Number.isFinite(parsedQty) && parsedQty > 0 ? Math.round(parsedQty) || 1 : editingLine.quantity
    const parsedPrice = Number(linePrice)
    const nextPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? Number(parsedPrice.toFixed(2)) : editingLine.price

    setCart((cur) =>
      cur.map((line) => (line.id === editingLine.id ? { ...line, quantity: nextQuantity, price: nextPrice } : line))
    )
    setEditingLine(null)
  }

  async function addByBarcode(code: string) {
    const trimmed = code.trim()
    if (!trimmed) return
    let p = products.find((x: any) => String(x.barcode || '').trim() === trimmed)
    if (!p && (db as any).getProductByBarcode) {
      try { p = (await (db as any).getProductByBarcode(trimmed)) || undefined } catch {}
    }
    if (p) addToCart(p)
  }

  async function cameraScan() {
    // @ts-ignore
    const BD = (window as any).BarcodeDetector
    if (!BD) { alert('Camera barcode scanning not supported on this browser. Use a USB/BT scanner or type code.'); return }
    try {
      // @ts-ignore
      const detector = new BD({ formats: ['ean_13','ean_8','code_128','code_39','upc_a','qr_code'] })
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      let found = ''
      for (let i=0;i<120 && !found;i++) {
        // @ts-ignore
        const codes = await detector.detect(video)
        if (codes && codes.length) found = codes[0].rawValue
        await new Promise(r=>setTimeout(r, 100))
      }
      stream.getTracks().forEach((t)=>t.stop())
      if (found) { setBarcodeInput(found); addByBarcode(found) } else { alert('No barcode detected. Try again in good lighting.') }
    } catch (e) {
      alert('Failed to access camera or detect barcode.')
    }
  }

  async function enterKiosk() {
    setHideChrome(true)
    try { await document.documentElement.requestFullscreen?.() } catch {}
  }
  async function exitKiosk() {
    setHideChrome(false)
    try { if (document.fullscreenElement) await document.exitFullscreen?.() } catch {}
  }

  async function checkout() {
    if (cart.length === 0) return
    setSubmitting(true)
    try {
      const payload = {
        items: cart.map((c) => ({ productId: c.productId, title: c.title, price: c.price, quantity: c.quantity })),
        customerName: customerName || 'Walk-in',
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
      }
      const order = await db.createPosOrder?.(payload)
      if (order?.id) setReceiptId(order.id)
      clearCart()
      setCustomerName(''); setCustomerEmail(''); setCustomerPhone('')
    } catch (e) {
      // no-op
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={hideChrome ? 'px-4 py-4' : 'mx-auto max-w-7xl px-4 py-6'}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Point of Sale</h1>
        <div className='flex items-center gap-2'>
          {!hideChrome ? (
            <Button variant='outline' onClick={enterKiosk} title='Hide navigation and enter fullscreen'>Enter Kiosk</Button>
          ) : (
            <Button variant='outline' onClick={exitKiosk} title='Show navigation and exit fullscreen'>Exit Kiosk</Button>
          )}
          <Link to='/marketplace/dashboard' className='rounded-md border px-3 py-2 text-sm'>Back to Dashboard</Link>
        </div>
      </div>
      <div className='grid gap-4 md:grid-cols-3'>
        {/* Products */}
        <Card className='md:col-span-2'>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='mb-3 grid gap-2 md:grid-cols-2'>
              <Input placeholder='Search products…' value={q} onChange={(e) => setQ(e.target.value)} />
              <div className='flex gap-2'>
                <Input placeholder='Scan or enter barcode…' value={barcodeInput} onChange={(e)=>setBarcodeInput(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter'){ addByBarcode(barcodeInput); setBarcodeInput('') } }} />
                <Button type='button' variant='outline' onClick={cameraScan}>Camera Scan</Button>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
              {filtered.map((p) => (
                <button key={p.id} onClick={() => addToCart(p)} className='rounded-xl border p-3 text-left transition hover:shadow'>
                  {p.img ? <img src={p.img} alt='' className='mb-2 h-24 w-full rounded object-cover' /> : <div className='mb-2 h-24 w-full rounded bg-gray-100' />}
                  <div className='text-sm font-medium'>{p.title}</div>
                  <div className='text-xs text-gray-500'>{p.type}</div>
                  <div className='mt-1 font-semibold'>A${p.price}</div>
                </button>
              ))}
              {filtered.length === 0 && <div className='col-span-full py-10 text-center text-sm text-gray-500'>No products found.</div>}
            </div>
          </CardContent>
        </Card>

        {/* Cart & Checkout */}
        <Card>
          <CardHeader>
            <CardTitle>Cart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {cart.length === 0 && <div className='text-sm text-gray-500'>No items added yet.</div>}
              {cart.map((c) => (
                <div
                  key={c.id}
                  role='button'
                  tabIndex={0}
                  onClick={() => setEditingLine(c)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setEditingLine(c)
                    }
                  }}
                  className='flex items-center justify-between rounded-lg border p-2 cursor-pointer select-none transition hover:border-emerald-200 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:ring-offset-2 focus:ring-offset-white'
                >
                  <div>
                    <div className='text-sm font-medium'>{c.title}</div>
                    <div className='text-xs text-gray-500'>A${c.price} • {c.type}</div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      className='rounded-md border px-2 py-1'
                      onClick={(event) => {
                        event.stopPropagation()
                        inc(c.id, -1)
                      }}
                    >
                      -
                    </button>
                    <div className='w-6 text-center text-sm'>{c.quantity}</div>
                    <button
                      type='button'
                      className='rounded-md border px-2 py-1'
                      onClick={(event) => {
                        event.stopPropagation()
                        inc(c.id, +1)
                      }}
                    >
                      +
                    </button>
                    <div className='w-16 text-right text-sm font-semibold'>A${c.price * c.quantity}</div>
                    <button
                      type='button'
                      className='rounded-md border px-2 py-1 text-xs'
                      onClick={(event) => {
                        event.stopPropagation()
                        removeLine(c.id)
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className='my-3 flex items-center justify-between'>
              <Button variant='outline' size='sm' onClick={clearCart}>Clear</Button>
              <div className='text-sm text-gray-600'>Items: {cart.reduce((a,c)=>a+c.quantity,0)}</div>
            </div>
            <Separator className='my-3' />
            <div className='grid gap-2'>
              <Input placeholder='Customer name (optional)' value={customerName} onChange={(e)=>setCustomerName(e.target.value)} />
              <Input placeholder='Customer phone (optional)' value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)} />
              <Input type='email' placeholder='Customer email (optional)' value={customerEmail} onChange={(e)=>setCustomerEmail(e.target.value)} />
            </div>
            <div className='my-3 grid grid-cols-2 gap-2'>
              <button onClick={()=>setPayMethod('cash')} className={`rounded-lg border px-3 py-2 text-sm ${payMethod==='cash'?'bg-black text-white':'bg-white'}`}>Cash</button>
              <button onClick={()=>setPayMethod('card')} className={`rounded-lg border px-3 py-2 text-sm ${payMethod==='card'?'bg-black text-white':'bg-white'}`}>Card</button>
            </div>
            <div className='space-y-1 text-sm'>
              <div className='flex justify-between'><span>Subtotal</span><span>A${subtotal}</span></div>
              <div className='flex justify-between text-gray-500'><span>Tax</span><span>A${taxes}</span></div>
              <div className='flex justify-between font-semibold'><span>Total</span><span>A${total}</span></div>
            </div>
            <Button className='mt-3 w-full' disabled={cart.length===0 || submitting} onClick={checkout}>
              {submitting ? 'Processing…' : payMethod==='cash' ? 'Complete Sale (Cash)' : 'Complete Sale (Card)'}
            </Button>
            {receiptId && (
              <div className='mt-3 rounded-md border bg-green-50 p-3 text-sm text-green-900'>
                Sale recorded. Receipt #{receiptId.slice(0,6)} created.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(editingLine)} onOpenChange={(open) => { if (!open) setEditingLine(null) }}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Edit receipt line</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4'>
            {editingLine ? (
              <div>
                <div className='text-sm font-semibold text-slate-900'>{editingLine.title}</div>
                <div className='text-xs text-gray-500'>SKU: {editingLine.productId}</div>
              </div>
            ) : null}
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='grid gap-1'>
                <Label htmlFor='pos-line-quantity' className='text-xs font-medium text-gray-600'>Quantity</Label>
                <Input
                  id='pos-line-quantity'
                  type='number'
                  min={1}
                  value={lineQuantity}
                  onChange={(event) => setLineQuantity(event.target.value)}
                />
              </div>
              <div className='grid gap-1'>
                <Label htmlFor='pos-line-price' className='text-xs font-medium text-gray-600'>Unit price (A$)</Label>
                <Input
                  id='pos-line-price'
                  type='number'
                  min={0}
                  step='0.01'
                  value={linePrice}
                  onChange={(event) => setLinePrice(event.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            {editingLine ? (
              <Button
                type='button'
                variant='destructive'
                onClick={() => {
                  removeLine(editingLine.id)
                  setEditingLine(null)
                }}
              >
                Remove line
              </Button>
            ) : null}
            <Button type='button' variant='ghost' onClick={() => setEditingLine(null)}>Cancel</Button>
            <Button type='button' onClick={updateLineFromDialog}>Update line</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/pos/')({
  component: PosPage,
})
