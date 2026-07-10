import { imageFor } from '@/features/marketplace/helpers'

export type LandListingStatus = 'available' | 'offer_received' | 'reserved'
export type LandListingZoning = 'agricultural' | 'mixed-use' | 'residential' | 'commercial'
export type LandListingAssetType = 'land' | 'house' | 'apartment' | 'commercial' | 'office'

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
  assetType: LandListingAssetType
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
  assetType: LandListingAssetType
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

const LAND_LISTINGS_ENDPOINT = '/api/land/listings'

function withFallbackGallery(gallery: string[], county: string, town: string) {
  if (Array.isArray(gallery) && gallery.filter(Boolean).length) return gallery
  const label = county || town || 'Kenyan real estate'
  return [imageFor(`${label} property`, 1200, 800)]
}

async function parseJsonResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    return {} as T
  }
}

export async function listLandListings(): Promise<LandListing[]> {
  try {
    const res = await fetch(LAND_LISTINGS_ENDPOINT, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error('Unable to fetch real estate listings')
    const payload = await parseJsonResponse<{ listings?: LandListing[] }>(res)
    return Array.isArray(payload.listings) ? payload.listings : []
  } catch (error) {
    console.error('listLandListings error', error)
    return []
  }
}

export async function getLandListing(slug: string): Promise<LandListing | undefined> {
  if (!slug) return undefined
  try {
    const res = await fetch(`${LAND_LISTINGS_ENDPOINT}/${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) return undefined
    const payload = await parseJsonResponse<{ listing?: LandListing }>(res)
    return payload.listing
  } catch (error) {
    console.error('getLandListing error', error)
    return undefined
  }
}

export async function createLandListing(input: LandListingInput): Promise<LandListing> {
  const payload = {
    ...input,
    gallery: withFallbackGallery(input.gallery, input.county, input.town),
  }
  const res = await fetch(LAND_LISTINGS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errorBody = await parseJsonResponse<{ error?: string }>(res)
    throw new Error(errorBody.error || 'Unable to save real estate listing yet.')
  }
  const data = await parseJsonResponse<{ listing?: LandListing }>(res)
  if (!data.listing) {
    throw new Error('Invalid response for real estate listing create.')
  }
  return data.listing
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
