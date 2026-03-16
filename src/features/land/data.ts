import { imageFor } from '@/features/marketplace/helpers'

export type LandListingStatus = 'available' | 'offer_received' | 'reserved'
export type LandListingZoning = 'agricultural' | 'mixed-use' | 'residential' | 'commercial'

export type LandSellerProfile = {
  name: string
  company?: string
  phone: string
  email?: string
  whatsapp?: string
}

export type LandUtility = {
  label: string
  available: boolean
  notes?: string
}

export type LandListing = {
  id: string
  slug: string
  title: string
  county: string
  town: string
  acreage: number
  priceKes: number
  pricePerAcreKes: number
  zoning: LandListingZoning
  listingType: 'freehold' | 'leasehold'
  description: string
  highlights: string[]
  documents: string[]
  utilities: LandUtility[]
  water?: string
  roadAccess?: string
  coordinates?: { lat: number; lng: number }
  seller: LandSellerProfile
  gallery: string[]
  status: LandListingStatus
  createdAt: string
  updatedAt: string
}

export type LandListingInput = {
  title: string
  county: string
  town: string
  acreage: number
  priceKes: number
  pricePerAcreKes?: number
  zoning: LandListingZoning
  listingType?: 'freehold' | 'leasehold'
  description: string
  highlights?: string[]
  documents?: string[]
  utilities?: LandUtility[]
  water?: string
  roadAccess?: string
  coordinates?: { lat: number; lng: number }
  seller: LandSellerProfile
  gallery: string[]
  status?: LandListingStatus
}

const STORAGE_KEY = 'hedgetech_land_listings_v1'
const hasWindow = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
let memoryCache: LandListing[] | null = null

function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `land_${Math.random().toString(36).slice(2, 10)}`
}

