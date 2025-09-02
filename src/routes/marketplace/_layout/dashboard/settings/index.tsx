import { createFileRoute } from '@tanstack/react-router'

function SellerSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Seller Settings</h1>
      <p className="mt-2 text-sm text-gray-600">Settings page coming soon.</p>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/settings/')({
  component: SellerSettingsPage,
})

