import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Sparkles, ShieldCheck, Store, ShoppingBag, BarChart3, MessagesSquare, type LucideIcon } from 'lucide-react'
import { imageFor } from '@/features/marketplace/helpers'
import { SafeImg } from '@/components/safe-img'
import { db, type Category, type Product } from '@/lib/data'

type QuickAction = {
  icon: LucideIcon
  title: string
  body: string
  href: string
  tone: 'emerald' | 'slate'
}

type StatProps = {
  label: string
  value: string
  hint?: string
}

function Stat({ label, value, hint }: StatProps) {
  return (
    <div className='rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-sm backdrop-blur'>
      <div className='text-xs font-medium uppercase tracking-wide text-emerald-100/80'>{label}</div>
      <div className='mt-1 text-2xl font-semibold text-white'>{value}</div>
      {hint ? <div className='text-xs text-emerald-50/80'>{hint}</div> : null}
    </div>
  )
}

function QuickActionCard({ icon: Icon, title, body, href, tone }: QuickAction) {
  const toneClasses =
    tone === 'emerald'
      ? 'border-emerald-100/40 bg-emerald-50 text-emerald-900 hover:border-emerald-200 hover:bg-emerald-100'
      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-100'

  return (
    <Link
      to={href as any}
      className={`group flex flex-col justify-between gap-3 rounded-2xl border px-4 py-5 transition ${toneClasses}`}
    >
      <div className='flex items-center gap-3'>
        <span className='rounded-xl bg-white/70 p-2 text-emerald-600 shadow-sm transition group-hover:scale-105 group-hover:bg-white'>
          <Icon className='h-4 w-4' />
        </span>
        <h3 className='text-sm font-semibold'>{title}</h3>
      </div>
      <p className='text-xs text-slate-600'>{body}</p>
      <span className='text-xs font-medium text-emerald-700 group-hover:underline'>Explore</span>
    </Link>
  )
}

function CategoryCard({ name }: { name: string }) {
  return (
    <Link
      to='/marketplace/listings'
      search={{ q: name }}
      className='group relative overflow-hidden rounded-2xl border border-emerald-100/40 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg'
    >
      <div className='absolute inset-0 bg-gradient-to-br from-emerald-50 via-transparent to-white/80 opacity-0 transition group-hover:opacity-100' />
      <div className='h-28 w-full overflow-hidden'>
        <SafeImg
          src={imageFor(name, 600, 300)}
          alt={name}
          className='h-full w-full object-cover transition duration-500 group-hover:scale-110'
        />
      </div>
      <div className='relative p-4'>
        <div className='flex items-center justify-between text-xs font-semibold text-emerald-700'>
          <span>{name}</span>
          <span>View</span>
        </div>
        <p className='mt-1 text-xs text-slate-500'>Discover curated offers in {name}.</p>
      </div>
    </Link>
  )
}

function SpotlightCard({ product }: { product: Product }) {
  const sellerName = (product as any).ownerName || product.seller
  const ownerRating = Number((product as any).ownerRating ?? product.rating ?? 4.8).toFixed(1)

  return (
    <Link
      to='/marketplace/listing/$slug'
      params={{ slug: product.slug }}
      className='group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-emerald-100/50'
    >
      <div className='relative aspect-[4/3] w-full overflow-hidden'>
        <SafeImg
          src={product.img}
          alt={product.title}
          loading='lazy'
          className='h-full w-full object-cover transition duration-500 group-hover:scale-105'
        />
        <span className='absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-emerald-700'>
          {product.type === 'service' ? 'Service' : 'Goods'}
        </span>
      </div>
      <div className='flex flex-1 flex-col gap-2 p-4'>
        <div className='flex items-start justify-between gap-2'>
          <h3 className='text-sm font-semibold text-slate-900'>{product.title}</h3>
          <span className='rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700'>A${product.price}</span>
        </div>
        <p className='text-xs text-slate-500'>Seller: {sellerName}</p>
        <div className='mt-auto flex items-center justify-between text-xs text-emerald-700'>
          <span>★ {ownerRating}</span>
          <span className='text-slate-400 group-hover:underline'>View details</span>
        </div>
      </div>
    </Link>
  )
}

