import { createFileRoute } from '@tanstack/react-router'
import { ListingDetail } from '../../../listing/$slug'

export const Route = createFileRoute('/marketplace/_layout/store/$storeSlug/products/$productSlug')({
  component: PublicProduct,
})

function PublicProduct() {
  const { storeSlug, productSlug } = Route.useParams()
  return <ListingDetail storeSlug={storeSlug} productSlug={productSlug} />
}
