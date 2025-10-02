import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SalesAssistant } from './sales-assistant'

type ChatLauncherProps = {
  className?: string
  label?: string
}

export function ChatLauncher({ className, label = 'Chat with AI' }: ChatLauncherProps = {}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
    }
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const original = document.body.style.overflow
    document.body.style.overflow = open ? 'hidden' : original
    return () => {
      document.body.style.overflow = original
    }
  }, [open, mounted])

  const modal = mounted && open
    ? createPortal(
        <div className='fixed inset-0 z-50 flex items-end justify-center sm:items-end sm:justify-end'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={() => setOpen(false)} />
          <div className='relative z-10 flex h-full w-full max-w-full flex-col bg-white shadow-2xl sm:h-[650px] sm:w-[420px] sm:rounded-3xl sm:mb-6 sm:mr-6'>
            <SalesAssistant variant='modal' onClose={() => setOpen(false)} />
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2',
          'dark:border-emerald-400/40 dark:bg-emerald-500 dark:hover:bg-emerald-400',
          className
        )}
      >
        <MessageCircle className='h-4 w-4' />
        <span className='hidden sm:inline'>{label}</span>
      </button>
      {modal}
    </>
  )
}
