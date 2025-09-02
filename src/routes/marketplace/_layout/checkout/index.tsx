import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
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
      // Prefill guest checkout details from localStorage
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
  }, [ns])

  // Persist guest details for future checkouts
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
        .filter((x) => x.product),
    [cart, productsById]
  )

  const total = detailed.reduce((a, c) => a + c.product.price * c.quantity, 0)

  async function handlePlaceOrder() {
    if (placing) return
    setPlacing(true)
    try {
      const items = detailed.map((d) => ({
        productId: d.product.id,
        title: d.product.title,
        price: d.product.price,
        quantity: d.quantity,
        // Pass service preferred time to backend so it can become appointmentAt
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
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="text-2xl font-bold">Order placed!</h1>
        <p className="mt-2 text-sm text-gray-600">Your order ID is {orderId}. A confirmation was sent to {email || 'your email'}.</p>
        {isGuest && accessCode ? (
          <div className="mt-4 rounded-xl border p-3 text-left">
            <div className="text-sm font-medium">Track your order</div>
            <div className="text-xs text-gray-600">Save this link to view your order status any time without logging in.</div>
            <Link
              to="/marketplace/order/track"
              search={{ code: accessCode }}
              className="mt-2 block truncate rounded-md bg-black px-3 py-2 text-white"
            >
              /marketplace/order/track?code={accessCode}
            </Link>
          </div>
        ) : null}
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/marketplace/listings" className="rounded-xl border px-4 py-2 text-sm">Continue shopping</Link>
          {user ? <Button onClick={() => router.navigate({ to: '/marketplace/dashboard' })}>Go to dashboard</Button> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Checkout</h1>
      {!user && (
        <div className="mb-4 rounded-2xl border p-4 text-sm text-gray-700">
          <div className="font-semibold">Checkout as guest or sign in</div>
          <div className="mt-1">You don’t need an account to place this order. If you sign in, you’ll see your order under your account.</div>
          <div className="mt-2 flex gap-2">
            <Link to="/sign-in" search={{ redirect: '/marketplace/checkout' }} className="rounded-md border px-3 py-1.5">Sign in</Link>
            <span className="rounded-md bg-gray-100 px-3 py-1.5">Guest checkout</span>
          </div>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <div className="rounded-2xl border p-4">
            <h2 className="mb-3 font-semibold">Contact</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+61…" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="mb-2 text-lg font-semibold">Summary</div>
          <div className="space-y-2 text-sm">
            {detailed.map((d, i) => (
              <div key={i} className="grid grid-cols-1 items-start gap-1 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                    <span>{d.product.title} × {d.quantity}</span>
                    <span className="sm:hidden">A${d.product.price * d.quantity}</span>
                  </div>
                  {d.product.type === 'service' && d.meta && (
                    <div className="text-xs text-gray-500">Preferred: {new Date(d.meta).toLocaleString?.() || d.meta}</div>
                  )}
                </div>
                <div className="hidden sm:block text-right">A${d.product.price * d.quantity}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-sm"><span>Shipping</span><span>Free</span></div>
          <div className="mt-2 flex justify-between font-semibold"><span>Total</span><span>A${total}</span></div>
          <Button disabled={placing || detailed.length === 0} onClick={handlePlaceOrder} className="mt-3 w-full">Place order</Button>
          <Link to="/marketplace/cart" className="mt-2 block text-center text-sm text-gray-600">Back to cart</Link>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/checkout/')({
  component: CheckoutPage,
})
