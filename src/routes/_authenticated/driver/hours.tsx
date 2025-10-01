import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { db } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_authenticated/driver/hours')({
  component: Page,
})

function Page() {
  const [list, setList] = useState<any[]>([])
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [startTime, setStart] = useState('07:00')
  const [endTime, setEnd] = useState('15:00')
  const [breakMin, setBreak] = useState('30')

  useEffect(() => { (async () => setList((await db.listMyShifts?.()) || []))() }, [])

  async function submit() {
    await db.createShift?.({ date, startTime, endTime, breakMin: Number(breakMin||0) })
    setList((await db.listMyShifts?.()) || [])
  }

  return (
    <div className='space-y-6'>
      <h2 className='text-lg font-semibold'>Log Hours</h2>
      <div className='grid gap-3 max-w-md'>
        <label className='text-sm'>Date</label>
        <Input type='date' value={date} onChange={(e) => setDate(e.target.value)} />
        <label className='text-sm'>Start</label>
        <Input type='time' value={startTime} onChange={(e) => setStart(e.target.value)} />
        <label className='text-sm'>End</label>
        <Input type='time' value={endTime} onChange={(e) => setEnd(e.target.value)} />
        <label className='text-sm'>Break (min)</label>
        <Input value={breakMin} onChange={(e) => setBreak(e.target.value)} />
        <Button onClick={submit}>Save</Button>
      </div>
      <h3 className='text-base font-medium'>My Shifts</h3>
      <ul className='space-y-2'>
        {list.map((s) => (
          <li key={s.id} className='border rounded p-3 text-sm'>
            {new Date(s.date).toISOString().slice(0,10)} • {s.startTime}-{s.endTime} • {s.totalHours}h
          </li>
        ))}
      </ul>
    </div>
  )
}

