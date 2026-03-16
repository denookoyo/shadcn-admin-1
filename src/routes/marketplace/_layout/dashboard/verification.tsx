import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, ShieldAlert } from 'lucide-react'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { submitSellerApplication, getSellerStatus, SELLER_VERIFICATION_EVENT, type SellerVerificationStatus } from '@/features/sellers/verification'
import { toast } from 'sonner'

export const Route = createFileRoute('/marketplace/_layout/dashboard/verification')({
  component: SellerVerificationPage,
})

function SellerVerificationPage() {
  const { user } = useAuthStore((state) => state.auth)
  const email = user?.email as string | undefined
  const [statusVersion, setStatusVersion] = useState(0)
  const sellerStatus: SellerVerificationStatus = useMemo(() => getSellerStatus(email), [email, statusVersion])
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    companyName: '',
    contactName: user?.name || '',
    phone: (user as any)?.phoneNo || '',
    location: '',
    documents: '',
    pitch: '',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => setStatusVersion((prev) => prev + 1)
    window.addEventListener(SELLER_VERIFICATION_EVENT, handler)
    return () => window.removeEventListener(SELLER_VERIFICATION_EVENT, handler)
  }, [])

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      contactName: user?.name || prev.contactName,
      phone: ((user as any)?.phoneNo as string | undefined) || prev.phone,
    }))
  }, [user?.name, (user as any)?.phoneNo])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email) {
      toast.error('Sign in before submitting verification.')
      return
    }
    if (!form.companyName || !form.phone) {
      toast.error('Company name and phone are required.')
      return
    }
    setSubmitting(true)
    try {
      await submitSellerApplication({
        email,
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim() || user?.name || 'Seller',
        phone: form.phone.trim(),
        location: form.location.trim() || undefined,
        documents: parseList(form.documents),
        pitch: form.pitch.trim() || undefined,
      })
      toast.success('Verification submitted. Support will respond shortly.')
      setForm((prev) => ({ ...prev, documents: prev.documents, pitch: prev.pitch }))
      setStatusVersion((prev) => prev + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit verification right now.')
    } finally {
      setSubmitting(false)
    }
  }

  const currentStatus = statusCopy[sellerStatus]

  return (
    <MarketplacePageShell width='default' className='space-y-8' topSpacing='lg' bottomSpacing='lg'>
      <header className='space-y-2'>
        <div className='inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800'>
          Seller verification
        </div>
        <h1 className='text-3xl font-semibold text-slate-900'>Request seller approval</h1>
        <p className='text-sm text-slate-600'>Share your company profile so Hedgetech operations can enable listings, land brokerage, and payouts.</p>
      </header>

      <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='text-sm font-semibold text-slate-900'>Current status</div>
            <p className='text-xs text-slate-500'>{currentStatus.description}</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${currentStatus.classes}`}>
            {currentStatus.icon}
            {currentStatus.label}
          </span>
        </div>
      </section>

      <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
        <h2 className='text-lg font-semibold text-slate-900 mb-2'>Verification details</h2>
        <form className='space-y-4' onSubmit={handleSubmit}>
          <div>
            <Label>Business / trading name</Label>
            <Input value={form.companyName} onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))} required />
          </div>
          <div className='grid gap-3 md:grid-cols-2'>
            <div>
              <Label>Primary contact</Label>
              <Input value={form.contactName} onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))} />
            </div>
            <div>
              <Label>Phone / WhatsApp</Label>
              <Input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} required />
            </div>
          </div>
          <div>
            <Label>Counties you operate in</Label>
            <Input value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} placeholder='Kajiado, Kilifi, Nakuru' />
          </div>
          <div>
            <Label>Key documents (comma or newline)</Label>
            <Textarea rows={3} value={form.documents} onChange={(event) => setForm((prev) => ({ ...prev, documents: event.target.value }))} placeholder='Certificate of Incorporation, KRA compliance, Utility bills...' />
          </div>
          <div>
            <Label>Describe your inventory & track record</Label>
            <Textarea rows={4} value={form.pitch} onChange={(event) => setForm((prev) => ({ ...prev, pitch: event.target.value }))} placeholder='Summarise acreage, deal sizes, proof of previous transactions, and escrow partners.' />
          </div>
          <div className='flex flex-wrap gap-3 text-xs text-slate-500'>
            <span>Need help? <Link to='/marketplace/dashboard/support' className='text-emerald-600 hover:underline'>Contact support</Link>.</span>
            <span>By submitting you agree to follow Hedgetech seller policies.</span>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Button type='submit' disabled={submitting} className='rounded-full'>
              {submitting ? 'Sending...' : sellerStatus === 'pending' ? 'Update submission' : 'Submit for review'}
            </Button>
            <Button type='button' variant='outline' className='rounded-full' onClick={() => setForm({ companyName: '', contactName: user?.name || '', phone: (user as any)?.phoneNo || '', location: '', documents: '', pitch: '' })}>
              Reset form
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
    description: 'Submit your company details to unlock listings and payouts.',
    classes: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: <ShieldAlert className='h-3.5 w-3.5' />,
  },
  pending: {
    label: 'In review',
    description: 'Ops is reviewing your documents. Expect a response within one business day.',
    classes: 'border-sky-200 bg-sky-50 text-sky-800',
    icon: <Clock className='h-3.5 w-3.5' />,
  },
  approved: {
    label: 'Approved',
    description: 'You have full access to seller tooling. Re-submit if your details change.',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: <CheckCircle2 className='h-3.5 w-3.5' />,
  },
  rejected: {
    label: 'Needs updates',
    description: 'We could not verify your latest submission. Update your info and resubmit.',
    classes: 'border-red-200 bg-red-50 text-red-700',
    icon: <ShieldAlert className='h-3.5 w-3.5' />,
  },
}

function parseList(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}
