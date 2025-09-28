import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, CreditCard, CheckCircle2 } from 'lucide-react'
import { db, type CartItem, type Product } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

function CheckoutPage() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [productsById, setProductsById] = useState<Record<string, Product>>({})
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [placing, setPlacing] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [accessCode, setAccessCode] = useState<string | null>(null)
  const isGuest = !user

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!user) {
          const raw = localStorage.getItem('guest_checkout')
          if (raw) {
            const saved = JSON.parse(raw)
            if (saved?.name) setName(saved.name)
            if (saved?.email) setEmail(saved.email)
            if (saved?.address) setAddress(saved.address)
            if (saved?.phone) setPhone(saved.phone)
          }
        }
      } catch {}
      const items = await db.getCart(ns)
      const prods = await db.listProducts()
      if (!mounted) return
      setCart(items)
      setProductsById(Object.fromEntries(prods.map((p) => [p.id, p])))
    })()
    return () => {
      mounted = false
    }
  }, [ns, user])

  useEffect(() => {
    try {
      if (!user) {
        localStorage.setItem('guest_checkout', JSON.stringify({ name, email, address, phone }))
      }
    } catch {}
  }, [user, name, email, address, phone])

  const detailed = useMemo(
    () =>
      cart
        .map((c) => ({ quantity: c.quantity, product: productsById[c.productId], meta: c.meta }))
        .filter((entry) => entry.product),
    [cart, productsById]
  )

  const total = detailed.reduce((acc, entry) => acc + entry.product.price * entry.quantity, 0)

  async function handlePlaceOrder() {
    if (placing) return
    setPlacing(true)
    try {
      const items = detailed.map((d) => ({
        productId: d.product.id,
        title: d.product.title,
        price: d.product.price,
        quantity: d.quantity,
        meta: d.product.type === 'service' ? d.meta : undefined,
      }))
      const order: any = await db.createOrder({ items, total, customerName: name, customerEmail: email, address, customerPhone: phone }, ns)
      await db.clearCart(ns)
      window.dispatchEvent(new CustomEvent('cart:changed'))
      setOrderId(order.id)
      if (isGuest && order?.accessCode) setAccessCode(order.accessCode)
    } finally {
      setPlacing(false)
    }
  }

  if (orderId) {
    return (
      <div className='mx-auto max-w-3xl space-y-6 px-4 py-12 text-center'>
        <div className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
          Checkout complete
        </div>
        <CheckCircle2 className='mx-auto h-16 w-16 text-emerald-500' />
        <h1 className='text-2xl font-semibold text-slate-900'>Order confirmed</h1>
        <p className='text-sm text-slate-600'>Your order ID is <span className='font-semibold text-emerald-700'>#{orderId}</span>. A confirmation was sent to {email || 'your email'}.</p>
        {isGuest && accessCode ? (
          <div className='mx-auto max-w-md rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-left text-sm text-emerald-800'>
            <div className='text-sm font-semibold mb-2'>Guest tracking link</div>
            <p className='text-xs text-emerald-700'>Save this code to follow your order without creating an account.</p>
            <Link
              to='/marketplace/order/track'
              search={{ code: accessCode }}
              className='mt-3 block truncate rounded-full bg-white px-4 py-2 text-center text-xs font-semibold text-emerald-700 shadow-sm'
            >
              /marketplace/order/track?code={accessCode}
            </Link>
          </div>
        ) : null}
        <div className='flex justify-center gap-3 text-sm'>
          <Link to='/marketplace/listings' className='rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'>Continue shopping</Link>
          {user ? (
            <Button onClick={() => router.navigate({ to: '/marketplace/dashboard' })} className='rounded-full px-4 py-2'>Go to dashboard</Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-6xl space-y-8 px-4 py-10'>
      <header className='rounded-3xl border border-emerald-100/60 bg-emerald-50/60 p-6 shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <span className='inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
              Step 2 • Secure checkout
            </span>
            <h1 className='mt-3 text-2xl font-semibold text-slate-900'>Confirm delivery & contact details</h1>
            <p className='mt-2 max-w-2xl text-sm text-slate-600'>Protect your order with verified contact details. Hedgetech uses this information to issue invoices, delivery updates, and support.</p>
          </div>
          <div className='flex items-center gap-3 rounded-2xl border border-white bg-white/80 px-4 py-3 text-xs text-slate-600 shadow-sm'>
            <ShieldCheck className='h-4 w-4 text-emerald-600' />
            <div>
              <div className='font-semibold text-slate-800'>Buyer protection active</div>
              <div>Escrow + instant refunds if seller cancels</div>
            </div>
          </div>
        </div>
      </header>

      {!user && (
        <div className='rounded-3xl border border-dashed border-emerald-200 bg-white p-6 text-sm text-slate-600'>
          <div className='font-semibold text-slate-900'>Checking out as a guest</div>
          <p className='mt-1 text-xs text-slate-500'>You can complete payment without an account. Create an account later to manage saved addresses and payment methods.</p>
          <div className='mt-3 flex gap-2 text-xs'>
            <Link to='/sign-in' search={{ redirect: '/marketplace/checkout' }} className='rounded-full border border-emerald-200 px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-50'>Sign in</Link>
            <span className='inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-slate-500'>Guest mode</span>
          </div>
        </div>
      )}

      <div className='grid gap-6 lg:grid-cols-[1.4fr_1fr]'>
        <section className='space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div>
            <h2 className='text-lg font-semibold text-slate-900'>Contact details</h2>
            <div className='mt-4 grid gap-4 md:grid-cols-2'>
              <div>
                <Label htmlFor='name'>Full name</Label>
                <Input id='name' value={name} onChange={(e) => setName(e.target.value)} placeholder='Jordan Williams' className='rounded-full border-slate-200 px-4 py-3 text-sm' />
              </div>
              <div>
                <Label htmlFor='email'>Email</Label>
                <Input id='email' type='email' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='jordan@company.com' className='rounded-full border-slate-200 px-4 py-3 text-sm' />
              </div>
              <div>
                <Label htmlFor='phone'>Phone</Label>
                <Input id='phone' value={phone} onChange={(e) => setPhone(e.target.value)} placeholder='+61…' className='rounded-full border-slate-200 px-4 py-3 text-sm' />
              </div>
              <div className='md:col-span-2'>
                <Label htmlFor='address'>Delivery address</Label>
                <Input id='address' value={address} onChange={(e) => setAddress(e.target.value)} placeholder='123 Market Street, Sydney NSW' className='rounded-full border-slate-200 px-4 py-3 text-sm' />
              </div>
            </div>
          </div>

          <div>
            <h2 className='text-lg font-semibold text-slate-900'>Payment method</h2>
            <div className='mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-3'>
              <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800'>
                <CreditCard className='mb-2 h-5 w-5' />
                Pay securely on Hedgetech (cards, bank transfer, BNPL).
              </div>
              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                Automatically issue invoices and receipts.
              </div>
              <div className='rounded-2xl border border-slate-200 bg-white p-4'>
                Connect saved payment methods from your dashboard.
              </div>
            </div>
          </div>
        </section>

        <aside className='space-y-4'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='text-lg font-semibold text-slate-900'>Order summary</div>
            <div className='mt-3 space-y-3 text-sm text-slate-600'>
              {detailed.map((entry, idx) => (
                <div key={idx} className='rounded-2xl border border-slate-200 px-4 py-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-semibold text-slate-800'>{entry.product.title}</span>
                    <span className='text-emerald-700'>A${(entry.product.price * entry.quantity).toFixed(2)}</span>
                  </div>
                  <div className='text-xs text-slate-500'>Qty {entry.quantity}{entry.meta && entry.product.type === 'service' ? ` • Scheduled ${entry.meta}` : ''}</div>
                </div>
              ))}
            </div>
            <div className='mt-4 flex justify-between text-sm text-slate-600'>
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className='mt-2 flex justify-between text-sm text-slate-600'>
              <span>Platform fee</span>
              <span>Included</span>
            </div>
            <div className='mt-4 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700'>
              <span>Total due</span>
              <span>A${total.toFixed(2)}</span>
            </div>
            <Button disabled={placing || detailed.length === 0} onClick={handlePlaceOrder} className='mt-5 w-full rounded-full py-3'>
              {placing ? 'Placing order…' : 'Place order'}
            </Button>
            <Link to='/marketplace/cart' className='mt-3 block text-center text-xs font-semibold text-emerald-700 hover:underline'>Back to cart</Link>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-600'>
            <div className='flex items-center gap-3'>
              <ShieldCheck className='h-4 w-4 text-emerald-600' />
              Hedgetech keeps your payment in escrow until the order is fulfilled.
            </div>
            <div className='mt-2 flex items-center gap-3'>
              <CheckCircle2 className='h-4 w-4 text-emerald-600' />
              Get instant status updates via email and dashboard notifications.
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/checkout/')({
  component: CheckoutPage,
})
