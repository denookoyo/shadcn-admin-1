import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { MapPin, Users, Sparkles, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SHARED_SPACES, type SharedSpace, productToSharedSpace } from '@/features/marketplace/spaces/data'
import { db } from '@/lib/data'

type OfferKind = 'all' | 'roommate' | 'desk-pass' | 'lease-transfer'

const OFFER_LABELS: Record<'roommate' | 'desk-pass' | 'lease-transfer', string> = {
  roommate: 'Roommate / spare room',
  'desk-pass': 'Desk or studio',
  'lease-transfer': 'Lease transfer',
}

export const Route = createFileRoute('/marketplace/_layout/spaces/')({
  validateSearch: (search: Record<string, unknown>) => ({
    city: typeof search.city === 'string' ? search.city : 'all',
  }),
  component: SharedSpacesPage,
})

function SharedSpacesPage() {
  const { city: citySearch } = Route.useSearch()
  const [spaces, setSpaces] = useState<SharedSpace[]>(SHARED_SPACES)
  const [cityFilter, setCityFilter] = useState<string>(citySearch || 'all')
  const [budget, setBudget] = useState<number>(500)
  const [spaceType, setSpaceType] = useState<'all' | 'room' | 'studio' | 'desk'>('all')
  const [offerKind, setOfferKind] = useState<OfferKind>('all')
  const [keyword, setKeyword] = useState('')
  const [message, setMessage] = useState('Hi! I saw your space on Hedgetech Spaces. I\'d love to organise a viewing and share a bit about myself.')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const products = await db.listProducts()
        if (!mounted) return
        const derived = products
          .map((product) => productToSharedSpace(product))
          .filter(Boolean) as SharedSpace[]
        setSpaces(derived.length > 0 ? derived : SHARED_SPACES)
      } catch {
        if (mounted) setSpaces(SHARED_SPACES)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setCityFilter(citySearch || 'all')
  }, [citySearch])

  const cities = useMemo(() => Array.from(new Set(spaces.map((space) => `${space.city}, ${space.state}`))), [spaces])

  const filteredSpaces = useMemo(() => {
    return spaces.filter((space) => {
      if (cityFilter !== 'all' && `${space.city}, ${space.state}` !== cityFilter) return false
      if (spaceType !== 'all' && space.type !== spaceType) return false
      if (offerKind !== 'all' && (space.listingKind || 'roommate') !== offerKind) return false
      if (space.rentPerWeek > budget) return false
      if (keyword && !space.description.toLowerCase().includes(keyword.toLowerCase()) && !(space.amenities || []).some((amenity) => amenity.toLowerCase().includes(keyword.toLowerCase()))) {
        return false
      }
      return true
    })
  }, [spaces, cityFilter, spaceType, offerKind, budget, keyword])

  return (
    <div className='mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8'>
      <header className='space-y-3'>
        <div className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
          Hedgetech spaces
        </div>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-semibold text-slate-900'>Shared spaces & roomies</h1>
            <p className='mt-1 max-w-2xl text-sm text-slate-600'>
              Hosts list spare rooms, desks, and micro-studios. Filter by city, vibe, and budget, then send a concierge-ready intro to start the conversation.
            </p>
          </div>
          <Link to='/marketplace/assistant' className='inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50'>
            <Sparkles className='h-4 w-4' />
            Ask the concierge
          </Link>
        </div>
      </header>

      <section className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
        <div className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
          <Filter className='h-4 w-4 text-emerald-600' />
          Refine your search
        </div>
        <div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
          <div className='space-y-2'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>City</label>
            <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} className='rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none'>
              <option value='all'>Any location</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          <div className='space-y-2'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Budget / week</label>
            <div>
              <input type='range' min={150} max={800} value={budget} onChange={(event) => setBudget(Number(event.target.value))} className='w-full' />
              <div className='mt-1 text-xs text-slate-500'>Up to A${budget}</div>
            </div>
          </div>
          <div className='space-y-2'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Space type</label>
            <select value={spaceType} onChange={(event) => setSpaceType(event.target.value as any)} className='rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none'>
              <option value='all'>Any type</option>
              <option value='room'>Room</option>
              <option value='studio'>Studio</option>
              <option value='desk'>Desk</option>
            </select>
          </div>
          <div className='space-y-2'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Offer type</label>
            <select value={offerKind} onChange={(event) => setOfferKind(event.target.value as OfferKind)} className='rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none'>
              <option value='all'>Any</option>
              <option value='roommate'>Roommate / spare room</option>
              <option value='desk-pass'>Desk or studio</option>
              <option value='lease-transfer'>Lease transfer</option>
            </select>
          </div>
          <div className='space-y-2'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Keyword</label>
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder='Pet friendly, sauna…' className='rounded-xl border-slate-200' />
          </div>
        </div>
      </section>

      <section className='grid gap-4 lg:grid-cols-[2fr_1fr]'>
        <div className='space-y-4'>
          {loading ? (
            <div className='rounded-3xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500'>Loading curated spaces…</div>
          ) : filteredSpaces.length === 0 ? (
            <div className='rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500'>No spaces match your filters yet. Expand your budget or city to see more hosts.</div>
          ) : (
            filteredSpaces.map((space) => {
              const listingLabel = OFFER_LABELS[(space.listingKind as keyof typeof OFFER_LABELS) || 'roommate'] || OFFER_LABELS.roommate
              return (
                <div key={space.id} className='grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[220px_1fr]'>
                  <div className='overflow-hidden rounded-2xl border border-slate-100'>
                    <img src={space.img} alt={space.title} className='h-48 w-full object-cover md:h-full' />
                  </div>
                  <div className='space-y-3'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div>
                      <h2 className='text-lg font-semibold text-slate-900'>{space.title}</h2>
                      <div className='mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500'>
                        <span className='inline-flex items-center gap-1'>
                          <MapPin className='h-3.5 w-3.5 text-emerald-600' />
                          {space.suburb}, {space.city}
                        </span>
                        <span className='inline-flex items-center gap-1'>
                          <Users className='h-3.5 w-3.5 text-emerald-600' />
                          {space.occupancy?.current ?? 0}/{space.occupancy?.total ?? 1} residents
                        </span>
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='text-sm text-slate-500'>From</div>
                      <div className='text-lg font-semibold text-emerald-700'>A${space.rentPerWeek}/wk</div>
                      {space.bond ? <div className='text-xs text-slate-500'>Bond A${space.bond}</div> : null}
                      <div className='mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600'>{listingLabel}</div>
                    </div>
                  </div>
                  <p className='text-sm text-slate-600'>{space.description}</p>
                  <div className='flex flex-wrap gap-2'>
                    {(space.vibe || []).map((tag) => (
                      <Badge key={tag} variant='secondary' className='bg-emerald-50 text-emerald-700'>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className='grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2'>
                    <div>
                      <div className='text-[11px] uppercase tracking-wide text-slate-500'>Availability</div>
                      <div>{space.availableFrom ? new Date(space.availableFrom).toLocaleDateString() : 'Flexible'}</div>
                      <div>{space.stayLength || 'Flexible stay'}</div>
                    </div>
                    <div>
                      <div className='text-[11px] uppercase tracking-wide text-slate-500'>Amenities</div>
                      <div>{(space.amenities || []).slice(0, 3).join(' • ')}{(space.amenities || []).length > 3 ? '…' : ''}</div>
                    </div>
                  </div>

                  <div className='flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm'>
                    <div className='flex items-center gap-3'>
                      <img src={space.host?.avatar || space.img} alt={space.host?.name || space.title} className='h-10 w-10 rounded-full object-cover' />
                      <div>
                        <div className='font-semibold text-slate-900'>{space.host?.name || 'Host'}</div>
                        <div className='text-xs text-slate-500'>{space.host?.bio || 'Verified Hedgetech host'}</div>
                      </div>
                    </div>
                    <Button asChild className='rounded-full'>
                      <Link to='/marketplace/assistant' search={{ preset: `space:${space.slug}`, intro: message }}>
                        Introduce yourself
                      </Link>
                    </Button>
                  </div>
                  {space.listingKind === 'lease-transfer' ? (
                    <div className='rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>
                      Lease transfer listing: we help coordinate paperwork and ID checks so you can take over the agreement smoothly.
                    </div>
                  ) : null}
                </div>
              </div>
              )
            })
          )}
        </div>

        <aside className='space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='space-y-2'>
            <h3 className='text-lg font-semibold text-slate-900'>Send a concierge-ready intro</h3>
            <p className='text-sm text-slate-600'>We prep hosts with your story so the conversation starts strong. Add your vibe, work setup, and move-in goal.</p>
            <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} className='text-sm' />
            <Button asChild className='w-full rounded-full'>
              <Link to='/marketplace/assistant' search={{ preset: 'space-general', intro: message }}>
                Share with concierge
              </Link>
            </Button>
          </div>
          <div className='space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600'>
            <div className='font-semibold text-slate-900'>How it works</div>
            <ol className='space-y-2 list-decimal pl-4'>
              <li>Filter spaces that match your rent, location, and vibe.</li>
              <li>Send an intro—Hedgetech concierge shares it with the host.</li>
              <li>Move into chat to confirm viewing, ID checks, or holding deposits.</li>
            </ol>
          </div>
        </aside>
      </section>
    </div>
  )
}
