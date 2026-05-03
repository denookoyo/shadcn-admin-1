import { HTMLAttributes } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

type ForgotFormProps = HTMLAttributes<HTMLDivElement>

export function ForgotPasswordForm({ className, ...props }: ForgotFormProps) {
  return (
    <div className={cn('grid gap-4', className)} {...props}>
      <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'>
        Password reset is unavailable because email/password authentication is not enabled on this marketplace.
      </div>
      <div className='flex flex-wrap gap-3'>
        <Link to='/sign-in' className='rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500'>
          Return to sign in
        </Link>
        <Link to='/contact' className='rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'>
          Contact support
        </Link>
      </div>
    </div>
  )
}
