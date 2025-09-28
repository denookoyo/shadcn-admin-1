import { Outlet, createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { db, type Category } from '@/lib/data'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { HedgetechLogo } from '@/components/hedgetech-logo'

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

  const primaryLinks = [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/marketplace/listings', label: 'Listings' },
    { href: '/marketplace/my-orders', label: 'Track order' },
    { href: '/marketplace/cart', label: 'Cart' },
  ] as const
  const sellerLinks = [
    { href: '/marketplace/dashboard', label: 'Seller cockpit' },
    { href: '/marketplace/dashboard/orders', label: 'Orders' },
    { href: '/marketplace/dashboard/pos', label: 'POS' },
  ] as const
  const supportLinks = [
    { href: '/marketplace/checkout', label: 'Checkout' },
    { href: '/marketplace/order/track', label: 'Guest tracking' },
  ] as const
  function onSearch(e: FormEvent) {
    e.preventDefault()
    const term = q.trim()
    navigate({ to: '/marketplace/listings', search: term ? { q: term } : {} })
  }

  const popular = cats.slice(0, 6).map((c) => ({ label: c.name, q: c.name }))

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/marketplace" className="flex shrink-0 items-center">
            <HedgetechLogo withWordmark labelClassName="hidden text-base font-semibold text-slate-800 sm:block" />
            <span className="ml-2 text-sm font-medium text-emerald-700 sm:hidden">Hedgetech</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-600 lg:flex">
            {primaryLinks.map((item) => (
              <Link key={item.href} to={item.href} className="rounded-full px-3 py-1.5 transition hover:bg-emerald-50 hover:text-emerald-700">
                {item.label}
              </Link>
            ))}
            {supportLinks.map((item) => (
              <Link key={item.href} to={item.href} className="rounded-full px-3 py-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/marketplace/cart"
              className="group relative flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500"
            >
              Cart
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white/90">
                {count}
              </span>
            </Link>
            <Link
              to="/marketplace/dashboard"
              className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 lg:flex"
            >
              <span>Seller cockpit</span>
            </Link>
            {user ? (
              <ProfileDropdown />
            ) : (
              <Link
                to="/sign-in"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <form
            onSubmit={onSearch}
            className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-full px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Search products, services, or merchants"
            />
            <button
              type="submit"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Search
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {popular.length > 0 ? <span className="hidden text-slate-500 sm:inline">Popular now:</span> : null}
            {popular.map((p) => (
              <Link
                key={p.q}
                to="/marketplace/listings"
                search={{ q: p.q }}
                className="rounded-full border border-transparent bg-emerald-50 px-3 py-1 font-medium text-emerald-700 transition hover:border-emerald-100 hover:bg-emerald-100"
              >
                {p.label}
              </Link>
            ))}
            <div className="hidden items-center gap-2 lg:flex">
              {sellerLinks.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="rounded-full border border-transparent px-3 py-1 font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs text-slate-500 lg:hidden">
          {[...primaryLinks, ...sellerLinks, ...supportLinks].map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 shadow-sm"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  const year = new Date().getFullYear()
  const columns = [
    {
      title: 'Buy with confidence',
      items: [
        { label: 'Browse listings', href: '/marketplace/listings' },
        { label: 'Track an order', href: '/marketplace/my-orders' },
        { label: 'Support desk', href: '/marketplace/order/track' },
      ],
    },
    {
      title: 'Sell on Hedgetech',
      items: [
        { label: 'Seller cockpit', href: '/marketplace/dashboard' },
        { label: 'Manage orders', href: '/marketplace/dashboard/orders' },
        { label: 'Point of sale', href: '/marketplace/dashboard/pos' },
      ],
    },
    {
      title: 'Company',
      items: [
        { label: 'Docs', href: '#' },
        { label: 'Status', href: '#' },
        { label: 'Privacy', href: '#' },
      ],
    },
  ] as const

  return (
    <footer className="mt-20 bg-[#0f1f2b] text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <HedgetechLogo withWordmark labelClassName="text-lg font-semibold text-white" />
            <p className="max-w-xs text-sm text-slate-300">
              Hedgetech Marketplace is the interactive commerce network where buyers and sellers collaborate, fulfil, and grow on a single platform.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-600/20 px-3 py-1 font-medium text-emerald-200">Buyer protection</span>
              <span className="rounded-full bg-emerald-600/20 px-3 py-1 font-medium text-emerald-200">24/7 support</span>
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <div className="text-sm font-semibold uppercase tracking-wide text-emerald-200">{col.title}</div>
              <ul className="mt-3 space-y-3 text-sm text-slate-300">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="transition hover:text-white">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
          <span>© {year} Hedgetech Marketplace. Trade with confidence.</span>
          <div className="flex gap-4">
            <a href="#" className="transition hover:text-white">Privacy</a>
            <a href="#" className="transition hover:text-white">Terms</a>
            <a href="#" className="transition hover:text-white">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

function MarketplaceLayout() {
  const hideChrome = useUiStore((s) => s.hideMarketplaceChrome)
  return (
    <div className="min-h-screen bg-background text-foreground">
      {!hideChrome && <Nav />}
      <Outlet />
      {!hideChrome && <Footer />}
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout')({
  component: MarketplaceLayout,
})
