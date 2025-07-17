import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Overview } from './components/overview'
import { RecentSales } from './components/recent-sales'

export default function Dashboard() {
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
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <div className='flex items-center space-x-2'>
            <Button>Download</Button>
          </div>
        </div>
        <Tabs orientation='vertical' defaultValue='overview' className='space-y-4'>
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='fleet'>Fleet</TabsTrigger>
              <TabsTrigger value='deliveries'>Deliveries</TabsTrigger>
              <TabsTrigger value='orders'>Orders</TabsTrigger>
              <TabsTrigger value='alerts'>Alerts</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Total Deliveries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>8,230</div>
                  <p className='text-muted-foreground text-xs'>+12% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Shipments In Transit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>1,243</div>
                  <p className='text-muted-foreground text-xs'>+15% from last week</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Fleet Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>92%</div>
                  <p className='text-muted-foreground text-xs'>Optimal usage rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Customer Satisfaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>4.8 / 5</div>
                  <p className='text-muted-foreground text-xs'>Based on last 100 ratings</p>
                </CardContent>
              </Card>
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>Delivery Overview</CardTitle>
                </CardHeader>
                <CardContent className='pl-2'>
                  <Overview />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Total Revenue: A$500,000</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentSales />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value='fleet' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Fleet Status</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Fleet component goes here */}
                Fleet data here
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='deliveries' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Delivery Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Delivery reports here */}
                Deliveries data here
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='orders' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Order tracking here */}
                Orders table here
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='alerts' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>System Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Alerts log or status */}
                Alerts data here
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

const topNav = [
  { title: 'Overview', href: '/dashboard', isActive: true, disabled: false },
  { title: 'Fleet', href: '/dashboard/fleet', isActive: false, disabled: false },
  { title: 'Orders', href: '/dashboard/orders', isActive: false, disabled: false },
  { title: 'Deliveries', href: '/dashboard/deliveries', isActive: false, disabled: false },
  { title: 'Settings', href: '/dashboard/settings', isActive: false, disabled: true },
]
