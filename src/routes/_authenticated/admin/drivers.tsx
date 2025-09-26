import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { db } from '@/lib/data'

export const Route = createFileRoute('/_authenticated/admin/drivers')({
  component: Page,
})

function Page() {
  const [drivers, setDrivers] = useState<any[]>([])
  useEffect(() => { (async () => setDrivers((await db.adminListDrivers?.()) || []))() }, [])
  return (
    <div className='space-y-6'>
      <h2 className='text-lg font-semibold'>Drivers</h2>
      <ul className='space-y-2'>
        {drivers.map((u) => (
          <li key={u.id} className='border rounded p-3 text-sm'>
            {u.name || u.email} • {u.role}
          </li>
        ))}
      </ul>
    </div>
  )
}

