import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { imageFor } from '@/features/marketplace/helpers'
import { db, type CartItem, type Product } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { SafeImg } from '@/components/safe-img'

function CartPage() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const [cart, setCart] = useState<CartItem[]>([])
  const [productsById, setProductsById] = useState<Record<string, Product>>({})

  useEffect(() => {
    let mounted = true
    ;(async () => {
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

  const detailed = useMemo(
    () =>
      cart
        .map((c) => ({
          cartId: c.id,
          quantity: c.quantity,
          meta: c.meta,
          product: productsById[c.productId],
        }))
        .filter((x) => x.product),
    [cart, productsById]
  )

  const subtotal = detailed.reduce((a, c) => a + c.product.price * c.quantity, 0)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Your cart</h1>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-3 md:col-span-2">
          {detailed.length === 0 && (
            <div className="rounded-2xl border p-4 text-sm text-gray-500">Your cart is empty.</div>
          )}
          {detailed.map((row, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border p-3">
              <SafeImg src={row.product.img || imageFor(row.product.title, 200, 200)} alt={row.product.title} className="h-20 w-20 rounded-xl object-cover" loading="lazy" />
              <div className="flex-1">
                <div className="text-sm font-medium">{row.product.title}</div>
                <div className="text-xs text-gray-500">Qty: {row.quantity}{row.meta ? ` • ${row.meta}` : ''}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">A${row.product.price * row.quantity}</div>
                <button
                  className="text-xs text-red-600"
                  onClick={async () => {
                    await db.removeFromCart(row.cartId, ns)
                    setCart((c) => c.filter((it) => it.id !== row.cartId))
                    window.dispatchEvent(new CustomEvent('cart:changed'))
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border p-4">
          <div className="mb-2 text-lg font-semibold">Summary</div>
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>A${subtotal}</span></div>
          <div className="flex justify-between text-sm"><span>Shipping</span><span>Free</span></div>
          <div className="mt-2 flex justify-between font-semibold"><span>Total</span><span>A${subtotal}</span></div>
          <Link to="/marketplace/checkout" className="mt-3 block w-full rounded-xl bg-black px-4 py-3 text-center text-white">Checkout</Link>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/cart/')({
  component: CartPage,
})

