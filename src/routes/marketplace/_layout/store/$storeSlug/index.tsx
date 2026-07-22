import { createFileRoute } from '@tanstack/react-router'
import { MerchantPage } from '../../merchant/$id'

export const Route = createFileRoute('/marketplace/_layout/store/$storeSlug/')({
  component: PublicStorefront,
})

function PublicStorefront() {
  const { storeSlug } = Route.useParams()
  return <MerchantPage storeId={storeSlug} />
}
