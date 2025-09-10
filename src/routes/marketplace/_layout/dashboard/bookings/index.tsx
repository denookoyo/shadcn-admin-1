import { createFileRoute } from '@tanstack/react-router'

function BookingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Bookings</h1>
      <p className="mt-2 text-sm text-gray-600">Bookings management coming soon.</p>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/bookings/')({
  component: BookingsPage,
})

