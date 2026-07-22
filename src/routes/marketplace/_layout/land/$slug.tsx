import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MapPin, Pencil, PhoneCall, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { deleteLandListing, formatAcreage, formatKes, getLandListing, type LandListing } from '@/features/land/data'
import { SafeImg } from '@/components/safe-img'
import { Button } from '@/components/ui/button'
import { buildGangLedgerAppUrl } from '@/lib/marketplace-consumer'

export const Route = createFileRoute('/marketplace/_layout/land/$slug')({
  component: LandListingDetail,
})

function LandListingDetail() {
  const { slug } = Route.useParams()
  const [listing, setListing] = useState<LandListing | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    void getLandListing(slug).then((result) => {
      setListing(result || null)
      setLoaded(true)
    })
  }, [slug])

  if (!loaded) return <MarketplacePageShell width='wide' className='py-16 text-center text-slate-500'>Loading property…</MarketplacePageShell>
  if (!listing) return <MarketplacePageShell width='wide' className='space-y-4 py-16 text-center text-slate-500'><p>This property listing is no longer available.</p><Link to='/marketplace/land' className='font-semibold text-emerald-700'>Browse real estate</Link></MarketplacePageShell>

  return (
    <MarketplacePageShell width='wide' className='space-y-6'>
      <div className='text-sm text-slate-500'><Link to='/marketplace/land' className='font-semibold text-emerald-700'>Kenyan real estate</Link> / {listing.title}</div>
      <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <section className='space-y-4'>
          <SafeImg src={listing.gallery[0]} alt={listing.title} className='aspect-[16/9] w-full rounded-3xl object-cover' />
          {listing.gallery.length > 1 ? <div className='grid grid-cols-3 gap-3'>{listing.gallery.slice(1, 4).map((image) => <SafeImg key={image} src={image} alt={listing.title} className='aspect-video w-full rounded-2xl object-cover' />)}</div> : null}
        </section>
        <aside className='space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div><div className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>{listing.assetType} · {listing.listingType}</div><h1 className='mt-2 text-3xl font-semibold text-slate-900'>{listing.title}</h1><div className='mt-2 flex items-center gap-2 text-slate-500'><MapPin className='h-4 w-4' />{listing.town}, {listing.county}</div></div>
          <div><div className='text-3xl font-bold text-emerald-700'>{formatKes(listing.priceKes)}</div><div className='text-sm text-slate-500'>{formatAcreage(listing.acreage)} · {listing.zoning}</div></div>
          <p className='text-sm leading-6 text-slate-600'>{listing.description}</p>
          {listing.highlights.length ? <ul className='space-y-2 text-sm text-slate-600'>{listing.highlights.map((highlight) => <li key={highlight}>• {highlight}</li>)}</ul> : null}
          <div className='rounded-2xl bg-emerald-50 p-4'><div className='font-semibold text-emerald-950'>{listing.seller.name}</div><div className='text-sm text-emerald-800'>{listing.seller.phone}</div></div>
          <Button asChild className='w-full rounded-full'><a href={`tel:${listing.seller.phone}`}><PhoneCall className='mr-2 h-4 w-4' />Contact seller</a></Button>
          {listing.canManage ? <div className='grid grid-cols-2 gap-2 border-t border-slate-200 pt-4'><Button asChild variant='outline'><a href={buildGangLedgerAppUrl('/marketplace/real-estate')}><Pencil className='mr-2 h-4 w-4' />Edit</a></Button><Button variant='destructive' disabled={deleting} onClick={async () => { if (!window.confirm(`Delete “${listing.title}”?`)) return; setDeleting(true); try { await deleteLandListing(listing.slug); window.location.assign('/marketplace/land'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to delete listing.'); setDeleting(false); } }}><Trash2 className='mr-2 h-4 w-4' />Delete</Button></div> : null}
        </aside>
      </div>
    </MarketplacePageShell>
  )
}
