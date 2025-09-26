import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { db } from '@/lib/data'

export const Route = createFileRoute('/_authenticated/driver/payments')({
  component: Page,
})

function Page() {
  const [payments, setPayments] = useState<any[]>([])
  const [payslips, setPayslips] = useState<any[]>([])
  useEffect(() => { (async () => {
    setPayments((await db.listMyPayments?.()) || [])
    setPayslips((await db.listMyPayslips?.()) || [])
  })() }, [])
  return (
    <div className='space-y-6'>
      <h2 className='text-lg font-semibold'>Payments</h2>
      <ul className='space-y-2'>
        {payments.map((p) => (
          <li key={p.id} className='border rounded p-3 text-sm'>
            {new Date(p.periodStart).toISOString().slice(0,10)} → {new Date(p.periodEnd).toISOString().slice(0,10)} • ${(p.net/100).toFixed(2)} • {p.status}
          </li>
        ))}
      </ul>
      <h3 className='text-base font-medium'>Payslips</h3>
      <ul className='space-y-2'>
        {payslips.map((s) => (
          <li key={s.id} className='border rounded p-3 text-sm'>
            {new Date(s.createdAt).toLocaleString()} • <a className='underline' href={s.url}>Download</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

