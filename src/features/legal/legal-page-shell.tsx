import { Link } from '@tanstack/react-router'

export function LegalPageShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main className='min-h-screen bg-slate-50 px-4 py-12 text-slate-900'>
      <div className='mx-auto max-w-4xl space-y-8'>
        <div className='space-y-3'>
          <Link
            to='/marketplace'
            className='inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50'
          >
            Back to marketplace
          </Link>
          <div className='rounded-3xl border border-slate-200 bg-white p-8 shadow-sm'>
            <h1 className='text-3xl font-semibold'>{title}</h1>
            <p className='mt-3 text-sm text-slate-600'>{description}</p>
          </div>
        </div>
        <section className='rounded-3xl border border-slate-200 bg-white p-8 text-sm leading-7 text-slate-700 shadow-sm'>
          {children}
        </section>
      </div>
    </main>
  )
}
