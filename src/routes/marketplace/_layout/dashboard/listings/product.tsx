import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ProductEditor } from '@/features/dashboard/products/product-editor'
import { db, type Product } from '@/lib/data'

export const Route = createFileRoute('/marketplace/_layout/dashboard/listings/product')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search?.id === 'string' ? search.id : '',
  }),
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
      <div className='mx-auto max-w-3xl px-4 py-12 text-center text-sm text-slate-500'>
        Select a product from the catalogue to begin editing.
      </div>
    )
  }

  if (loading && !product) {
    return (
      <div className='mx-auto max-w-3xl px-4 py-12 text-center text-sm text-slate-500'>
        Loading product…
      </div>
    )
  }

  if (!product) {
    return (
      <div className='mx-auto max-w-3xl px-4 py-12 text-center text-sm text-red-600'>
        Product not found. It may have been removed or belongs to another account.
      </div>
    )
  }

  return <ProductEditor mode='edit' product={product} />
}
