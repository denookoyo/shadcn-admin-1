import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  AlertTriangle,
  BellRing,
  ClipboardList,
  DollarSign,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Store,
  Ticket,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { ensureSellerRouteAccess } from '@/features/sellers/access'
import { listSellerApplications, type SellerApplication } from '@/features/sellers/verification'
import { db, type Announcement, type Order, type RefundRequest, type SupportTicket } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'

function orderStatusClasses(status: string) {
  switch (status) {
    case 'pending':
    case 'scheduled':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'paid':
    case 'shipped':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'cancelled':
    case 'refunded':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

function supportStatusClasses(status: string) {
  switch (status) {
    case 'open':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'in_progress':
    case 'reviewing':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'resolved':
    case 'accepted':
    case 'refunded':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'closed':
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

function sellerStatusClasses(status: SellerApplication['status']) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

function formatCurrency(amount: number) {
  return `A$${amount.toLocaleString()}`
}

function buyerLabel(order: Order & { buyer?: { name?: string | null; email?: string | null } }) {
  return order.buyer?.name || order.buyer?.email || order.customerName || order.customerEmail || 'Buyer'
}

function sellerLabel(order: Order & { seller?: { name?: string | null; email?: string | null } }) {
  return order.seller?.name || order.seller?.email || 'Seller'
}

function AdminDashboardPage() {
  const { user } = useAuthStore((s) => s.auth)
  const [orders, setOrders] = useState<(Order & { buyer?: { name?: string | null; email?: string | null }; seller?: { name?: string | null; email?: string | null } })[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [refunds, setRefunds] = useState<RefundRequest[]>([])
  const [sellerApps, setSellerApps] = useState<SellerApplication[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [nextOrders, nextTickets, nextRefunds, nextSellerApps, nextAnnouncements] = await Promise.all([
        db.listAllOrders?.() ?? Promise.resolve([]),
        db.listSupportTickets?.() ?? Promise.resolve([]),
        db.listRefundRequests?.('all') ?? Promise.resolve([]),
        listSellerApplications(),
        db.listAnnouncements?.('admins') ?? Promise.resolve([]),
      ])
      setOrders(nextOrders ?? [])
      setTickets(nextTickets ?? [])
      setRefunds(nextRefunds ?? [])
      setSellerApps(nextSellerApps ?? [])
      setAnnouncements(nextAnnouncements ?? [])
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load admin dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const pendingSellerApps = useMemo(() => sellerApps.filter((app) => app.status !== 'approved'), [sellerApps])
  const openTickets = useMemo(() => tickets.filter((ticket) => ticket.status !== 'resolved' && ticket.status !== 'closed'), [tickets])
  const activeRefunds = useMemo(() => refunds.filter((refund) => ['requested', 'reviewing', 'accepted'].includes(refund.status)), [refunds])
  const grossMerchandiseValue = useMemo(() => orders.reduce((sum, order) => sum + Number(order.total || 0), 0), [orders])
  const ordersNeedingAttention = useMemo(() => orders.filter((order) => ['pending', 'paid', 'scheduled', 'shipped'].includes(order.status)).length, [orders])
  const pinnedAnnouncements = useMemo(() => announcements.filter((item) => item.pinned), [announcements])
  const latestOrders = useMemo(() => [...orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6), [orders])
  const latestTickets = useMemo(() => [...openTickets].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 5), [openTickets])
  const latestRefunds = useMemo(() => [...activeRefunds].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5), [activeRefunds])
  const latestAnnouncements = useMemo(() => announcements.slice(0, 4), [announcements])

  return (
    <MarketplacePageShell width='wide' className='space-y-8'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800'>
            <ShieldCheck className='h-3.5 w-3.5' />
            Marketplace admin
          </div>
          <h1 className='mt-3 text-3xl font-semibold text-slate-900'>Operations dashboard</h1>
          <p className='mt-2 max-w-3xl text-sm text-slate-600'>
            Monitor marketplace risk, support load, seller verification, and order flow from one admin workspace{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline' className='rounded-full'>
            <Link to='/marketplace/dashboard/support'>Open support console</Link>
          </Button>
          <Button asChild variant='outline' className='rounded-full'>
            <Link to='/marketplace/dashboard/orders/all'>Review all orders</Link>
          </Button>
          <Button onClick={load} className='rounded-full' variant='outline'>
            <RefreshCw className='mr-2 h-4 w-4' />
            Refresh
          </Button>
        </div>
      </header>

      {error ? (
        <div className='rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          <AlertTriangle className='mr-2 inline h-4 w-4' />
          {error}
        </div>
      ) : null}

      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
        <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between text-sm font-semibold text-slate-700'>
            <span>GMV</span>
            <DollarSign className='h-4 w-4 text-emerald-600' />
          </div>
          <div className='mt-3 text-2xl font-semibold text-slate-900'>{formatCurrency(grossMerchandiseValue)}</div>
          <p className='mt-1 text-xs text-slate-500'>Total tracked order value.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between text-sm font-semibold text-slate-700'>
            <span>Orders in motion</span>
            <ClipboardList className='h-4 w-4 text-sky-600' />
          </div>
          <div className='mt-3 text-2xl font-semibold text-slate-900'>{ordersNeedingAttention}</div>
          <p className='mt-1 text-xs text-slate-500'>Pending, paid, scheduled, or shipped.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between text-sm font-semibold text-slate-700'>
            <span>Open tickets</span>
            <Ticket className='h-4 w-4 text-amber-600' />
          </div>
          <div className='mt-3 text-2xl font-semibold text-slate-900'>{openTickets.length}</div>
          <p className='mt-1 text-xs text-slate-500'>Buyer and seller issues awaiting closure.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between text-sm font-semibold text-slate-700'>
            <span>Active refunds</span>
            <Receipt className='h-4 w-4 text-red-600' />
          </div>
          <div className='mt-3 text-2xl font-semibold text-slate-900'>{activeRefunds.length}</div>
          <p className='mt-1 text-xs text-slate-500'>Refunds still under review or payout.</p>
        </div>
        <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between text-sm font-semibold text-slate-700'>
            <span>Seller approvals</span>
            <Store className='h-4 w-4 text-emerald-600' />
          </div>
          <div className='mt-3 text-2xl font-semibold text-slate-900'>{pendingSellerApps.length}</div>
          <p className='mt-1 text-xs text-slate-500'>Applications still waiting for approval.</p>
        </div>
      </section>

      {loading ? (
        <div className='rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500'>
          Loading admin dashboard…
        </div>
      ) : null}

      <section className='grid gap-6 xl:grid-cols-[1.6fr_1fr]'>
        <div className='space-y-6'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Order oversight</h2>
                <p className='text-xs text-slate-500'>Recent marketplace orders across buyers and sellers.</p>
              </div>
              <Button asChild variant='outline' className='rounded-full'>
                <Link to='/marketplace/dashboard/orders/all'>View all orders</Link>
              </Button>
            </div>
            <div className='mt-4 space-y-3'>
              {latestOrders.length === 0 ? (
                <div className='rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500'>
                  No orders available yet.
                </div>
              ) : (
                latestOrders.map((order) => (
                  <div key={order.id} className='rounded-2xl border border-slate-200 p-4'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div>
                        <div className='text-sm font-semibold text-slate-900'>#{order.id.slice(0, 8)}</div>
                        <div className='text-xs text-slate-500'>
                          {buyerLabel(order)} to {sellerLabel(order)}
                        </div>
                        <div className='text-xs text-slate-500'>{format(new Date(order.createdAt), 'PP p')}</div>
                      </div>
                      <div className='text-right'>
                        <div className='text-sm font-semibold text-slate-900'>{formatCurrency(order.total)}</div>
                        <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${orderStatusClasses(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className='grid gap-6 lg:grid-cols-2'>
            <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <h2 className='text-lg font-semibold text-slate-900'>Support queue</h2>
                  <p className='text-xs text-slate-500'>Latest open buyer and seller tickets.</p>
                </div>
                <Button asChild variant='outline' className='rounded-full'>
                  <Link to='/marketplace/dashboard/support'>Open support</Link>
                </Button>
              </div>
              <div className='mt-4 space-y-3'>
                {latestTickets.length === 0 ? (
                  <div className='rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500'>No tickets open.</div>
                ) : (
                  latestTickets.map((ticket) => (
                    <div key={ticket.id} className='rounded-2xl border border-slate-200 p-4'>
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <div className='text-sm font-semibold text-slate-900'>{ticket.subject}</div>
                          <div className='text-xs text-slate-500'>#{ticket.id.slice(0, 8)} • {ticket.type}</div>
                        </div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${supportStatusClasses(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <h2 className='text-lg font-semibold text-slate-900'>Refund queue</h2>
                  <p className='text-xs text-slate-500'>Refund requests currently under review.</p>
                </div>
                <Button asChild variant='outline' className='rounded-full'>
                  <Link to='/marketplace/dashboard/support'>Manage refunds</Link>
                </Button>
              </div>
              <div className='mt-4 space-y-3'>
                {latestRefunds.length === 0 ? (
                  <div className='rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500'>No active refund requests.</div>
                ) : (
                  latestRefunds.map((refund) => (
                    <div key={refund.id} className='rounded-2xl border border-slate-200 p-4'>
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <div className='text-sm font-semibold text-slate-900'>Order {refund.orderId}</div>
                          <div className='text-xs text-slate-500'>{format(new Date(refund.createdAt), 'PP p')}</div>
                        </div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${supportStatusClasses(refund.status)}`}>
                          {refund.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className='mt-2 text-xs text-slate-600'>{refund.reason}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='space-y-6'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Seller verification</h2>
                <p className='text-xs text-slate-500'>Applications awaiting action.</p>
              </div>
              <Button asChild variant='outline' className='rounded-full'>
                <Link to='/marketplace/dashboard/support'>Review queue</Link>
              </Button>
            </div>
            <div className='mt-4 space-y-3'>
              {pendingSellerApps.length === 0 ? (
                <div className='rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500'>No pending seller applications.</div>
              ) : (
                pendingSellerApps.slice(0, 5).map((app) => (
                  <div key={app.id} className='rounded-2xl border border-slate-200 p-4'>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <div className='text-sm font-semibold text-slate-900'>{app.companyName}</div>
                        <div className='text-xs text-slate-500'>{app.email}</div>
                        <div className='text-xs text-slate-500'>{format(new Date(app.submittedAt), 'PP p')}</div>
                      </div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${sellerStatusClasses(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Announcements</h2>
                <p className='text-xs text-slate-500'>Pinned and recent admin-facing updates.</p>
              </div>
              <div className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600'>
                <BellRing className='h-3.5 w-3.5' />
                {pinnedAnnouncements.length} pinned
              </div>
            </div>
            <div className='mt-4 space-y-3'>
              {latestAnnouncements.length === 0 ? (
                <div className='rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500'>No active announcements.</div>
              ) : (
                latestAnnouncements.map((announcement) => (
                  <div key={announcement.id} className='rounded-2xl border border-slate-200 p-4'>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <div className='text-sm font-semibold text-slate-900'>{announcement.title}</div>
                        <div className='text-xs text-slate-500'>Audience: {announcement.audience}</div>
                      </div>
                      {announcement.pinned ? (
                        <span className='inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>
                          Pinned
                        </span>
                      ) : null}
                    </div>
                    <p className='mt-2 text-xs text-slate-600'>{announcement.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </MarketplacePageShell>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/admin')({
  beforeLoad: async ({ location }) => {
    const access = await ensureSellerRouteAccess(location)
    if (!access.isAdmin) {
      throw redirect({ to: '/marketplace/dashboard' })
    }
  },
  component: AdminDashboardPage,
})
