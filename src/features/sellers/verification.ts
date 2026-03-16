const STORAGE_KEY = 'hedgetech_seller_verifications_v1'
const EVENT_NAME = 'seller-verification:changed'
const hasWindow = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export type SellerVerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'

export type SellerApplication = {
  id: string
  email: string
  companyName: string
  contactName: string
  phone: string
  location?: string
  documents?: string[]
  pitch?: string
  status: SellerVerificationStatus
  submittedAt: string
  reviewedAt?: string
  reviewerNotes?: string
}

let memoryCache: SellerApplication[] | null = null

const seeds: SellerApplication[] = [
  {
    id: 'seller_app_kitengela',
    email: 'kitengela@hedgetech.market',
    companyName: 'Kitengela Plains Estates',
    contactName: 'Grace Naliaka',
    phone: '+254 711 222333',
    location: 'Kitengela, Kajiado County',
    documents: ['Certificate of Incorporation', 'Tax compliance 2025'],
    pitch: 'Townhouse developer handling Namanga road projects.',
    status: 'pending',
    submittedAt: '2026-02-05T07:30:00.000Z',
  },
  {
    id: 'seller_app_vipingo',
    email: 'vipingo@hedgetech.market',
    companyName: 'Vipingo Ridge Holdings',
    contactName: 'Diana Kahindi',
    phone: '+254 721 000555',
    location: 'Vipingo, Kilifi County',
    documents: ['Title deeds portfolio', 'Bank letter of good standing'],
    pitch: 'Premium coastal developer with audited sales.',
    status: 'approved',
    submittedAt: '2025-12-12T10:00:00.000Z',
    reviewedAt: '2025-12-15T14:00:00.000Z',
    reviewerNotes: 'Documents verified by ops team.',
  },
]

function ensureLoaded(): SellerApplication[] {
  if (memoryCache) return memoryCache
  if (hasWindow) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        memoryCache = JSON.parse(raw) as SellerApplication[]
      } else {
        memoryCache = seeds
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache))
      }
    } catch {
      memoryCache = seeds
    }
  } else {
    memoryCache = seeds
  }
  return memoryCache
}

function persist(list: SellerApplication[]) {
  memoryCache = list
  if (hasWindow) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
      window.dispatchEvent(new CustomEvent(EVENT_NAME))
    } catch {
      // Ignore persistence issues in demo mode
    }
  }
}

export async function listSellerApplications(): Promise<SellerApplication[]> {
  const list = ensureLoaded()
  return list.slice().sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
}

export async function submitSellerApplication(
  input: Omit<SellerApplication, 'id' | 'status' | 'submittedAt' | 'reviewedAt'> & { status?: SellerVerificationStatus },
) {
  if (!input.email) throw new Error('Email is required for seller verification')
  const list = ensureLoaded()
  const now = new Date().toISOString()
  const existing = list.find((item) => item.email.toLowerCase() === input.email.toLowerCase())
  if (existing) {
    existing.companyName = input.companyName
    existing.contactName = input.contactName
    existing.phone = input.phone
    existing.location = input.location
    existing.documents = input.documents
    existing.pitch = input.pitch
    existing.status = input.status ?? 'pending'
    existing.submittedAt = now
    delete existing.reviewedAt
    delete existing.reviewerNotes
    persist([...list])
    return existing
  }
  const created: SellerApplication = {
    id: `seller_${Math.random().toString(36).slice(2, 10)}`,
    email: input.email,
    companyName: input.companyName,
    contactName: input.contactName,
    phone: input.phone,
    location: input.location,
    documents: input.documents,
    pitch: input.pitch,
    status: input.status ?? 'pending',
    submittedAt: now,
  }
  persist([created, ...list])
  return created
}

export async function reviewSellerApplication(id: string, action: 'approve' | 'reject', reviewerNotes?: string) {
  const list = ensureLoaded()
  const idx = list.findIndex((item) => item.id === id)
  if (idx === -1) throw new Error('Application not found')
  const status: SellerVerificationStatus = action === 'approve' ? 'approved' : 'rejected'
  const updated = {
    ...list[idx],
    status,
    reviewedAt: new Date().toISOString(),
    reviewerNotes,
  }
  list[idx] = updated
  persist([...list])
  return updated
}

export function getSellerApplicationByEmail(email?: string): SellerApplication | null {
  if (!email) return null
  const list = ensureLoaded()
  return list.find((item) => item.email.toLowerCase() === email.toLowerCase()) ?? null
}

export function getSellerStatus(email?: string): SellerVerificationStatus {
  const application = getSellerApplicationByEmail(email)
  return application?.status ?? 'not_submitted'
}

export function isSellerApproved(email?: string): boolean {
  return getSellerStatus(email) === 'approved'
}

export const SELLER_VERIFICATION_EVENT = EVENT_NAME
