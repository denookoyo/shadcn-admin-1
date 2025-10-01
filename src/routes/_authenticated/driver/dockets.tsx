import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { db } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/driver/dockets')({
  component: Page,
})

function Page() {
  const [list, setList] = useState<any[]>([])
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [project, setProject] = useState('')
  const [hours, setHours] = useState('')
  const [details, setDetails] = useState('')

  useEffect(() => {
    ;(async () => {
      const r = await db.listMyDockets?.()
      setList(r || [])
    })()
  }, [])

  async function submit() {
    await db.createDocket?.({ date, project, hours: hours ? Number(hours) : undefined, details })
    const r = await db.listMyDockets?.()
    setList(r || [])
    setProject(''); setHours(''); setDetails('')
  }

  return (
    <div className='space-y-6'>
      <h2 className='text-lg font-semibold'>Submit Docket</h2>
      <div className='grid gap-3 max-w-xl'>
        <label className='text-sm'>Date</label>
        <Input type='date' value={date} onChange={(e) => setDate(e.target.value)} />
        <label className='text-sm'>Project</label>
        <Input value={project} onChange={(e) => setProject(e.target.value)} />
        <label className='text-sm'>Hours</label>
        <Input value={hours} onChange={(e) => setHours(e.target.value)} />
        <label className='text-sm'>Details</label>
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} />
        <Button onClick={submit}>Submit</Button>
      </div>
      <h3 className='text-base font-medium'>My Dockets</h3>
      <ul className='space-y-2'>
        {list.map((d) => (
          <li key={d.id} className='border rounded p-3 text-sm'>
            <div>{new Date(d.date).toISOString().slice(0,10)} • {d.project || '—'} • {d.hours ?? '—'}h</div>
            <div className='text-muted-foreground'>{d.details}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

