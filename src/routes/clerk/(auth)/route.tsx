import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { ClerkFullLogo } from '@/assets/clerk-full-logo'
import { LearnMore } from '@/components/learn-more'
import { HedgetechLogo } from '@/components/hedgetech-logo'

export const Route = createFileRoute('/clerk/(auth)')({
  component: ClerkAuthLayout,
})

function ClerkAuthLayout() {
  return (
    <div className='relative container grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-slate-500' />
        <Link to='/' className='relative z-20 flex items-center text-lg font-medium text-white'>
          <HedgetechLogo withWordmark labelClassName='text-white' />
        </Link>

        <ClerkFullLogo className='relative m-auto size-96' />

        <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>
              &ldquo; Hedgetech Marketplace centralises our listings, fulfilment, and finance workflows—everything is in rhythm now. &rdquo;
            </p>
            <footer className='text-sm'>Ava Merchant, Store Owner</footer>
          </blockquote>
        </div>
      </div>
      <div className='lg:p-8'>
        <div className='relative mx-auto flex w-full flex-col items-center justify-center gap-4'>
          <LearnMore
            defaultOpen
            triggerProps={{
              className: 'absolute -top-12 right-0 sm:right-20 size-6',
            }}
            contentProps={{ side: 'top', align: 'end', className: 'w-auto' }}
          >
            Welcome to the example Clerk auth page. <br />
            Back to{' '}
            <Link
              to='/'
              className='underline decoration-dashed underline-offset-2'
            >
              Dashboard
            </Link>{' '}
            ?
          </LearnMore>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