function MarketplaceHome() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [cats, prods] = await Promise.all([
          db.listCategories?.() ?? Promise.resolve([] as Category[]),
          db.listProducts(),
        ])
        if (!mounted) return
        setCategories(cats)
        setProducts(prods)
      } catch {
        if (!mounted) return
        setCategories([])
        setProducts([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const avgRating = useMemo(() => {
    if (!products.length) return '4.9'
    const total = products.reduce((acc, item) => acc + Number(item.rating ?? 4.8), 0)
    return (total / products.length).toFixed(1)
  }, [products])

  const serviceCount = useMemo(
    () => products.filter((p) => p.type === 'service').length,
    [products]
  )

  const goodsCount = products.length - serviceCount

  const buyerActions: QuickAction[] = [
    {
      icon: ShoppingBag,
      title: 'Shop curated picks',
      body: 'Explore Hedgetech verified goods and services tailored to your goals.',
      href: '/marketplace/listings',
      tone: 'emerald',
    },
    {
      icon: ShieldCheck,
      title: 'Track your orders',
      body: 'View fulfilment status, confirm deliveries, and escalate issues fast.',
      href: '/marketplace/my-orders',
      tone: 'slate',
    },
  ]

  const sellerActions: QuickAction[] = [
    {
      icon: Store,
      title: 'Launch your store',
      body: 'Open a storefront, sync inventory, and receive instant POS orders.',
      href: '/marketplace/dashboard',
      tone: 'slate',
    },
    {
      icon: BarChart3,
      title: 'Monitor performance',
      body: 'See live revenue, pipeline health, and customer sentiment in one place.',
      href: '/marketplace/dashboard/orders',
      tone: 'emerald',
    },
  ]

  const heroStats: StatProps[] = [
    { label: 'Live listings', value: String(products.length || 0), hint: `${goodsCount} goods • ${serviceCount} services` },
    { label: 'Active categories', value: String(categories.length || 12), hint: 'Expanding weekly' },
    { label: 'Average seller rating', value: `${avgRating}/5`, hint: 'Verified reviews' },
    { label: 'Orders fulfilled this week', value: '312', hint: 'Marketplace-wide' },
  ]

  const spotlight = products.slice(0, 6)
  const heroShowcase = products[0]

  return (
    <div className='mx-auto max-w-7xl space-y-16 px-4 pb-16 pt-8'>
      <section className='relative overflow-hidden rounded-3xl border border-emerald-100/40 bg-gradient-to-br from-[#102534] via-[#0f766e] to-[#34d399] px-6 py-10 text-white shadow-lg md:px-12 md:py-16'>
        <div className='absolute -left-24 top-10 hidden h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl md:block' />
        <div className='relative grid gap-12 lg:grid-cols-[1.2fr_1fr]'>
          <div className='space-y-6'>
            <span className='inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-50'>
              Interactive marketplace platform
            </span>
            <h1 className='text-4xl font-semibold leading-tight md:text-5xl'>
              Trade with confidence on <span className='font-extrabold text-emerald-100'>Hedgetech Marketplace</span>
            </h1>
            <p className='max-w-xl text-sm text-emerald-50/90 md:text-base'>
              Connect buyers and sellers across goods and services with built-in fulfilment, messaging, and analytics. A single command centre for modern commerce.
            </p>
            <div className='flex flex-wrap gap-3 text-sm font-semibold'>
              <Link
                to='/marketplace/listings'
                className='rounded-full bg-white px-5 py-2 text-emerald-700 shadow-sm transition hover:bg-emerald-100'
              >
                Browse marketplace
              </Link>
              <Link
                to='/marketplace/dashboard'
                className='rounded-full border border-white/40 px-5 py-2 text-white transition hover:bg-white/10'
              >
                Launch seller cockpit
              </Link>
            </div>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              {heroStats.map((stat) => (
                <Stat key={stat.label} {...stat} />
              ))}
            </div>
          </div>
          <div className='relative rounded-3xl border border-white/15 bg-white/10 p-6 shadow-emerald-900/40 backdrop-blur'>
            <div className='flex items-center justify-between text-xs text-emerald-50/80'>
              <span>Live activity</span>
              <span className='inline-flex items-center gap-1 rounded-full bg-emerald-500/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide'>
                <Sparkles className='h-3 w-3' /> Updating
              </span>
            </div>
            <div className='mt-4 rounded-2xl bg-white/15 p-4 text-sm text-white shadow-sm'>
              <div className='font-semibold'>Newest match</div>
              <p className='mt-1 text-xs text-emerald-50/80'>SmartDesk Pro bundle just matched with a fintech buyer in Sydney.</p>
            </div>
            {heroShowcase ? (
              <Link
                to='/marketplace/listing/$slug'
                params={{ slug: heroShowcase.slug }}
                className='mt-6 flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 text-left transition hover:bg-white/20'
              >
                <SafeImg
                  src={heroShowcase.img}
                  alt={heroShowcase.title}
                  className='h-16 w-16 rounded-xl object-cover'
                />
                <div className='flex-1 text-sm'>
                  <div className='font-semibold text-white'>{heroShowcase.title}</div>
                  <div className='text-xs text-emerald-50/80'>{(heroShowcase as any).ownerName || heroShowcase.seller}</div>
                  <div className='mt-1 text-xs font-semibold text-emerald-100'>A${heroShowcase.price}</div>
                </div>
              </Link>
            ) : null}
            <div className='mt-5 flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 p-3 text-xs text-emerald-50/80'>
              <MessagesSquare className='h-4 w-4 text-emerald-200' />
              <span>Seamless buyer ↔ seller chat and support escalation.</span>
            </div>
          </div>
        </div>
      </section>

      <section className='grid gap-6 lg:grid-cols-[1.1fr_1.1fr]'>
        <div className='space-y-3'>
          <h2 className='text-lg font-semibold text-slate-900'>Buyer shortcuts</h2>
          <div className='grid gap-4 sm:grid-cols-2'>
            {buyerActions.map((action) => (
              <QuickActionCard key={action.title} {...action} />
            ))}
          </div>
        </div>
        <div className='space-y-3'>
          <h2 className='text-lg font-semibold text-slate-900'>Seller cockpit</h2>
          <div className='grid gap-4 sm:grid-cols-2'>
            {sellerActions.map((action) => (
              <QuickActionCard key={action.title} {...action} />
            ))}
          </div>
        </div>
      </section>

      <section className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-slate-900'>Marketplace spotlight</h2>
            <p className='text-xs text-slate-500'>Featured goods and services trending with Hedgetech buyers right now.</p>
          </div>
          <Link to='/marketplace/listings' className='rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'>
            View all listings
          </Link>
        </div>
        {spotlight.length === 0 ? (
          <div className='rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500'>No listings yet. Add your first product from the seller cockpit.</div>
        ) : (
          <div className='grid gap-4 md:grid-cols-3 lg:grid-cols-3'>
            {spotlight.map((product) => (
              <SpotlightCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-slate-900'>Trending categories</h2>
          <span className='text-xs text-slate-500'>Stay ahead with Hedgetech verified suppliers.</span>
        </div>
        <div className='grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6'>
          {categories.length === 0 ? (
            <div className='col-span-full rounded-3xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500'>Categories will appear here once the marketplace upstream API is connected.</div>
          ) : null}
          {categories.map((c) => (
            <CategoryCard key={c.id} name={c.name} />
          ))}
        </div>
      </section>

      <section className='grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1.1fr_1fr]'>
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold text-slate-900'>Why sellers choose Hedgetech</h2>
          <div className='grid gap-3 text-sm text-slate-600 sm:grid-cols-2'>
            <div className='rounded-xl border border-emerald-100 bg-emerald-50 p-4'>
              <p className='font-semibold text-emerald-800'>Unified pipeline</p>
              <p className='mt-1 text-xs text-emerald-700'>Orders, chats, and payouts in one dashboard with granular permissions.</p>
            </div>
            <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
              <p className='font-semibold text-slate-800'>Instant POS</p>
              <p className='mt-1 text-xs text-slate-600'>Spin up pop-up stores or in-person sales with QR codes and barcode scanning.</p>
            </div>
            <div className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
              <p className='font-semibold text-slate-800'>Trust signals</p>
              <p className='mt-1 text-xs text-slate-600'>Verified identity, responsive SLAs, and review summaries build loyalty.</p>
            </div>
            <div className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
              <p className='font-semibold text-slate-800'>Automation ready</p>
              <p className='mt-1 text-xs text-slate-600'>Connect logistics, invoicing, and ERP data through the Hedgetech API.</p>
            </div>
          </div>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-slate-50 p-6'>
          <h3 className='text-base font-semibold text-slate-900'>“Hedgetech gave us a single channel for B2B and retail buyers.”</h3>
          <p className='mt-3 text-sm text-slate-600'>Coordinate inventory, chat with buyers, issue invoices, and run fulfilment workflows without switching tools.</p>
          <div className='mt-5 flex items-center gap-3'>
            <div className='h-12 w-12 overflow-hidden rounded-full border border-emerald-100'>
              <SafeImg src={imageFor('seller avatar', 200, 200)} alt='Seller avatar' className='h-full w-full object-cover' />
            </div>
            <div>
              <div className='text-sm font-semibold text-slate-900'>Maya Lee</div>
              <div className='text-xs text-slate-500'>Founder, Circuit & Co</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/')({
  component: MarketplaceHome,
})
