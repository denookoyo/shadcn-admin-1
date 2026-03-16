import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Truck, Clock3, MessageCircle, MapPin, Users, Sparkles, CalendarClock, Home, Key } from 'lucide-react'
import { imageFor } from '@/features/marketplace/helpers'
import { db, type Product } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { SafeImg } from '@/components/safe-img'
import { ServiceScheduler } from '@/features/marketplace/service-scheduler'
import { ChatLauncher } from '@/features/assistant/chat-launcher'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { productToSharedSpace, type SharedSpace } from '@/features/marketplace/spaces/data'

function Badge({ children }: { children: React.ReactNode }) {
  return <span className='rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>{children}</span>
}

const SHARED_OFFER_LABELS: Record<'roommate' | 'desk-pass' | 'lease-transfer', string> = {
  roommate: 'Roommate / spare room',
  'desk-pass': 'Desk or studio',
  'lease-transfer': 'Lease transfer',
}

export const Route = createFileRoute('/marketplace/_layout/listing/$slug/')({
  component: ListingDetail,
})

function ListingDetail() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const { slug } = useParams({ from: '/marketplace/_layout/listing/$slug/' })
  const [product, setProduct] = useState<Product | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [ownerImage, setOwnerImage] = useState<string | null>(null)
  const [ownerRating, setOwnerRating] = useState<number>(4.9)
  const [qty, setQty] = useState(1)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [slotError, setSlotError] = useState<string | null>(null)

  const images = useMemo(() => {
    if (!product) return [] as string[]
    const extra = ((product as any).images as string[] | undefined)?.filter(Boolean) || []
    const base = [product.img, ...extra]
    if (base.length >= 4) return base.slice(0, 4)
    const needed = 4 - base.length
    const pads = Array.from({ length: needed }, (_, i) => imageFor(`${product.title} ${i + 1}`, 600, 400))
    return [...base, ...pads]
  }, [product])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const prod = await db.getProductBySlug(slug)
      if (mounted) {
        setProduct(prod ?? null)
        setLoaded(true)
      }
    })()
    return () => {
      mounted = false
    }
  }, [slug])

  useEffect(() => {
    setSelectedSlot(null)
    setSlotError(null)
  }, [product?.id])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const raw = (product as any)?.ownerId
        const id = Number(raw)
        if (!Number.isFinite(id)) {
          if (mounted) setOwnerName((product as any)?.seller ?? null)
          return
        }
        const owner = await db.getUserById?.(id)
        if (!mounted) return
        if (owner) {
          setOwnerName(owner.name || owner.email?.split('@')[0] || 'Seller')
          setOwnerImage(owner.image || null)
          if ((owner as any).rating != null) setOwnerRating((owner as any).rating)
        }
      } catch {
        if (mounted) setOwnerName(null)
      }
    })()
    return () => {
      mounted = false
    }
  }, [product])

  const ownerIdLabel = product?.ownerId ?? 'N/A'

  const bullets = useMemo(
    () => [
      'Genuine item verified by Hedgetech operations.',
      'Flexible fulfilment windows and buyer-side support.',
      'Pay sellers directly using the instructions they share.',
    ],
    []
  )

  if (!loaded) {
    return (
      <MarketplacePageShell width='wide' className='text-center text-sm text-slate-500 lg:pt-20 lg:pb-20' topSpacing='lg' bottomSpacing='lg'>
        Loading product…
      </MarketplacePageShell>
    )
  }

  if (!product) {
    return (
      <MarketplacePageShell width='wide' className='text-center text-sm text-slate-500 lg:pt-20 lg:pb-20' topSpacing='lg' bottomSpacing='lg'>
        This listing is no longer available.
      </MarketplacePageShell>
    )
  }

  const sharedSpace = productToSharedSpace(product)
  if ((product as any)?.vertical === 'shared_space' && sharedSpace) {
    return <SharedSpaceDetail product={product} space={sharedSpace} />
  }

  const isService = product.type === 'service'
  const displayQuantity = isService ? 1 : qty

  return (
    <MarketplacePageShell width='wide' className='space-y-8'>
      <div className='flex flex-wrap items-center gap-2 text-xs text-slate-500'>
        <Link to='/marketplace/listings' className='font-medium text-emerald-700 hover:underline'>Marketplace</Link>
        <span>/</span>
        <span>{product.title}</span>
      </div>

      <div className='grid gap-8 lg:grid-cols-12'>
        <div className='lg:col-span-5 space-y-6'>
          <Card className='overflow-hidden border-slate-200 shadow-sm'>
            <CardContent className='p-0'>
              <SafeImg
                src={images[0]}
                alt={product.title}
                className='aspect-[3/4] w-full object-cover'
                loading='lazy'
              />
            </CardContent>
          </Card>
          {images.slice(1).length ? (
            <div className='grid grid-cols-3 gap-3'>
              {images.slice(1, 4).map((img, idx) => (
                <Card key={idx} className='overflow-hidden border-slate-200 shadow-sm'>
                  <CardContent className='p-0'>
                    <SafeImg src={img} alt={`${product.title} ${idx + 2}`} className='aspect-video w-full object-cover' loading='lazy' />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </div>

        <div className='lg:col-span-7 space-y-6'>
          <Card className='border-slate-200 shadow-sm'>
            <CardContent className='space-y-6 p-6'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <Badge>{isService ? 'Service' : 'Product'}</Badge>
                <span className='text-xs font-medium text-slate-500'>Listing ID {product.id.slice(0, 6)}</span>
              </div>
              <div className='space-y-2'>
                <h1 className='text-3xl font-semibold text-slate-900'>{product.title}</h1>
                <div className='flex flex-wrap items-center gap-2 text-sm text-slate-500'>
                  <span className='inline-flex items-center gap-2'>
                    {ownerImage ? (
                      <Link to='/marketplace/merchant/$id' params={{ id: String((product as any)?.ownerId ?? '') }}>
                        <img src={ownerImage} alt={ownerName || 'Seller'} className='h-6 w-6 rounded-full object-cover' />
                      </Link>
                    ) : null}
                    <span>
                      Sold by{' '}
                      <Link
                        to='/marketplace/merchant/$id'
                        params={{ id: String((product as any)?.ownerId ?? '') }}
                        className='font-semibold text-emerald-700 hover:underline'
                      >
                        {ownerName || ownerIdLabel}
                      </Link>
                    </span>
                  </span>
                  <span>•</span>
                  <span className='text-emerald-700'>★ {Number(ownerRating ?? 4.9).toFixed(1)}</span>
                </div>
              </div>
              <div className='text-3xl font-bold text-emerald-600'>A${product.price}</div>

              <div className='space-y-5 text-sm text-slate-600'>
                {isService ? (
                  <div className='space-y-3'>
                    <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Book an appointment</div>
                    <ServiceScheduler
                      productId={product.id}
                      value={selectedSlot}
                      onChange={(slot) => {
                        setSelectedSlot(slot)
                        setSlotError(null)
                      }}
                    />
                    <p className='text-xs text-slate-500'>Providers confirm bookings within 24 hours. You can reschedule later if needed.</p>
                    {slotError ? (
                      <div className='rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600'>{slotError}</div>
                    ) : null}
                  </div>
                ) : (
                  <div className='space-y-2'>
                    <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Select quantity</span>
                    <div className='inline-flex items-center rounded-full border border-slate-200 bg-slate-50'>
                      <Button variant='ghost' size='icon' className='h-9 w-9 rounded-full text-lg' onClick={() => setQty((q) => Math.max(1, q - 1))}>
                        −
                      </Button>
                      <input
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                        className='w-16 border-x border-slate-200 bg-white text-center text-sm outline-none'
                      />
                      <Button variant='ghost' size='icon' className='h-9 w-9 rounded-full text-lg' onClick={() => setQty((q) => q + 1)}>
                        +
                      </Button>
                    </div>
                  </div>
                )}

                <div className='flex flex-col gap-3'>
                  <Button
                    className='gap-2 rounded-full px-5 py-3 text-sm font-semibold'
                    onClick={async () => {
                      const quantity = displayQuantity
                      const meta = isService ? selectedSlot : undefined
                      if (isService && !meta) {
                        setSlotError('Select an appointment time before adding to cart.')
                        return
                      }
                      await db.addToCart(product.id, quantity, ns as any, meta ?? undefined)
                      window.dispatchEvent(new CustomEvent('cart:changed'))
                    }}
                  >
                    Add to cart • A${(product.price * displayQuantity).toFixed(2)}
                  </Button>
                  <Button asChild variant='outline' className='rounded-full px-5 py-3 text-sm font-semibold'>
                    <Link to='/marketplace/checkout'>Buy now</Link>
                  </Button>
                  <Button
                    variant='ghost'
                    className='gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
                    asChild
                  >
                    <Link to='/marketplace/merchant/$id' params={{ id: String((product as any)?.ownerId ?? '') }}>
                      <MessageCircle className='h-4 w-4' /> Message seller
                    </Link>
                  </Button>
                </div>
              </div>

              <Card className='border-emerald-100 bg-emerald-50 text-xs text-emerald-800'>
                <CardContent className='space-y-2 p-4'>
                  <div className='flex items-center justify-between text-sm font-semibold'>
                    <span>Buyer coverage</span>
                    <span className='text-emerald-700'>Manual payments</span>
                  </div>
                  <p>
                    Sellers provide their preferred payment instructions after checkout. Transfer funds directly and share proof of payment to keep fulfilment on track.
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card className='border-slate-200 shadow-sm'>
            <CardContent className='space-y-3 p-6 text-sm text-slate-600'>
              <h2 className='text-lg font-semibold text-slate-900'>Seller signals</h2>
              <div className='flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-800'>
                <span>Verified identity</span>
                <span className='font-semibold'>Yes</span>
              </div>
              <div className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
                <span>Average response time</span>
                <span>{(product as any).responseTime ?? 'Under 2h'}</span>
              </div>
              <div className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
                <span>Repeat buyers</span>
                <span className='font-semibold text-emerald-700'>{(product as any).repeatBuyerRate ?? '62%'}</span>
              </div>
              <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-500'>
                Seller dashboard metrics sync automatically when connected to Hedgetech APIs.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <Card className='border-slate-200 shadow-sm'>
          <CardContent className='p-6'>
            <h2 className='text-lg font-semibold text-slate-900'>Overview</h2>
            {(product as any).description ? (
              <div className='prose prose-sm mt-3 max-w-none text-slate-600'>
                {String((product as any).description)
                  .split(/\n\n+/)
                  .map((paragraph: string, index: number) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
            ) : (
              <ul className='mt-3 grid list-inside list-disc gap-2 text-sm text-slate-600 md:grid-cols-2'>
                {bullets.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className='border-slate-200 shadow-sm'>
          <CardContent className='space-y-4 p-6 text-sm text-slate-600'>
            <h2 className='text-lg font-semibold text-slate-900'>Fulfilment & support</h2>
            <div className='space-y-4'>
              <div className='rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800'>
                <ShieldCheck className='mb-2 h-5 w-5' />
                Hedgetech buyer protection covers every order with automatic refunds for cancellations or no-shows.
              </div>
              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <Truck className='mb-2 h-5 w-5 text-emerald-600' />
                Preferred shipping & service partners confirm handover or appointment windows with live updates.
              </div>
              <div className='rounded-2xl border border-slate-200 bg-white p-4'>
                <Clock3 className='mb-2 h-5 w-5 text-emerald-600' />
                Typical fulfilment within 48h for goods, 24h confirmation for services.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ChatLauncher className='bottom-6 right-6 sm:bottom-8 sm:right-8' />
    </MarketplacePageShell>
  )
}

function SharedSpaceDetail({ product, space }: { product: Product; space: SharedSpace }) {
  const locationLabel = [space.suburb, space.city].filter(Boolean).join(', ')
  const offerLabel = SHARED_OFFER_LABELS[(space.listingKind as keyof typeof SHARED_OFFER_LABELS) || 'roommate'] || 'Shared space'
  const availabilityLabel = space.availableFrom ? new Date(space.availableFrom).toLocaleDateString() : 'Flexible'
  const stayLabel = space.stayLength || 'Flexible stay'
  const bondLabel = space.bond ? `Bond A$${space.bond}` : 'No bond listed'
  const occupancy = `${space.occupancy?.current ?? 0}/${space.occupancy?.total ?? 1} residents`
  const conciergeIntro = space.conciergeIntro || `Hi! I'm interested in ${space.title} that I found on Hedgetech Spaces.`
  const cityFilter = space.city && space.state ? `${space.city}, ${space.state}` : 'all'
  const amenities = space.amenities || []
  const vibes = space.vibe || []
  const hostName = space.host?.name || product.seller || 'Host'

  return (
    <MarketplacePageShell width='wide' className='space-y-10'>
      <div className='flex flex-wrap items-center gap-2 text-xs text-slate-500'>
        <Link to='/marketplace/listings' className='font-medium text-emerald-700 hover:underline'>
          Marketplace
        </Link>
        <span>/</span>
        <Link to='/marketplace/spaces' search={{ city: 'all' }} className='font-medium text-emerald-700 hover:underline'>
          Flatmates
        </Link>
        <span>/</span>
        <span>{space.title}</span>
      </div>

      <div className='grid gap-8 lg:grid-cols-[1.4fr_1fr]'>
        <div className='space-y-6'>
          <div className='overflow-hidden rounded-3xl border border-slate-200 shadow-sm'>
            <SafeImg src={space.img || product.img} alt={space.title} className='h-full w-full object-cover' />
          </div>
          <div className='space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
              {offerLabel}
            </div>
            <div className='space-y-2'>
              <h1 className='text-3xl font-semibold text-slate-900'>{space.title}</h1>
              <p className='text-sm text-slate-500'>{locationLabel}</p>
            </div>
            <p className='text-sm text-slate-600'>{space.description}</p>
            {space.listingKind === 'lease-transfer' ? (
              <div className='rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>
                <div className='text-xs font-semibold uppercase tracking-wide'>Lease transfer</div>
                Take over this lease with Hedgetech concierge guiding ID checks and paperwork so the handover is smooth.
              </div>
            ) : null}
            <div className='grid gap-4 text-sm text-slate-600 sm:grid-cols-2'>
              <div className='flex items-center gap-2'>
                <MapPin className='h-4 w-4 text-emerald-600' />
                {locationLabel}
              </div>
              <div className='flex items-center gap-2'>
                <Users className='h-4 w-4 text-emerald-600' />
                {occupancy}
              </div>
              <div className='flex items-center gap-2'>
                <CalendarClock className='h-4 w-4 text-emerald-600' />
                Available {availabilityLabel}
              </div>
              <div className='flex items-center gap-2'>
                <Home className='h-4 w-4 text-emerald-600' />
                {stayLabel}
              </div>
              <div className='flex items-center gap-2'>
                <Key className='h-4 w-4 text-emerald-600' />
                {bondLabel}
              </div>
              <div className='flex items-center gap-2'>
                <Sparkles className='h-4 w-4 text-emerald-600' />
                Fully furnished: {space.furnished ? 'Yes' : 'Ask host'}
              </div>
            </div>
            <div className='rounded-3xl border border-slate-100 bg-slate-50 p-4'>
              <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Amenities & perks</div>
              {amenities.length ? (
                <ul className='mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2'>
                  {amenities.map((item) => (
                    <li key={item} className='inline-flex items-center gap-2'>
                      <Sparkles className='h-3.5 w-3.5 text-emerald-600' /> {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='mt-3 text-sm text-slate-500'>Host will share amenities once you message the concierge.</p>
              )}
            </div>
            {vibes.length ? (
              <div className='space-y-2'>
                <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Vibe & culture</div>
                <div className='flex flex-wrap gap-2'>
                  {vibes.map((tag) => (
                    <span key={tag} className='rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex items-center gap-3'>
              <img src={space.host?.avatar || product.img} alt={hostName} className='h-14 w-14 rounded-full object-cover' />
              <div>
                <div className='text-sm font-semibold text-slate-900'>Meet {hostName}</div>
                <p className='text-xs text-slate-500'>{space.host?.bio || 'Verified Hedgetech host'}</p>
              </div>
            </div>
            <p className='mt-4 text-sm text-slate-600'>
              {space.conciergeIntro ||
                "Share your story with the concierge and they'll connect you directly to the host with ID verification included."}
            </p>
          </div>
        </div>

        <div className='space-y-4'>
          <div className='space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex items-center justify-between text-xs text-slate-500'>
              <span className='rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700'>{offerLabel}</span>
              <span className='font-mono text-[11px]'>ID {product.id.slice(0, 6)}</span>
            </div>
            <div className='text-4xl font-bold text-emerald-600'>A${space.rentPerWeek}/wk</div>
            <p className='text-sm text-slate-500'>Hedgetech concierge can negotiate bundled services or cleaning add-ons.</p>
            <div className='flex flex-col gap-2 sm:flex-row'>
              <Button asChild className='flex-1 rounded-full'>
                <Link to='/marketplace/assistant' search={{ preset: `space:${space.slug}`, intro: conciergeIntro }}>
                  Message concierge
                </Link>
              </Button>
              <Button asChild variant='outline' className='flex-1 rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50'>
                <Link to='/marketplace/spaces' search={{ city: cityFilter }}>
                  Browse flatmates
                </Link>
              </Button>
            </div>
            <div className='rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600'>
              <div className='font-semibold text-slate-900'>What concierge handles</div>
              <ul className='mt-2 list-disc space-y-1 pl-5'>
                <li>Host introductions and ID verification.</li>
                <li>Optional deposit escrow + payment links.</li>
                <li>Lease addendums or move-in agreements.</li>
              </ul>
            </div>
          </div>
          <div className='space-y-3 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Next steps</div>
            <ol className='list-decimal space-y-2 pl-5'>
              <li>Send your intro and ideal move-in date via the concierge button.</li>
              <li>We coordinate a viewing or video walk-through with {hostName}.</li>
              <li>Secure the room with a digital agreement and optional payment link.</li>
            </ol>
          </div>
        </div>
      </div>

      <ChatLauncher className='bottom-6 right-6 sm:bottom-8 sm:right-8' />
    </MarketplacePageShell>
  )
}
