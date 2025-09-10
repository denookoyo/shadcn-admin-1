import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { db, type Product } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type CsvRow = Partial<Pick<Product, 'title'|'slug'|'price'|'type'|'seller'|'img'>> & { barcode?: string }

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const row: any = {}
    header.forEach((h, idx) => (row[h] = (cols[idx] || '').trim()))
    if (!row.title) continue
    if (row.price) row.price = Number(row.price)
    rows.push(row)
  }
  return rows
}

function ImportCsvPage() {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<CsvRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; failed: number }>({ created: 0, failed: 0 })

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    const text = await f.text()
    const parsed = parseCsv(text)
    setRows(parsed)
  }

  async function runImport() {
    setImporting(true)
    let created = 0
    let failed = 0
    for (const r of rows) {
      try {
        await db.createProduct({
          title: r.title!,
          slug: r.slug || r.title!.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          price: Number(r.price || 0),
          type: (r.type as any) === 'service' ? 'service' : 'goods',
          seller: r.seller || 'You',
          img: r.img || '',
          barcode: (r as any).barcode || undefined,
        } as any)
        created++
      } catch {
        failed++
      }
    }
    setResult({ created, failed })
    setImporting(false)
  }

  return (
    <div className='mx-auto max-w-3xl px-4 py-8'>
      <div className='mb-4 flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Import Products (CSV)</h1>
        <Link to='/marketplace/dashboard' className='rounded-md border px-3 py-2 text-sm'>Back</Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='mb-3 text-sm text-gray-600'>Columns supported: title, slug, price, type (goods|service), seller, img, barcode</p>
          <Input type='file' accept='.csv' onChange={onFile} />
          {fileName && <div className='mt-2 text-xs text-gray-500'>Selected: {fileName} ({rows.length} rows)</div>}
          <div className='mt-4'>
            <Button disabled={rows.length===0 || importing} onClick={runImport}>{importing ? 'Importing…' : 'Start Import'}</Button>
          </div>
          {(result.created+result.failed)>0 && (
            <div className='mt-3 text-sm'>Created: {result.created} • Failed: {result.failed}</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/import')({
  component: ImportCsvPage,
})

