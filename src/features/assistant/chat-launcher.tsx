import { Link } from '@tanstack/react-router'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ChatLauncherProps = {
  className?: string
  label?: string
}

export function ChatLauncher({ className, label = 'Chat with AI' }: ChatLauncherProps) {
  return (
    <Link
      to='/marketplace/assistant'
      aria-label={label}
      className={cn(
        'fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2',
        'dark:border-emerald-400/40 dark:bg-emerald-500 dark:hover:bg-emerald-400',
        className
      )}
    >
      <MessageCircle className='h-4 w-4' />
      <span className='hidden sm:inline'>{label}</span>
    </Link>
  )
}
