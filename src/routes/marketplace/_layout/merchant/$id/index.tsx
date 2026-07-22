import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Store, Tag, Package } from 'lucide-react'
import { db, type Product } from '@/lib/data'
import { imageFor } from '@/features/marketplace/helpers'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { SafeImg } from '@/components/safe-img'

function formatMoney(value: number) {
  return `A$${Number(value || 0).toLocaleString()}`
}

export function MerchantPage({ storeId }: { storeId?: string }) {
  const routeParams = useParams({ strict: false })
  const id = storeId || String((routeParams as { id?: string }).id || '')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const allProducts = await db.listProducts()
        if (!mounted) return
        const normalizedId = String(id || '').trim().toLowerCase()
        const sellerProducts = allProducts.filter((product) => {
          const ownerId = Number((product as any)?.ownerId)
          const storeSlug = String((product as any)?.storeSlug || '').trim().toLowerCase()
          return (
            (Number.isFinite(ownerId) && String(ownerId) === normalizedId) ||
            (storeSlug && storeSlug === normalizedId)
          )
        })
        setProducts(sellerProducts)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [id])

  const merchant = useMemo(() => {
    const primary = products[0]
    if (!primary) return null
    const sellerName = String((primary as any)?.ownerName || primary.seller || 'Merchant').trim()
    const storeSlug = String((primary as any)?.storeSlug || '').trim()
    const priceValues = products.map((product) => Number(product.price) || 0).filter((value) => value > 0)
    const minPrice = priceValues.length ? Math.min(...priceValues) : 0
    const maxPrice = priceValues.length ? Math.max(...priceValues) : 0
    return {
      sellerName,
      storeSlug,
      heroImage: primary.img || imageFor(sellerName, 1200, 800),
      productCount: products.length,
      goodsCount: products.filter((product) => product.type === 'goods').length,
      serviceCount: products.filter((product) => product.type === 'service').length,
      minPrice,
      maxPrice,
    }
  }, [products])

  if (loading) {
    return (
      <MarketplacePageShell width='wide' className='text-sm text-slate-500' topSpacing='md' bottomSpacing='md'>
        Loading merchant…
      </MarketplacePageShell>
    )
  }

  if (!merchant) {
    return (
      <MarketplacePageShell width='wide' className='space-y-4 text-sm text-slate-500' topSpacing='md' bottomSpacing='md'>
        <div className='rounded-3xl border border-dashed border-slate-200 p-10 text-center'>
          Merchant not found.
        </div>
        <div className='text-center'>
          <Link to='/marketplace/listings' className='font-medium text-emerald-700 hover:underline'>
            Back to listings
          </Link>
        </div>
      </MarketplacePageShell>
    )
  }

  return (
    <MarketplacePageShell width='wide' className='space-y-8' topSpacing='md' bottomSpacing='md'>
      <div className='flex flex-wrap items-center gap-2 text-xs text-slate-500'>
        <Link to='/marketplace/listings' className='font-medium text-emerald-700 hover:underline'>
          Marketplace
        </Link>
        <span>/</span>
        <span>{merchant.sellerName}</span>
      </div>

      <section className='overflow-hidden rounded-3xl border border-emerald-100/70 bg-white shadow-sm'>
        <div className='relative h-44 sm:h-56'>
          <SafeImg src={merchant.heroImage} alt={merchant.sellerName} className='h-full w-full object-cover' />
          <div className='absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent' />
          <div className='absolute bottom-0 left-0 right-0 p-5 sm:p-6'>
            <div className='inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700'>
              <ShieldCheck className='h-3.5 w-3.5' />
              Gang Ledger storefront
            </div>
            <h1 className='mt-3 text-2xl font-semibold text-white sm:text-3xl'>{merchant.sellerName}</h1>
            <p className='mt-1 max-w-2xl text-sm text-white/85'>
              Public catalogue synchronized from Gang Ledger. Browse live products and services without signing in.
            </p>
          </div>
        </div>

        <div className='grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-6'>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Live listings</div>
            <div className='mt-2 text-2xl font-semibold text-slate-900'>{merchant.productCount}</div>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Goods</div>
            <div className='mt-2 text-2xl font-semibold text-slate-900'>{merchant.goodsCount}</div>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Services</div>
            <div className='mt-2 text-2xl font-semibold text-slate-900'>{merchant.serviceCount}</div>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Price range</div>
            <div className='mt-2 text-sm font-semibold text-slate-900'>
              {merchant.minPrice && merchant.maxPrice ? `${formatMoney(merchant.minPrice)} - ${formatMoney(merchant.maxPrice)}` : 'Available now'}
            </div>
          </div>
        </div>
      </section>

      <section className='space-y-4'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-slate-900'>Storefront catalogue</h2>
            <p className='text-sm text-slate-500'>
              Browse everything currently published from this merchant&apos;s Gang Ledger catalogue.
            </p>
          </div>
          {merchant.storeSlug ? (
            <div className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500'>
              Store slug: <span className='font-semibold text-slate-700'>{merchant.storeSlug}</span>
            </div>
          ) : null}
        </div>

        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
          {products.map((product) => (
            <Link
              key={product.id}
              to='/marketplace/listing/$slug'
              params={{ slug: product.slug }}
              className='group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg'
            >
              <div className='aspect-[4/3] overflow-hidden'>
                <SafeImg
                  src={product.img || imageFor(product.title, 800, 600)}
                  alt={product.title}
                  className='h-full w-full object-cover transition duration-500 group-hover:scale-105'
                />
              </div>
              <div className='flex flex-1 flex-col gap-3 p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <h3 className='truncate text-sm font-semibold text-slate-900'>{product.title}</h3>
                    <p className='mt-1 line-clamp-2 text-xs text-slate-500'>
                      {product.description || 'Open the listing to view the full seller description and checkout flow.'}
                    </p>
                  </div>
                  <span className='rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700'>
                    {formatMoney(product.price)}
                  </span>
                </div>
                <div className='mt-auto flex flex-wrap items-center gap-2 text-xs text-slate-500'>
                  <span className='inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 capitalize'>
                    <Package className='h-3.5 w-3.5' />
                    {product.type}
                  </span>
                  {product.barcode ? (
                    <span className='inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1'>
                      <Tag className='h-3.5 w-3.5' />
                      {product.barcode}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className='rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 shadow-sm'>
        <div className='flex items-start gap-3'>
          <Store className='mt-0.5 h-5 w-5 text-emerald-600' />
          <div>
            <div className='font-semibold text-slate-900'>Centralized seller data</div>
            <p className='mt-1'>
              Merchant identity, catalogue access, and seller permissions are managed in Gang Ledger. Marketplace only presents the published storefront and product detail pages.
            </p>
          </div>
        </div>
      </section>
    </MarketplacePageShell>
  )
}

export const Route = createFileRoute('/marketplace/_layout/merchant/$id/')({
  component: MerchantPage,
})
