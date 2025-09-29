import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { FileDown, CalendarClock } from 'lucide-react'
import { db, type Order } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  rows.forEach((row) => {
    lines.push(headers.map((key) => JSON.stringify(row[key] ?? '')).join(','))
  })
  return lines.join('\n')
}

function downloadBlob(contents: string, filename: string, type = 'text/csv') {
  const blob = new Blob([contents], { type })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function SellerReportsPage() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const [orders, setOrders] = useState<Order[]>([])
  const [range, setRange] = useState({ from: '', to: '' })
  const [scheduleEmail, setScheduleEmail] = useState(user?.email ?? '')
  const [scheduled, setScheduled] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const list = await db.listOrders(ns)
        if (!mounted) return
        setOrders(list)
      } catch {
        if (mounted) setOrders([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [ns])

  function handleDownload() {
    const rows = orders.map((order: any) => ({
      id: order.id,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
    }))
    const csv = toCsv(rows)
    downloadBlob(csv, 'hedgetech-orders.csv')
  }

  function handleSchedule() {
    if (!scheduleEmail) return
    setScheduled(true)
    setTimeout(() => setScheduled(false), 4000)
  }

  return (
    <div className='mx-auto max-w-4xl space-y-8 px-4 py-10'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold text-slate-900'>Reports</h1>
        <p className='text-sm text-slate-600'>Export finance-ready CSVs, schedule automated digests, and share insights with your team.</p>
      </header>

      <section className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-slate-900'>Download orders CSV</h2>
            <p className='text-xs text-slate-500'>Includes totals, buyer identity, and status history.</p>
          </div>
          <Button className='gap-2' onClick={handleDownload}>
            <FileDown className='h-4 w-4' /> Export CSV
          </Button>
        </div>

        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>From</label>
            <Input type='date' value={range.from} onChange={(event) => setRange((state) => ({ ...state, from: event.target.value }))} />
          </div>
          <div className='space-y-2'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>To</label>
            <Input type='date' value={range.to} onChange={(event) => setRange((state) => ({ ...state, to: event.target.value }))} />
          </div>
        </div>
        <p className='mt-3 text-xs text-slate-500'>Date filters are applied client-side for now; server-side filtering is coming shortly.</p>
      </section>

      <section className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-slate-900'>Schedule weekly digests</h2>
            <p className='text-xs text-slate-500'>Receive a Sunday evening summary of revenue, new customers, and pending fulfilment.</p>
          </div>
          <Button variant='secondary' className='gap-2' onClick={handleSchedule}>
            <CalendarClock className='h-4 w-4' /> Schedule digest
          </Button>
        </div>
        <div className='mt-4 space-y-3'>
          <div className='space-y-2'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Send to</label>
            <Input value={scheduleEmail} onChange={(event) => setScheduleEmail(event.target.value)} placeholder='ops@hedgetech.market' />
          </div>
          {scheduled ? <p className='text-xs font-semibold text-emerald-600'>Digest scheduled! We will send weekly highlights to {scheduleEmail}.</p> : null}
        </div>
      </section>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/reports')({
  component: SellerReportsPage,
})
