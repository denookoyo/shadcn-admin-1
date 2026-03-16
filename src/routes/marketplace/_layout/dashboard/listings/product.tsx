import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ProductEditor } from '@/features/dashboard/products/product-editor'
import { db, type Product } from '@/lib/data'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { ensureSellerRouteAccess } from '@/features/sellers/access'

export const Route = createFileRoute('/marketplace/_layout/dashboard/listings/product')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search?.id === 'string' ? search.id : '',
  }),
  beforeLoad: ({ location }) => ensureSellerRouteAccess(location),
  component: ProductEditorRoute,
})

function ProductEditorRoute() {
  const { id } = Route.useSearch()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (!id) {
      setProduct(null)
      return () => {
        active = false
      }
    }

    setLoading(true)
    ;(async () => {
      try {
        const found = await db.getProductById(id)
        if (active) setProduct(found ?? null)
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [id])

  if (!id) {
    return (
      <MarketplacePageShell width='narrow' className='text-center text-sm text-slate-500' topSpacing='lg' bottomSpacing='lg'>
        Select a product from the catalogue to begin editing.
      </MarketplacePageShell>
    )
  }

  if (loading && !product) {
    return (
      <MarketplacePageShell width='narrow' className='text-center text-sm text-slate-500' topSpacing='lg' bottomSpacing='lg'>
        Loading product…
      </MarketplacePageShell>
    )
  }

  if (!product) {
    return (
      <MarketplacePageShell width='narrow' className='text-center text-sm text-red-600' topSpacing='lg' bottomSpacing='lg'>
        Product not found. It may have been removed or belongs to another account.
      </MarketplacePageShell>
    )
  }

  return <ProductEditor mode='edit' product={product} />
}
