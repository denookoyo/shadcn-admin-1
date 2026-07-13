import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Eye, CheckCircle2, AlertCircle } from 'lucide-react'
import { db, type Product, uploadMarketplaceAsset } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { buildGangLedgerSignInUrl, marketplaceConsumerMode } from '@/lib/marketplace-consumer'

export type ProductEditorMode = 'create' | 'edit'

export type ProductEditorProps = {
  mode: ProductEditorMode
  product?: Product
}

type FormState = {
  title: string
  slug: string
  description: string
  price: number
  type: Product['type']
  seller: string
  img: string
  gallery: string[]
  barcode?: string
  barcodeText: string
  stockCount: number
  serviceOpenDays: string[]
  serviceOpenTime: string
  serviceCloseTime: string
  serviceDurationMinutes: number
  serviceDailyCapacity: number
}

const emptyState: FormState = {
  title: '',
  slug: '',
  description: '',
  price: 0,
  type: 'goods',
  seller: 'You',
  img: '',
  gallery: [],
  barcode: '',
  barcodeText: '',
  stockCount: 0,
  serviceOpenDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  serviceOpenTime: '09:00',
  serviceCloseTime: '17:00',
  serviceDurationMinutes: 60,
  serviceDailyCapacity: 8,
}

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

function ensureAbsoluteUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return `https://${url}`
}

function normalizeEditorError(error: unknown) {
  const raw = error instanceof Error ? error.message : 'Unable to save product'
  const normalized = raw.trim().toLowerCase()
  if (
    marketplaceConsumerMode &&
    (normalized === 'unauthorized' ||
      normalized === 'forbidden' ||
      normalized.includes('access token') ||
      normalized.includes('bearer token'))
  ) {
    return 'Your Gang Ledger marketplace session has expired or no longer has seller access. Sign in again, then reopen the listing editor.'
  }
  return raw
}

const WEEKDAY_OPTIONS = [
  { label: 'Mon', value: 'monday' },
  { label: 'Tue', value: 'tuesday' },
  { label: 'Wed', value: 'wednesday' },
  { label: 'Thu', value: 'thursday' },
  { label: 'Fri', value: 'friday' },
  { label: 'Sat', value: 'saturday' },
  { label: 'Sun', value: 'sunday' },
]

