import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { db } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/driver/accidents')({
  component: Page,
})

function Page() {
  const [list, setList] = useState<any[]>([])
  const [occurredAt, setAt] = useState<string>(new Date().toISOString().slice(0, 16))
  const [location, setLocation] = useState('')
  const [description, setDesc] = useState('')

  useEffect(() => { (async () => setList((await db.listMyAccidents?.()) || []))() }, [])

  async function submit() {
    await db.createAccident?.({ occurredAt: new Date(occurredAt).toISOString(), location, description })
    setList((await db.listMyAccidents?.()) || [])
    setLocation(''); setDesc('')
  }

  return (
    <div className='space-y-6'>
      <h2 className='text-lg font-semibold'>Accident Report</h2>
      <div className='grid gap-3 max-w-xl'>
        <label className='text-sm'>Occurred At</label>
        <Input type='datetime-local' value={occurredAt} onChange={(e) => setAt(e.target.value)} />
        <label className='text-sm'>Location</label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        <label className='text-sm'>Description</label>
        <Textarea value={description} onChange={(e) => setDesc(e.target.value)} />
        <Button onClick={submit}>Submit</Button>
      </div>
      <h3 className='text-base font-medium'>My Reports</h3>
      <ul className='space-y-2'>
        {list.map((a) => (
          <li key={a.id} className='border rounded p-3 text-sm'>
            {new Date(a.occurredAt).toLocaleString()} • {a.location || '—'} • {a.status}
          </li>
        ))}
      </ul>
    </div>
  )
}

