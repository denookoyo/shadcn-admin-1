import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MapPin, Droplets, ShieldCheck, Sparkles, PhoneCall, MessageCircle, Images, SlidersHorizontal } from 'lucide-react'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { ChatLauncher } from '@/features/assistant/chat-launcher'
import { listLandListings, createLandListing, formatKes, formatAcreage, type LandListing } from '@/features/land/data'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SafeImg } from '@/components/safe-img'
import { useSellerAccess } from '@/features/sellers/access'

const counties = ['Kajiado', 'Nakuru', 'Kilifi', 'Laikipia', 'Narok', 'Machakos', 'Nyeri', 'Kiambu', 'Elgeyo-Marakwet', 'Nairobi']
const zoningOptions = ['residential', 'mixed-use', 'agricultural', 'commercial'] as const
const assetTypeOptions = ['land', 'house', 'apartment', 'commercial', 'office'] as const

const statusLabel: Record<LandListing['status'], { label: string; classes: string }> = {
  available: { label: 'Open to offers', classes: 'bg-emerald-50 text-emerald-700' },
  offer_received: { label: 'Offer received', classes: 'bg-amber-50 text-amber-700' },
  reserved: { label: 'Reserved', classes: 'bg-slate-200 text-slate-700' },
}

type SubmissionFormState = {
  title: string
  county: string
  town: string
  assetType: LandListing['assetType']
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
  assetType: 'land',
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

const DEFAULT_LAND_CONCIERGE_INTRO = "Hi! I'm evaluating Kenyan real estate on Hedgetech. Could you shortlist viable land and property options, share due diligence packs, and arrange escorted viewings?"

export const Route = createFileRoute('/marketplace/_layout/land/')({
  component: KenyaLandPage,
})

function KenyaLandPage() {
  const { user, sellerStatus, isAdmin } = useSellerAccess()
  const [listings, setListings] = useState<LandListing[]>([])
  const [loadingListings, setLoadingListings] = useState(true)
  const [form, setForm] = useState<SubmissionFormState>(emptySubmission)
  const [submitting, setSubmitting] = useState(false)
  const [activeListing, setActiveListing] = useState<LandListing | null>(null)
  const [viewingRequest, setViewingRequest] = useState<ViewingRequest>(emptyRequest)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [locationFilter, setLocationFilter] = useState('')
  const [countyFilter, setCountyFilter] = useState('all')
  const [assetTypeFilter, setAssetTypeFilter] = useState<'all' | LandListing['assetType']>('all')
  const [tenureFilter, setTenureFilter] = useState<'all' | LandListing['listingType']>('all')
  const [zoningFilter, setZoningFilter] = useState<'all' | LandListing['zoning']>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | LandListing['status']>('all')
  const [minPriceFilter, setMinPriceFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')
  const isSignedIn = Boolean(user)
  const marketplaceEligible =
    Boolean((user as any)?.marketplaceEligible) || Boolean((user as any)?.marketplaceCatalog) || Boolean((user as any)?.marketplaceApi) || isAdmin
  const isActiveSeller = marketplaceEligible || sellerStatus === 'approved' || isAdmin

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
  const propertyCount = useMemo(() => listings.filter((item) => item.assetType !== 'land').length, [listings])
  const countyCoverage = useMemo(() => new Set(listings.map((item) => item.county)).size, [listings])
  const filteredListings = useMemo(() => {
    const query = locationFilter.trim().toLowerCase()
    const minPrice = Number(minPriceFilter) || 0
    const maxPrice = Number(maxPriceFilter) || Number.POSITIVE_INFINITY

    return listings.filter((item) => {
      const locationMatch = !query
        || `${item.county} ${item.town} ${item.title}`.toLowerCase().includes(query)
      if (!locationMatch) return false
      if (countyFilter !== 'all' && item.county !== countyFilter) return false
      if (assetTypeFilter !== 'all' && item.assetType !== assetTypeFilter) return false
      if (tenureFilter !== 'all' && item.listingType !== tenureFilter) return false
      if (zoningFilter !== 'all' && item.zoning !== zoningFilter) return false
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (item.priceKes < minPrice || item.priceKes > maxPrice) return false
      return true
    })
  }, [assetTypeFilter, countyFilter, listings, locationFilter, maxPriceFilter, minPriceFilter, statusFilter, tenureFilter, zoningFilter])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isActiveSeller) {
      toast.error('An eligible Gang Ledger marketplace plan is required before posting real estate.')
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
        assetType: form.assetType,
        acreage: Number(form.acreage) || 1,
        priceKes: Number(form.priceKes) || 0,
        pricePerAcreKes: Number(form.pricePerAcreKes) || undefined,
        zoning: form.zoning,
        listingType: form.listingType,
        description: form.description || 'Well-positioned Kenyan real estate listing ready for buyer outreach.',
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
      toast.success('Listing saved to Kenyan real estate.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save real estate listing yet.')
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
              <Sparkles className='h-3.5 w-3.5' /> Kenyan real estate
            </span>
            <h1 className='text-3xl font-semibold'>List Kenyan land and properties, share media, and invite qualified buyers</h1>
            <p className='text-sm text-emerald-50'>Run one board for plots, villas, apartments, offices, and income assets across counties, with viewing requests and concierge support built in.</p>
            <Link
              to='/marketplace/assistant'
              search={{ preset: 'land-general', intro: DEFAULT_LAND_CONCIERGE_INTRO }}
              className='inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10'
            >
              <Sparkles className='h-4 w-4 text-white' />
              Ask AI concierge to shortlist deals
            </Link>
          </div>
          <div className='rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-emerald-50'>
            <div>Total inventory: <span className='font-semibold'>{formatAcreage(totalAcreage)}</span></div>
            <div>Value on platform: <span className='font-semibold'>{formatKes(totalValue)}</span></div>
            <div>Live listings: <span className='font-semibold'>{listings.length}</span></div>
            <div>Properties listed: <span className='font-semibold'>{propertyCount}</span></div>
            <div>Counties covered: <span className='font-semibold'>{countyCoverage}</span></div>
          </div>
        </div>
      </header>

      <div className='grid gap-8 lg:grid-cols-[1.2fr_0.8fr]'>
        <section className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-slate-900'>Available Kenyan real estate</h2>
            <Badge variant='outline' className='border-emerald-200 text-emerald-700'>Land + properties</Badge>
          </div>
          <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
            <div className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
              <SlidersHorizontal className='h-4 w-4 text-emerald-600' />
              Filter inventory
            </div>
            <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-500'>Location</label>
                <Input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder='County, town, estate...' />
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-500'>County</label>
                <select className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm' value={countyFilter} onChange={(event) => setCountyFilter(event.target.value)}>
                  <option value='all'>All counties</option>
                  {counties.map((county) => (
                    <option key={county} value={county}>
                      {county}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-500'>Type</label>
                <select className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm capitalize' value={assetTypeFilter} onChange={(event) => setAssetTypeFilter(event.target.value as typeof assetTypeFilter)}>
                  <option value='all'>All types</option>
                  {assetTypeOptions.map((assetType) => (
                    <option key={assetType} value={assetType}>
                      {formatAssetType(assetType)}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-500'>Lease / tenure</label>
                <select className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm capitalize' value={tenureFilter} onChange={(event) => setTenureFilter(event.target.value as typeof tenureFilter)}>
                  <option value='all'>All tenure types</option>
                  <option value='freehold'>Freehold</option>
                  <option value='leasehold'>Leasehold</option>
                </select>
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-500'>Min amount (KES)</label>
                <Input type='number' value={minPriceFilter} onChange={(event) => setMinPriceFilter(event.target.value)} placeholder='0' />
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-500'>Max amount (KES)</label>
                <Input type='number' value={maxPriceFilter} onChange={(event) => setMaxPriceFilter(event.target.value)} placeholder='100000000' />
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-500'>Zoning</label>
                <select className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm capitalize' value={zoningFilter} onChange={(event) => setZoningFilter(event.target.value as typeof zoningFilter)}>
                  <option value='all'>All zoning</option>
                  {zoningOptions.map((zone) => (
                    <option key={zone} value={zone}>
                      {formatZoning(zone)}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-500'>Availability</label>
                <select className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm' value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                  <option value='all'>Any status</option>
                  <option value='available'>Open to offers</option>
                  <option value='offer_received'>Offer received</option>
                  <option value='reserved'>Reserved</option>
                </select>
              </div>
            </div>
          </div>
          {loadingListings ? (
            <div className='rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500'>Refreshing inventory...</div>
          ) : filteredListings.length === 0 ? (
            <div className='rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500'>No real estate listings match those filters yet. Broaden the search or post a new listing.</div>
          ) : (
            <div className='grid gap-4 md:grid-cols-2'>
              {filteredListings.map((parcel) => (
                <Card key={parcel.id} className='flex h-full flex-col overflow-hidden border-slate-200'>
                  <CardContent className='flex flex-1 flex-col gap-4 p-0'>
                    <SafeImg src={parcel.gallery[0]} alt={parcel.title} className='h-52 w-full object-cover' />
                    <div className='flex flex-1 flex-col gap-3 p-4'>
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div>
                          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                            {parcel.county} • {formatAssetType(parcel.assetType)} • {formatZoning(parcel.zoning)}
                          </div>
                          <h3 className='text-base font-semibold text-slate-900'>{parcel.title}</h3>
                        </div>
                        <div className='text-right'>
                          <div className='text-xs text-slate-500'>Total ask</div>
                          <div className='text-xl font-semibold text-emerald-700'>{formatKes(parcel.priceKes)}</div>
                          <div className='text-xs text-slate-500'>{formatAcreage(parcel.acreage)} site size • {formatListingType(parcel.listingType)}</div>
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
                        <span className='rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700'>
                          {formatListingType(parcel.listingType)}
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
            <h2 className='text-lg font-semibold text-slate-900'>Post your real estate listing</h2>
            <p className='text-sm text-slate-500'>Share verified details for land, homes, apartments, commercial units, and offices. Seller operations approval still applies.</p>
          </div>
          {!isSignedIn ? (
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600'>
              <p className='text-base font-semibold text-slate-900'>Sign in to continue</p>
              <p className='mt-1 text-xs text-slate-500'>Real estate intake belongs to seller account operations. Sign in so we can confirm your workspace and permissions.</p>
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
                    : 'Submit seller verification to unlock real estate posting'}
              </p>
              <p className='mt-1 text-xs text-amber-800'>
                {sellerStatus === 'pending'
                  ? 'Support has your documents. We will notify you once the review is complete.'
                  : sellerStatus === 'rejected'
                    ? 'Support flagged your last submission. Update your details or contact operations for next steps.'
                    : 'Head to the seller cockpit → Account operations to upload compliance docs. Real estate listings stay locked until approval.'}
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
                  <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder='e.g. 4-bedroom villa off Kiambu Road' required />
                </div>
                <div className='grid gap-3 sm:grid-cols-4'>
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
                    <label className='text-xs font-semibold text-slate-500'>Property type</label>
                    <select
                      className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm capitalize'
                      value={form.assetType}
                      onChange={(event) => setForm({ ...form, assetType: event.target.value as SubmissionFormState['assetType'] })}
                    >
                      {assetTypeOptions.map((assetType) => (
                        <option key={assetType} value={assetType}>
                          {formatAssetType(assetType)}
                        </option>
                      ))}
                    </select>
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
                <div className='grid gap-3 sm:grid-cols-4'>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Lease / tenure</label>
                    <select
                      className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm capitalize'
                      value={form.listingType}
                      onChange={(event) => setForm({ ...form, listingType: event.target.value as SubmissionFormState['listingType'] })}
                    >
                      <option value='freehold'>Freehold</option>
                      <option value='leasehold'>Leasehold</option>
                    </select>
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Site size (acres)</label>
                    <Input type='number' min='0.125' step='0.125' value={form.acreage} onChange={(event) => setForm({ ...form, acreage: event.target.value })} required />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Total price (KES)</label>
                    <Input type='number' value={form.priceKes} onChange={(event) => setForm({ ...form, priceKes: event.target.value })} required />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>{form.assetType === 'land' ? 'Price per acre (KES)' : 'Benchmark price note (KES)'}</label>
                    <Input type='number' value={form.pricePerAcreKes} onChange={(event) => setForm({ ...form, pricePerAcreKes: event.target.value })} />
                  </div>
                </div>
                <div>
                  <label className='text-xs font-semibold text-slate-500'>Description</label>
                  <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} placeholder='Summarise the asset, neighbourhood, utilities, and best buyer profile.' />
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
                    <label className='text-xs font-semibold text-slate-500'>Access / frontage</label>
                    <Input value={form.roadAccess} onChange={(event) => setForm({ ...form, roadAccess: event.target.value })} placeholder='e.g. Cabro road, highway frontage, lift lobby access' />
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-slate-500'>Utilities / water</label>
                    <Input value={form.water} onChange={(event) => setForm({ ...form, water: event.target.value })} placeholder='e.g. Borehole, county water, generator, fiber' />
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
                  {submitting ? 'Saving...' : 'Publish to Kenyan real estate'}
                </Button>
              </form>
              <div className='rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500'>
                <p className='font-semibold text-slate-700'>What happens next?</p>
                <ul className='mt-2 list-disc space-y-1 pl-4'>
                  <li>Listings are stored centrally so every connected site sees the same inventory.</li>
                  <li>Buyers can request guided inspections through the viewing flow.</li>
                  <li>Use clear media, utilities, and document notes to improve buyer confidence.</li>
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
                  {activeListing.county} • {formatAssetType(activeListing.assetType)} • {formatKes(activeListing.priceKes)}
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
                    <Droplets className='h-3.5 w-3.5 text-emerald-600' /> Listing notes
                  </div>
                  <div>Type: {formatAssetType(activeListing.assetType)}</div>
                  <div>Tenure: {formatListingType(activeListing.listingType)}</div>
                  <div>Zoning: {formatZoning(activeListing.zoning)}</div>
                  <div>Site size: {formatAcreage(activeListing.acreage)}</div>
                  {activeListing.water ? <div>Water: {activeListing.water}</div> : null}
                  {activeListing.roadAccess ? <div>Access: {activeListing.roadAccess}</div> : null}
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
                <div className='rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400 p-4 text-sm text-white shadow-sm'>
                  <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80'>
                    <Sparkles className='h-3.5 w-3.5' /> AI concierge
                  </div>
                  <p className='mt-2 text-white/90'>Loop in Hedgetech to pull due diligence docs, neighbourhood comps, and coordinate escrow-ready inspections.</p>
                  <Button asChild className='mt-3 w-full rounded-full bg-white text-emerald-700 hover:bg-emerald-50'>
                    <Link to='/marketplace/assistant' search={{ preset: `land:${activeListing.slug}`, intro: createLandConciergeIntro(activeListing) }}>
                      Ask AI concierge
                    </Link>
                  </Button>
                </div>
                <form className='space-y-3 rounded-2xl border border-slate-200 bg-white p-4' onSubmit={handleViewingRequest}>
                  <p className='text-sm font-semibold text-slate-900'>Arrange a guided viewing or inspection</p>
                  <Input placeholder='Your full name' value={viewingRequest.fullName} onChange={(event) => setViewingRequest({ ...viewingRequest, fullName: event.target.value })} required />
                  <Input type='email' placeholder='Email' value={viewingRequest.email} onChange={(event) => setViewingRequest({ ...viewingRequest, email: event.target.value })} required />
                  <Input placeholder='Phone or WhatsApp' value={viewingRequest.phone} onChange={(event) => setViewingRequest({ ...viewingRequest, phone: event.target.value })} required />
                  <Input type='date' value={viewingRequest.date} onChange={(event) => setViewingRequest({ ...viewingRequest, date: event.target.value })} required />
                  <Textarea placeholder='Notes, preferred time, financing needs...' value={viewingRequest.notes} onChange={(event) => setViewingRequest({ ...viewingRequest, notes: event.target.value })} rows={3} />
                  <Button type='submit' className='w-full rounded-full' disabled={sendingRequest}>
                    {sendingRequest ? 'Submitting...' : 'Send request'}
                  </Button>
                </form>
                <div className='text-xs text-slate-500'>We email + SMS the seller profile above and loop in operations for escrow support if required.</div>
              </div>
              <SheetFooter />
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <ChatLauncher className='bottom-6 right-6 sm:bottom-8 sm:right-8' />
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

function formatAssetType(assetType: LandListing['assetType']) {
  switch (assetType) {
    case 'house':
      return 'House'
    case 'apartment':
      return 'Apartment'
    case 'commercial':
      return 'Commercial'
    case 'office':
      return 'Office'
    default:
      return 'Land'
  }
}

function formatListingType(listingType: LandListing['listingType']) {
  return listingType === 'leasehold' ? 'Leasehold' : 'Freehold'
}

function formatZoning(zoning: LandListing['zoning']) {
  return zoning === 'mixed-use' ? 'Mixed use' : zoning[0].toUpperCase() + zoning.slice(1)
}

function createLandConciergeIntro(listing: LandListing) {
  const location = [listing.town, listing.county].filter(Boolean).join(', ')
  const locationText = location ? ` near ${location}` : ''
  return `Hi! I'm interested in the ${formatAssetType(listing.assetType).toLowerCase()} listing ${listing.title}${locationText} from Hedgetech's Kenyan real estate board. Please share due diligence files and coordinate an escorted viewing.`
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
