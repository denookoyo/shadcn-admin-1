import { Link } from '@tanstack/react-router'
import { IconMenu } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Truck,
  Package,
  AlertCircle,
  ClipboardList,
  LayoutDashboard,
  Settings
} from 'lucide-react'

interface TopNavProps extends React.HTMLAttributes<HTMLElement> {
  links: {
    title: string
    href: string
    isActive: boolean
    disabled?: boolean
  }[]
}

export function TopNav({ className, links, ...props }: TopNavProps) {
  return (
    <>
      <div className='md:hidden'>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size='icon' variant='outline'>
              <IconMenu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side='bottom' align='start'>
            {links.map(({ title, href, isActive, disabled }) => (
              <DropdownMenuItem key={`${title}-${href}`} asChild>
                <Link
                  to={href}
                  className={!isActive ? 'text-muted-foreground' : ''}
                  disabled={disabled}
                >
                  {title}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav
        role='navigation'
        aria-label='Main navigation'
        className={cn(
          'hidden items-center space-x-4 md:flex lg:space-x-6',
          className
        )}
        {...props}
      >
        {links.map(({ title, href, isActive, disabled }) => (
          <Link
            key={`${title}-${href}`}
            to={href}
            disabled={disabled}
            className={`flex items-center gap-2 hover:text-primary text-sm font-medium transition-colors ${isActive ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            {title === 'Overview' && <LayoutDashboard className='h-4 w-4' />}
            {title === 'Fleet' && <Truck className='h-4 w-4' />}
            {title === 'Orders' && <ClipboardList className='h-4 w-4' />}
            {title === 'Deliveries' && <Package className='h-4 w-4' />}
            {title === 'Alerts' && <AlertCircle className='h-4 w-4' />}
            {title === 'Settings' && <Settings className='h-4 w-4' />}
            {title}
          </Link>
        ))}
      </nav>
    </>
  )
}
