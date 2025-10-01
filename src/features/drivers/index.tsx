import { Header } from '@/components/layout/header'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTables'
import { ColumnDef } from '@tanstack/react-table'
import { Download } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const driverList = [
  {
    name: 'John Doe',
    license: 'NSW123456',
    vehicle: 'TX-1021',
    status: 'On Duty',
  },
  {
    name: 'Anna Lee',
    license: 'QLD654321',
    vehicle: 'TX-1047',
    status: 'Off Duty',
  },
  {
    name: 'Mark Smith',
    license: 'VIC112233',
    vehicle: 'TX-1093',
    status: 'On Leave',
  },
]

const columns: ColumnDef<typeof driverList[0]>[] = [
  {
    accessorKey: 'name',
    header: 'Driver Name',
  },
  {
    accessorKey: 'license',
    header: 'License No.',
  },
  {
    accessorKey: 'vehicle',
    header: 'Assigned Vehicle',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
]

const topNav = [
  { title: 'Dashboard', href: '/dashboard', isActive: false },
  { title: 'Fleet', href: '/fleet', isActive: false },
  { title: 'Drivers', href: '/drivers', isActive: true },
  { title: 'Settings', href: '/settings', isActive: false },
]

export default function DriversPage() {
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
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-2xl font-bold tracking-tight'>Drivers</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='outline' size='sm' onClick={() => exportToCSV(driverList)}>
                  <Download className='mr-2 h-4 w-4' /> Export CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download driver data as CSV</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <DataTable columns={columns} data={driverList} />
      </Main>
    </>
  )
}

function exportToCSV(data: any[]) {
  const csv = [Object.keys(data[0]).join(','), ...data.map(row => Object.values(row).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'drivers.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}
