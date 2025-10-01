import { useState, type JSX } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string
    title: string
    icon: JSX.Element
  }[]
}

export default function SidebarNav({
  className,
  items,
  ...props
}: SidebarNavProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [val, setVal] = useState(pathname ?? '/settings')

  const handleSelect = (e: string) => {
    setVal(e)
    navigate({ to: e })
  }

  return (
    <>
      <div className='p-1 md:hidden'>
        <Select value={val} onValueChange={handleSelect}>
          <SelectTrigger className='h-12 sm:w-48'>
            <SelectValue placeholder='Select section' />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.href} value={item.href}>
                <div className='flex items-center gap-3 px-2 py-1'>
                  <span className='text-slate-500'>{item.icon}</span>
                  <span className='text-sm font-medium text-slate-700'>{item.title}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav
        className={cn('hidden flex-col gap-2 md:flex', className)}
        {...props}
      >
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center justify-between rounded-2xl border px-3 py-2 text-sm font-semibold transition',
                active
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-100 text-slate-600 hover:border-emerald-100 hover:bg-emerald-50/60 hover:text-emerald-700',
              )}
            >
              <span className='flex items-center gap-2'>
                <span className='text-slate-500'>{item.icon}</span>
                {item.title}
              </span>
              <span className='text-[10px] font-medium uppercase tracking-wide text-slate-400'>
                {active ? 'Active' : ''}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
