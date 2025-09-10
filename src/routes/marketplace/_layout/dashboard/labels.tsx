import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { db, type Product } from '@/lib/data'
import { Button } from '@/components/ui/button'

declare global {
  interface Window { JsBarcode?: any }
}

function useScript(src: string) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => setLoaded(true)
    document.body.appendChild(s)
    return () => { document.body.removeChild(s) }
  }, [src])
  return loaded
}

function LabelsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const jsbReady = useScript('https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js')

  useEffect(() => { (async () => setProducts(await db.listProducts()))() }, [])

  const mine = useMemo(() => products.filter((p: any) => p.barcode), [products])

  useEffect(() => {
    if (!jsbReady || !window.JsBarcode) return
    mine.forEach((p) => {
      const sel = `#bc-${p.id}`
      try { window.JsBarcode(sel, p.barcode, { format: 'auto', lineColor: '#000', width: 2, height: 60, displayValue: true, fontSize: 12 }) } catch {}
    })
  }, [jsbReady, mine])

  return (
    <div className='mx-auto max-w-5xl px-6 py-6'>
      <div className='mb-4 flex items-center justify-between print:hidden'>
        <h1 className='text-2xl font-bold'>Print Labels</h1>
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => window.print()}>Print</Button>
          <Link to='/marketplace/dashboard' className='rounded-md border px-3 py-2 text-sm'>Back</Link>
        </div>
      </div>

      {mine.length === 0 ? (
        <div className='text-sm text-gray-500'>No products with barcodes. Add barcodes first.</div>
      ) : (
        <div className='grid grid-cols-2 gap-4 md:grid-cols-3 print:grid-cols-3'>
          {mine.map((p) => (
            <div key={p.id} className='flex flex-col items-center justify-center rounded border p-3'>
              <div className='mb-1 text-xs font-medium'>{p.title}</div>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <svg id={`bc-${p.id}`}></svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/labels')({
  component: LabelsPage,
})

