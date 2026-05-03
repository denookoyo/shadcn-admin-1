import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { db } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { ensureSellerRouteAccess } from '@/features/sellers/access'

type AllOrder = any

function AllOrdersPage() {
  const [orders, setOrders] = useState<AllOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<{ orderId: string; kind: 'payment' | 'shipment' | 'delete' } | null>(null)
  const user = useAuthStore((s) => s.auth.user as any | null)
  const myId = (user?.id as number | undefined) ?? undefined

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const all = await db.listAllOrders?.()
        if (!mounted) return
        setOrders(all || [])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <MarketplacePageShell width='default' className='text-sm text-slate-500' topSpacing='md' bottomSpacing='md'>
        Loading all orders…
      </MarketplacePageShell>
    )
  }

  async function runPendingAction() {
    if (!pendingAction) return
    try {
      if (pendingAction.kind === 'payment') {
        const updated = db.markOrderPaid ? await db.markOrderPaid(pendingAction.orderId) : null
        if (updated) setOrders((cur) => cur.map((x) => (x.id === pendingAction.orderId ? updated : x)))
      } else if (pendingAction.kind === 'shipment') {
        const updated = await db.shipOrder?.(pendingAction.orderId, true)
        if (updated) setOrders((cur) => cur.map((x) => (x.id === pendingAction.orderId ? updated : x)))
      } else {
        await db.adminDeleteOrder?.(pendingAction.orderId)
        setOrders((cur) => cur.filter((x) => x.id !== pendingAction.orderId))
      }
      window.dispatchEvent(new CustomEvent('orders:changed'))
      setActionError(null)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to update order.')
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <MarketplacePageShell width='default'>
      <h1 className='text-2xl font-bold'>All Orders</h1>
      {actionError ? (
        <div className='mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{actionError}</div>
      ) : null}
      <div className='mt-4 w-full overflow-x-auto rounded-2xl border'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b text-left text-xs text-gray-500'>
              <th className='py-2 pr-4'>Order</th>
              <th className='py-2 pr-4'>Date</th>
              <th className='py-2 pr-4'>Buyer</th>
              <th className='py-2 pr-4'>Seller</th>
              <th className='py-2 pr-4'>Items</th>
              <th className='py-2 pr-4'>Total</th>
              <th className='py-2 pr-4'>Status</th>
              <th className='py-2 pr-4 text-right'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className='border-b'>
                <td className='py-2 pr-4 font-mono text-xs'>{o.id}</td>
                <td className='py-2 pr-4'>{new Date(o.createdAt).toLocaleString()}</td>
                <td className='py-2 pr-4'>{o.buyer?.name || o.buyer?.email || o.buyerId || '—'}</td>
                <td className='py-2 pr-4'>{o.seller?.name || o.seller?.email || o.sellerId || '—'}</td>
                <td className='py-2 pr-4'>{o.items?.length || 0}</td>
                <td className='py-2 pr-4'>A${o.total}</td>
                <td className='py-2 pr-4 capitalize'>{o.status}</td>
                <td className='py-2 pr-4 text-right'>
                  <div className='space-y-2'>
                    {(['pending', 'scheduled'].includes(o.status) && myId && (o.sellerId === myId)) ? (
                      <button
                        className='w-full rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100'
                        onClick={() => setPendingAction({ orderId: o.id, kind: 'payment' })}
                      >
                        Confirm Payment
                      </button>
                    ) : null}
                    {(o.status === 'paid' && myId && (o.sellerId === myId)) ? (
                      <button
                        className='w-full rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white'
                        onClick={() => setPendingAction({ orderId: o.id, kind: 'shipment' })}
                      >
                        Mark Shipped
                      </button>
                    ) : null}
                    {(o.status === 'shipped' && myId && (o.buyerId === myId)) ? (
                      <button
                        className='w-full rounded-md border px-3 py-1.5 text-xs font-semibold'
                        onClick={async () => {
                          try {
                            const updated = await db.confirmReceived?.(o.id)
                            if (!updated) return
                            setOrders((cur) => cur.map((x) => (x.id === o.id ? updated : x)))
                            window.dispatchEvent(new CustomEvent('orders:changed'))
                          } catch {}
                        }}
                      >
                        Confirm Received
                      </button>
                    ) : null}
                  </div>
                  <div className='inline-flex gap-2 pl-2'>
                    {o.status === 'pending' && (
                      <button
                        className='rounded-md border px-2 py-1 text-xs'
                        onClick={async () => {
                          try {
                            const updated = await db.adminUpdateOrderStatus?.(o.id, 'paid')
                            if (!updated) return
                            setOrders((cur) => cur.map((x) => (x.id === o.id ? updated : x)))
                            window.dispatchEvent(new CustomEvent('orders:changed'))
                          } catch {}
                        }}
                      >
                        Confirm
                      </button>
                    )}
                    {o.status === 'paid' && (
                      <button
                        className='rounded-md border px-2 py-1 text-xs'
                        onClick={async () => {
                          try {
                            const updated = await db.adminUpdateOrderStatus?.(o.id, 'shipped')
                            if (!updated) return
                            setOrders((cur) => cur.map((x) => (x.id === o.id ? updated : x)))
                            window.dispatchEvent(new CustomEvent('orders:changed'))
                          } catch {}
                        }}
                      >
                        Posted
                      </button>
                    )}
                    {o.status === 'shipped' && (
                      <button
                        className='rounded-md border px-2 py-1 text-xs'
                        onClick={async () => {
                          try {
                            const updated = await db.adminUpdateOrderStatus?.(o.id, 'completed')
                            if (!updated) return
                            setOrders((cur) => cur.map((x) => (x.id === o.id ? updated : x)))
                            window.dispatchEvent(new CustomEvent('orders:changed'))
                          } catch {}
                        }}
                      >
                        Complete
                      </button>
                    )}
                    <button
                      className='rounded-md border px-2 py-1 text-xs text-red-600'
                      onClick={() => setPendingAction({ orderId: o.id, kind: 'delete' })}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td className='py-6 text-center text-gray-500' colSpan={8}>No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open) setPendingAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.kind === 'payment'
                ? 'Confirm payment received'
                : pendingAction?.kind === 'shipment'
                  ? 'Mark order as shipped'
                  : 'Delete order'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.kind === 'payment'
                ? 'Only continue after verifying funds for this order.'
                : pendingAction?.kind === 'shipment'
                  ? 'Use this after the seller has dispatched the order.'
                  : 'This permanently removes the order record from the dashboard.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={pendingAction?.kind === 'delete' ? 'bg-red-600 hover:bg-red-500' : undefined}
              onClick={() => void runPendingAction()}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MarketplacePageShell>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/orders/all')({
  beforeLoad: ({ location }) => ensureSellerRouteAccess(location),
  component: AllOrdersPage,
})
