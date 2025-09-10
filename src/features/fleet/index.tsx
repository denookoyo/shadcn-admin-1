import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Truck,  } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { TopNav } from '@/components/layout/top-nav'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'

const fleetData = [
  {
    id: 'TX-1021',
    status: 'Active',
    location: 'Sydney Depot',
    driver: 'John Doe',
    lastUpdate: '2 mins ago',
  },
  {
    id: 'TX-1047',
    status: 'Maintenance',
    location: 'Brisbane Workshop',
    driver: 'Anna Lee',
    lastUpdate: '1 hour ago',
  },
  {
    id: 'TX-1093',
    status: 'Inactive',
    location: 'Melbourne Yard',
    driver: 'No Driver',
    lastUpdate: 'Yesterday',
  },
]

export default function FleetStatusPage() {
  return (
    <>
    <Header>
            <TopNav links={topNav} />
            <div className='ml-auto flex items-center space-x-4'>
              <Search />
              <ThemeSwitch />
              <ProfileDropdown />
            </div>
          </Header>
    <div className='grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3'>
      {fleetData.map((truck) => (
        <Card key={truck.id}>
          <CardHeader className='flex flex-row items-center justify-between'>
            <div>
              <CardTitle>{truck.id}</CardTitle>
              <CardDescription>{truck.driver}</CardDescription>
            </div>
            <Truck className='h-6 w-6 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <span className='text-sm'>Location</span>
              <span className='font-medium'>{truck.location}</span>
            </div>
            <div className='flex items-center justify-between mt-2'>
              <span className='text-sm'>Status</span>
              <Badge variant={
                truck.status === 'Active'
                  ? 'default'
                  : truck.status === 'Maintenance'
                  ? 'destructive'
                  : 'secondary'
              }>
                {truck.status}
              </Badge>
            </div>
            <div className='text-xs text-muted-foreground mt-4'>
              Last update: {truck.lastUpdate}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    </>
  )
}
const topNav = [
  { title: 'Overview', href: '/dashboard', isActive: true, disabled: false },
  { title: 'Fleet', href: '/dashboard/fleet', isActive: false, disabled: false },
  { title: 'Drivers', href: '/drivers', isActive: true },
  { title: 'Orders', href: '/dashboard/orders', isActive: false, disabled: false },
  { title: 'Deliveries', href: '/dashboard/deliveries', isActive: false, disabled: false },
  { title: 'Settings', href: '/dashboard/settings', isActive: false, disabled: true },
]
