import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ShieldCheck, UserPlus, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { useSellerAccess } from '@/features/sellers/access'

type StoreRole = 'OWNER' | 'MANAGER' | 'STOCK_CONTROLLER' | 'SALES_STAFF' | 'FULFILLMENT_STAFF' | 'ANALYST' | 'STAFF'
type TeamResponse = {
  store: { id: number; name: string }
  access: { role: StoreRole; isOwner: boolean; permissions: string[] }
  memberships: Array<{ id: number; userId: number; role: StoreRole; status: string; user: { name?: string | null; email: string } }>
  invites: Array<{ id: number; email: string; role: StoreRole; status: string; createdAt: string }>
}

const assignableRoles: Array<{ value: Exclude<StoreRole, 'OWNER' | 'STAFF'>; label: string; summary: string }> = [
  { value: 'MANAGER', label: 'Manager', summary: 'Runs store operations and manages non-manager staff.' },
  { value: 'STOCK_CONTROLLER', label: 'Stock controller', summary: 'Counts, receives, and adjusts inventory.' },
  { value: 'SALES_STAFF', label: 'Sales staff', summary: 'Handles sales, orders, and payment requests.' },
  { value: 'FULFILLMENT_STAFF', label: 'Fulfilment staff', summary: 'Handles orders, deliveries, and appointments.' },
  { value: 'ANALYST', label: 'Store analyst', summary: 'Read-only access to orders, catalog, and analytics.' },
]

function labelRole(role: string) {
  return role.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())
}

function StaffPermissionsPage() {
  const { isAdmin, storefrontRole, storefrontPermissions } = useSellerAccess()
  const allowed = isAdmin || storefrontRole === 'OWNER' || storefrontRole === 'MANAGER' || storefrontPermissions.includes('team.manage')
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StoreRole>('SALES_STAFF')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const loadTeam = useCallback(async () => {
    const response = await fetch('/api/storefront/team', { credentials: 'include', cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || result.message || 'Could not load storefront staff.')
    setTeam(result)
  }, [])

  useEffect(() => {
    if (!allowed) return
    loadTeam().catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load storefront staff.'))
  }, [allowed, loadTeam])

  async function request(method: 'POST' | 'PATCH', body: Record<string, unknown>) {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/storefront/team', {
        method,
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ storeId: team?.store.id, ...body }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || result.message || 'The staff update could not be saved.')
      await loadTeam()
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The staff update could not be saved.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function invite(event: FormEvent) {
    event.preventDefault()
    if (await request('POST', { email, role })) {
      setEmail('')
      setRole('SALES_STAFF')
      setMessage('Invitation sent by email.')
    }
  }

  if (!allowed) {
    return (
      <MarketplacePageShell width='default' className='py-12'>
        <div className='rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-950'>Only storefront owners and managers can manage staff and permissions.</div>
      </MarketplacePageShell>
    )
  }

  const owner = team?.access.isOwner || storefrontRole === 'OWNER' || isAdmin

  return (
    <MarketplacePageShell width='xl' className='space-y-8 py-10'>
      <section className='rounded-4xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-8 shadow-sm'>
        <div className='flex items-start gap-4'>
          <div className='rounded-2xl bg-emerald-600 p-3 text-white'><Users className='h-6 w-6' /></div>
          <div>
            <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>Seller cockpit</p>
            <h1 className='mt-1 text-3xl font-semibold text-slate-900'>Staff & permissions</h1>
            <p className='mt-2 max-w-2xl text-sm text-slate-600'>Invite employees and assign the minimum access needed for their storefront duties. Changes and staff activity are securely audited in Gang Ledger.</p>
          </div>
        </div>
      </section>

      {message ? <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700'>{message}</div> : null}

      <section className='grid gap-6 lg:grid-cols-[1fr_1.3fr]'>
        <form onSubmit={invite} className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex items-center gap-2'><UserPlus className='h-5 w-5 text-emerald-600' /><h2 className='font-semibold text-slate-900'>Invite staff member</h2></div>
          <label className='mt-5 block text-sm font-medium text-slate-700'>Work email</label>
          <input required type='email' value={email} onChange={(event) => setEmail(event.target.value)} placeholder='staff@example.com' className='mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400' />
          <label className='mt-4 block text-sm font-medium text-slate-700'>Designation</label>
          <select value={role} onChange={(event) => setRole(event.target.value as StoreRole)} className='mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm'>
            {assignableRoles.filter((item) => owner || item.value !== 'MANAGER').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <p className='mt-2 text-xs text-slate-500'>{assignableRoles.find((item) => item.value === role)?.summary}</p>
          <Button disabled={busy} className='mt-5 w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-500'>{busy ? 'Sending…' : 'Send email invitation'}</Button>
        </form>

        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex items-center gap-2'><ShieldCheck className='h-5 w-5 text-emerald-600' /><h2 className='font-semibold text-slate-900'>Active team</h2></div>
          <div className='mt-4 space-y-3'>
            {team?.memberships.map((member) => {
              const protectedManager = !owner && member.role === 'MANAGER'
              const protectedOwner = member.role === 'OWNER'
              return (
                <div key={member.id} className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4'>
                  <div><p className='font-medium text-slate-900'>{member.user.name || member.user.email}</p><p className='text-xs text-slate-500'>{member.user.email} · {member.status.toLowerCase()}</p></div>
                  {protectedOwner || protectedManager ? <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600'>{labelRole(member.role)}</span> : (
                    <div className='flex gap-2'>
                      <select value={member.role} disabled={busy} onChange={(event) => request('PATCH', { membershipId: member.id, role: event.target.value, status: member.status })} className='rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs'>
                        {assignableRoles.filter((item) => owner || item.value !== 'MANAGER').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                      <Button size='sm' variant='outline' disabled={busy} onClick={() => request('PATCH', { membershipId: member.id, role: member.role, status: member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}>{member.status === 'ACTIVE' ? 'Suspend' : 'Restore'}</Button>
                    </div>
                  )}
                </div>
              )
            })}
            {!team?.memberships.length ? <p className='text-sm text-slate-500'>Loading storefront team…</p> : null}
          </div>
        </div>
      </section>

      <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
        <h2 className='font-semibold text-slate-900'>Invitations</h2>
        <div className='mt-4 grid gap-3 md:grid-cols-2'>
          {team?.invites.map((invite) => <div key={invite.id} className='flex items-center justify-between rounded-2xl border border-slate-100 p-4'><div><p className='text-sm font-medium text-slate-900'>{invite.email}</p><p className='text-xs text-slate-500'>{labelRole(invite.role)} · {invite.status.toLowerCase()}</p></div>{invite.status === 'PENDING' ? <Button size='sm' variant='outline' disabled={busy} onClick={() => request('PATCH', { inviteId: invite.id })}>Revoke</Button> : null}</div>)}
        </div>
      </section>
    </MarketplacePageShell>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/staff')({ component: StaffPermissionsPage })
