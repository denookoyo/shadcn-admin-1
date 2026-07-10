import { useEffect, useMemo, useState } from 'react'

const EVENT_NAME = 'seller-verification:changed'

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
  createdAt?: string
  updatedAt?: string
}

export type SellerApplicationInput = {
  email?: string
  companyName: string
  contactName: string
  phone: string
  location?: string
  documents?: string[]
  pitch?: string
  resubmitForReview?: boolean
}

let currentApplicationCache: SellerApplication | null = null
let currentStatusCache: SellerVerificationStatus = 'not_submitted'
let currentEmailCache: string | null = null

function emitVerificationChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function normalizeEmail(email?: string | null) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

function normalizeApplication(payload: unknown): SellerApplication | null {
  if (!payload || typeof payload !== 'object') return null
  const raw = payload as Record<string, unknown>
  const email = normalizeEmail(typeof raw.email === 'string' ? raw.email : '')
  if (!email) return null
  return {
    id: String(raw.id || ''),
    email,
    companyName: String(raw.companyName || ''),
    contactName: String(raw.contactName || ''),
    phone: String(raw.phone || ''),
    location: typeof raw.location === 'string' && raw.location.trim() ? raw.location : undefined,
    documents: Array.isArray(raw.documents) ? raw.documents.map((entry) => String(entry || '').trim()).filter(Boolean) : [],
    pitch: typeof raw.pitch === 'string' && raw.pitch.trim() ? raw.pitch : undefined,
    status: (raw.status as SellerVerificationStatus) || 'not_submitted',
    submittedAt: String(raw.submittedAt || ''),
    reviewedAt: typeof raw.reviewedAt === 'string' ? raw.reviewedAt : undefined,
    reviewerNotes: typeof raw.reviewerNotes === 'string' && raw.reviewerNotes.trim() ? raw.reviewerNotes : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  }
}

function setCachedSellerApplication(application: SellerApplication | null) {
  currentApplicationCache = application
  currentEmailCache = application?.email ? normalizeEmail(application.email) : null
  currentStatusCache = application?.status ?? 'not_submitted'
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

export async function refreshSellerApplication(): Promise<SellerApplication | null> {
  const res = await fetch('/api/seller/application', {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })

  if (res.status === 401) {
    setCachedSellerApplication(null)
    emitVerificationChanged()
    return null
  }

  if (!res.ok) {
    const payload = await parseJsonResponse<{ error?: string }>(res)
    throw new Error(payload.error || 'Unable to load seller verification right now.')
  }

  const payload = await parseJsonResponse<{ application?: SellerApplication | null; status?: SellerVerificationStatus }>(res)
  const application = normalizeApplication(payload.application)
  setCachedSellerApplication(application)
  if (!application) {
    currentStatusCache = payload.status || 'not_submitted'
  }
  emitVerificationChanged()
  return application
}

export async function listSellerApplications(): Promise<SellerApplication[]> {
  const res = await fetch('/api/seller/applications', {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })
  if (!res.ok) {
    const payload = await parseJsonResponse<{ error?: string }>(res)
    throw new Error(payload.error || 'Unable to load seller applications right now.')
  }
  const payload = await parseJsonResponse<{ applications?: SellerApplication[] }>(res)
  return Array.isArray(payload.applications) ? payload.applications.map((item) => normalizeApplication(item)).filter(Boolean) as SellerApplication[] : []
}

export async function submitSellerApplication(input: SellerApplicationInput): Promise<SellerApplication> {
  const res = await fetch('/api/seller/application', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const payload = await parseJsonResponse<{ error?: string }>(res)
    throw new Error(payload.error || 'Unable to submit seller verification right now.')
  }
  const payload = await parseJsonResponse<{ application?: SellerApplication }>(res)
  const application = normalizeApplication(payload.application)
  if (!application) throw new Error('Invalid response for seller verification.')
  setCachedSellerApplication(application)
  emitVerificationChanged()
  return application
}

export async function reviewSellerApplication(id: string, action: 'approve' | 'reject', reviewerNotes?: string): Promise<SellerApplication> {
  const res = await fetch(`/api/seller/applications/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action, reviewerNotes }),
  })
  if (!res.ok) {
    const payload = await parseJsonResponse<{ error?: string }>(res)
    throw new Error(payload.error || 'Unable to review seller application right now.')
  }
  const payload = await parseJsonResponse<{ application?: SellerApplication }>(res)
  const application = normalizeApplication(payload.application)
  if (!application) throw new Error('Invalid response for seller review.')
  if (currentApplicationCache?.id === application.id || normalizeEmail(currentApplicationCache?.email) === application.email) {
    setCachedSellerApplication(application)
    emitVerificationChanged()
  }
  return application
}

export function getSellerApplicationByEmail(email?: string): SellerApplication | null {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null
  if (normalizedEmail !== currentEmailCache) return null
  return currentApplicationCache
}

export function getSellerStatus(email?: string): SellerVerificationStatus {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || normalizedEmail !== currentEmailCache) return 'not_submitted'
  return currentStatusCache
}

export function isSellerApproved(email?: string): boolean {
  return getSellerStatus(email) === 'approved'
}

export function useSellerVerification(email?: string) {
  const normalizedEmail = useMemo(() => normalizeEmail(email), [email])
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(Boolean(normalizedEmail))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => setVersion((prev) => prev + 1)
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [])

  useEffect(() => {
    let active = true
    if (!normalizedEmail) {
      setCachedSellerApplication(null)
      setLoading(false)
      setVersion((prev) => prev + 1)
      return () => {
        active = false
      }
    }
    setLoading(true)
    refreshSellerApplication()
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [normalizedEmail])

  const application = useMemo(() => getSellerApplicationByEmail(normalizedEmail), [normalizedEmail, version])
  const sellerStatus = useMemo(() => getSellerStatus(normalizedEmail), [normalizedEmail, version])

  return {
    application,
    sellerStatus,
    loading,
    refresh: refreshSellerApplication,
  }
}

export const SELLER_VERIFICATION_EVENT = EVENT_NAME
