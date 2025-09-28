import { HedgetechLogo } from '@/components/hedgetech-logo'

interface Props {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  return (
    <div className='bg-primary-foreground container grid h-svh max-w-none items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-[480px] sm:p-8'>
        <div className='mb-6 flex flex-col items-center justify-center space-y-2 text-center'>
          <HedgetechLogo withWordmark labelClassName='text-xl font-semibold text-slate-900' />
          <p className='text-sm text-slate-500'>Access your Hedgetech Marketplace workspace</p>
        </div>
        {children}
      </div>
    </div>
  )
}
