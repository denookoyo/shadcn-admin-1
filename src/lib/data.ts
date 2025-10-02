import { db as localdb, seedProducts, categories as localCategories, type Product, type Order, type CartItem, type Category } from './localdb'
import type { AssistantChatRequest, AssistantChatResponse } from '@/features/assistant/types'
import { useStageStore } from '@/stores/stageStore'
import { fetchJson } from './http'

const useApi = typeof window !== 'undefined' && (import.meta as any).env?.VITE_USE_API === 'true'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function startOfDay(date: Date | string | number) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function combineDateAndTime(base: Date, time?: string | null) {
  const d = new Date(base)
  const fallback = '09:00'
  const source = time && /^\d{2}:\d{2}$/.test(time) ? time : fallback
  const [hours, minutes] = source.split(':').map((value) => Number(value) || 0)
  d.setHours(hours, minutes, 0, 0)
  return d
}

export type ServiceAvailabilitySlot = {
  start: string
  end: string
  available: boolean
  booked: number
}

export type ServiceAvailabilityDay = {
  date: string
  weekday: string
  isOpen: boolean
  remaining: number
  capacity: number
  slots: ServiceAvailabilitySlot[]
}

export type ProductAvailability = {
  productId: string
  start: string
  end: string
  durationMinutes: number
  openTime: string
  closeTime: string
  openDays: string[]
  days: ServiceAvailabilityDay[]
}

export type AnnouncementAudience = 'all' | 'buyers' | 'sellers' | 'drivers' | 'admins'

export type Announcement = {
  id: string
  title: string
  body: string
  audience: AnnouncementAudience
  pinned: boolean
  startAt?: string | null
  endAt?: string | null
  publishedAt: string
  author?: { id: number; name?: string | null; email: string }
}

