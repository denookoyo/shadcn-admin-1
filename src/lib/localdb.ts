// Lightweight localStorage-backed DB for demo use
// Provides Products, Cart, and Orders with async-like APIs

export type ProductType = 'goods' | 'service'
export type ProductVertical = 'commerce' | 'shared_space'

export type SharedSpaceProfile = {
  type: 'room' | 'studio' | 'desk'
  listingKind?: 'roommate' | 'desk-pass' | 'lease-transfer'
  rentPerWeek: number
  bond?: number
  suburb: string
  city: string
  state: string
  availableFrom: string
  stayLength: string
  occupancy: { current: number; total: number }
  furnished?: boolean
  amenities?: string[]
  vibe?: string[]
  host?: {
    name: string
    avatar?: string
    bio?: string
  }
  conciergeIntro?: string
}

export type Product = {
  id: string
  slug: string
  title: string
  price: number
  compareAtPrice?: number | null
  seller: string
  rating?: number
  type: ProductType
  img: string
  barcode?: string
  barcodes?: string[]
  description?: string
  images?: string[]
  ownerId?: string | number | null
  categoryId?: string
  stockCount?: number
  serviceDurationMinutes?: number
  serviceOpenTime?: string
  serviceCloseTime?: string
  serviceOpenDays?: string[]
  serviceDailyCapacity?: number
  vertical?: ProductVertical
  spaceProfile?: SharedSpaceProfile | null
}

export type CartItem = {
  id: string
  productId: string
  quantity: number
  meta?: string
}

export type OrderItem = {
  id?: string
  productId: string
  title: string
  price: number
  quantity: number
  shippedBarcodes?: string[]
  stockSource?: 'tracked_units' | 'manual'
}

export type PaymentRoute = 'platform' | 'connected_account'
export type OrderPaymentStatus =
  | 'pending'
  | 'payment_requested'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled'

export type StorePaymentSettings = {
  defaultPaymentRoute: PaymentRoute
  stripeConnectedAccountId?: string | null
  stripeChargesEnabled: boolean
  stripePayoutsEnabled: boolean
  stripeDetailsSubmitted: boolean
}

export type Order = {
  id: string
  items: OrderItem[]
  total: number
  createdAt: string
  status: 'pending' | 'scheduled' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'refunded'
  paymentStatus?: OrderPaymentStatus
  paymentRoute?: PaymentRoute | null
  paymentUrl?: string | null
  paymentRequestedAt?: string | null
  paidAt?: string | null
  refundedAt?: string | null
  currency?: string
  customerName?: string
  customerEmail?: string
  address?: string
  customerPhone?: string
  seller?: {
    id?: number | string | null
    name?: string | null
    email?: string | null
  } | null
  store?: {
    id?: number | string | null
    name?: string | null
    slug?: string | null
    paymentSettings?: StorePaymentSettings | null
  } | null
}

export type ShipmentItemInput = {
  orderItemId: string
  barcodes: string[]
}

export type StockIntakeInput = {
  productId: string
  supplierName?: string
  supplierReference?: string
  unitCost?: number | null
  barcodes?: string[]
  quantity?: number
}

