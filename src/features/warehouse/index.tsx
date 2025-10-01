import { Header } from '@/components/layout/header'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Main } from '@/components/layout/main'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const topNav = [
  { title: 'Dashboard', href: '/dashboard', isActive: false },
  { title: 'Fleet', href: '/fleet', isActive: false },
  { title: 'Routes', href: '/routes', isActive: false },
  { title: 'Warehouses', href: '/warehouses', isActive: true },
  { title: 'Settings', href: '/settings', isActive: false },
]

const warehouseList = [
  {
    id: 'WH-001',
    name: 'Darlinghurst Warehouse',
    location: 'Downtown Sydney',
    capacity: '85%',
    inventory: 1240,
  },
  {
    id: 'WH-002',
    name: 'Homebush Depot',
    location: 'Western Suburbs',
    capacity: '60%',
    inventory: 980,
  },
  {
    id: 'WH-003',
    name: 'Parramatta Hub',
    location: 'Greater Sydney Region',
    capacity: '73%',
    inventory: 1123,
  },
]

export default function WarehousesPage() {
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

      <Main>
        <h1 className='text-2xl font-bold tracking-tight mb-4'>Warehouses</h1>

        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {warehouseList.map((wh) => (
            <Card key={wh.id}>
              <CardHeader>
                <CardTitle>{wh.name}</CardTitle>
              </CardHeader>
              <CardContent className='space-y-1 text-sm'>
                <p>ID: {wh.id}</p>
                <p>Location: {wh.location}</p>
                <p>Inventory: {wh.inventory} items</p>
                <p>Capacity Used: {wh.capacity}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Main>
    </>
  )
}
