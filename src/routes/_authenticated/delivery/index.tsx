import { createFileRoute } from '@tanstack/react-router'
import DeliveryRoutesPage from '@/features/delivery'

export const Route = createFileRoute('/_authenticated/delivery/')({
  component: DeliveryRoutesPage,
})
