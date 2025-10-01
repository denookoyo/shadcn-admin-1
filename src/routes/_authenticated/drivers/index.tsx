import { createFileRoute } from '@tanstack/react-router'
import DriversPage from '@/features/drivers'

export const Route = createFileRoute('/_authenticated/drivers/')({
  component: DriversPage,
})
