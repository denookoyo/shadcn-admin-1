// src/routes/_authenticated/warehouses.tsx

import { createFileRoute } from '@tanstack/react-router'
import WarehousesPage from '@/features/warehouse'

export const Route = createFileRoute('/_authenticated/warehouse/')({
  component: WarehousesPage,
})
