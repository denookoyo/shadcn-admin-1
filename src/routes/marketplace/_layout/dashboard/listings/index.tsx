import { createFileRoute } from '@tanstack/react-router'

function SellerListingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">My Listings</h1>
      <p className="mt-2 text-sm text-gray-600">Listings management coming soon.</p>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/listings/')({
  component: SellerListingsPage,
})

