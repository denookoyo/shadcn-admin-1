// Lightweight localStorage-backed DB for demo use
// Provides Products, Cart, and Orders with async-like APIs

export type ProductType = 'goods' | 'service'

export type Product = {
  id: string
  slug: string
  title: string
  price: number
  seller: string
  rating?: number
  type: ProductType
  img: string
  barcode?: string
  description?: string
  images?: string[]
  ownerId?: string
  categoryId?: string
  stockCount?: number
  serviceDurationMinutes?: number
  serviceOpenTime?: string
  serviceCloseTime?: string
  serviceOpenDays?: string[]
  serviceDailyCapacity?: number
}

export type CartItem = {
  id: string
  productId: string
  quantity: number
  meta?: string
}

export type OrderItem = {
  productId: string
  title: string
  price: number
  quantity: number
}

export type Order = {
  id: string
  items: OrderItem[]
  total: number
  createdAt: string
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'
  customerName?: string
  customerEmail?: string
  address?: string
  customerPhone?: string
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
    const product: Product = {
      id: uid('prod'),
      stockCount: input.stockCount ?? 0,
      serviceOpenDays: input.serviceOpenDays ?? [],
      ...input,
    }
    write(nsKey('db_products', namespace), [product, ...products])
    return product
  },
  async updateProduct(id: string, patch: Partial<Product>, namespace?: string): Promise<Product | undefined> {
    const products = await this.listProducts(namespace)
    const idx = products.findIndex((p) => p.id === id)
    if (idx === -1) return undefined
    const updated = { ...products[idx], ...patch }
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
  async createOrder(input: Omit<Order, 'id' | 'createdAt' | 'status'> & { status?: Order['status'] }, namespace?: string): Promise<Order> {
    const orders = await this.listOrders(namespace)
    const order: Order = {
      id: uid('ord'),
      createdAt: new Date().toISOString(),
      status: input.status ?? 'pending',
      items: input.items,
      total: input.total,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      address: input.address,
      customerPhone: (input as any).customerPhone,
    }
    write(nsKey('db_orders', namespace), [order, ...orders])
    return order
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
