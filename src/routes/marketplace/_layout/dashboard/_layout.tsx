import { Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { SellerAccessNotice, useSellerAccess } from '@/features/sellers/access'

function DashboardAccessLayout() {
  const location = useLocation()
  const { user, sellerStatus, canAccessSellerTools } = useSellerAccess()
  const isVerificationPage = location.pathname?.startsWith('/marketplace/dashboard/verification')

  if (canAccessSellerTools || isVerificationPage) {
    return <Outlet />
  }

  return <SellerAccessNotice feature='seller cockpit, POS, and land operations' sellerStatus={sellerStatus} isSignedIn={Boolean(user)} />
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/_layout')({
  component: DashboardAccessLayout,
})