export function ProductEditor({ mode, product }: ProductEditorProps) {
  const { user } = useAuthStore((state) => state.auth)
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(() => {
    if (mode === 'edit' && product) {
      return {
        title: product.title,
        slug: product.slug,
        description: product.description ?? '',
        price: product.price,
        type: product.type,
        seller: product.seller,
        img: product.img,
        gallery: product.images ?? [],
        barcode: product.barcode,
        barcodeText: Array.isArray((product as any)?.barcodes) ? ((product as any).barcodes as string[]).join('\n') : '',
        stockCount: Number((product as any)?.stockCount ?? (product as any)?.inventory ?? 0),
        serviceOpenDays: Array.isArray((product as any)?.serviceOpenDays) && (product as any)?.serviceOpenDays.length
          ? ((product as any)?.serviceOpenDays as string[])
          : emptyState.serviceOpenDays,
        serviceOpenTime: (product as any)?.serviceOpenTime || emptyState.serviceOpenTime,
        serviceCloseTime: (product as any)?.serviceCloseTime || emptyState.serviceCloseTime,
        serviceDurationMinutes: Number((product as any)?.serviceDurationMinutes ?? emptyState.serviceDurationMinutes),
        serviceDailyCapacity: Number((product as any)?.serviceDailyCapacity ?? emptyState.serviceDailyCapacity),
      }
    }
    return emptyState
  })
  const [imageDraft, setImageDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && product) {
      setForm({
        title: product.title,
        slug: product.slug,
        description: product.description ?? '',
        price: product.price,
        type: product.type,
        seller: product.seller,
        img: product.img,
        gallery: product.images ?? [],
        barcode: product.barcode,
        barcodeText: Array.isArray((product as any)?.barcodes) ? ((product as any).barcodes as string[]).join('\n') : '',
        stockCount: Number((product as any)?.stockCount ?? (product as any)?.inventory ?? 0),
        serviceOpenDays: Array.isArray((product as any)?.serviceOpenDays) && (product as any)?.serviceOpenDays.length
          ? ((product as any)?.serviceOpenDays as string[])
          : emptyState.serviceOpenDays,
        serviceOpenTime: (product as any)?.serviceOpenTime || emptyState.serviceOpenTime,
        serviceCloseTime: (product as any)?.serviceCloseTime || emptyState.serviceCloseTime,
        serviceDurationMinutes: Number((product as any)?.serviceDurationMinutes ?? emptyState.serviceDurationMinutes),
        serviceDailyCapacity: Number((product as any)?.serviceDailyCapacity ?? emptyState.serviceDailyCapacity),
      })
    }
  }, [mode, product])

  const previewGallery = useMemo(() => {
    if (!form.gallery.length && form.img) return [form.img]
    return form.gallery
  }, [form.gallery, form.img])

  const normalizedBarcodes = useMemo(
    () =>
      Array.from(
        new Set(
          form.barcodeText
            .split(/[\n,;]+/)
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ),
    [form.barcodeText],
  )

  const isService = form.type === 'service'
  const openTimeLabel = form.serviceOpenTime || '09:00'
  const closeTimeLabel = form.serviceCloseTime || '17:00'
  const serviceWindow = `${openTimeLabel} – ${closeTimeLabel}`
  const openDaySummary = form.serviceOpenDays.length
    ? form.serviceOpenDays
        .map((day) => day.slice(0, 3).toUpperCase())
        .join(' · ')
    : 'Set availability'

  function updateServiceDay(day: string, enabled: boolean) {
    setForm((state) => {
      const nextSet = new Set(state.serviceOpenDays.map((item) => item.toLowerCase()))
      if (enabled) {
        nextSet.add(day)
      } else {
        nextSet.delete(day)
      }
      const ordered = WEEKDAY_OPTIONS.filter((opt) => nextSet.has(opt.value)).map((opt) => opt.value)
      return { ...state, serviceOpenDays: ordered }
    })
  }

  async function handleSubmit(publish: boolean) {
    setSaving(true)
    setError(null)
    try {
      const userId = (user as any)?.id
      const resolvedOwnerId = (() => {
        const numericId = Number(userId)
        if (Number.isFinite(numericId) && numericId > 0) return numericId
        return undefined
      })()
      const stockCount = Math.max(0, Number(form.stockCount) || 0)
      const resolvedStockCount = isService ? 0 : normalizedBarcodes.length > 0 ? normalizedBarcodes.length : stockCount
      const serviceDurationMinutes = Math.max(15, Number(form.serviceDurationMinutes) || 60)
      const serviceDailyCapacity = Math.max(1, Number(form.serviceDailyCapacity) || 1)
      const serviceOpenTime = (form.serviceOpenTime || '09:00').slice(0, 5)
      const serviceCloseTime = (form.serviceCloseTime || '17:00').slice(0, 5)
      const payload: Omit<Product, 'id'> = {
        title: form.title.trim(),
        slug: form.slug || slugify(form.title),
        price: Number(form.price) || 0,
        seller: form.seller || 'You',
        rating: product?.rating,
        type: form.type,
        img: ensureAbsoluteUrl(form.img),
        barcode: form.barcode?.trim() || normalizedBarcodes[0] || undefined,
        barcodes: isService ? [] : normalizedBarcodes,
        description: form.description.trim() || undefined,
        images: form.gallery.length ? form.gallery.map(ensureAbsoluteUrl) : undefined,
        categoryId: product?.categoryId,
        stockCount: resolvedStockCount,
        serviceOpenDays: isService ? form.serviceOpenDays : [],
        serviceOpenTime: isService ? serviceOpenTime : undefined,
        serviceCloseTime: isService ? serviceCloseTime : undefined,
        serviceDurationMinutes: isService ? serviceDurationMinutes : undefined,
        serviceDailyCapacity: isService ? serviceDailyCapacity : undefined,
      }

      if (resolvedOwnerId !== undefined) {
        ;(payload as any).ownerId = resolvedOwnerId
      }

      if (!payload.title) throw new Error('Title is required')
      if (!payload.slug) throw new Error('Slug is required')
      if (payload.price <= 0) throw new Error('Price must be greater than zero')

      if (mode === 'create') {
        const created = await db.createProduct(payload)
        setPublished(publish)
        await navigate({ to: '/marketplace/dashboard/listings/product', search: { id: created.id } })
      } else if (product) {
        await db.updateProduct(product.id, payload)
        setPublished(publish)
        await navigate({ to: '/marketplace/dashboard/listings' })
      }
    } catch (err: unknown) {
      const message = normalizeEditorError(err)
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  function addImage() {
    const url = ensureAbsoluteUrl(imageDraft.trim())
    if (!url) return
    setForm((state) => ({ ...state, gallery: Array.from(new Set([...state.gallery, url])) }))
    setImageDraft('')
  }

  function removeImage(url: string) {
    setForm((state) => ({ ...state, gallery: state.gallery.filter((img) => img !== url) }))
  }

  async function uploadPrimaryImage(file?: File | null) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const uploaded = await uploadMarketplaceAsset(file)
      setForm((state) => ({ ...state, img: uploaded.blobUrl }))
    } catch (err: unknown) {
      setError(normalizeEditorError(err))
    } finally {
      setUploading(false)
    }
  }

  async function uploadGalleryImages(fileList: FileList | null) {
    if (!fileList?.length) return
    setUploading(true)
    setError(null)
    try {
      const uploads = await Promise.all(Array.from(fileList).map((file) => uploadMarketplaceAsset(file)))
      const urls = uploads.map((item) => item.blobUrl)
      setForm((state) => ({
        ...state,
        img: state.img || urls[0] || '',
        gallery: Array.from(new Set([...state.gallery, ...urls])),
      }))
    } catch (err: unknown) {
      setError(normalizeEditorError(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <MarketplacePageShell width='xl' className='grid gap-6 lg:gap-8 xl:grid-cols-[1.1fr_0.9fr]'>
      <section className='space-y-6'>
        <header className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <p className='text-xs font-semibold uppercase tracking-wide text-emerald-600'>Product {mode === 'create' ? 'composer' : 'editor'}</p>
            <h1 className='text-xl font-semibold text-slate-900 sm:text-2xl'>{mode === 'create' ? 'Create a new listing' : `Editing ${product?.title}`}</h1>
            <p className='mt-1 text-sm text-slate-600'>Craft compelling content, then preview the buyer experience before publishing.</p>
          </div>
          <div className='grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3'>
            <Button variant='outline' className='w-full' onClick={() => navigate({ to: '/marketplace/dashboard/listings' })}>
              Cancel
            </Button>
            <Button variant='secondary' className='w-full' disabled={saving} onClick={() => handleSubmit(false)}>
              {saving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
              Save draft
            </Button>
            <Button className='w-full' disabled={saving} onClick={() => handleSubmit(true)}>
              {saving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
              Publish changes
            </Button>
          </div>
        </header>

        {error ? (
          <div className='flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-start gap-2'>
              <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
              <span>{error}</span>
            </div>
            {marketplaceConsumerMode && error.toLowerCase().includes('gang ledger marketplace session') ? (
              <a
                href={buildGangLedgerSignInUrl('/marketplace/dashboard/listings')}
                className='inline-flex items-center justify-center rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100'
              >
                Sign in again
              </a>
            ) : null}
          </div>
        ) : null}
        {published ? (
          <div className='flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
            <CheckCircle2 className='h-4 w-4' />
            Listing saved — now live in the marketplace catalogue.
          </div>
        ) : null}

        <div className='space-y-6 rounded-4xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='title'>Product title</Label>
              <Input
                id='title'
                placeholder='Hedgetech premium toolkit'
                value={form.title}
                onChange={(event) => {
                  const value = event.target.value
                  setForm((state) => ({ ...state, title: value, slug: mode === 'create' ? slugify(value) : state.slug }))
                }}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='slug'>Slug</Label>
              <Input
                id='slug'
                placeholder='hedgetech-premium-toolkit'
                value={form.slug}
                onChange={(event) => setForm((state) => ({ ...state, slug: slugify(event.target.value) }))}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='price'>Price (A$)</Label>
              <Input
                id='price'
                type='number'
                min={0}
                value={form.price}
                onChange={(event) => setForm((state) => ({ ...state, price: Number(event.target.value) }))}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='stockCount'>Stock count</Label>
              <Input
                id='stockCount'
                type='number'
                min={0}
                value={form.stockCount}
                onChange={(event) => setForm((state) => ({ ...state, stockCount: Number(event.target.value) }))}
                disabled={!isService && normalizedBarcodes.length > 0}
              />
              {!isService && normalizedBarcodes.length > 0 ? (
                <p className='text-xs text-slate-500'>Derived from barcode units below.</p>
              ) : null}
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='type'>Listing type</Label>
              <select
                id='type'
                value={form.type}
                onChange={(event) => setForm((state) => ({ ...state, type: event.target.value as Product['type'] }))}
                className='w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
              >
                <option value='goods'>Goods</option>
                <option value='service'>Service</option>
              </select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='barcode'>Barcode / SKU</Label>
              <Input
                id='barcode'
                placeholder='Optional'
                value={form.barcode ?? ''}
                onChange={(event) => setForm((state) => ({ ...state, barcode: event.target.value }))}
              />
              <p className='text-xs text-slate-500'>Primary fallback code. Bulk stock barcodes can be added separately.</p>
            </div>
          </div>

          {!isService ? (
            <div className='space-y-2'>
              <Label htmlFor='barcodeText'>Stock barcodes</Label>
              <Textarea
                id='barcodeText'
                placeholder={'ABC-001\nABC-002\nABC-003'}
                rows={7}
                value={form.barcodeText}
                onChange={(event) => {
                  const nextBarcodeText = event.target.value
                  const count = Array.from(
                    new Set(
                      nextBarcodeText
                        .split(/[\n,;]+/)
                        .map((value) => value.trim())
                        .filter(Boolean),
                    ),
                  ).length
                  setForm((state) => ({
                    ...state,
                    barcodeText: nextBarcodeText,
                    stockCount: count > 0 ? count : state.stockCount,
                  }))
                }}
              />
              <p className='text-xs text-slate-500'>One code per line. When provided, stock is kept from these barcode units.</p>
            </div>
          ) : null}

          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              placeholder='Craft a concise pitch, include materials, sizing, delivery expectations…'
              rows={6}
              value={form.description}
              onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))}
            />
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='primary-image'>Primary image URL</Label>
              <Input
                id='primary-image'
                placeholder='https://cdn.hedgetech.market/product.jpg'
                value={form.img}
                onChange={(event) => setForm((state) => ({ ...state, img: event.target.value }))}
              />
              <Input
                type='file'
                accept='image/*'
                disabled={uploading}
                onChange={(event) => {
                  void uploadPrimaryImage(event.target.files?.[0] ?? null)
                  event.currentTarget.value = ''
                }}
              />
              <p className='text-xs text-slate-500'>Use a 1200 x 1200 px image for best results.</p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='gallery'>Add gallery image</Label>
              <div className='flex flex-col gap-2 sm:flex-row'>
                <Input
                  id='gallery'
                  placeholder='https://cdn.hedgetech.market/gallery.jpg'
                  value={imageDraft}
                  onChange={(event) => setImageDraft(event.target.value)}
                />
                <Button type='button' variant='outline' className='w-full sm:w-auto' onClick={addImage}>Add</Button>
              </div>
              <Input
                type='file'
                accept='image/*'
                multiple
                disabled={uploading}
                onChange={(event) => {
                  void uploadGalleryImages(event.target.files)
                  event.currentTarget.value = ''
                }}
              />
              {form.gallery.length ? (
                <ul className='space-y-1 text-xs text-slate-600'>
                  {form.gallery.map((url) => (
                    <li key={url} className='flex min-w-0 flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between'>
                      <span className='min-w-0 break-all text-[11px] sm:truncate sm:text-xs'>{url}</span>
                      <button type='button' className='shrink-0 text-left text-emerald-700 hover:underline sm:text-right' onClick={() => removeImage(url)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {uploading ? <p className='text-xs text-slate-500'>Uploading to Gang Ledger...</p> : null}
            </div>
          </div>

          {isService ? (
            <div className='space-y-4 rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4'>
              <div>
                <h3 className='text-sm font-semibold text-emerald-900'>Service availability</h3>
                <p className='text-xs text-emerald-800'>Define the days, hours, and capacity so buyers can book real-time slots.</p>
              </div>
              <div>
                <Label className='text-xs uppercase tracking-wide text-emerald-800'>Service days</Label>
                <div className='mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4'>
                  {WEEKDAY_OPTIONS.map((day) => {
                    const checked = form.serviceOpenDays.includes(day.value)
                    return (
                      <label
                        key={day.value}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-sm transition',
                          checked ? 'border-emerald-400 bg-white text-emerald-900' : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => updateServiceDay(day.value, value === true)}
                        />
                        <span>{day.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='service-open-time'>Opens</Label>
                  <Input
                    id='service-open-time'
                    type='time'
                    value={form.serviceOpenTime}
                    onChange={(event) => setForm((state) => ({ ...state, serviceOpenTime: event.target.value }))}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='service-close-time'>Closes</Label>
                  <Input
                    id='service-close-time'
                    type='time'
                    value={form.serviceCloseTime}
                    onChange={(event) => setForm((state) => ({ ...state, serviceCloseTime: event.target.value }))}
                  />
                </div>
              </div>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='service-duration'>Appointment length (minutes)</Label>
                  <Input
                    id='service-duration'
                    type='number'
                    min={15}
                    step={15}
                    value={form.serviceDurationMinutes}
                    onChange={(event) =>
                      setForm((state) => ({ ...state, serviceDurationMinutes: Number(event.target.value) }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='service-capacity'>Daily capacity</Label>
                  <Input
                    id='service-capacity'
                    type='number'
                    min={1}
                    value={form.serviceDailyCapacity}
                    onChange={(event) =>
                      setForm((state) => ({ ...state, serviceDailyCapacity: Number(event.target.value) }))
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <aside className='space-y-6'>
        <div className='rounded-4xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <h2 className='text-sm font-semibold text-slate-900'>Live preview</h2>
            <span className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600'>
              <Eye className='h-3 w-3' /> Buyer view
            </span>
          </div>
          <div className='mt-4 space-y-4 rounded-3xl border border-slate-100 bg-slate-50 p-4'>
            <div className='aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-white'>
              {previewGallery.length ? (
                <img src={previewGallery[0]} alt='' className='h-full w-full object-cover' />
              ) : (
                <div className='flex h-full items-center justify-center text-xs text-slate-400'>Image preview</div>
              )}
            </div>
            <div className='space-y-2'>
              <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                <h3 className='text-lg font-semibold text-slate-900'>{form.title || 'Untitled product'}</h3>
                <span className='text-lg font-semibold text-emerald-700'>A${(form.price || 0).toLocaleString()}</span>
              </div>
              <p className='text-xs text-slate-500'>Fulfilled by {form.seller || 'your brand'} · {form.type === 'service' ? 'Service listing' : 'Physical goods'}</p>
              <p className='text-sm text-slate-600'>{form.description || 'Add a compelling description to highlight value, materials, or service inclusions.'}</p>
              {previewGallery.length > 1 ? (
                <div className='grid grid-cols-2 gap-2 sm:flex'>
                  {previewGallery.slice(1, 5).map((url) => (
                    <img key={url} src={url} alt='' className='h-16 w-16 rounded-md border border-slate-200 object-cover' />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className='mt-4 grid gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500'>
            {isService ? (
              <>
                <div className='flex items-center justify-between'>
                  <span>Service window</span>
                  <span className='font-semibold text-slate-900'>{serviceWindow}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span>Open days</span>
                  <span className='font-semibold text-slate-900'>{openDaySummary}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span>Daily capacity</span>
                  <span className='font-semibold text-slate-900'>{form.serviceDailyCapacity} slots</span>
                </div>
              </>
            ) : (
              <div className='flex items-center justify-between'>
                <span>Stock on hand</span>
                <span className='font-semibold text-slate-900'>{form.stockCount}</span>
              </div>
            )}
            <div className='flex items-center justify-between'>
              <span>Barcode</span>
              <span className='font-semibold text-slate-900'>{form.barcode || '—'}</span>
            </div>
            {!isService ? (
              <div className='flex items-center justify-between'>
                <span>Tracked barcodes</span>
                <span className='font-semibold text-slate-900'>{normalizedBarcodes.length}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
          <h2 className='text-sm font-semibold text-slate-900'>Launch checklist</h2>
          <ul className='mt-3 space-y-3 text-sm text-slate-600'>
            <li className={cn('rounded-2xl border px-4 py-3', form.title ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50')}>
              <div className='font-semibold text-slate-900'>Write a clear headline</div>
              <p className='text-xs text-slate-500'>Aim for 45 characters including the core differentiator.</p>
            </li>
            <li className={cn('rounded-2xl border px-4 py-3', form.description.length >= 60 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50')}>
              <div className='font-semibold text-slate-900'>Add descriptive copy</div>
              <p className='text-xs text-slate-500'>Call out materials, fulfilment promise, and aftercare.</p>
            </li>
            <li className={cn('rounded-2xl border px-4 py-3', form.img ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50')}>
              <div className='font-semibold text-slate-900'>Upload imagery</div>
              <p className='text-xs text-slate-500'>Include multiple angles for goods or proof-of-outcome for services.</p>
            </li>
          </ul>
        </div>
      </aside>
    </MarketplacePageShell>
  )
}
