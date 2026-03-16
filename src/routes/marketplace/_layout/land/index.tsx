import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MapPin, Droplets, ShieldCheck, Sparkles, PhoneCall, MessageCircle, Images } from 'lucide-react'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { listLandListings, createLandListing, formatKes, formatAcreage, type LandListing } from '@/features/land/data'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SafeImg } from '@/components/safe-img'
import { useAuthStore } from '@/stores/authStore'
import { getSellerStatus, SELLER_VERIFICATION_EVENT } from '@/features/sellers/verification'

const counties = ['Kajiado', 'Nakuru', 'Kilifi', 'Laikipia', 'Narok', 'Machakos', 'Nyeri', 'Kiambu', 'Elgeyo-Marakwet']
const zoningOptions = ['residential', 'mixed-use', 'agricultural', 'commercial'] as const

const statusLabel: Record<LandListing['status'], { label: string; classes: string }> = {
  available: { label: 'Open to offers', classes: 'bg-emerald-50 text-emerald-700' },
  offer_received: { label: 'Offer received', classes: 'bg-amber-50 text-amber-700' },
  reserved: { label: 'Reserved', classes: 'bg-slate-200 text-slate-700' },
}

type SubmissionFormState = {
  title: string
  county: string
  town: string
  acreage: string
  priceKes: string
  pricePerAcreKes: string
  zoning: LandListing['zoning']
  listingType: 'freehold' | 'leasehold'
  description: string
  highlights: string
  documents: string
  photoUrls: string
  roadAccess: string
  water: string
  sellerName: string
  sellerPhone: string
  sellerEmail: string
  sellerWhatsapp: string
}

const emptySubmission: SubmissionFormState = {
  title: '',
  county: 'Kajiado',
  town: '',
  acreage: '1',
  priceKes: '1500000',
  pricePerAcreKes: '1500000',
  zoning: 'residential',
  listingType: 'freehold',
  description: '',
  highlights: '',
  documents: '',
  photoUrls: '',
  roadAccess: '',
  water: '',
  sellerName: '',
  sellerPhone: '',
  sellerEmail: '',
  sellerWhatsapp: '',
}

type ViewingRequest = {
  fullName: string
  email: string
  phone: string
  date: string
  notes: string
}

const emptyRequest: ViewingRequest = {
  fullName: '',
  email: '',
  phone: '',
  date: '',
  notes: '',
}

export const Route = createFileRoute('/marketplace/_layout/land/')({
  component: KenyaLandPage,
})

