import { createFileRoute } from '@tanstack/react-router'
import { useStageStore, type Stage } from '@/stores/stageStore'
import { StageBadge } from '@/components/stage-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/authStore'

const stages: Stage[] = ['test', 'preview', 'production']

function SellerSettingsPage() {
  const { user } = useAuthStore((s) => s.auth)
  const role = user?.role ?? 'seller'
  const { stage, setStage } = useStageStore()

  return (
    <div className='mx-auto max-w-4xl space-y-8 px-4 py-10'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold text-slate-900'>Workspace settings</h1>
        <p className='text-sm text-slate-600'>Keep your Hedgetech cockpit aligned across environments and communication channels.</p>
      </header>

      <section className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-slate-900'>Environment stage</h2>
            <p className='text-xs text-slate-500'>Admins can toggle between test, preview, and production databases.</p>
          </div>
          <StageBadge />
        </div>
        <div className='mt-4 flex flex-wrap gap-2'>
          {stages.map((option) => (
            <Button
              key={option}
              variant={stage === option ? 'default' : 'outline'}
              disabled={role !== 'admin'}
              onClick={() => setStage(option)}
            >
              {option}
            </Button>
          ))}
        </div>
        {role !== 'admin' ? <p className='mt-2 text-xs text-amber-600'>Only admins can change stages. Contact your workspace owner.</p> : null}
      </section>

      <section className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
        <h2 className='text-lg font-semibold text-slate-900'>Contact information</h2>
        <p className='text-xs text-slate-500'>Update the contact details surfaced on your checkout receipts and support interactions.</p>
        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Support email</label>
            <Input defaultValue={user?.email ?? ''} placeholder='support@yourbrand.com' />
          </div>
          <div className='space-y-2'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Phone</label>
            <Input placeholder='+61 400 000 000' />
          </div>
        </div>
        <div className='mt-4 flex gap-2'>
          <Button variant='secondary'>Save contact details</Button>
          <Button variant='ghost'>Cancel</Button>
        </div>
      </section>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/dashboard/settings/')({
  component: SellerSettingsPage,
})
