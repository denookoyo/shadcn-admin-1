import { createFileRoute } from '@tanstack/react-router'
import { ProductEditor } from '@/features/dashboard/products/product-editor'
import { ensureSellerRouteAccess } from '@/features/sellers/access'

function NewListingPage() {
  return <ProductEditor mode='create' />
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/listings/new')({
  beforeLoad: ({ location }) => ensureSellerRouteAccess(location),
  component: NewListingPage,
})
