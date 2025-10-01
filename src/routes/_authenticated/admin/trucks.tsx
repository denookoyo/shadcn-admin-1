import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { db } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_authenticated/admin/trucks')({
  component: Page,
})

function Page() {
  const [list, setList] = useState<any[]>([])
  const [rego, setRego] = useState('')
  const [name, setName] = useState('')
  useEffect(() => { (async () => setList((await db.adminListTrucks?.()) || []))() }, [])
  async function submit() {
    if (!rego || !name) return
    await db.adminCreateTruck?.({ rego, name })
    setList((await db.adminListTrucks?.()) || [])
    setRego(''); setName('')
  }
  return (
    <div className='space-y-6'>
      <h2 className='text-lg font-semibold'>Trucks</h2>
      <div className='grid gap-2 max-w-md'>
        <Input placeholder='Rego' value={rego} onChange={(e) => setRego(e.target.value)} />
        <Input placeholder='Name' value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={submit}>Add Truck</Button>
      </div>
      <ul className='space-y-2'>
        {list.map((t) => (
          <li key={t.id} className='border rounded p-3 text-sm'>
            {t.rego} • {t.name} • {t.active ? 'Active' : 'Inactive'}
          </li>
        ))}
      </ul>
    </div>
  )
}

