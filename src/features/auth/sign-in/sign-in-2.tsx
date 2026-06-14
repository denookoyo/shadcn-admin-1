import { HedgetechLogo } from '@/components/hedgetech-logo'
import { GoogleSignInButton } from '../google-signin'

export default function SignIn2() {
  return (
    <div className='relative container grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-zinc-900' />
        <div className='relative z-20 flex items-center text-lg font-medium'>
          <HedgetechLogo withWordmark labelClassName='text-white' />
        </div>

        <div className='relative z-20 m-auto max-w-[320px] text-center text-sm text-slate-200'>
          Personal Finance keeps budgets, goals, and spending insights in one
          secure workspace.
        </div>

        <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>
              &ldquo;This template has saved me countless hours of work and
              helped me deliver stunning designs to my clients faster than ever
              before.&rdquo;
            </p>
            <footer className='text-sm'>John Doe</footer>
          </blockquote>
        </div>
      </div>
      <div className='lg:p-8'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[350px]'>
          <div className='flex flex-col space-y-2 text-left'>
            <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
              Sign in to Personal Finance
            </h1>
            <p className='text-muted-foreground text-sm'>
              Continue without a password to review budgets, track spending, and
              manage your money goals.
            </p>
          </div>
          <div className='space-y-4'>
            <GoogleSignInButton />
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600'>
              Password sign-in is disabled for Personal Finance. Use Google
              sign-in to access your workspace.
            </div>
          </div>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            By signing in, you agree to the{' '}
            <a
              href='/terms'
              className='hover:text-primary underline underline-offset-4'
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href='/privacy'
              className='hover:text-primary underline underline-offset-4'
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