export type SupportMessage = {
  id: string
  ticketId: string
  authorId?: number | null
  body: string
  attachments?: string[]
  createdAt: string
  author?: { id: number; name?: string | null; email: string; image?: string | null }
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type SupportTicketType = 'general' | 'order' | 'service' | 'billing'

export type SupportTicket = {
  id: string
  subject: string
  type: SupportTicketType
  status: SupportTicketStatus
  priority?: string
  orderId?: string | null
  orderItemId?: string | null
  requesterId: number
  sellerId?: number | null
  createdAt: string
  updatedAt: string
  requester?: { id: number; name?: string | null; email: string; image?: string | null }
  seller?: { id: number; name?: string | null; email: string; image?: string | null }
  order?: { id: string; status: string }
  orderItem?: { id: string; title: string }
  messages?: SupportMessage[]
}

export type RefundStatus = 'requested' | 'reviewing' | 'accepted' | 'rejected' | 'refunded'

export type RefundRequest = {
  id: string
  orderId: string
  orderItemId?: string | null
  buyerId: number
  sellerId?: number | null
  amount?: number | null
  reason: string
  status: RefundStatus
  resolution?: string | null
  createdAt: string
  updatedAt: string
  order?: { id: string; status: string; customerName?: string | null }
  orderItem?: { id: string; title: string }
  buyer?: { id: number; name?: string | null; email: string }
  seller?: { id: number; name?: string | null; email: string }
}

// Unify API surface so callers can use categories regardless of backend
export type DataAPI = {
  // Products
  listProducts: () => Promise<Product[]>
  getProductBySlug: (slug: string) => Promise<Product | undefined>
  getProductById: (id: string) => Promise<Product | undefined>
  getProductByBarcode?: (code: string) => Promise<Product | null>
  getProductAvailability?: (
    id: string,
    options?: { start?: string | Date; days?: number }
  ) => Promise<ProductAvailability>
  // Announcements
  listAnnouncements?: (audience?: AnnouncementAudience) => Promise<Announcement[]>
  createProduct: (input: Omit<Product, 'id'>) => Promise<Product>
  updateProduct: (id: string, patch: Partial<Product>) => Promise<Product | undefined>
  deleteProduct: (id: string) => Promise<boolean>
  // Cart
  getCart: (namespace?: string) => Promise<CartItem[]>
  addToCart: (productId: string, quantity?: number, namespace?: string, meta?: string) => Promise<CartItem>
  removeFromCart: (itemId: string, namespace?: string) => Promise<void>
  clearCart: (namespace?: string) => Promise<void>
  // Orders
  listOrders: (namespace?: string) => Promise<Order[]>
  createOrder: (input: Omit<Order, 'id' | 'createdAt' | 'status'> & { status?: Order['status'] }, namespace?: string) => Promise<Order>
  // POS (seller-created order)
  createPosOrder?: (input: { items: { productId: string; title: string; price: number; quantity: number; meta?: string }[]; customerName?: string; customerEmail?: string; customerPhone?: string }) => Promise<Order>
  listSellerOrders?: () => Promise<(Order & { buyer?: { id: number; name?: string | null; email: string } })[]>
  shipOrder?: (id: string, ackPaid: boolean) => Promise<Order>
  confirmReceived?: (id: string) => Promise<Order>
  listAllOrders?: () => Promise<(Order & { buyer?: { id: number; name?: string | null; email: string }, seller?: { id: number; name?: string | null; email: string } })[]>
  adminUpdateOrderStatus?: (id: string, status: Order['status']) => Promise<Order>
  adminDeleteOrder?: (id: string) => Promise<void>
  submitOrderReview?: (orderId: string, rating: number, feedback: string) => Promise<{ rating: number; feedback: string }>
  getOrderReview?: (orderId: string) => Promise<{ rating: number; feedback: string } | null>
  // Support
  listSupportTickets?: () => Promise<SupportTicket[]>
  getSupportTicket?: (id: string) => Promise<SupportTicket | null>
  createSupportTicket?: (input: { subject: string; body: string; type?: SupportTicketType; orderId?: string; orderItemId?: string; priority?: string }) => Promise<SupportTicket>
  replySupportTicket?: (id: string, body: string, attachments?: string[]) => Promise<SupportMessage>
  updateSupportTicketStatus?: (id: string, status: SupportTicketStatus) => Promise<SupportTicket>
  // AI assistant
  salesAssistantChat?: (payload: AssistantChatRequest) => Promise<AssistantChatResponse>
  // Refunds
  listRefundRequests?: (scope?: 'buyer' | 'seller' | 'all') => Promise<RefundRequest[]>
  createRefundRequest?: (input: { orderId: string; orderItemId?: string; amount?: number; reason: string }) => Promise<RefundRequest>
  reviewRefundRequest?: (id: string, action: 'accept' | 'reject' | 'refund', notes?: string, amount?: number) => Promise<RefundRequest>
  // Categories (optional when using pure local db before categories existed)
  listCategories?: () => Promise<Category[]>
  createCategory?: (input: Omit<Category, 'id'>) => Promise<Category>
  updateCategory?: (id: string, patch: Partial<Category>) => Promise<Category>
  deleteCategory?: (id: string) => Promise<void>
  // User profile
  getMe?: () => Promise<any>
  updateMe?: (patch: Partial<{ name: string; image: string; phoneNo: string; ABN: string; bio: string }>) => Promise<any>
  // Users (public lookup)
  getUserById?: (id: number) => Promise<{ id: number; name?: string | null; email: string; image?: string | null } | null>
  rateNegative?: (id: number, reason: string) => Promise<{ negativeCount: number; rating: number }>
  // Reviews
  listSellerReviews?: (sellerId: number) => Promise<{ avg: number; count: number; histogram: Record<number, number>; reviews: { orderId: string; rating: number; feedback: string; createdAt: string; buyer?: { id: number; name?: string | null; email: string; image?: string | null } }[] }>
  // Blog
  listBlogPosts?: (authorId?: number) => Promise<{ id: string; slug: string; title: string; coverImage?: string | null; tags?: string[]; createdAt: string; published: boolean; authorId?: number | null }[]>
  getBlogPostBySlug?: (slug: string) => Promise<any>
  createBlogPost?: (input: { title: string; slug: string; content: string; coverImage?: string; tags?: string[]; published?: boolean }) => Promise<any>
  updateBlogPost?: (id: string, patch: Partial<{ title: string; slug: string; content: string; coverImage?: string | null; tags?: string[]; published?: boolean }>) => Promise<any>
  deleteBlogPost?: (id: string) => Promise<void>
  // MFA
  getMfaStatus?: () => Promise<{ enabled: boolean }>
  mfaSetup?: () => Promise<{ secret: string; otpauth: string }>
  mfaEnable?: (token: string) => Promise<{ enabled: boolean }>
  mfaDisable?: (token: string) => Promise<{ enabled: boolean }>
  mfaVerify?: (token: string) => Promise<any>
  // Amazing Freight
  createDocket?: (input: { date: string; truckId?: string; project?: string; startTime?: string; endTime?: string; hours?: number; details?: string; files?: string[] }) => Promise<any>
  listMyDockets?: () => Promise<any[]>
  createShift?: (input: { date: string; truckId?: string; startTime: string; endTime: string; breakMin?: number }) => Promise<any>
  listMyShifts?: () => Promise<any[]>
  createMaintenance?: (input: { date?: string; truckId?: string; category: string; severity?: string; description: string; files?: string[] }) => Promise<any>
  listMyMaintenance?: () => Promise<any[]>
  createAccident?: (input: { occurredAt?: string; truckId?: string; location?: string; description: string; injuries?: boolean; policeReport?: boolean; files?: string[] }) => Promise<any>
  listMyAccidents?: () => Promise<any[]>
  createFuelReceipt?: (input: { date: string; truckId?: string; liters: number; amount: number; odometer?: number; fileUrl?: string }) => Promise<any>
  listMyFuelReceipts?: () => Promise<any[]>
  listMyPayments?: () => Promise<any[]>
  listMyPayslips?: () => Promise<any[]>
  // Admin
  adminListDrivers?: () => Promise<any[]>
  adminListDockets?: () => Promise<any[]>
  adminShiftsAgg?: (group?: 'day' | 'week') => Promise<{ group: string; data: Record<string, number> }>
  adminListTrucks?: () => Promise<any[]>
  adminCreateTruck?: (input: { rego: string; name: string; active?: boolean }) => Promise<any>
}

async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const stage = useStageStore.getState().stage
  const stageHeader = stage ? { 'X-Hedgetech-Stage': stage } : undefined
  const baseHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...stageHeader,
  }
  const mergedHeaders = init?.headers
    ? { ...baseHeaders, ...(init.headers as Record<string, string>) }
    : baseHeaders

  return fetchJson<T>(input, {
    ...init,
    headers: mergedHeaders,
  })
}

function localRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function localWrite<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function localId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

const api: DataAPI = {
  async listProducts(): Promise<Product[]> {
    return http<Product[]>('/api/products')
  },
  async createPosOrder(input) {
    return http<Order>('/api/pos/orders', { method: 'POST', body: JSON.stringify(input) })
  },
  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const products = await api.listProducts()
    return products.find((p) => p.slug === slug)
  },
  async getProductById(id: string): Promise<Product | undefined> {
    const products = await api.listProducts()
    return products.find((p) => p.id === id)
  },
  async getProductAvailability(id: string, options) {
    const params = new URLSearchParams()
    if (options?.start) params.set('start', new Date(options.start).toISOString())
    if (options?.days) params.set('days', String(options.days))
    const query = params.toString()
    const path = `/api/products/${encodeURIComponent(id)}/availability${query ? `?${query}` : ''}`
    return http<ProductAvailability>(path)
  },
  async getProductByBarcode(code: string) {
    try {
      return await http<Product>(`/api/products/barcode/${encodeURIComponent(code)}`)
    } catch {
      return null
    }
  },
  async listAnnouncements(audience) {
    const params = new URLSearchParams()
    if (audience && audience !== 'all') params.set('audience', audience)
    const query = params.toString()
    return http<Announcement[]>(`/api/announcements${query ? `?${query}` : ''}`)
  },
  async createProduct(input: Omit<Product, 'id'>): Promise<Product> {
    return http<Product>('/api/products', { method: 'POST', body: JSON.stringify(input) })
  },
  async updateProduct(id: string, patch: Partial<Product>): Promise<Product | undefined> {
    return http<Product>('/api/products', { method: 'PUT', body: JSON.stringify({ id, ...patch }) })
  },
  async deleteProduct(id: string): Promise<boolean> {
    await http<void>('/api/products', { method: 'DELETE', body: JSON.stringify({ id }) })
    return true
  },

  // Cart stored in localStorage (persistent for guests and users)
  async getCart(namespace?: string): Promise<CartItem[]> {
    return localdb.getCart(namespace)
  },
  async addToCart(productId: string, quantity = 1, namespace?: string, meta?: string): Promise<CartItem> {
    return localdb.addToCart(productId, quantity, namespace, meta)
  },
  async removeFromCart(itemId: string, namespace?: string): Promise<void> {
    return localdb.removeFromCart(itemId, namespace)
  },
  async clearCart(namespace?: string): Promise<void> {
    return localdb.clearCart(namespace)
  },

  async listOrders(_namespace?: string): Promise<Order[]> {
    return http<Order[]>(`/api/orders`)
  },
  async createOrder(input: Omit<Order, 'id' | 'createdAt' | 'status'> & { status?: Order['status'] }, _namespace?: string): Promise<Order> {
    // Do not pass ownerId; rely on session
    const order = await http<Order & { accessCode?: string }>('/api/checkout', { method: 'POST', body: JSON.stringify({ ...input }) })
    // If guest checkout, persist tracking accessCode locally for convenience
    try {
      if (typeof window !== 'undefined' && (order as any)?.accessCode) {
        const key = 'guestOrders'
        const raw = localStorage.getItem(key)
        const list = raw ? JSON.parse(raw) : []
        const entry = { id: (order as any).id, code: (order as any).accessCode, createdAt: (order as any).createdAt }
        // de-dup by id
        const next = [entry, ...list.filter((x: any) => x.id !== entry.id)]
        localStorage.setItem(key, JSON.stringify(next))
      }
    } catch {}
    return order as unknown as Order
  },

  async listSellerOrders() {
    return http<(Order & { buyer?: { id: number; name?: string | null; email: string } })[]>('/api/seller/orders')
  },
  async shipOrder(id: string, ackPaid: boolean) {
    return http<Order>(`/api/orders/${encodeURIComponent(id)}/ship`, { method: 'POST', body: JSON.stringify({ ackPaid }) })
  },
  async confirmReceived(id: string) {
    return http<Order>(`/api/orders/${encodeURIComponent(id)}/received`, { method: 'POST' })
  },
  async listAllOrders() {
    return http<(Order & { buyer?: { id: number; name?: string | null; email: string }, seller?: { id: number; name?: string | null; email: string } })[]>('/api/admin/orders')
  },
  async adminUpdateOrderStatus(id: string, status: Order['status']) {
    return http<Order>(`/api/admin/orders/${encodeURIComponent(id)}/status`, { method: 'POST', body: JSON.stringify({ status }) })
  },
  async adminDeleteOrder(id: string) {
    await http<void>(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  async submitOrderReview(orderId: string, rating: number, feedback: string) {
    return http<{ rating: number; feedback: string }>(`/api/orders/${encodeURIComponent(orderId)}/review`, { method: 'POST', body: JSON.stringify({ rating, feedback }) })
  },
  async getOrderReview(orderId: string) {
    try {
      return await http<{ rating: number; feedback: string } | null>(`/api/orders/${encodeURIComponent(orderId)}/review`)
    } catch {
      return null
    }
  },
  async listSupportTickets() {
    return http<SupportTicket[]>('/api/support/tickets')
  },
  async getSupportTicket(id: string) {
    try {
      return await http<SupportTicket>(`/api/support/tickets/${encodeURIComponent(id)}`)
    } catch {
      return null
    }
  },
  async createSupportTicket(input: { subject: string; body: string; type?: SupportTicketType; orderId?: string; orderItemId?: string; priority?: string }) {
    return http<SupportTicket>('/api/support/tickets', { method: 'POST', body: JSON.stringify(input) })
  },
  async replySupportTicket(id: string, body: string, attachments: string[] = []) {
    return http<SupportMessage>(`/api/support/tickets/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body, attachments }),
    })
  },
  async updateSupportTicketStatus(id: string, status: SupportTicketStatus) {
    return http<SupportTicket>(`/api/support/tickets/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  },
  async salesAssistantChat(payload: AssistantChatRequest) {
    return http<AssistantChatResponse>('/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async listRefundRequests(scope?: 'buyer' | 'seller' | 'all') {
    const params = new URLSearchParams()
    if (scope) params.set('scope', scope)
    const query = params.toString()
    return http<RefundRequest[]>(`/api/refunds${query ? `?${query}` : ''}`)
  },
  async createRefundRequest(input: { orderId: string; orderItemId?: string; amount?: number; reason: string }) {
    const { orderId, ...rest } = input
    return http<RefundRequest>(`/api/orders/${encodeURIComponent(orderId)}/refund`, {
      method: 'POST',
      body: JSON.stringify(rest),
    })
  },
  async reviewRefundRequest(id: string, action: 'accept' | 'reject' | 'refund', notes?: string, amount?: number) {
    const payload: Record<string, unknown> = { action }
    if (notes !== undefined) payload.notes = notes
    if (amount !== undefined) payload.amount = amount
    return http<RefundRequest>(`/api/refunds/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Categories
  async listCategories(): Promise<Category[]> {
    return http<Category[]>('/api/categories')
  },
  async createCategory(input: Omit<Category, 'id'>): Promise<Category> {
    return http<Category>('/api/categories', { method: 'POST', body: JSON.stringify(input) })
  },
  async updateCategory(id: string, patch: Partial<Category>): Promise<Category> {
    return http<Category>('/api/categories', { method: 'PUT', body: JSON.stringify({ id, ...patch }) })
  },
  async deleteCategory(id: string): Promise<void> {
    await http<void>('/api/categories', { method: 'DELETE', body: JSON.stringify({ id }) })
  },
  async getMe() {
    return http<any>('/api/auth/me')
  },
  async updateMe(patch: Partial<{ name: string; image: string; phoneNo: string; ABN: string; bio: string }>) {
    return http<any>('/api/auth/me', { method: 'PUT', body: JSON.stringify(patch) })
  },
  async getUserById(id: number) {
    try {
      return await http<{ id: number; name?: string | null; email: string; image?: string | null } | null>(`/api/users/${id}`)
    } catch {
      return null
    }
  },
  async rateNegative(id: number, reason: string) {
    return http<{ negativeCount: number; rating: number }>(`/api/users/${id}/rate-negative`, { method: 'POST', body: JSON.stringify({ reason }) })
  },
  async listSellerReviews(sellerId: number) {
    return http<{ avg: number; count: number; histogram: Record<number, number>; reviews: { orderId: string; rating: number; feedback: string; createdAt: string; buyer?: { id: number; name?: string | null; email: string; image?: string | null } }[] }>(`/api/users/${sellerId}/reviews`)
  },
  async listBlogPosts(authorId?: number) {
    const q = authorId ? `?authorId=${authorId}` : ''
    return http<any[]>(`/api/blog/posts${q}`)
  },
  async getBlogPostBySlug(slug: string) {
    return http<any>(`/api/blog/posts/${encodeURIComponent(slug)}`)
  },
  async createBlogPost(input: { title: string; slug: string; content: string; coverImage?: string; tags?: string[]; published?: boolean }) {
    return http<any>('/api/blog/posts', { method: 'POST', body: JSON.stringify(input) })
  },
  async updateBlogPost(id: string, patch: Partial<{ title: string; slug: string; content: string; coverImage?: string | null; tags?: string[]; published?: boolean }>) {
    return http<any>(`/api/blog/posts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(patch) })
  },
  async deleteBlogPost(id: string) {
    await http<void>(`/api/blog/posts/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  // Amazing Freight
  async createDocket(input) { return http<any>('/api/driver/dockets', { method: 'POST', body: JSON.stringify(input) }) },
  async listMyDockets() { return http<any[]>('/api/driver/dockets') },
  async createShift(input) { return http<any>('/api/driver/shifts', { method: 'POST', body: JSON.stringify(input) }) },
  async listMyShifts() { return http<any[]>('/api/driver/shifts') },
  async createMaintenance(input) { return http<any>('/api/driver/maintenance', { method: 'POST', body: JSON.stringify(input) }) },
  async listMyMaintenance() { return http<any[]>('/api/driver/maintenance') },
  async createAccident(input) { return http<any>('/api/driver/accidents', { method: 'POST', body: JSON.stringify(input) }) },
  async listMyAccidents() { return http<any[]>('/api/driver/accidents') },
  async createFuelReceipt(input) { return http<any>('/api/driver/receipts', { method: 'POST', body: JSON.stringify(input) }) },
  async listMyFuelReceipts() { return http<any[]>('/api/driver/receipts') },
  async listMyPayments() { return http<any[]>('/api/driver/payments') },
  async listMyPayslips() { return http<any[]>('/api/driver/payslips') },
  async adminListDrivers() { return http<any[]>('/api/admin/drivers') },
  async adminListDockets() { return http<any[]>('/api/admin/dockets') },
  async adminShiftsAgg(group = 'day') { return http<{ group: string; data: Record<string, number> }>(`/api/admin/shifts?group=${group}`) },
  async adminListTrucks() { return http<any[]>('/api/admin/trucks') },
  async adminCreateTruck(input) { return http<any>('/api/admin/trucks', { method: 'POST', body: JSON.stringify(input) }) },
  async getMfaStatus() {
    return http<{ enabled: boolean }>(`/api/auth/mfa/status`)
  },
  async mfaSetup() {
    return http<{ secret: string; otpauth: string }>(`/api/auth/mfa/setup`, { method: 'POST' })
  },
  async mfaEnable(token: string) {
    return http<{ enabled: boolean }>(`/api/auth/mfa/enable`, { method: 'POST', body: JSON.stringify({ token }) })
  },
  async mfaDisable(token: string) {
    return http<{ enabled: boolean }>(`/api/auth/mfa/disable`, { method: 'POST', body: JSON.stringify({ token }) })
  },
  async mfaVerify(token: string) {
    return http<any>(`/api/auth/mfa/verify`, { method: 'POST', body: JSON.stringify({ token }) })
  },
}

const localWrapper: DataAPI = {
  // Products
  async listAnnouncements(audience) {
    const announcements = localRead<Announcement[]>('local_announcements', [
      {
        id: localId('ann'),
        title: 'Welcome to Hedgetech demo mode',
        body: 'Switch to API-backed mode to see real marketplace announcements.',
        audience: 'all',
        pinned: true,
        publishedAt: new Date().toISOString(),
      },
    ])
    const now = Date.now()
    const filtered = announcements.filter((item) => {
      const inWindow = (!item.startAt || Date.parse(item.startAt) <= now) && (!item.endAt || Date.parse(item.endAt) >= now)
      if (!audience || audience === 'all') return inWindow
      return inWindow && (item.audience === 'all' || item.audience === audience)
    })
    return filtered
  },
  async listProducts() { return localdb.listProducts() },
  async getProductBySlug(slug: string) { return localdb.getProductBySlug(slug) },
  async getProductById(id: string) { return localdb.getProductById(id) },
  async getProductAvailability(id: string, options) {
    const product = await localdb.getProductById(id)
    if (!product) throw new Error('Product not found')
    if (product.type !== 'service') throw new Error('Availability only applies to services')
    const startDate = options?.start ? new Date(options.start) : new Date()
    if (Number.isNaN(startDate.getTime())) throw new Error('Invalid start date')
    const start = startOfDay(startDate)
    const span = Math.min(Math.max(1, options?.days ?? 14), 90)
    const openDays = (product.serviceOpenDays && product.serviceOpenDays.length ? product.serviceOpenDays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']).map((d) => d.toLowerCase())
    const openTime = product.serviceOpenTime || '09:00'
    const closeTime = product.serviceCloseTime || '17:00'
    const durationMinutes = Math.max(15, product.serviceDurationMinutes || 60)
    const durationMs = durationMinutes * 60 * 1000

    const days: ServiceAvailabilityDay[] = []
    for (let offset = 0; offset < span; offset += 1) {
      const dayDate = addDays(start, offset)
      const weekday = DAY_NAMES[dayDate.getDay()] || 'monday'
      const isOpen = openDays.includes(weekday)
      let slots: ServiceAvailabilitySlot[] = []
      let capacity = product.serviceDailyCapacity ?? 0
      if (isOpen) {
        const dayOpen = combineDateAndTime(dayDate, openTime)
        let dayClose = combineDateAndTime(dayDate, closeTime)
        if (dayClose <= dayOpen) {
          dayClose = new Date(dayOpen.getTime() + durationMs)
        }
        const maxSlots = Math.max(1, Math.floor((dayClose.getTime() - dayOpen.getTime()) / durationMs))
        capacity = product.serviceDailyCapacity ?? maxSlots
        const effectiveSlots = Math.min(maxSlots, capacity)
        slots = Array.from({ length: effectiveSlots }).map((_, idx) => {
          const slotStart = dayOpen.getTime() + idx * durationMs
          return {
            start: new Date(slotStart).toISOString(),
            end: new Date(slotStart + durationMs).toISOString(),
            available: true,
            booked: 0,
          }
        })
      }
      days.push({
        date: dayDate.toISOString().slice(0, 10),
        weekday,
        isOpen,
        remaining: capacity,
        capacity,
        slots,
      })
    }

    return {
      productId: id,
      start: start.toISOString(),
      end: addDays(start, span).toISOString(),
      durationMinutes,
      openTime,
      closeTime,
      openDays,
      days,
    }
  },
  async getProductByBarcode(code: string) {
    const list = await localdb.listProducts()
    const p = list.find((x: any) => String(x.barcode || '').trim() === String(code).trim())
    return p || null
  },
  async createProduct(input: Omit<Product, 'id'>) { return localdb.createProduct(input) },
  async updateProduct(id: string, patch: Partial<Product>) { return localdb.updateProduct(id, patch) },
  async deleteProduct(id: string) { return localdb.deleteProduct(id) },
  // Cart
  async getCart(namespace?: string) { return localdb.getCart(namespace) },
  async addToCart(productId: string, quantity = 1, namespace?: string, meta?: string) { return localdb.addToCart(productId, quantity, namespace, meta) },
  async removeFromCart(itemId: string, namespace?: string) { return localdb.removeFromCart(itemId, namespace) },
  async clearCart(namespace?: string) { return localdb.clearCart(namespace) },
  // Orders
  async listOrders(namespace?: string) { return localdb.listOrders(namespace) },
  async createOrder(input: Omit<Order, 'id' | 'createdAt' | 'status'> & { status?: Order['status'] }, namespace?: string) { return localdb.createOrder(input, namespace) },
  async createPosOrder(input) {
    const ns = 'pos'
    const total = (input.items || []).reduce((a, c) => a + (c.price || 0) * (c.quantity || 0), 0)
    return localdb.createOrder({
      items: input.items.map((i) => ({ productId: i.productId, title: i.title, price: i.price, quantity: i.quantity })),
      total,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      status: 'paid',
    }, ns)
  },
  async listSellerOrders() { return [] },
  async shipOrder(id: string, _ackPaid: boolean) { return { id, items: [], total: 0, createdAt: new Date().toISOString(), status: 'shipped' } as unknown as Order },
  async confirmReceived(id: string) { return { id, items: [], total: 0, createdAt: new Date().toISOString(), status: 'completed' } as unknown as Order },
  async listAllOrders() { return [] },
  async adminUpdateOrderStatus(id: string, status: Order['status']) { return { id, items: [], total: 0, createdAt: new Date().toISOString(), status } as unknown as Order },
  async adminDeleteOrder(_id: string) { return },
  async submitOrderReview(_orderId: string, rating: number, feedback: string) { return { rating, feedback } },
  async getOrderReview(_orderId: string) { return null },
  async listSupportTickets() {
    return localRead<SupportTicket[]>('local_supportTickets', [])
  },
  async getSupportTicket(id: string) {
    const tickets = localRead<SupportTicket[]>('local_supportTickets', [])
    return tickets.find((ticket) => ticket.id === id) || null
  },
  async createSupportTicket(input) {
    const tickets = localRead<SupportTicket[]>('local_supportTickets', [])
    const message: SupportMessage = {
      id: localId('msg'),
      ticketId: '',
      authorId: 0,
      body: input.body,
      attachments: [],
      createdAt: new Date().toISOString(),
    }
    const ticket: SupportTicket = {
      id: localId('ticket'),
      subject: input.subject,
      type: (input.type as SupportTicketType) || 'general',
      status: 'open',
      priority: input.priority || 'normal',
      orderId: input.orderId,
      orderItemId: input.orderItemId,
      requesterId: 0,
      sellerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    }
    message.ticketId = ticket.id
    ticket.messages = [message]
    localWrite('local_supportTickets', [ticket, ...tickets])
    return ticket
  },
  async replySupportTicket(id: string, body: string, attachments: string[] = []) {
    const tickets = localRead<SupportTicket[]>('local_supportTickets', [])
    const idx = tickets.findIndex((ticket) => ticket.id === id)
    const message: SupportMessage = {
      id: localId('msg'),
      ticketId: id,
      authorId: 0,
      body,
      attachments,
      createdAt: new Date().toISOString(),
    }
    if (idx >= 0) {
      const next = { ...tickets[idx] }
      next.messages = [...(next.messages ?? []), message]
      next.updatedAt = new Date().toISOString()
      tickets[idx] = next
      localWrite('local_supportTickets', tickets)
    }
    return message
  },
  async updateSupportTicketStatus(id: string, status: SupportTicketStatus) {
    const tickets = localRead<SupportTicket[]>('local_supportTickets', [])
    const idx = tickets.findIndex((ticket) => ticket.id === id)
    if (idx === -1) throw new Error('Ticket not found')
    const next = { ...tickets[idx], status, updatedAt: new Date().toISOString() }
    tickets[idx] = next
    localWrite('local_supportTickets', tickets)
    return next
  },
  async salesAssistantChat() {
    throw new Error('AI assistant requires API mode. Enable VITE_USE_API=true with a configured backend.')
  },
  async listRefundRequests(scope?: 'buyer' | 'seller' | 'all') {
    const refunds = localRead<RefundRequest[]>('local_refunds', [])
    if (!scope || scope === 'all') return refunds
    if (scope === 'buyer') return refunds.filter((item) => item.buyerId === 0)
    if (scope === 'seller') return refunds.filter((item) => item.sellerId === 0)
    return refunds
  },
  async createRefundRequest(input) {
    const refunds = localRead<RefundRequest[]>('local_refunds', [])
    const refund: RefundRequest = {
      id: localId('refund'),
      orderId: input.orderId,
      orderItemId: input.orderItemId ?? null,
      buyerId: 0,
      sellerId: null,
      amount: input.amount ?? null,
      reason: input.reason,
      status: 'requested',
      resolution: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    localWrite('local_refunds', [refund, ...refunds])
    return refund
  },
  async reviewRefundRequest(id: string, action: 'accept' | 'reject' | 'refund', notes?: string, amount?: number) {
    const refunds = localRead<RefundRequest[]>('local_refunds', [])
    const idx = refunds.findIndex((item) => item.id === id)
    if (idx === -1) throw new Error('Refund not found')
    const map: Record<string, RefundStatus> = { accept: 'accepted', reject: 'rejected', refund: 'refunded' }
    const next: RefundRequest = {
      ...refunds[idx],
      status: map[action] ?? refunds[idx].status,
      resolution: notes ?? refunds[idx].resolution ?? null,
      amount: amount ?? refunds[idx].amount ?? null,
      updatedAt: new Date().toISOString(),
    }
    refunds[idx] = next
    localWrite('local_refunds', refunds)
    return next
  },
  // Categories (map to local storage categories helper)
  async listCategories() { return localCategories.list() },
  async createCategory(input: Omit<Category, 'id'>) { return localCategories.create(input) },
  async updateCategory(id: string, patch: Partial<Category>) { const r = await localCategories.update(id, patch); return r as unknown as Category },
  async deleteCategory(id: string) { return localCategories.remove(id) },
  async getMe() { return null },
  async updateMe(_patch) { return null },
  async getMfaStatus() { return { enabled: false } },
  async mfaSetup() { return { secret: 'LOCALONLY', otpauth: '' } },
  async mfaEnable(_token: string) { return { enabled: false } },
  async mfaDisable(_token: string) { return { enabled: false } },
  async mfaVerify(_token: string) { return null },
  async getUserById(_id: number) { return null },
  async rateNegative(_id: number, _reason: string) { return { negativeCount: 0, rating: 5 } },
  async listSellerReviews(_sellerId: number) { return { avg: 0, count: 0, histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, reviews: [] } },
  // Amazing Freight (local no-op)
  async createDocket(_input) { return {} as any },
  async listMyDockets() { return [] },
  async createShift(_input) { return {} as any },
  async listMyShifts() { return [] },
  async createMaintenance(_input) { return {} as any },
  async listMyMaintenance() { return [] },
  async createAccident(_input) { return {} as any },
  async listMyAccidents() { return [] },
  async createFuelReceipt(_input) { return {} as any },
  async listMyFuelReceipts() { return [] },
  async listMyPayments() { return [] },
  async listMyPayslips() { return [] },
  async adminListDrivers() { return [] },
  async adminListDockets() { return [] },
  async adminShiftsAgg(_group = 'day') { return { group: 'day', data: {} } },
  async adminListTrucks() { return [] },
  async adminCreateTruck(_input) { return {} as any },
}

export const db: DataAPI = useApi ? api : localWrapper
export { seedProducts }
export * from './localdb'
