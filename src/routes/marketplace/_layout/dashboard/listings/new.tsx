import { createFileRoute } from '@tanstack/react-router'
import { ProductEditor } from '@/features/dashboard/products/product-editor'

function NewListingPage() {
  return <ProductEditor mode='create' />
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/listings/new')({
  component: NewListingPage,
})
