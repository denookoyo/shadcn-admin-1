import { createFileRoute } from '@tanstack/react-router'
import FleetStatusPage from '../../../features/fleet'

export const Route = createFileRoute('/_authenticated/fleet/')({
  component: FleetStatusPage,
})
