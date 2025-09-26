import { db as localdb, seedProducts, categories as localCategories, type Product, type Order, type CartItem, type Category } from './localdb'
import { fetchJson } from './http'

const useApi = typeof window !== 'undefined' && (import.meta as any).env?.VITE_USE_API === 'true'

// Unify API surface so callers can use categories regardless of backend
export type DataAPI = {
  // Products
  listProducts: () => Promise<Product[]>
  getProductBySlug: (slug: string) => Promise<Product | undefined>
  getProductById: (id: string) => Promise<Product | undefined>
  getProductByBarcode?: (code: string) => Promise<Product | null>
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
  return fetchJson<T>(input, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
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
  async getProductByBarcode(code: string) {
    try {
      return await http<Product>(`/api/products/barcode/${encodeURIComponent(code)}`)
    } catch {
      return null
    }
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
  async listProducts() { return localdb.listProducts() },
  async getProductBySlug(slug: string) { return localdb.getProductBySlug(slug) },
  async getProductById(id: string) { return localdb.getProductById(id) },
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