function slugify(title: string, town: string) {
  return `${title}-${town}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function ensureSeeded(): LandListing[] {
  if (memoryCache) return memoryCache

  const seeds: LandListing[] = [
    {
      id: 'land_lanet_plains',
      slug: 'lanet-plains-signature-acreage',
      title: '5-acre serviced enclave in Lanet Plains',
      county: 'Nakuru',
      town: 'Lanet Plains',
      acreage: 5,
      priceKes: 42500000,
      pricePerAcreKes: 8500000,
      zoning: 'mixed-use',
      listingType: 'freehold',
      description:
        'Corner parcel touching the new Lanet bypass with red soil, piped water, and Kenya Power transformer at the gate. Perfect for a gated estate or hospitality build.',
      highlights: ['Beaconed & fenced', 'Clean freehold title', '2 min to bypass'],
      documents: ['Original title deed', 'Mutation map (2025)', 'Official search (Oct 2025)'],
      utilities: [
        { label: 'Kenya Power 3-phase', available: true, notes: 'Transformer installed on boundary' },
        { label: 'Piped water', available: true, notes: 'NAWASSCO line along boundary' },
        { label: 'Fiber internet', available: false, notes: 'Safaricom fiber terminating 1.2km away' },
      ],
      water: 'Piped + community borehole',
      roadAccess: '600m off tarmac via compacted murram road',
      coordinates: { lat: -0.2449, lng: 36.1504 },
      seller: { name: 'Mwangi Realty', company: 'Mwangi Realty', phone: '+254719555010', email: 'mwangi@mwrealty.co.ke', whatsapp: '+254719555010' },
      gallery: [
        imageFor('Nakuru Lanet Plains aerial farmland', 1200, 800),
        imageFor('Kenya gated community land beacons', 1200, 800),
        imageFor('Nakuru bypass road infrastructure', 1200, 800),
      ],
      status: 'available',
      createdAt: '2026-01-12T08:00:00.000Z',
      updatedAt: '2026-01-12T08:00:00.000Z',
    },
    {
      id: 'land_kitengela_ridges',
      slug: 'kitengela-ridges-2-5ac',
      title: '2.5 acres along the Kitengela plains',
      county: 'Kajiado',
      town: 'Kitengela - Yukos',
      acreage: 2.5,
      priceKes: 27500000,
      pricePerAcreKes: 11000000,
      zoning: 'residential',
      listingType: 'freehold',
      description:
        'Flat, red soil land 1.8km off the Namanga Highway behind Yukos. Ideal for townhouses or a senior school campus with nearby borehole water.',
      highlights: ['Namanga highway frontage', 'Perimeter mesh fence', 'Neighbors developed estates'],
      documents: ['Freehold title', 'Stamped mutation', 'Approved change of user'],
      utilities: [
        { label: 'Borehole on site', available: true },
        { label: 'Power nearby', available: true, notes: 'Kenya Power line 200m away' },
        { label: 'Security patrols', available: true, notes: 'Controlled estate watch' },
      ],
      water: 'On-site borehole + community storage tank',
      roadAccess: 'All-weather murram road, 1.8km from Namanga highway',
      coordinates: { lat: -1.4506, lng: 36.9602 },
      seller: { name: 'Nalepo Holdings', company: 'Nalepo Holdings', phone: '+254733886644', email: 'hello@nalepo.co.ke', whatsapp: '+254733886644' },
      gallery: [
        imageFor('Kitengela land sale aerial view', 1200, 800),
        imageFor('Kitengela Namanga highway access road', 1200, 800),
        imageFor('Kenya real estate development plots', 1200, 800),
      ],
      status: 'offer_received',
      createdAt: '2026-02-03T06:30:00.000Z',
      updatedAt: '2026-02-10T15:10:00.000Z',
    },
    {
      id: 'land_vipingo_view',
      slug: 'vipingo-ridge-ten-acres',
      title: '10 acres ocean-view ridge in Vipingo',
      county: 'Kilifi',
      town: 'Vipingo Ridge',
      acreage: 10,
      priceKes: 120000000,
      pricePerAcreKes: 12000000,
      zoning: 'commercial',
      listingType: 'leasehold',
      description:
        'Undulating ridge line bordering Vipingo Ridge Phase 2, overlooking the Indian Ocean and golf course. Best suited for villas or a boutique resort.',
      highlights: ['Titled + rent paid to 2098', 'Gated golf estate services', 'Unrestricted ocean views'],
      documents: ['Leasehold title (2098)', 'Survey map', 'County rates clearance (2025)'],
      utilities: [
        { label: 'Paved access', available: true },
        { label: 'Mains power', available: true, notes: 'Vipingo Ridge power network' },
        { label: 'Fiber internet', available: true, notes: 'POA fibre along inside road' },
      ],
      water: 'Vipingo Ridge desalination plant connection',
      roadAccess: 'Cabro internal roads connected to Malindi highway via paved entry',
      coordinates: { lat: -3.7836, lng: 39.8494 },
      seller: { name: 'Kahindi + Partners', company: 'Kahindi + Partners', phone: '+254720402040', email: 'sales@kahindipartners.com', whatsapp: '+254720402040' },
      gallery: [
        imageFor('Vipingo ridge aerial land view indian ocean', 1200, 800),
        imageFor('Vipingo ridge golf course view', 1200, 800),
        imageFor('Kenya coast resort land plots', 1200, 800),
      ],
      status: 'available',
      createdAt: '2025-12-05T10:00:00.000Z',
      updatedAt: '2026-01-28T12:00:00.000Z',
    },
  ]

  if (!hasWindow) {
    memoryCache = seeds
    return memoryCache
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds))
      memoryCache = seeds
      return memoryCache
    }
    const parsed = JSON.parse(raw) as LandListing[]
    memoryCache = parsed.length ? parsed : seeds
    if (!parsed.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache))
    }
    return memoryCache
  } catch {
    memoryCache = seeds
    if (hasWindow) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds))
    }
    return memoryCache
  }
}

function persist(next: LandListing[]) {
  memoryCache = next
  if (hasWindow) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore persistence errors
    }
  }
}

export async function listLandListings(): Promise<LandListing[]> {
  const items = ensureSeeded()
  return items.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function getLandListing(slug: string): Promise<LandListing | undefined> {
  return ensureSeeded().find((listing) => listing.slug === slug)
}

export async function createLandListing(input: LandListingInput): Promise<LandListing> {
  const existing = ensureSeeded()
  const now = new Date().toISOString()
  const listing: LandListing = {
    id: uid(),
    slug: slugify(input.title, input.town),
    title: input.title,
    county: input.county,
    town: input.town,
    acreage: Number(input.acreage) || 1,
    priceKes: Math.max(0, Number(input.priceKes) || 0),
    pricePerAcreKes:
      input.pricePerAcreKes && input.pricePerAcreKes > 0
        ? input.pricePerAcreKes
        : Math.max(0, Number(input.priceKes) || 0) / Math.max(Number(input.acreage) || 1, 1),
    zoning: input.zoning,
    listingType: input.listingType || 'freehold',
    description: input.description,
    highlights: input.highlights?.length ? input.highlights : ['Fresh listing'],
    documents: input.documents?.length ? input.documents : ['Title ready'],
    utilities: input.utilities?.length ? input.utilities : [{ label: 'Power nearby', available: true }],
    water: input.water,
    roadAccess: input.roadAccess,
    coordinates: input.coordinates,
    seller: input.seller,
    gallery: input.gallery.length ? input.gallery : [imageFor(`${input.county} land parcel`, 1200, 800)],
    status: input.status || 'available',
    createdAt: now,
    updatedAt: now,
  }

  const next = [listing, ...existing]
  persist(next)
  return listing
}

export function formatKes(value: number) {
  try {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value)
  } catch {
    return `KES ${value.toLocaleString()}`
  }
}

export function formatAcreage(acres: number) {
  return `${acres.toFixed(2)} ac`
}
