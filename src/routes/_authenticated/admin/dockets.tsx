import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { db } from '@/lib/data'

export const Route = createFileRoute('/_authenticated/admin/dockets')({
  component: Page,
})

function Page() {
  const [list, setList] = useState<any[]>([])
  useEffect(() => { (async () => setList((await db.adminListDockets?.()) || []))() }, [])
  return (
    <div className='space-y-6'>
      <h2 className='text-lg font-semibold'>All Dockets</h2>
      <ul className='space-y-2'>
        {list.map((d) => (
          <li key={d.id} className='border rounded p-3 text-sm'>
            {new Date(d.date).toISOString().slice(0,10)} • Driver #{d.driverId} • {d.project || '—'} • {d.hours ?? '—'}h
          </li>
        ))}
      </ul>
    </div>
  )
}

