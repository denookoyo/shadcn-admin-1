import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { differenceInHours, format } from 'date-fns'
import {
  Sparkles,
  Store,
  Boxes,
  TrendingUp,
  Truck,
  ShieldCheck,
  AlertTriangle,
  Users,
  ClipboardList,
  ArrowUpRight,
  LineChart,
  Building,
  Layers,
  Rocket,
} from 'lucide-react'

import { Header } from '@/components/layout/header'
import { TopNav } from '@/components/layout/top-nav'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Search } from '@/components/search'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

import { db, type Product, type Order, type Category, type Announcement, type AnnouncementAudience } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { getSellerStatus, SELLER_VERIFICATION_EVENT, type SellerVerificationStatus } from '@/features/sellers/verification'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function splitListInput(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

type PersonaKey = 'owner' | 'operations' | 'sales' | 'admin'

type SpaceFormState = {
  type: 'room' | 'studio' | 'desk'
  listingKind: 'roommate' | 'desk-pass' | 'lease-transfer'
  suburb: string
  city: string
  state: string
  availableFrom: string
  stayLength: string
  occupancyCurrent: number
  occupancyTotal: number
  furnished: boolean
  bond: string
  amenities: string
  vibe: string
  hostName: string
  hostAvatar: string
  hostBio: string
  conciergeIntro: string
}

type ProductFormState = {
  title: string
  price: number
  type: Product['type']
  seller: string
  img: string
  images: string
  description: string
  slug: string
  categoryId: string
  vertical: 'commerce' | 'shared_space'
  spaceProfile: SpaceFormState
}

function createEmptySpaceProfile(): SpaceFormState {
  return {
    type: 'room',
    listingKind: 'roommate',
    suburb: '',
    city: '',
    state: '',
    availableFrom: new Date().toISOString().slice(0, 10),
    stayLength: '3-6 months',
    occupancyCurrent: 1,
    occupancyTotal: 2,
    furnished: true,
    bond: '',
    amenities: 'Queen bed, High-speed internet, Cleaner',
    vibe: 'Remote work, Pet-friendly',
    hostName: '',
    hostAvatar: '',
    hostBio: '',
    conciergeIntro: 'I\'m looking for a considerate founder/creator who values community dinners and hybrid work.',
  }
}

function createEmptyProductForm(): ProductFormState {
  return {
    title: '',
    price: 0,
    type: 'goods',
    seller: 'You',
    img: '',
    images: '',
    description: '',
    slug: '',
    categoryId: '',
    vertical: 'commerce',
    spaceProfile: createEmptySpaceProfile(),
  }
}

const FLATMATES_CATEGORY_NAME = 'Flatmates & desks'
const FLATMATES_CATEGORY_SLUG = 'flatmates'

const personas: { value: PersonaKey; label: string; description: string }[] = [
  {
    value: 'owner',
    label: 'Store owner',
    description: 'Listings, inventory, and storefront storytelling.',
  },
  {
    value: 'operations',
    label: 'Marketplace operator',
    description: 'Fulfilment, SLAs, and service reliability.',
  },
  {
    value: 'sales',
    label: 'Sales & growth',
    description: 'Pipeline, top offers, and buyer engagement.',
  },
  {
    value: 'admin',
    label: 'Marketplace admin',
    description: 'Platform health, risk, and compliance controls.',
  },
]

function MetricCard({
  icon: Icon,
  label,
  value,
  help,
  accent = 'slate',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  help?: string
  accent?: 'emerald' | 'amber' | 'slate'
}) {
  const accents: Record<typeof accent, string> = {
    emerald: 'border-emerald-200/80 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200/80 bg-amber-50 text-amber-900',
    slate: 'border-slate-200 bg-white text-slate-900',
  }

  return (
    <Card className={`h-full border ${accents[accent]}`}>
      <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-semibold'>{label}</CardTitle>
        <Icon className='h-4 w-4 opacity-70' />
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        {help ? <p className='mt-1 text-xs text-slate-500'>{help}</p> : null}
      </CardContent>
    </Card>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className='rounded-2xl border border-dashed border-slate-200 p-10 text-center'>
      <h3 className='text-sm font-semibold text-slate-700'>{title}</h3>
      <p className='mt-2 text-sm text-slate-500'>{description}</p>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore((state) => state.auth)
  const userId = (user as any)?.id as number | undefined
  const userEmail = user?.email

  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const creatingFlatmatesRef = useRef(false)
  const [sellerStatus, setSellerStatus] = useState<SellerVerificationStatus>(() => getSellerStatus(userEmail))

  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState<ProductFormState>(() => createEmptyProductForm())
  const [generatingCopy, setGeneratingCopy] = useState(false)

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '' })
  const [categoryEditingId, setCategoryEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (productForm.vertical !== 'shared_space') return
    const existing = categories.find((category) => category.slug === FLATMATES_CATEGORY_SLUG)
    if (existing) {
      if (productForm.categoryId !== existing.id) {
        setProductForm((prev) => ({ ...prev, categoryId: existing.id }))
      }
      return
    }
    if (creatingFlatmatesRef.current || typeof db.createCategory !== 'function') return
    creatingFlatmatesRef.current = true
    ;(async () => {
      try {
        const created = await db.createCategory?.({
          name: FLATMATES_CATEGORY_NAME,
          slug: FLATMATES_CATEGORY_SLUG,
        })
        if (created) {
          setCategories((prev) => [created, ...prev])
          setProductForm((prev) => ({ ...prev, categoryId: created.id }))
        }
      } catch {
        // ignore
      } finally {
        creatingFlatmatesRef.current = false
      }
    })()
  }, [productForm.vertical, productForm.categoryId, categories])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const [prods, ords, cats] = await Promise.all([
        db.listProducts(),
        db.listOrders(),
        db.listCategories?.() ?? Promise.resolve([] as Category[]),
      ])
      if (!mounted) return
      setProducts(prods)
      setOrders(ords)
      setCategories(cats)
    })()
    return () => {
      mounted = false
    }
  }, [userId])

  useEffect(() => {
    setSellerStatus(getSellerStatus(userEmail))
  }, [userEmail])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => setSellerStatus(getSellerStatus(userEmail))
    window.addEventListener(SELLER_VERIFICATION_EVENT, handler)
    return () => window.removeEventListener(SELLER_VERIFICATION_EVENT, handler)
  }, [userEmail])


  useEffect(() => {
    let mounted = true
    if (typeof db.listAnnouncements !== 'function') return () => { mounted = false }
    ;(async () => {
      try {
        const role = (user as any)?.role as AnnouncementAudience | undefined
        const scope: AnnouncementAudience = role && ['admins', 'sellers', 'buyers', 'drivers'].includes(role) ? role : 'sellers'
        const list = (await db.listAnnouncements?.(scope)) ?? []
        if (mounted) setAnnouncements(list)
      } catch {
        if (mounted) setAnnouncements([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [user])

  const myProducts = useMemo(() => {
    return products.filter((product: any) => {
      if (product?.ownerId != null) {
        if (typeof product.ownerId === 'number' && userId != null) {
          return Number(product.ownerId) === Number(userId)
        }
        if (typeof product.ownerId === 'string' && userEmail) {
          return product.ownerId === userEmail
        }
        return false
      }
      return true
    })
  }, [products, userId, userEmail])

  const productPreview = myProducts.slice(0, 5)

  const groupedOrders = useMemo(() => {
    const groups: Record<Order['status'], Order[]> = {
      pending: [],
      scheduled: [],
      paid: [],
      shipped: [],
      completed: [],
      cancelled: [],
      refunded: [],
    }
    for (const order of orders) {
      if (!groups[order.status]) groups[order.status as keyof typeof groups] = []
      groups[order.status]?.push(order)
    }
    return groups
  }, [orders])

  const visibleAnnouncements = useMemo(() => announcements.slice(0, 3), [announcements])
  const role = String(user?.role ?? '').toLowerCase()
  const canManageListings = sellerStatus === 'approved' || role === 'admin'
  const verificationBannerDescription =
    sellerStatus === 'pending'
      ? 'Support is reviewing your documents. We will notify you once the cockpit unlocks.'
      : sellerStatus === 'rejected'
        ? 'Your previous submission needs updates. Refresh your documents and resubmit.'
        : 'Submit your compliance pack so support can enable payouts, listings, and land brokerage.'
  const verificationCtaLabel =
    sellerStatus === 'pending' ? 'View submission' : sellerStatus === 'rejected' ? 'Resubmit' : 'Submit verification'

  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + order.total, 0),
    [orders]
  )

  const revenueThisMonth = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return orders
      .filter((order) => new Date(order.createdAt) >= startOfMonth)
      .reduce((sum, order) => sum + order.total, 0)
  }, [orders])

  const delayedOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!['pending', 'paid', 'shipped'].includes(order.status)) return false
      return differenceInHours(new Date(), new Date(order.createdAt)) > 48
    })
  }, [orders])

  const salesPerformance = useMemo(() => {
    const byProduct = new Map<string, { title: string; qty: number; revenue: number }>()
    orders.forEach((order) => {
      if (!['completed', 'paid', 'shipped'].includes(order.status)) return
      order.items.forEach((item) => {
        const next = byProduct.get(item.productId) ?? {
          title: item.title,
          qty: 0,
          revenue: 0,
        }
        next.qty += item.quantity
        next.revenue += item.price * item.quantity
        byProduct.set(item.productId, next)
      })
    })
    return Array.from(byProduct.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [orders])

  const uniqueSellers = useMemo(() => {
    const sellers = new Set<string>()
    products.forEach((product: any) => {
      if (product?.ownerName) sellers.add(product.ownerName)
      else if (product?.seller) sellers.add(product.seller)
    })
    return sellers.size || products.length
  }, [products])

  const personaDefault: PersonaKey = useMemo(() => {
    const role = (user as any)?.role as string | undefined
    if (role === 'admin') return 'admin'
    if (role === 'manager') return 'operations'
    if (role === 'driver') return 'sales'
    return 'owner'
  }, [user])

  function resetProductForm(overrides?: Partial<ProductFormState>) {
    setEditingProduct(null)
    setProductForm(() => {
      const base = createEmptyProductForm()
      return {
        ...base,
        ...overrides,
        spaceProfile: overrides?.spaceProfile
          ? { ...createEmptySpaceProfile(), ...overrides.spaceProfile }
          : base.spaceProfile,
      }
    })
  }

  function startSharedSpaceFlow() {
    if (!canManageListings) {
      toast.error('Complete seller verification to add shared stays.')
      return
    }
    resetProductForm({
      vertical: 'shared_space',
      type: 'service',
      price: 450,
      spaceProfile: {
        ...createEmptySpaceProfile(),
        hostName: user?.name || 'You',
        hostAvatar: (user as any)?.image || '',
      },
    })
    setProductDialogOpen(true)
  }

  async function saveProduct() {
    const images = productForm.images
      .split(/\n|,/)
      .map((value) => value.trim())
      .filter(Boolean)
    const isSharedSpace = productForm.vertical === 'shared_space'
    const spaceProfilePayload = isSharedSpace
      ? {
          type: productForm.spaceProfile.type,
          listingKind: productForm.spaceProfile.listingKind,
          rentPerWeek: Number(productForm.price) || 0,
          bond: productForm.spaceProfile.bond ? Number(productForm.spaceProfile.bond) : undefined,
          suburb: productForm.spaceProfile.suburb,
          city: productForm.spaceProfile.city,
          state: productForm.spaceProfile.state,
          availableFrom: productForm.spaceProfile.availableFrom || new Date().toISOString().slice(0, 10),
          stayLength: productForm.spaceProfile.stayLength || 'Flexible',
          occupancy: {
            current: Number(productForm.spaceProfile.occupancyCurrent) || 0,
            total: Math.max(1, Number(productForm.spaceProfile.occupancyTotal) || 1),
          },
          furnished: productForm.spaceProfile.furnished,
          amenities: splitListInput(productForm.spaceProfile.amenities),
          vibe: splitListInput(productForm.spaceProfile.vibe),
          host: {
            name: productForm.spaceProfile.hostName || productForm.seller || 'Host',
            avatar: productForm.spaceProfile.hostAvatar || productForm.img,
            bio: productForm.spaceProfile.hostBio || '',
          },
          conciergeIntro: productForm.spaceProfile.conciergeIntro || undefined,
        }
      : null

    const payload = {
      title: productForm.title,
      price: Number(productForm.price) || 0,
      type: isSharedSpace ? 'service' : productForm.type,
      seller: productForm.seller,
      img: productForm.img,
      slug: productForm.slug || slugify(productForm.title),
      categoryId: productForm.categoryId || undefined,
      vertical: productForm.vertical,
      spaceProfile: spaceProfilePayload,
      ...(images.length ? { images } : {}),
      ...(productForm.description ? { description: productForm.description } : {}),
    }

    if (editingProduct) {
      const updated = await db.updateProduct(editingProduct.id, payload)
      if (updated) {
        setProducts((prev) => prev.map((product) => (product.id === updated.id ? updated : product)))
      }
    } else {
      const created = await db.createProduct(payload)
      setProducts((prev) => [created, ...prev])
    }

    setProductDialogOpen(false)
    resetProductForm()
  }

  async function deleteProduct(id: string) {
    await db.deleteProduct(id)
    setProducts((prev) => prev.filter((product) => product.id !== id))
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product)
    const rawProfile = (product as any).spaceProfile
    const nextSpaceProfile: SpaceFormState =
      (product as any).vertical === 'shared_space' && rawProfile
        ? {
            ...createEmptySpaceProfile(),
            type: rawProfile.type || 'room',
            listingKind: rawProfile.listingKind || (rawProfile.type === 'desk' ? 'desk-pass' : 'roommate'),
            suburb: rawProfile.suburb || '',
            city: rawProfile.city || '',
            state: rawProfile.state || '',
            availableFrom: rawProfile.availableFrom || new Date().toISOString().slice(0, 10),
            stayLength: rawProfile.stayLength || 'Flexible',
            occupancyCurrent: rawProfile.occupancy?.current ?? 1,
            occupancyTotal: rawProfile.occupancy?.total ?? 2,
            furnished: rawProfile.furnished ?? true,
            bond: rawProfile.bond != null ? String(rawProfile.bond) : '',
            amenities: Array.isArray(rawProfile.amenities) ? rawProfile.amenities.join(', ') : rawProfile.amenities || '',
            vibe: Array.isArray(rawProfile.vibe) ? rawProfile.vibe.join(', ') : rawProfile.vibe || '',
            hostName: rawProfile.host?.name || '',
            hostAvatar: rawProfile.host?.avatar || '',
            hostBio: rawProfile.host?.bio || '',
            conciergeIntro: rawProfile.conciergeIntro || '',
          }
        : createEmptySpaceProfile()
    setProductForm({
      title: product.title,
      price: (product as any).vertical === 'shared_space' && rawProfile?.rentPerWeek ? rawProfile.rentPerWeek : product.price,
      type: product.type,
      seller: product.seller,
      img: product.img,
      images: Array.isArray((product as any).images) ? (product as any).images.join('\n') : '',
      description: (product as any).description || '',
      slug: product.slug,
      categoryId: product.categoryId || '',
      vertical: ((product as any).vertical as 'commerce' | 'shared_space') || 'commerce',
      spaceProfile: nextSpaceProfile,
    })
    setProductDialogOpen(true)
  }

  async function saveCategory() {
    if (!categoryForm.name || !categoryForm.slug) return

    if (categoryEditingId) {
      const updated = await db.updateCategory?.(categoryEditingId, {
        name: categoryForm.name,
        slug: categoryForm.slug,
      })
      if (updated) {
        setCategories((prev) => prev.map((category) => (category.id === categoryEditingId ? updated : category)))
      }
    } else {
      const created = await db.createCategory?.({
        name: categoryForm.name,
        slug: categoryForm.slug,
      })
      if (created) setCategories((prev) => [created, ...prev])
    }

    setCategoryDialogOpen(false)
    setCategoryEditingId(null)
  }

  function openCategoryEditor(category?: Category) {
    if (category) {
      setCategoryEditingId(category.id)
      setCategoryForm({ name: category.name, slug: category.slug })
    } else {
      setCategoryEditingId(null)
      setCategoryForm({ name: '', slug: '' })
    }
    setCategoryDialogOpen(true)
  }

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
  }, [orders])

  return (
    <>
      <Header>
        <TopNav
          links={[
            { title: 'Marketplace', href: '/marketplace', isActive: false },
            { title: 'AI concierge', href: '/marketplace/assistant', isActive: false },
            { title: 'Seller cockpit', href: '/marketplace/dashboard', isActive: false },
            { title: 'Team dashboard', href: '/_authenticated/', isActive: true },
          ]}
        />
        <div className='ml-auto flex items-center space-x-3'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-10'>
        {canManageListings ? (
          <>
            {visibleAnnouncements.length ? (
              <section className='rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div>
                    <div className='text-sm font-semibold text-emerald-900'>Marketplace announcements</div>
                    <p className='text-xs text-emerald-700'>Pinned messages from Hedgetech operations.</p>
                  </div>
                  <span className='text-xs text-emerald-700'>Stay aligned with policy updates.</span>
                </div>
                <ul className='mt-4 space-y-3'>
                  {visibleAnnouncements.map((announcement) => (
                    <li key={announcement.id} className='rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm'>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <div>
                          <div className='text-sm font-semibold text-slate-900'>{announcement.title}</div>
                          <div className='text-xs text-slate-500'>
                            {format(new Date(announcement.publishedAt), 'PP')}
                            {announcement.audience !== 'all' ? ` • ${announcement.audience}` : ''}
                          </div>
                        </div>
                        {announcement.pinned ? (
                          <span className='rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700'>Pinned</span>
                        ) : null}
                      </div>
                      <p className='mt-2 text-sm text-slate-600'>{announcement.body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className='relative overflow-hidden rounded-3xl border border-emerald-100/70 bg-gradient-to-br from-[#102534] via-[#0f766e] to-[#34d399] px-6 py-10 text-white shadow-lg md:px-10'>
              <div className='absolute -left-24 top-12 hidden h-80 w-80 rounded-full bg-emerald-500/30 blur-3xl md:block' />
              <div className='relative grid gap-10 lg:grid-cols-[1.4fr_1fr]'>
                <div className='space-y-5'>
                  <span className='inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-50'>
                    Hedgetech commerce cockpit
                  </span>
                  <h1 className='text-3xl font-semibold leading-tight md:text-4xl'>
                    Operate smarter across <span className='font-bold text-emerald-100'>storefronts, fulfilment, and growth</span>.
                  </h1>
                  <p className='max-w-2xl text-sm text-emerald-50/90 md:text-base'>
                    Switch perspectives to see exactly what store owners, marketplace operators, sales teams, and administrators need to act on today.
                  </p>
                  <div className='flex flex-wrap gap-3 text-sm font-semibold'>
                    <Button variant='secondary' className='rounded-full border border-white/40 bg-white/10 hover:bg-white/20'>
                      <Sparkles className='mr-2 h-4 w-4' /> Open omnichannel POS
                    </Button>
                    <Link
                      to='/marketplace/dashboard/orders'
                      className='inline-flex items-center rounded-full border border-white/40 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10'
                    >
                      View fulfilment board
                      <ArrowUpRight className='ml-2 h-4 w-4' />
                    </Link>
                    <Button
                      variant='outline'
                      className='rounded-full border-white/40 text-white hover:bg-white/10'
                      onClick={startSharedSpaceFlow}
                      disabled={!canManageListings}
                    >
                      Add shared stay
                    </Button>
                    <Button variant='outline' className='rounded-full border-white/40 text-white hover:bg-white/10' asChild>
                      <Link to='/marketplace/dashboard/verification'>Seller verification</Link>
                    </Button>
                  </div>
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <MetricCard icon={Store} label='Active listings' value={myProducts.length} help='Owned or managed offerings' accent='emerald' />
                  <MetricCard icon={TrendingUp} label='Marketplace revenue' value={`A$${totalRevenue.toLocaleString()}`} help='Lifetime gross' accent='emerald' />
                  <MetricCard icon={Truck} label='Orders in motion' value={groupedOrders.shipped.length + groupedOrders.pending.length + groupedOrders.paid.length + groupedOrders.scheduled.length} help='Awaiting fulfilment or shipping' accent='amber' />
                  <MetricCard icon={Users} label='Active sellers' value={uniqueSellers} help='Based on current listings' />
                </div>
              </div>
            </section>

            <Tabs defaultValue={personaDefault} className='space-y-6'>
            <TabsList className='flex flex-col gap-3 bg-transparent p-0 md:flex-row'>
              {personas.map((persona) => (
                <TabsTrigger
                key={persona.value}
                value={persona.value}
                className='flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition data-[state=active]:border-emerald-300 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-900'
              >
                <div className='text-sm font-semibold'>{persona.label}</div>
                <div className='text-xs text-slate-500'>{persona.description}</div>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value='owner' className='space-y-6 focus:outline-none'>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <MetricCard icon={Boxes} label='Managed listings' value={myProducts.length} help='Synchronised with Hedgetech marketplace' accent='emerald' />
              <MetricCard icon={TrendingUp} label='Revenue this month' value={`A$${revenueThisMonth.toLocaleString()}`} help='Completed + paid orders' accent='emerald' />
              <MetricCard icon={Layers} label='Categories in use' value={categories.length} />
              <MetricCard icon={ShieldCheck} label='On-time fulfilment' value={`${orders.length ? Math.round(((orders.length - delayedOrders.length) / orders.length) * 100) : 100}%`} help='Orders within SLA window' />
            </div>

            <div className='grid gap-6 lg:grid-cols-[1.6fr_1fr]'>
              <Card className='border-slate-200'>
                <CardHeader className='flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0'>
                  <div>
                    <CardTitle className='text-base font-semibold'>Listing manager</CardTitle>
                    <p className='text-xs text-slate-500'>Keep your storefront fresh and compliant.</p>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      className='rounded-full'
                      disabled={!canManageListings}
                      onClick={() => {
                        if (!canManageListings) {
                          toast.error('Seller verification required before adding listings.')
                          return
                        }
                        resetProductForm()
                        setProductDialogOpen(true)
                      }}
                    >
                      Add listing
                    </Button>
                    <Button
                      variant='outline'
                      className='rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      onClick={startSharedSpaceFlow}
                      disabled={!canManageListings}
                    >
                      Add shared stay
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {productPreview.length === 0 ? (
                    <EmptyState title='No products yet' description='Create your first listing to start attracting buyers.' />
                  ) : (
                    <div className='space-y-3'>
                      {productPreview.map((product) => (
                        <div key={product.id} className='flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-sm'>
                          <div className='flex items-center gap-3'>
                            {product.img ? (
                              <img src={product.img} alt={product.title} className='h-12 w-12 rounded-xl object-cover' />
                            ) : (
                              <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500'>
                                {product.title.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className='text-sm font-semibold text-slate-900'>{product.title}</div>
                              <div className='text-xs text-slate-500'>A${product.price} • {(product as any).ownerName || product.seller}</div>
                            </div>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Button variant='outline' size='sm' className='rounded-full' onClick={() => openEditProduct(product)}>
                              Edit
                            </Button>
                            <Button variant='outline' size='sm' className='rounded-full' asChild>
                              <Link to='/marketplace/listing/$slug' params={{ slug: product.slug }}>View</Link>
                            </Button>
                            <Button variant='ghost' size='sm' className='text-red-500 hover:text-red-600' onClick={() => deleteProduct(product.id)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                      {myProducts.length > productPreview.length ? (
                        <Link to='/marketplace/dashboard/listings' className='inline-flex items-center text-sm font-semibold text-emerald-700 hover:underline'>
                          View all listings
                          <ArrowUpRight className='ml-1 h-4 w-4' />
                        </Link>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className='border-slate-200 bg-slate-50/60'>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>Growth playbook</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3 text-sm text-slate-600'>
                  <div className='flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white/70 p-3 shadow-sm'>
                    <Rocket className='mt-0.5 h-4 w-4 text-emerald-600' />
                    <div>
                      <div className='font-semibold text-slate-900'>Launch bundle pricing</div>
                      <p className='text-xs text-slate-500'>Group complementary products into a bundle and feature it on the marketplace home spotlight.</p>
                    </div>
                  </div>
                  <div className='flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/60 p-3'>
                    <ClipboardList className='mt-0.5 h-4 w-4 text-slate-500' />
                    <div>
                      <div className='font-semibold text-slate-900'>Sync fulfilment instructions</div>
                      <p className='text-xs text-slate-500'>Upload packaging and delivery notes so operations can auto-share them with couriers.</p>
                    </div>
                  </div>
                  <div className='flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/60 p-3'>
                    <Users className='mt-0.5 h-4 w-4 text-slate-500' />
                    <div>
                      <div className='font-semibold text-slate-900'>Invite contributors</div>
                      <p className='text-xs text-slate-500'>Grant team access for copywriting, inventory edits, or inline support replies.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className='border-slate-200'>
              <CardHeader>
                <CardTitle className='text-base font-semibold'>Recent marketplace orders</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                {recentOrders.length === 0 ? (
                  <EmptyState title='No orders yet' description='Your first confirmed sale will appear here with fulfilment guidance.' />
                ) : (
                  <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                    {recentOrders.map((order) => (
                      <div key={order.id} className='rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm'>
                        <div className='flex items-center justify-between text-xs text-slate-500'>
                          <span className='font-mono text-[11px]'>#{order.id.slice(0, 8)}</span>
                          <span>{format(new Date(order.createdAt), 'MMM d, HH:mm')}</span>
                        </div>
                        <div className='mt-2 text-sm font-semibold text-slate-900'>A${order.total.toLocaleString()}</div>
                        <div className='text-xs text-slate-500'>{order.items.length} items • {order.status}</div>
                        {order.customerName ? (
                          <div className='mt-2 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700'>
                            {order.customerName}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='operations' className='space-y-6 focus:outline-none'>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <MetricCard icon={ClipboardList} label='Orders pending' value={groupedOrders.pending.length} help='Awaiting acceptance' accent='amber' />
              <MetricCard icon={Truck} label='Shipping queue' value={groupedOrders.shipped.length} help='Hand off to carriers' accent='amber' />
              <MetricCard icon={AlertTriangle} label='SLA risks' value={delayedOrders.length} help='Older than 48 hours' accent='amber' />
              <MetricCard icon={ShieldCheck} label='Completed orders' value={groupedOrders.completed.length} help='Delivered & confirmed' />
            </div>

            <div className='grid gap-6 lg:grid-cols-[1.5fr_1fr]'>
              <Card className='border-slate-200'>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>Fulfilment control tower</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {orders.length === 0 ? (
                    <EmptyState title='Nothing to fulfil' description='Once orders come in, we will surface packaging instructions, courier slots, and SLA timers here.' />
                  ) : (
                    <div className='space-y-3'>
                      {['pending', 'paid', 'shipped', 'completed', 'cancelled'].map((status) => (
                        <div key={status} className='rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm'>
                          <div className='flex items-center justify-between'>
                            <div className='text-sm font-semibold text-slate-900 capitalize'>{status}</div>
                            <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500'>{groupedOrders[status as Order['status']].length}</span>
                          </div>
                          <div className='mt-2 text-xs text-slate-500'>
                            {groupedOrders[status as Order['status']]
                              .slice(0, 3)
                              .map((order) => `#${order.id.slice(0, 6)}`)
                              .join(' • ') || 'No orders in this state'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className='border-slate-200 bg-slate-50/60'>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>Operational playbook</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3 text-sm text-slate-600'>
                  <div className='rounded-2xl border border-emerald-100 bg-white/70 p-3 shadow-sm'>
                    <div className='text-sm font-semibold text-slate-900'>Check courier capacity for today</div>
                    <p className='text-xs text-slate-500'>Coordinate priority orders with the transport partner best matching SLA and load.</p>
                  </div>
                  <div className='rounded-2xl border border-slate-200 bg-white/60 p-3'>
                    <div className='text-sm font-semibold text-slate-900'>Audit support escalations</div>
                    <p className='text-xs text-slate-500'>Merge duplicate tickets and tag the relevant seller before peak hours.</p>
                  </div>
                  <div className='rounded-2xl border border-slate-200 bg-white/60 p-3'>
                    <div className='text-sm font-semibold text-slate-900'>Sync warehouse cut-off</div>
                    <p className='text-xs text-slate-500'>Confirm pick-pack cut-off times so marketplace messaging stays accurate.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value='sales' className='space-y-6 focus:outline-none'>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <MetricCard icon={TrendingUp} label='Closed revenue (30d)' value={`A$${revenueThisMonth.toLocaleString()}`} accent='emerald' />
              <MetricCard icon={LineChart} label='Opportunities in play' value={groupedOrders.pending.length + groupedOrders.paid.length} help='Awaiting buyer confirmation' accent='amber' />
              <MetricCard icon={Rocket} label='Average order value' value={orders.length ? `A$${Math.round(totalRevenue / orders.length)}` : 'A$0'} />
              <MetricCard icon={Users} label='Repeat buyers' value={orders.filter((order) => (order as any).buyer?.id).length} help='Based on recorded buyer IDs' />
            </div>

            <Card className='border-slate-200'>
              <CardHeader className='flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0'>
                <div>
                  <CardTitle className='text-base font-semibold'>Top performing offers</CardTitle>
                  <p className='text-xs text-slate-500'>Revenue is calculated from completed / paid / shipped orders.</p>
                </div>
                <Link
                  to='/marketplace/listings'
                  className='inline-flex items-center rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
                >
                  Promote listings
                  <ArrowUpRight className='ml-2 h-4 w-4' />
                </Link>
              </CardHeader>
              <CardContent>
                {salesPerformance.length === 0 ? (
                  <EmptyState title='No sales data yet' description='Once orders flow through, you’ll see the strongest listings here.' />
                ) : (
                  <div className='w-full overflow-x-auto'>
                    <table className='min-w-full text-sm'>
                      <thead>
                        <tr className='border-b text-left text-xs uppercase tracking-wide text-slate-400'>
                          <th className='py-2 pr-4'>Product</th>
                          <th className='py-2 pr-4'>Units</th>
                          <th className='py-2 pr-4'>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesPerformance.map((row) => (
                          <tr key={row.title} className='border-b last:border-0'>
                            <td className='py-2 pr-4 font-medium text-slate-800'>{row.title}</td>
                            <td className='py-2 pr-4 text-slate-500'>{row.qty}</td>
                            <td className='py-2 pr-4 font-semibold text-emerald-700'>A${row.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className='border-slate-200 bg-slate-50/60'>
              <CardHeader>
                <CardTitle className='text-base font-semibold'>Lead acceleration</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm text-slate-600'>
                <div className='rounded-2xl border border-emerald-100 bg-white/70 p-3 shadow-sm'>
                  <div className='text-sm font-semibold text-slate-900'>Activate email nudges</div>
                  <p className='text-xs text-slate-500'>Schedule a drip campaign for buyers that stalled at checkout.</p>
                </div>
                <div className='rounded-2xl border border-slate-200 bg-white/60 p-3'>
                  <div className='text-sm font-semibold text-slate-900'>Bundle service add-ons</div>
                  <p className='text-xs text-slate-500'>Upsell installation or onboarding support alongside popular goods.</p>
                </div>
                <div className='rounded-2xl border border-slate-200 bg-white/60 p-3'>
                  <div className='text-sm font-semibold text-slate-900'>Coordinate with marketing</div>
                  <p className='text-xs text-slate-500'>Share spotlight-ready offers so the homepage hero remains aligned with pipeline goals.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='admin' className='space-y-6 focus:outline-none'>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <MetricCard icon={Building} label='Total listings' value={products.length} help='Across the entire marketplace' accent='emerald' />
              <MetricCard icon={Users} label='Team members' value={uniqueSellers} help='Distinct seller identities' />
              <MetricCard icon={ClipboardList} label='Orders processed' value={orders.length} help='All lifecycle states' />
              <MetricCard icon={AlertTriangle} label='Exceptions today' value={delayedOrders.length} help='Orders breaching SLA' accent='amber' />
            </div>

            <Card className='border-slate-200'>
              <CardHeader className='flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0'>
                <div>
                  <CardTitle className='text-base font-semibold'>Category governance</CardTitle>
                  <p className='text-xs text-slate-500'>Curate taxonomy to keep discovery sharp and relevant.</p>
                </div>
                <Button variant='outline' className='rounded-full' onClick={() => openCategoryEditor()}>
                  New category
                </Button>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <EmptyState title='No categories configured' description='Define marketplace categories to group listings and power search filters.' />
                ) : (
                  <div className='w-full overflow-x-auto'>
                    <table className='min-w-full text-sm'>
                      <thead>
                        <tr className='border-b text-left text-xs uppercase tracking-wide text-slate-400'>
                          <th className='py-2 pr-4'>Name</th>
                          <th className='py-2 pr-4'>Slug</th>
                          <th className='py-2 pr-4 text-right'>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((category) => (
                          <tr key={category.id} className='border-b last:border-0'>
                            <td className='py-2 pr-4 font-medium text-slate-800'>{category.name}</td>
                            <td className='py-2 pr-4 text-slate-500'>{category.slug}</td>
                            <td className='py-2 pr-0 text-right'>
                              <Button variant='ghost' size='sm' onClick={() => openCategoryEditor(category)}>Edit</Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='text-red-500 hover:text-red-600'
                                onClick={async () => {
                                  await db.deleteCategory?.(category.id)
                                  setCategories((prev) => prev.filter((item) => item.id !== category.id))
                                }}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className='border-slate-200 bg-slate-50/60'>
              <CardHeader>
                <CardTitle className='text-base font-semibold'>Platform health checklist</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-3 sm:grid-cols-2'>
                <div className='rounded-2xl border border-emerald-100 bg-white/70 p-3 shadow-sm'>
                  <div className='text-sm font-semibold text-slate-900'>Risk & trust</div>
                  <p className='text-xs text-slate-500'>Review negative seller reports and enforce action plans.</p>
                </div>
                <div className='rounded-2xl border border-slate-200 bg-white/60 p-3'>
                  <div className='text-sm font-semibold text-slate-900'>API integrations</div>
                  <p className='text-xs text-slate-500'>Monitor rate limits, webhook delivery, and system uptime.</p>
                </div>
                <div className='rounded-2xl border border-slate-200 bg-white/60 p-3'>
                  <div className='text-sm font-semibold text-slate-900'>Financial reconciliation</div>
                  <p className='text-xs text-slate-500'>Sync payouts with accounting and verify marketplace fees.</p>
                </div>
                <div className='rounded-2xl border border-slate-200 bg-white/60 p-3'>
                  <div className='text-sm font-semibold text-slate-900'>Incident communication</div>
                  <p className='text-xs text-slate-500'>Prepare customer messaging for outages or carrier issues.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </>
        ) : (
          <section className='rounded-3xl border border-amber-200 bg-amber-50/80 p-8 text-amber-900 shadow-sm'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <span className='inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900'>
                  Seller status • {sellerStatus === 'pending' ? 'In review' : sellerStatus === 'rejected' ? 'Needs updates' : 'Not submitted'}
                </span>
                <h2 className='text-2xl font-semibold'>Finish verification to unlock the seller cockpit</h2>
                <p className='text-sm text-amber-800'>{verificationBannerDescription}</p>
              </div>
              <ul className='space-y-2 rounded-2xl border border-amber-200 bg-white/80 p-4 text-sm text-amber-900'>
                <li>• Open the “Seller verification” page (left nav → Organization) to submit your pack.</li>
                <li>• Upload your business details, documents, and acreage track record.</li>
                <li>• Ops reviews submissions within one business day.</li>
                <li>• Once approved, product, land, and POS tools will unlock instantly.</li>
              </ul>
              <div className='flex flex-wrap gap-3 text-sm'>
                <Button className='rounded-full bg-amber-600 text-white hover:bg-amber-500' asChild>
                  <Link to='/marketplace/dashboard/verification'>{verificationCtaLabel}</Link>
                </Button>
                <Button variant='outline' className='rounded-full border-amber-300 text-amber-900 hover:bg-amber-100' asChild>
                  <Link to='/marketplace/dashboard/support'>Contact support</Link>
                </Button>
              </div>
            </div>
          </section>
        )}
      </Main>

      <Dialog open={productDialogOpen} onOpenChange={(value) => { setProductDialogOpen(value); if (!value) resetProductForm() }}>
        <DialogContent className='max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Update listing' : 'Create new listing'}</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4'>
            <div>
              <Label htmlFor='product-title'>Title</Label>
              <Input
                id='product-title'
                value={productForm.title}
                onChange={(event) => setProductForm({ ...productForm, title: event.target.value, slug: slugify(event.target.value) })}
              />
            </div>
            <div>
              <Label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Listing vertical</Label>
              <div className='mt-2 grid grid-cols-2 gap-2'>
                {[
                  { key: 'commerce', label: 'Commerce & POS', description: 'Goods or services (inventory, POS, bookings).' },
                  { key: 'shared_space', label: 'Shared space', description: 'Rooms, desks, or micro-studios with concierge.' },
                ].map((option) => (
                  <button
                    key={option.key}
                    type='button'
                    onClick={() => setProductForm((prev) => ({ ...prev, vertical: option.key as 'commerce' | 'shared_space' }))}
                    className={`rounded-2xl border p-3 text-left transition ${productForm.vertical === option.key ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <div className='text-sm font-semibold text-slate-900'>{option.label}</div>
                    <p className='mt-1 text-xs text-slate-500'>{option.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className='grid gap-3 md:grid-cols-3'>
              <div>
                <Label htmlFor='product-price'>{productForm.vertical === 'shared_space' ? 'Weekly rate (A$)' : 'Price (A$)'}</Label>
                <Input
                  id='product-price'
                  type='number'
                  value={productForm.price}
                  onChange={(event) => setProductForm({ ...productForm, price: Number(event.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor='product-type'>Type</Label>
                <select
                  id='product-type'
                  className='w-full rounded-md border px-3 py-2'
                  value={productForm.type}
                  onChange={(event) => setProductForm({ ...productForm, type: event.target.value as Product['type'] })}
                  disabled={productForm.vertical === 'shared_space'}
                >
                  <option value='goods'>Goods</option>
                  <option value='service'>Service</option>
                </select>
                {productForm.vertical === 'shared_space' ? <p className='mt-1 text-xs text-slate-500'>Shared spaces are treated like services for bookings + concierge.</p> : null}
              </div>
              <div>
                <Label htmlFor='product-seller'>Seller label</Label>
                <Input
                  id='product-seller'
                  value={productForm.seller}
                  onChange={(event) => setProductForm({ ...productForm, seller: event.target.value })}
                />
              </div>
            </div>
            {productForm.vertical === 'shared_space' ? (
              <div className='space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4'>
                <div>
                  <p className='text-sm font-semibold text-emerald-900'>Space profile</p>
                  <p className='text-xs text-emerald-700'>Location, host vibe, and concierge notes power the new Hedgetech Spaces page.</p>
                </div>
                <div className='grid gap-3 md:grid-cols-2'>
                  <div>
                    <Label htmlFor='space-kind'>Offer focus</Label>
                    <select
                      id='space-kind'
                      className='w-full rounded-md border px-3 py-2 text-sm'
                      value={productForm.spaceProfile.listingKind}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          spaceProfile: { ...productForm.spaceProfile, listingKind: event.target.value as SpaceFormState['listingKind'] },
                        })
                      }
                    >
                      <option value='roommate'>Spare room / roommate</option>
                      <option value='desk-pass'>Desk or studio</option>
                      <option value='lease-transfer'>Lease transfer</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor='space-type'>Space type</Label>
                    <select
                      id='space-type'
                      className='w-full rounded-md border px-3 py-2 text-sm'
                      value={productForm.spaceProfile.type}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, type: event.target.value as SpaceFormState['type'] } })}
                    >
                      <option value='room'>Room</option>
                      <option value='studio'>Studio</option>
                      <option value='desk'>Desk</option>
                    </select>
                  </div>
                </div>
                <div className='grid gap-3 md:grid-cols-3'>
                  <div>
                    <Label htmlFor='space-suburb'>Suburb</Label>
                    <Input
                      id='space-suburb'
                      value={productForm.spaceProfile.suburb}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, suburb: event.target.value } })}
                    />
                  </div>
                  <div>
                    <Label htmlFor='space-city'>City</Label>
                    <Input
                      id='space-city'
                      value={productForm.spaceProfile.city}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, city: event.target.value } })}
                    />
                  </div>
                  <div>
                    <Label htmlFor='space-state'>State</Label>
                    <Input
                      id='space-state'
                      value={productForm.spaceProfile.state}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, state: event.target.value } })}
                    />
                  </div>
                </div>
                <div className='grid gap-3 md:grid-cols-2'>
                  <div>
                    <Label htmlFor='space-available'>Available from</Label>
                    <Input
                      id='space-available'
                      type='date'
                      value={productForm.spaceProfile.availableFrom}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, availableFrom: event.target.value } })}
                    />
                  </div>
                  <div>
                    <Label htmlFor='space-stay'>Preferred stay length</Label>
                    <Input
                      id='space-stay'
                      value={productForm.spaceProfile.stayLength}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, stayLength: event.target.value } })}
                    />
                  </div>
                </div>
                <div className='grid gap-3 md:grid-cols-3'>
                  <div>
                    <Label htmlFor='space-bond'>Bond (A$)</Label>
                    <Input
                      id='space-bond'
                      type='number'
                      value={productForm.spaceProfile.bond}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, bond: event.target.value } })}
                    />
                  </div>
                  <div>
                    <Label htmlFor='space-occ-current'>Residents (current)</Label>
                    <Input
                      id='space-occ-current'
                      type='number'
                      value={productForm.spaceProfile.occupancyCurrent}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, occupancyCurrent: Number(event.target.value) } })}
                    />
                  </div>
                  <div>
                    <Label htmlFor='space-occ-total'>Residents (total)</Label>
                    <Input
                      id='space-occ-total'
                      type='number'
                      value={productForm.spaceProfile.occupancyTotal}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, occupancyTotal: Number(event.target.value) } })}
                    />
                  </div>
                </div>
                <div className='flex items-center justify-between rounded-2xl border border-emerald-100 bg-white/70 px-3 py-2'>
                  <div>
                    <div className='text-sm font-semibold text-slate-900'>Fully furnished</div>
                    <p className='text-xs text-slate-500'>Include bed, storage, and work setup.</p>
                  </div>
                  <Switch
                    checked={productForm.spaceProfile.furnished}
                    onCheckedChange={(value) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, furnished: value } })}
                  />
                </div>
                <div className='grid gap-3 md:grid-cols-2'>
                  <div>
                    <Label htmlFor='space-amenities'>Amenities (comma or newline)</Label>
                    <textarea
                      id='space-amenities'
                      className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
                      rows={2}
                      value={productForm.spaceProfile.amenities}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, amenities: event.target.value } })}
                    />
                  </div>
                  <div>
                    <Label htmlFor='space-vibe'>Vibe tags</Label>
                    <textarea
                      id='space-vibe'
                      className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
                      rows={2}
                      value={productForm.spaceProfile.vibe}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, vibe: event.target.value } })}
                    />
                  </div>
                </div>
                <div className='grid gap-3 md:grid-cols-3'>
                  <div>
                    <Label htmlFor='space-host-name'>Host name</Label>
                    <Input
                      id='space-host-name'
                      value={productForm.spaceProfile.hostName}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, hostName: event.target.value } })}
                    />
                  </div>
                  <div>
                    <Label htmlFor='space-host-avatar'>Host avatar URL</Label>
                    <Input
                      id='space-host-avatar'
                      value={productForm.spaceProfile.hostAvatar}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, hostAvatar: event.target.value } })}
                    />
                  </div>
                  <div>
                    <Label htmlFor='space-host-bio'>Host bio</Label>
                    <Input
                      id='space-host-bio'
                      value={productForm.spaceProfile.hostBio}
                      onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, hostBio: event.target.value } })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor='space-concierge'>Concierge intro cue</Label>
                  <textarea
                    id='space-concierge'
                    className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
                    rows={3}
                    value={productForm.spaceProfile.conciergeIntro}
                    onChange={(event) => setProductForm({ ...productForm, spaceProfile: { ...productForm.spaceProfile, conciergeIntro: event.target.value } })}
                    placeholder='Share the story, goals, or hosting style so the AI concierge can speak like you.'
                  />
                </div>
              </div>
            ) : null}
            <div>
              <Label htmlFor='product-images'>Additional image URLs (comma or newline separated)</Label>
              <textarea
                id='product-images'
                className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
                rows={3}
                value={productForm.images}
                onChange={(event) => setProductForm({ ...productForm, images: event.target.value })}
              />
              <div className='mt-2 flex flex-wrap gap-2'>
                {productForm.images
                  .split(/\n|,/)
                  .map((value) => value.trim())
                  .filter(Boolean)
                  .slice(0, 4)
                  .map((url, index) => (
                    <img key={index} src={url} alt={`preview-${index}`} className='h-16 w-16 rounded-md object-cover' />
                  ))}
              </div>
            </div>
            <div className='grid items-end gap-3 md:grid-cols-[2fr_auto]'>
              <div>
                <Label htmlFor='product-category'>Category</Label>
                <select
                  id='product-category'
                  className='w-full rounded-md border px-3 py-2'
                  value={productForm.categoryId}
                  onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}
                >
                  <option value=''>{categories.length ? 'Select a category' : 'No categories'}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type='button' variant='outline' onClick={() => openCategoryEditor()}>
                New category
              </Button>
            </div>
            <div>
              <Label htmlFor='product-img'>Hero image URL</Label>
              <Input
                id='product-img'
                value={productForm.img}
                onChange={(event) => setProductForm({ ...productForm, img: event.target.value })}
                placeholder='https://images…'
              />
            </div>
            <div>
              <Label htmlFor='product-description'>Description</Label>
              <textarea
                id='product-description'
                className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
                rows={6}
                value={productForm.description}
                onChange={(event) => setProductForm({ ...productForm, description: event.target.value })}
              />
              <div className='mt-2 flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  disabled={generatingCopy}
                  onClick={async () => {
                    setGeneratingCopy(true)
                    try {
                      const categoryName = categories.find((category) => category.id === productForm.categoryId)?.name
                      const response = await fetch('/api/ai/description', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: productForm.title,
                          price: Number(productForm.price) || undefined,
                          type: productForm.type,
                          seller: productForm.seller,
                          categoryName,
                          existing: productForm.description,
                        }),
                      })
                      if (response.ok) {
                        const json = await response.json()
                        if (json?.description) {
                          setProductForm((prev) => ({ ...prev, description: json.description }))
                        }
                      }
                    } catch (error) {
                      console.error('Generate copy failed', error)
                    }
                    setGeneratingCopy(false)
                  }}
                >
                  {generatingCopy ? 'Generating…' : 'Generate with AI'}
                </Button>
                <span className='text-xs text-slate-500'>Uses your OpenAI key</span>
              </div>
              <div className='mt-2 rounded-md border p-3'>
                <div className='mb-1 text-xs font-semibold text-slate-500'>Preview</div>
                <div className='prose prose-sm max-w-none text-slate-700'>
                  {productForm.description ? (
                    productForm.description
                      .split(/\n\n+/)
                      .map((paragraph, index) => <p key={index}>{paragraph}</p>)
                  ) : (
                    <p className='text-slate-400'>Draft copy appears here.</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor='product-slug'>Slug</Label>
              <Input
                id='product-slug'
                value={productForm.slug}
                onChange={(event) => setProductForm({ ...productForm, slug: event.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='ghost' onClick={() => setProductDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProduct}>{editingProduct ? 'Save changes' : 'Create listing'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={(value) => { setCategoryDialogOpen(value); if (!value) setCategoryEditingId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{categoryEditingId ? 'Update category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <div className='grid gap-3'>
            <div>
              <Label htmlFor='category-name'>Name</Label>
              <Input
                id='category-name'
                value={categoryForm.name}
                onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value, slug: slugify(event.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor='category-slug'>Slug</Label>
              <Input
                id='category-slug'
                value={categoryForm.slug}
                onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='ghost' onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCategory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
