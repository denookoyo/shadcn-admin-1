import { cn } from '@/lib/utils'

type HedgetechLogoProps = {
  className?: string
  withWordmark?: boolean
  labelClassName?: string
}

/**
 * Hedgetech brand mark built from two offset shields that imply protection and growth.
 * Using inline SVG keeps the asset crisp at any size and avoids layout shift.
 */
export function HedgetechLogo({ className, withWordmark = false, labelClassName }: HedgetechLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        aria-hidden
        viewBox='0 0 48 48'
        className='h-9 w-9 flex-shrink-0 rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 p-[6px] text-white shadow-sm'
      >
        <path
          d='M24 4c7.732 0 14 2.2 14 6.4v13.7c0 7.9-6.268 14.8-14 16.5-7.732-1.7-14-8.6-14-16.5V10.4C10 6.2 16.268 4 24 4Z'
          fill='url(#hedgetech-gradient)'
        />
        <path
          d='M33.5 13.75c0-1.53-.79-2.29-2.95-2.79-1.47-.33-3.28-.5-5.52-.5s-4.05.17-5.52.5c-2.16.5-2.95 1.26-2.95 2.79v9.4c0 4.85 3.78 9.4 8.47 10.5 4.69-1.1 8.47-5.65 8.47-10.5v-9.4Z'
          fill='rgba(255,255,255,0.22)'
        />
        <path
          d='M30 18.35c0-1.14-.7-1.68-2.18-2.02-1.09-.24-2.44-.35-3.82-.35s-2.73.11-3.82.35c-1.48.34-2.18.88-2.18 2.02v4.5c0 2.65 1.92 5.14 4.54 5.92 2.62-.78 4.54-3.27 4.54-5.92v-4.5Z'
          fill='rgba(255,255,255,0.45)'
        />
        <defs>
          <linearGradient id='hedgetech-gradient' x1='6' y1='6' x2='40' y2='42' gradientUnits='userSpaceOnUse'>
            <stop stopColor='#0f766e' />
            <stop offset='1' stopColor='#34d399' />
          </linearGradient>
        </defs>
      </svg>
      {withWordmark ? (
        <span className={cn('font-semibold tracking-tight text-slate-900', labelClassName)}>Hedgetech Marketplace</span>
      ) : null}
    </div>
  )
}
