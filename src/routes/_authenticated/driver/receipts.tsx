import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { db } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_authenticated/driver/receipts')({
  component: Page,
})

function Page() {
  const [list, setList] = useState<any[]>([])
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [liters, setLiters] = useState('0')
  const [amount, setAmount] = useState('0')
  const [odometer, setOdo] = useState('')

  useEffect(() => { (async () => setList((await db.listMyFuelReceipts?.()) || []))() }, [])

  async function submit() {
    await db.createFuelReceipt?.({ date, liters: Number(liters||0), amount: Number(amount||0), odometer: odometer? Number(odometer): undefined })
    setList((await db.listMyFuelReceipts?.()) || [])
    setLiters('0'); setAmount('0'); setOdo('')
  }

  return (
    <div className='space-y-6'>
      <h2 className='text-lg font-semibold'>Fuel Receipt</h2>
      <div className='grid gap-3 max-w-md'>
        <label className='text-sm'>Date</label>
        <Input type='date' value={date} onChange={(e) => setDate(e.target.value)} />
        <label className='text-sm'>Liters</label>
        <Input value={liters} onChange={(e) => setLiters(e.target.value)} />
        <label className='text-sm'>Amount (cents)</label>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
        <label className='text-sm'>Odometer</label>
        <Input value={odometer} onChange={(e) => setOdo(e.target.value)} />
        <Button onClick={submit}>Submit</Button>
      </div>
      <h3 className='text-base font-medium'>My Receipts</h3>
      <ul className='space-y-2'>
        {list.map((r) => (
          <li key={r.id} className='border rounded p-3 text-sm'>
            {new Date(r.date).toISOString().slice(0,10)} • {r.liters}L • ${(r.amount/100).toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  )
}

