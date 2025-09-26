import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { db } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/driver/maintenance')({
  component: Page,
})

function Page() {
  const [list, setList] = useState<any[]>([])
  const [category, setCategory] = useState('engine')
  const [severity, setSeverity] = useState('medium')
  const [description, setDesc] = useState('')

  useEffect(() => { (async () => setList((await db.listMyMaintenance?.()) || []))() }, [])

  async function submit() {
    await db.createMaintenance?.({ category, severity, description })
    setList((await db.listMyMaintenance?.()) || [])
    setDesc('')
  }

  return (
    <div className='space-y-6'>
      <h2 className='text-lg font-semibold'>Maintenance Request</h2>
      <div className='grid gap-3 max-w-xl'>
        <label className='text-sm'>Category</label>
        <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        <label className='text-sm'>Severity</label>
        <Input value={severity} onChange={(e) => setSeverity(e.target.value)} />
        <label className='text-sm'>Description</label>
        <Textarea value={description} onChange={(e) => setDesc(e.target.value)} />
        <Button onClick={submit}>Submit</Button>
      </div>
      <h3 className='text-base font-medium'>My Maintenance</h3>
      <ul className='space-y-2'>
        {list.map((m) => (
          <li key={m.id} className='border rounded p-3 text-sm'>
            {new Date(m.date).toISOString().slice(0,10)} • {m.category} • {m.severity || '—'} • {m.status}
          </li>
        ))}
      </ul>
    </div>
  )
}