function KenyaLandPage() {
  const user = useAuthStore((s) => s.auth.user as any | null)
  const userEmail = user?.email as string | undefined
  const [listings, setListings] = useState<LandListing[]>([])
  const [loadingListings, setLoadingListings] = useState(true)
  const [form, setForm] = useState<SubmissionFormState>(emptySubmission)
  const [submitting, setSubmitting] = useState(false)
  const [activeListing, setActiveListing] = useState<LandListing | null>(null)
  const [viewingRequest, setViewingRequest] = useState<ViewingRequest>(emptyRequest)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [verificationVersion, setVerificationVersion] = useState(0)
  const isSignedIn = Boolean(user)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => setVerificationVersion((prev) => prev + 1)
    window.addEventListener(SELLER_VERIFICATION_EVENT, handler)
    return () => window.removeEventListener(SELLER_VERIFICATION_EVENT, handler)
  }, [])
  const sellerStatus = useMemo(() => getSellerStatus(userEmail), [userEmail, verificationVersion])
  const isPrivileged = useMemo(() => {
    const role = String(user?.role ?? '').toLowerCase()
    return role === 'admin' || role === 'manager'
  }, [user])
  const isActiveSeller = sellerStatus === 'approved' || isPrivileged

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const items = await listLandListings()
        if (!mounted) return
        setListings(items)
      } finally {
        if (mounted) setLoadingListings(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!activeListing) {
      setViewingRequest(emptyRequest)
      return
    }
    setViewingRequest((prev) => ({
      ...prev,
      notes: prev.notes || `Interested in ${activeListing.title}. Kindly share title copies and payment plan.`,
    }))
  }, [activeListing])

  const totalAcreage = useMemo(() => listings.reduce((acc, item) => acc + (Number(item.acreage) || 0), 0), [listings])
  const totalValue = useMemo(() => listings.reduce((acc, item) => acc + (Number(item.priceKes) || 0), 0), [listings])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isActiveSeller) {
      toast.error('Only signed-in, operations-approved sellers can post land. Head to the seller cockpit to finish onboarding.')
      return
    }
    setSubmitting(true)
    try {
      const gallery = form.photoUrls
        .split(/\n|,/)
        .map((url) => url.trim())
        .filter(Boolean)
        .map(ensureUrl)
      const highlights = splitToList(form.highlights, ['\n', ','])
      const documents = splitToList(form.documents, ['\n', ','])
      if (!form.title || !form.town || !form.sellerPhone) {
        throw new Error('Kindly add a title, locality, and seller phone number.')
      }
      const payload = await createLandListing({
        title: form.title,
        county: form.county,
        town: form.town,
        acreage: Number(form.acreage) || 1,
        priceKes: Number(form.priceKes) || 0,
        pricePerAcreKes: Number(form.pricePerAcreKes) || undefined,
        zoning: form.zoning,
        listingType: form.listingType,
        description: form.description || 'Prime parcel ready for immediate sale.',
        highlights,
        documents,
        utilities: [
          { label: 'Power nearby', available: true },
          { label: 'Water source noted', available: Boolean(form.water), notes: form.water },
        ],
        roadAccess: form.roadAccess,
        water: form.water,
        seller: {
          name: form.sellerName || 'Owner',
          phone: form.sellerPhone,
          email: form.sellerEmail,
          whatsapp: form.sellerWhatsapp || form.sellerPhone,
        },
        gallery,
      })
      setListings((prev) => [payload, ...prev])
      setForm(emptySubmission)
      toast.success('Land listing saved in your browser ledger.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save land listing yet.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleViewingRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeListing) return
    setSendingRequest(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 600))
      toast.success(`Viewing enquiry shared with ${activeListing.seller.name}`)
      setActiveListing(null)
      setViewingRequest(emptyRequest)
    } finally {
      setSendingRequest(false)
    }
  }

  return (
    <MarketplacePageShell width='wide' className='space-y-10' topSpacing='lg' bottomSpacing='lg'>
      <header className='rounded-3xl border border-emerald-100/70 bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400 p-6 text-white shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='max-w-2xl space-y-2'>
            <span className='inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide'>
              <Sparkles className='h-3.5 w-3.5' /> Kenya land exchange
            </span>
            <h1 className='text-3xl font-semibold'>List Kenyan land, share photos, and invite qualified buyers</h1>
            <p className='text-sm text-emerald-50'>Centralise acreage across counties, keep documentation in one place, and let buyers request guided visits without leaving Hedgetech.</p>
          </div>
          <div className='rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-emerald-50'>
            <div>Total inventory: <span className='font-semibold'>{formatAcreage(totalAcreage)}</span></div>
            <div>Value on platform: <span className='font-semibold'>{formatKes(totalValue)}</span></div>
            <div>Active mandates: <span className='font-semibold'>{listings.length}</span></div>
          </div>
        </div>
      </header>

      <div className='grid gap-8 lg:grid-cols-[1.2fr_0.8fr]'>
        <section className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-slate-900'>Available Kenyan parcels</h2>
            <Badge variant='outline' className='border-emerald-200 text-emerald-700'>Buyer ready</Badge>
          </div>
          {loadingListings ? (
            <div className='rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500'>Refreshing inventory...</div>
          ) : listings.length === 0 ? (
            <div className='rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500'>No land uploaded yet. Start with the form to the right.</div>
          ) : (
            <div className='grid gap-4 md:grid-cols-2'>
              {listings.map((parcel) => (
                <Card key={parcel.id} className='flex h-full flex-col overflow-hidden border-slate-200'>
                  <CardContent className='flex flex-1 flex-col gap-4 p-0'>
                    <SafeImg src={parcel.gallery[0]} alt={parcel.title} className='h-52 w-full object-cover' />
                    <div className='flex flex-1 flex-col gap-3 p-4'>
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div>
                          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                            {parcel.county} • {parcel.zoning.replace('-', ' ')}
                          </div>
                          <h3 className='text-base font-semibold text-slate-900'>{parcel.title}</h3>
                        </div>
                        <div className='text-right'>
                          <div className='text-xs text-slate-500'>Total ask</div>
                          <div className='text-xl font-semibold text-emerald-700'>{formatKes(parcel.priceKes)}</div>
                          <div className='text-xs text-slate-500'>{formatAcreage(parcel.acreage)} • {formatKes(parcel.pricePerAcreKes)}/ac</div>
                        </div>
                      </div>
                      <p className='text-sm text-slate-600 line-clamp-3'>{parcel.description}</p>
                      <div className='flex flex-wrap gap-2'>
                        {parcel.highlights.slice(0, 3).map((point) => (
                          <span key={point} className='rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700'>
                            {point}
                          </span>
                        ))}
                      </div>
                      <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500'>
                        <span className='inline-flex items-center gap-1 text-emerald-700'>
                          <MapPin className='h-3.5 w-3.5' />
                          {parcel.town}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusLabel[parcel.status].classes}`}>
                          {statusLabel[parcel.status].label}
                        </span>
                      </div>
                      <Button variant='default' className='mt-auto w-full rounded-full' onClick={() => setActiveListing(parcel)}>
                        Arrange viewing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className='space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div>
            <h2 className='text-lg font-semibold text-slate-900'>Post your parcel</h2>
            <p className='text-sm text-slate-500'>Share verified details. Add-ons sit under Account → Seller operations so only approved teams can post.</p>
          </div>
          {!isSignedIn ? (
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600'>
              <p className='text-base font-semibold text-slate-900'>Sign in to continue</p>
              <p className='mt-1 text-xs text-slate-500'>Land intake belongs to seller account operations. Sign in so we can confirm your workspace and permissions.</p>
              <div className='mt-4 flex flex-wrap gap-3 text-sm'>
                <Link
                  to='/sign-in'
                  search={{ redirect: '/marketplace/land' }}
                  className='inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-emerald-500'
                >
                  Sign in
                </Link>
                <Link
                  to='/marketplace/dashboard'
                  className='inline-flex items-center rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100'
                >
                  Open seller cockpit
                </Link>
              </div>
            </div>
          ) : !isActiveSeller ? (
            <div className='rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-sm text-amber-900'>
              <p className='text-base font-semibold text-amber-900'>
                {sellerStatus === 'pending'
                  ? 'Your seller verification is under review'
                  : sellerStatus === 'rejected'
                    ? 'Seller verification needs attention'
                    : 'Submit seller verification to unlock land posting'}
              </p>
              <p className='mt-1 text-xs text-amber-800'>
                {sellerStatus === 'pending'
                  ? 'Support has your documents. We will notify you once the review is complete.'
                  : sellerStatus === 'rejected'
                    ? 'Support flagged your last submission. Update your details or contact operations for next steps.'
                    : 'Head to the seller cockpit → Account operations to upload compliance docs. Land listings stay locked until approval.'}
              </p>
              <div className='mt-4 flex flex-wrap gap-3 text-sm'>
                <Link
                  to='/marketplace/dashboard'
                  className='inline-flex items-center rounded-full border border-amber-300 px-4 py-2 font-semibold text-amber-900 transition hover:bg-amber-100'
                >
                  Go to seller operations
                </Link>
                <Link
                  to='/marketplace/dashboard/support'
                  className='inline-flex items-center rounded-full border border-transparent bg-white/70 px-4 py-2 font-semibold text-amber-900 transition hover:bg-white'
                >
                  Ping support
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form className='space-y-4' onSubmit={handleSubmit}>
                <div>
                  <label className='text-xs font-semibold text-slate-500'>Listing title</label>
                  <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder='e.g. 2 acres touching Namanga Highway' required />
                </div>
                <div className='grid gap-3 sm:grid-cols-3'>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>County</label>
                    <select
                      className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm'
                      value={form.county}
                      onChange={(event) => setForm({ ...form, county: event.target.value })}
                    >
                      {counties.map((county) => (
                        <option key={county} value={county}>
                          {county}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Town/Locality</label>
                    <Input value={form.town} onChange={(event) => setForm({ ...form, town: event.target.value })} required />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Zoning</label>
                    <select
                      className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm capitalize'
                      value={form.zoning}
                      onChange={(event) => setForm({ ...form, zoning: event.target.value as SubmissionFormState['zoning'] })}
                    >
                      {zoningOptions.map((zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className='grid gap-3 sm:grid-cols-3'>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Acreage</label>
                    <Input type='number' min='0.125' step='0.125' value={form.acreage} onChange={(event) => setForm({ ...form, acreage: event.target.value })} required />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Total price (KES)</label>
                    <Input type='number' value={form.priceKes} onChange={(event) => setForm({ ...form, priceKes: event.target.value })} required />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Price per acre (KES)</label>
                    <Input type='number' value={form.pricePerAcreKes} onChange={(event) => setForm({ ...form, pricePerAcreKes: event.target.value })} />
                  </div>
                </div>
                <div>
                  <label className='text-xs font-semibold text-slate-500'>Description</label>
                  <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} placeholder='Summarise soil, road access, water, and best use case.' />
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Highlights (comma or newline)</label>
                    <Textarea value={form.highlights} onChange={(event) => setForm({ ...form, highlights: event.target.value })} rows={2} />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Documents ready</label>
                    <Textarea value={form.documents} onChange={(event) => setForm({ ...form, documents: event.target.value })} rows={2} placeholder='e.g. Title deed, search, mutation.' />
                  </div>
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Road access</label>
                    <Input value={form.roadAccess} onChange={(event) => setForm({ ...form, roadAccess: event.target.value })} placeholder='e.g. 800m off Mombasa Road on all-weather murram' />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Water source</label>
                    <Input value={form.water} onChange={(event) => setForm({ ...form, water: event.target.value })} placeholder='e.g. Borehole + county water line' />
                  </div>
                </div>
                <div>
                  <label className='text-xs font-semibold text-slate-500'>Photo URLs (comma or newline)</label>
                  <Textarea value={form.photoUrls} onChange={(event) => setForm({ ...form, photoUrls: event.target.value })} rows={2} placeholder='https://...' />
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Seller / contact name</label>
                    <Input value={form.sellerName} onChange={(event) => setForm({ ...form, sellerName: event.target.value })} />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Phone (required)</label>
                    <Input value={form.sellerPhone} onChange={(event) => setForm({ ...form, sellerPhone: event.target.value })} required />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Email</label>
                    <Input type='email' value={form.sellerEmail} onChange={(event) => setForm({ ...form, sellerEmail: event.target.value })} />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>WhatsApp line</label>
                    <Input value={form.sellerWhatsapp} onChange={(event) => setForm({ ...form, sellerWhatsapp: event.target.value })} placeholder='+2547...' />
                  </div>
                </div>
                <Button type='submit' className='w-full rounded-full' disabled={submitting}>
                  {submitting ? 'Saving...' : 'Publish to land board'}
                </Button>
              </form>
              <div className='rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500'>
                <p className='font-semibold text-slate-700'>What happens next?</p>
                <ul className='mt-2 list-disc space-y-1 pl-4'>
                  <li>Listings stay in your browser until an API backend is connected.</li>
                  <li>Buyers can request escorted site visits via the Arrange Viewing button.</li>
                  <li>Use clear photos and highlight existing beacons to build trust.</li>
                </ul>
              </div>
            </>
          )}
        </section>
      </div>

      <Sheet open={Boolean(activeListing)} onOpenChange={(open) => { if (!open) setActiveListing(null) }}>
        <SheetContent side='right' className='w-full overflow-y-auto sm:max-w-lg'>
          {activeListing ? (
            <>
              <SheetHeader>
                <SheetTitle>{activeListing.title}</SheetTitle>
                <SheetDescription>
                  {activeListing.county} • {formatAcreage(activeListing.acreage)} • {formatKes(activeListing.priceKes)}
                </SheetDescription>
              </SheetHeader>
              <div className='space-y-4 px-4'>
                <div className='space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600'>
                  <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    <Images className='h-3.5 w-3.5 text-emerald-600' /> Media kit
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    {activeListing.gallery.map((img) => (
                      <SafeImg key={img} src={img} alt={activeListing.title} className='h-24 w-full rounded-xl object-cover' loading='lazy' />
                    ))}
                  </div>
                </div>
                <div className='grid gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm text-slate-600'>
                  <div className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    <Droplets className='h-3.5 w-3.5 text-emerald-600' /> Site notes
                  </div>
                  {activeListing.water ? <div>Water: {activeListing.water}</div> : null}
                  {activeListing.roadAccess ? <div>Road access: {activeListing.roadAccess}</div> : null}
                  <div>Documents: {activeListing.documents.join(' • ')}</div>
                </div>
                <div className='rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-sm text-emerald-900'>
                  <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                    <ShieldCheck className='h-3.5 w-3.5' /> Seller
                  </div>
                  <div className='mt-1 font-semibold'>{activeListing.seller.name}</div>
                  <div className='text-xs text-emerald-800'>{activeListing.seller.phone}</div>
                  {activeListing.seller.email ? <div className='text-xs text-emerald-800'>{activeListing.seller.email}</div> : null}
                  <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                    {telHref(activeListing.seller.phone) ? (
                      <Button variant='outline' className='w-full rounded-full text-xs' asChild>
                        <a href={telHref(activeListing.seller.phone)!}>
                          <PhoneCall className='h-4 w-4' />
                          Call seller
                        </a>
                      </Button>
                    ) : null}
                    {whatsappHref(activeListing.seller.whatsapp || activeListing.seller.phone) ? (
                      <Button variant='outline' className='w-full rounded-full text-xs' asChild>
                        <a href={whatsappHref(activeListing.seller.whatsapp || activeListing.seller.phone)!} target='_blank' rel='noreferrer'>
                          <MessageCircle className='h-4 w-4' />
                          WhatsApp
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
                <form className='space-y-3 rounded-2xl border border-slate-200 bg-white p-4' onSubmit={handleViewingRequest}>
                  <p className='text-sm font-semibold text-slate-900'>Arrange a guided viewing</p>
                  <Input placeholder='Your full name' value={viewingRequest.fullName} onChange={(event) => setViewingRequest({ ...viewingRequest, fullName: event.target.value })} required />
                  <Input type='email' placeholder='Email' value={viewingRequest.email} onChange={(event) => setViewingRequest({ ...viewingRequest, email: event.target.value })} required />
                  <Input placeholder='Phone or WhatsApp' value={viewingRequest.phone} onChange={(event) => setViewingRequest({ ...viewingRequest, phone: event.target.value })} required />
                  <Input type='date' value={viewingRequest.date} onChange={(event) => setViewingRequest({ ...viewingRequest, date: event.target.value })} required />
                  <Textarea placeholder='Notes, preferred time, financing needs...' value={viewingRequest.notes} onChange={(event) => setViewingRequest({ ...viewingRequest, notes: event.target.value })} rows={3} />
                  <Button type='submit' className='w-full rounded-full' disabled={sendingRequest}>
                    {sendingRequest ? 'Submitting...' : 'Send request'}
                  </Button>
                </form>
                <div className='text-xs text-slate-500'>We email + SMS the seller profile above and loop in operations for escrow if you enable payouts.</div>
              </div>
              <SheetFooter />
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </MarketplacePageShell>
  )
}

function splitToList(source: string, delimiters: string[]) {
  if (!source.trim()) return []
  const escaped = delimiters.map((delimiter) => delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(escaped.join('|'), 'g')
  return source
    .split(pattern)
    .map((item) => item.trim())
    .filter(Boolean)
}

function ensureUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function telHref(phone: string) {
  if (!phone) return undefined
  const cleaned = phone.replace(/[^0-9+]/g, '')
  return cleaned ? `tel:${cleaned}` : undefined
}

function whatsappHref(phone?: string) {
  if (!phone) return undefined
  let digits = phone.replace(/[^0-9]/g, '')
  if (!digits) return undefined
  if (digits.startsWith('0')) {
    digits = `254${digits.slice(1)}`
  } else if (digits.startsWith('7')) {
    digits = `254${digits}`
  }
  return `https://wa.me/${digits}`
}
