import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, ShieldAlert } from 'lucide-react'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useSellerAccess } from '@/features/sellers/access'
import { submitSellerApplication, useSellerVerification, type SellerApplication, type SellerVerificationStatus } from '@/features/sellers/verification'
import { toast } from 'sonner'

export const Route = createFileRoute('/marketplace/_layout/dashboard/verification')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '',
  }),
  component: SellerVerificationPage,
})

function SellerVerificationPage() {
  const navigate = useNavigate()
  const { redirect } = Route.useSearch()
  const { user } = useAuthStore((state) => state.auth)
  const { marketplaceEligible, canAccessSellerTools } = useSellerAccess()
  const email = user?.email as string | undefined
  const { application, sellerStatus, loading } = useSellerVerification(email)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(createEmptyForm(user?.name || '', (user as any)?.phoneNo || ''))

  useEffect(() => {
    setForm(createFormFromApplication(application, user?.name || '', (user as any)?.phoneNo || ''))
  }, [application?.id, application?.updatedAt, user?.name, (user as any)?.phoneNo])

  function continueToRedirect() {
    if (!redirect) return
    navigate({ to: redirect as any })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email) {
      toast.error('Sign in before submitting verification.')
      return
    }
    if (!form.companyName.trim() || !form.phone.trim()) {
      toast.error('Business name and phone are required.')
      return
    }
    setSubmitting(true)
    try {
      const saved = await submitSellerApplication({
        email,
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim() || user?.name || 'Seller',
        phone: form.phone.trim(),
        location: form.location.trim() || undefined,
        documents: parseList(form.documents),
        pitch: form.pitch.trim() || undefined,
      })
      toast.success(
        saved.status === 'approved'
          ? 'Seller details updated. Access remains approved.'
          : 'Verification submitted. Operations will review it shortly.'
      )
      if (saved.status === 'approved' && redirect) {
        continueToRedirect()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit verification right now.')
    } finally {
      setSubmitting(false)
    }
  }

  const currentStatus = marketplaceEligible ? eligibleStatusCopy : statusCopy[sellerStatus]
  const canContinue = Boolean(redirect && canAccessSellerTools)
  const submitLabel = useMemo(() => {
    if (submitting) return 'Saving...'
    if (marketplaceEligible || sellerStatus === 'approved') return 'Save seller details'
    if (sellerStatus === 'pending') return 'Update submission'
    return 'Submit for review'
  }, [marketplaceEligible, sellerStatus, submitting])

  return (
    <MarketplacePageShell width='default' className='space-y-8' topSpacing='lg' bottomSpacing='lg'>
      <header className='space-y-2'>
        <div className='inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800'>
          {marketplaceEligible ? 'Seller profile' : 'Seller verification'}
        </div>
        <h1 className='text-3xl font-semibold text-slate-900'>{marketplaceEligible ? 'Seller profile' : 'Become a seller'}</h1>
        <p className='text-sm text-slate-600'>
          {marketplaceEligible
            ? 'Your Gang Ledger subscription already unlocks seller tooling. Use this page to keep your marketplace contact details and support information current.'
            : 'Keep this lightweight: business name, contact, where you operate, and any documents you already have. You can add more later.'}
        </p>
      </header>

      <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='text-sm font-semibold text-slate-900'>Current status</div>
            <p className='text-xs text-slate-500'>{loading ? 'Refreshing your latest verification details...' : currentStatus.description}</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${currentStatus.classes}`}>
            {currentStatus.icon}
            {currentStatus.label}
          </span>
        </div>
        {application?.reviewerNotes ? (
          <div className='mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700'>
            <div className='font-semibold text-slate-900'>Reviewer notes</div>
            <p className='mt-1'>{application.reviewerNotes}</p>
          </div>
        ) : null}
        {canContinue ? (
          <div className='mt-4 flex flex-wrap gap-3'>
            <Button className='rounded-full' type='button' onClick={continueToRedirect}>
              Continue where you left off
            </Button>
          </div>
        ) : null}
      </section>

      <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='mb-4'>
          <h2 className='text-lg font-semibold text-slate-900'>Seller details</h2>
          <p className='text-sm text-slate-500'>
            {sellerStatus === 'approved'
              || marketplaceEligible
              ? 'Edits here keep your seller access approved unless operations asks for a fresh review.'
              : 'Optional fields help operations review faster, but only business name and phone are required.'}
          </p>
        </div>
        <form className='space-y-4' onSubmit={handleSubmit}>
          <div>
            <Label>Business / trading name</Label>
            <Input value={form.companyName} onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))} placeholder='e.g. Apex Residences Ltd' required />
          </div>
          <div className='grid gap-3 md:grid-cols-2'>
            <div>
              <Label>Primary contact</Label>
              <Input value={form.contactName} onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))} placeholder='Your full name' />
            </div>
            <div>
              <Label>Phone / WhatsApp</Label>
              <Input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder='+2547...' required />
            </div>
          </div>
          <div>
            <Label>Counties or areas you operate in</Label>
            <Input value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} placeholder='Nairobi, Kiambu, Kajiado' />
          </div>
          <div>
            <Label>Documents ready (optional)</Label>
            <Textarea rows={3} value={form.documents} onChange={(event) => setForm((prev) => ({ ...prev, documents: event.target.value }))} placeholder='Certificate of incorporation, KRA compliance, title pack...' />
          </div>
          <div>
            <Label>What do you sell? (optional)</Label>
            <Textarea rows={4} value={form.pitch} onChange={(event) => setForm((prev) => ({ ...prev, pitch: event.target.value }))} placeholder='Briefly describe your inventory, deal size, or operating track record.' />
          </div>
          <div className='flex flex-wrap gap-3 text-xs text-slate-500'>
            <span>
              Need help?{' '}
              <Link to='/marketplace/dashboard/support' className='text-emerald-600 hover:underline'>
                Contact support
              </Link>
              .
            </span>
            <span>{marketplaceEligible ? 'Listings, land posts, and seller tools are already unlocked from Gang Ledger.' : 'Once approved, listings, POS, and seller tooling unlock automatically.'}</span>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Button type='submit' disabled={submitting} className='rounded-full'>
              {submitLabel}
            </Button>
            {canContinue ? (
              <Button type='button' variant='outline' className='rounded-full' onClick={continueToRedirect}>
                Continue to requested page
              </Button>
            ) : null}
            <Button
              type='button'
              variant='outline'
              className='rounded-full'
              onClick={() => setForm(createFormFromApplication(application, user?.name || '', (user as any)?.phoneNo || ''))}
            >
              Reset
            </Button>
          </div>
        </form>
      </section>
    </MarketplacePageShell>
  )
}

const statusCopy: Record<SellerVerificationStatus, { label: string; description: string; classes: string; icon: React.ReactNode }> = {
  not_submitted: {
    label: 'Not submitted',
    description: 'Send the basic seller details below to start approval.',
    classes: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: <ShieldAlert className='h-3.5 w-3.5' />,
  },
  pending: {
    label: 'In review',
    description: 'Operations is reviewing your current submission. You can still update the same form if needed.',
    classes: 'border-sky-200 bg-sky-50 text-sky-800',
    icon: <Clock className='h-3.5 w-3.5' />,
  },
  approved: {
    label: 'Approved',
    description: 'Your seller access is live. Minor profile edits here keep that access active.',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: <CheckCircle2 className='h-3.5 w-3.5' />,
  },
  rejected: {
    label: 'Needs updates',
    description: 'Update the requested details and submit again. Reviewer notes are shown above when available.',
    classes: 'border-red-200 bg-red-50 text-red-700',
    icon: <ShieldAlert className='h-3.5 w-3.5' />,
  },
}

const eligibleStatusCopy = {
  label: 'Eligible plan active',
  description: 'Your Gang Ledger marketplace plan already unlocks seller tooling. This page is now only for keeping seller profile details current.',
  classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  icon: <CheckCircle2 className='h-3.5 w-3.5' />,
}

function parseList(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function createEmptyForm(contactName = '', phone = '') {
  return {
    companyName: '',
    contactName,
    phone,
    location: '',
    documents: '',
    pitch: '',
  }
}

function createFormFromApplication(application: SellerApplication | null | undefined, fallbackName = '', fallbackPhone = '') {
  if (!application) return createEmptyForm(fallbackName, fallbackPhone)
  return {
    companyName: application.companyName || '',
    contactName: application.contactName || fallbackName,
    phone: application.phone || fallbackPhone,
    location: application.location || '',
    documents: Array.isArray(application.documents) ? application.documents.join('\n') : '',
    pitch: application.pitch || '',
  }
}