function nsKey(key: string, namespace?: string) {
  return namespace ? `${namespace}:${key}` : key
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export const db = {
  async listProducts(namespace?: string): Promise<Product[]> {
    return read<Product[]>(nsKey('db_products', namespace), [])
  },
  async getProductBySlug(slug: string, namespace?: string): Promise<Product | undefined> {
    const products = await this.listProducts(namespace)
    return products.find((p) => p.slug === slug)
  },
  async getProductById(id: string, namespace?: string): Promise<Product | undefined> {
    const products = await this.listProducts(namespace)
    return products.find((p) => p.id === id)
  },
  async createProduct(input: Omit<Product, 'id'>, namespace?: string): Promise<Product> {
    const products = await this.listProducts(namespace)
    const normalizedBarcodes = Array.isArray(input.barcodes)
      ? Array.from(new Set(input.barcodes.map((value) => String(value || '').trim()).filter(Boolean)))
      : []
    const product: Product = {
      id: uid('prod'),
      ...input,
      barcode: input.barcode ?? normalizedBarcodes[0],
      barcodes: normalizedBarcodes,
      stockCount: normalizedBarcodes.length > 0 ? normalizedBarcodes.length : input.stockCount ?? 0,
      serviceOpenDays: input.serviceOpenDays ?? [],
      vertical: input.vertical ?? 'commerce',
      spaceProfile: input.spaceProfile ?? null,
    }
    write(nsKey('db_products', namespace), [product, ...products])
    return product
  },
  async updateProduct(id: string, patch: Partial<Product>, namespace?: string): Promise<Product | undefined> {
    const products = await this.listProducts(namespace)
    const idx = products.findIndex((p) => p.id === id)
    if (idx === -1) return undefined
    const normalizedBarcodes = Array.isArray(patch.barcodes)
      ? Array.from(new Set(patch.barcodes.map((value) => String(value || '').trim()).filter(Boolean)))
      : undefined
    const updated = {
      ...products[idx],
      ...patch,
      barcode: patch.barcode ?? normalizedBarcodes?.[0] ?? products[idx].barcode,
      barcodes: normalizedBarcodes ?? products[idx].barcodes,
      stockCount:
        normalizedBarcodes && normalizedBarcodes.length > 0
          ? normalizedBarcodes.length
          : patch.stockCount ?? products[idx].stockCount,
    }
    products[idx] = updated
    write(nsKey('db_products', namespace), products)
    return updated
  },
  async deleteProduct(id: string, namespace?: string): Promise<boolean> {
    const products = await this.listProducts(namespace)
    const next = products.filter((p) => p.id !== id)
    write(nsKey('db_products', namespace), next)
    return next.length !== products.length
  },

  // Cart
  async getCart(namespace?: string): Promise<CartItem[]> {
    return read<CartItem[]>(nsKey('db_cart', namespace), [])
  },
  async addToCart(productId: string, quantity = 1, namespace?: string, meta?: string): Promise<CartItem> {
    const cart = await this.getCart(namespace)
    const existing = cart.find((c) => c.productId === productId)
    if (existing) {
      existing.quantity += quantity
      if (meta) existing.meta = meta
      write(nsKey('db_cart', namespace), [...cart])
      return existing
    }
    const item: CartItem = { id: uid('cart'), productId, quantity, meta }
    write(nsKey('db_cart', namespace), [item, ...cart])
    return item
  },
  async removeFromCart(itemId: string, namespace?: string): Promise<void> {
    const cart = await this.getCart(namespace)
    write(nsKey('db_cart', namespace), cart.filter((c) => c.id !== itemId))
  },
  async clearCart(namespace?: string): Promise<void> {
    write(nsKey('db_cart', namespace), [])
  },

  // Orders
  async listOrders(namespace?: string): Promise<Order[]> {
    return read<Order[]>(nsKey('db_orders', namespace), [])
  },
  async getOrder(id: string, namespace?: string): Promise<Order | undefined> {
    const orders = await this.listOrders(namespace)
    return orders.find((order) => order.id === id)
  },
  async createOrder(
    input: Omit<Order, 'id' | 'createdAt' | 'status'> & { status?: Order['status'] },
    namespace?: string,
  ): Promise<Order> {
    const orders = await this.listOrders(namespace)
    const order: Order = {
      id: uid('ord'),
      createdAt: new Date().toISOString(),
      status: input.status ?? 'pending',
      paymentStatus: input.paymentStatus ?? 'pending',
      paymentRoute: input.paymentRoute ?? null,
      paymentUrl: input.paymentUrl ?? null,
      paymentRequestedAt: input.paymentRequestedAt ?? null,
      paidAt: input.paidAt ?? null,
      refundedAt: input.refundedAt ?? null,
      currency: input.currency ?? 'AUD',
      items: input.items.map((item) => ({
        ...item,
        id: item.id ?? uid('item'),
        shippedBarcodes: item.shippedBarcodes ?? [],
      })),
      total: input.total,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      address: input.address,
      customerPhone: (input as any).customerPhone,
      seller: input.seller ?? null,
      store: input.store ?? null,
    }
    write(nsKey('db_orders', namespace), [order, ...orders])
    return order
  },
  async shipOrder(id: string, shipment?: { items?: ShipmentItemInput[] }, namespace?: string): Promise<Order | undefined> {
    const orders = await this.listOrders(namespace)
    const idx = orders.findIndex((order) => order.id === id)
    if (idx === -1) return undefined
    const barcodeMap = new Map(
      (shipment?.items || []).map((item) => [item.orderItemId, item.barcodes.map((barcode) => barcode.trim()).filter(Boolean)])
    )
    const updated: Order = {
      ...orders[idx],
      status: 'shipped',
      items: (orders[idx].items || []).map((item) => ({
        ...item,
        shippedBarcodes: barcodeMap.get(item.id || '') || item.shippedBarcodes || [],
        stockSource: barcodeMap.has(item.id || '') ? 'tracked_units' : item.stockSource,
      })),
    }
    orders[idx] = updated
    write(nsKey('db_orders', namespace), orders)
    return updated
  },
  async createStockIntake(input: StockIntakeInput, namespace?: string) {
    const products = await this.listProducts(namespace)
    const idx = products.findIndex((product) => product.id === input.productId)
    if (idx === -1) throw new Error('Product not found')
    const quantityFromBarcodes = (input.barcodes || []).filter(Boolean).length
    const quantity = Math.max(quantityFromBarcodes, Number(input.quantity || 0))
    products[idx] = {
      ...products[idx],
      stockCount: Math.max(0, Number(products[idx].stockCount || 0)) + quantity,
      barcode: products[idx].barcode || input.barcodes?.find(Boolean) || products[idx].barcode,
    }
    write(nsKey('db_products', namespace), products)
    const intake = {
      id: uid('intake'),
      productId: input.productId,
      supplierName: input.supplierName?.trim() || null,
      supplierReference: input.supplierReference?.trim() || null,
      unitCost: input.unitCost ?? null,
      quantity,
      barcodes: (input.barcodes || []).map((barcode) => barcode.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    }
    const history = read<any[]>(nsKey('db_stock_intakes', namespace), [])
    write(nsKey('db_stock_intakes', namespace), [intake, ...history])
    return intake
  },
  async listStockIntakes(namespace?: string) {
    return read<any[]>(nsKey('db_stock_intakes', namespace), [])
  },
}

// Simple seeding helper
export async function seedProducts(products: Array<Omit<Product, 'id'>> = [], namespace?: string) {
  const existing = await db.listProducts(namespace)
  if (existing.length > 0) return existing
  const created: Product[] = []
  for (const p of products) {
    const prod = await db.createProduct(p, namespace)
    created.push(prod)
  }
  return created
}

// Categories (local fallback)
export type Category = { id: string; name: string; slug: string }

export const categories = {
  async list(namespace?: string): Promise<Category[]> {
    return read<Category[]>(nsKey('db_categories', namespace), [])
  },
  async create(input: Omit<Category, 'id'>, namespace?: string): Promise<Category> {
    const all = await this.list(namespace)
    const cat: Category = { id: uid('cat'), ...input }
    write(nsKey('db_categories', namespace), [cat, ...all])
    return cat
  },
  async update(id: string, patch: Partial<Category>, namespace?: string): Promise<Category | undefined> {
    const all = await this.list(namespace)
    const idx = all.findIndex((c) => c.id === id)
    if (idx === -1) return undefined
    all[idx] = { ...all[idx], ...patch }
    write(nsKey('db_categories', namespace), all)
    return all[idx]
  },
  async remove(id: string, namespace?: string): Promise<void> {
    const all = await this.list(namespace)
    write(nsKey('db_categories', namespace), all.filter((c) => c.id !== id))
  },
}
