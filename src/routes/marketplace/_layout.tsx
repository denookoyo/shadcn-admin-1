import { Outlet, createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { db, type Category } from '@/lib/data'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { ProfileDropdown } from '@/components/profile-dropdown'

function Nav() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || (user as any)?.accountNo || 'guest'
  const [count, setCount] = useState(0)
  // const [toShip, setToShip] = useState(0)
  const [q, setQ] = useState('')
  const [cats, setCats] = useState<Category[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    const refresh = async () => {
      try {
        const items = await db.getCart(ns)
        if (mounted) setCount(items.reduce((a, c) => a + c.quantity, 0))
      } catch {
        if (mounted) setCount(0)
      }
    }
    refresh()
    const onChange = () => refresh()
    window.addEventListener('cart:changed', onChange)
    return () => {
      mounted = false
      window.removeEventListener('cart:changed', onChange)
    }
  }, [ns])

  // Seller order badges can be re-added if needed

  // Load categories to power Popular links
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const c = await db.listCategories?.()
        if (mounted && c) setCats(c)
      } catch {
        if (mounted) setCats([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const tabs = [
    { href: '/marketplace', label: 'Home' },
    { href: '/marketplace/listings', label: 'Listings' },
    { href: '/marketplace/cart', label: 'Cart' },
    { href: '/marketplace/checkout', label: 'Checkout' },
    { href: '/marketplace/my-orders', label: 'My Orders' },
    { href: '/marketplace/dashboard/orders', label: 'My Shop Orders' },
  ]
  function onSearch(e: FormEvent) {
    e.preventDefault()
    const term = q.trim()
    navigate({ to: '/marketplace/listings', search: term ? { q: term } : {} })
  }

  const popular = cats.slice(0, 6).map((c) => ({ label: c.name, q: c.name }))

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Left: Logo */}
          <Link to="/marketplace" className="flex shrink-0 items-center gap-2">
            <div className="h-8 w-8 rounded-2xl bg-black" />
            <span className="text-lg font-bold">MarketX</span>
          </Link>

          {/* Center: Search */}
          <form onSubmit={onSearch} className="mx-2 hidden flex-1 items-center gap-2 rounded-xl border bg-white px-2 py-1 md:flex">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full px-2 py-2 outline-none"
              placeholder="Search products & services"
            />
            <button type="submit" className="rounded-lg bg-black px-3 py-2 text-sm text-white">Search</button>
          </form>

          {/* Right: Actions */}
          <div className="ml-auto flex items-center gap-2">
            <Link to="/marketplace/cart" className="relative rounded-xl bg-black px-3 py-1.5 text-sm text-white">
              Cart
              <span className="ml-2 inline-flex min-w-5 justify-center rounded-full bg-white px-1 text-xs font-semibold text-black">
                {count}
              </span>
            </Link>
            {user ? (
              <ProfileDropdown />
            ) : (
              <Link to="/sign-in" className="rounded-xl border px-3 py-1.5 text-sm">Sign in</Link>
            )}
          </div>
        </div>

        {/* Popular links (below search) */}
        <div className="mt-2 hidden items-center gap-2 text-xs text-gray-600 md:flex">
          {popular.length > 0 ? <span className="hidden md:inline">Popular:</span> : null}
          {popular.map((p) => (
            <Link
              key={p.q}
              to="/marketplace/listings"
              search={{ q: p.q }}
              className="rounded-full border bg-white/70 px-3 py-1"
            >
              {p.label}
            </Link>
          ))}
          <nav className="ml-auto hidden gap-2 md:flex">
            {tabs.map((t) => (
              <Link key={t.href} to={t.href} className="rounded-xl px-3 py-1.5 text-sm hover:bg-gray-100">
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-gray-500">
        © {new Date().getFullYear()} MarketX • Demo images via Unsplash Source
      </div>
    </footer>
  )
}

function MarketplaceLayout() {
  const hideChrome = useUiStore((s) => s.hideMarketplaceChrome)
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {!hideChrome && <Nav />}
      <Outlet />
      {!hideChrome && <Footer />}
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout')({
  component: MarketplaceLayout,
})
