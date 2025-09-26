import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { db } from '@/lib/data'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/admin/hours')({
  component: Page,
})

function Page() {
  const [group, setGroup] = useState<'day'|'week'>('day')
  const [data, setData] = useState<Record<string, number>>({})
  async function load(g: 'day'|'week') {
    const r = await db.adminShiftsAgg?.(g)
    setGroup((r?.group as any) || g)
    setData(r?.data || {})
  }
  useEffect(() => { load('day') }, [])
  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-2'>
        <h2 className='text-lg font-semibold'>Hours Aggregation</h2>
        <Button size='sm' variant={group==='day'?'default':'outline'} onClick={() => load('day')}>By Day</Button>
        <Button size='sm' variant={group==='week'?'default':'outline'} onClick={() => load('week')}>By Week</Button>
      </div>
      <ul className='space-y-2'>
        {Object.entries(data).map(([k, v]) => (
          <li key={k} className='border rounded p-3 text-sm'>{k}: {v}h</li>
        ))}
      </ul>
    </div>
  )
}

