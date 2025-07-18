import {
  IconBrowserCheck,
 
  IconChecklist,
  IconHelp,
  IconLayoutDashboard,
  
  IconMessages,
  IconNotification,
  IconPackages,
  IconPalette,
  IconSettings,
  IconTool,
  IconUserCog,
  IconUsers,
  IconTruckDelivery,
  IconMapPin,
  IconRoad,
  IconBuildingWarehouse,
  IconReportAnalytics
} from '@tabler/icons-react'
import { AudioWaveform, Command, GalleryVerticalEnd } from 'lucide-react'

interface BaseNavItem {
  title: string
  badge?: string
  icon?: React.ElementType
  url?: string
  items?: NavItem[]
}

type NavItem = BaseNavItem

interface Team {
  name: string
  logo: React.ElementType
  plan: string
}

interface User {
  name: string
  email: string
  avatar: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

interface SidebarData {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
}

export const sidebarData: SidebarData = {
  user: {
    name: 'LogiTrack Admin',
    email: 'admin@logitrack.com',
    avatar: '/avatars/logistics-admin.jpg',
  },
  teams: [
    {
      name: 'FleetOps Ltd',
      logo: Command,
      plan: 'Fleet Management SaaS',
    },
    {
      name: 'Global Couriers',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise Logistics',
    },
    {
      name: 'Swift Movers',
      logo: AudioWaveform,
      plan: 'Last-Mile Startup',
    },
  ],
  navGroups: [
    {
      title: 'Operations',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: IconLayoutDashboard,
        },
        {
          title: 'Fleet Status',
          url: '/fleet',
          icon: IconTruckDelivery,
        },
        {
          title: 'Delivery Routes',
          url: '/delivery',
          icon: IconRoad,
        },
        {
          title: 'Warehouses',
          url: '/warehouse',
          icon: IconBuildingWarehouse,
        },
        {
          title: 'Live Map',
          url: '/map',
          icon: IconMapPin,
        },
      ],
    },
    {
      title: 'Reports & Tools',
      items: [
        {
          title: 'Analytics Reports',
          url: '/analytics',
          icon: IconReportAnalytics,
        },
        {
          title: 'Task Scheduler',
          url: '/tasks',
          icon: IconChecklist,
        },
        {
          title: 'Partner Integration',
          url: '/partners',
          icon: IconPackages,
        },
        {
          title: 'Messages',
          url: '/chats',
          badge: '3',
          icon: IconMessages,
        },
        {
          title: 'Team Members',
          url: '/users',
          icon: IconUsers,
        },
      ],
    },
    {
      title: 'System',
      items: [
        {
          title: 'Settings',
          icon: IconSettings,
          items: [
            {
              title: 'Profile',
              url: '/settings',
              icon: IconUserCog,
            },
            {
              title: 'Account',
              url: '/settings/account',
              icon: IconTool,
            },
            {
              title: 'Appearance',
              url: '/settings/appearance',
              icon: IconPalette,
            },
            {
              title: 'Notifications',
              url: '/settings/notifications',
              icon: IconNotification,
            },
            {
              title: 'Display',
              url: '/settings/display',
              icon: IconBrowserCheck,
            },
          ],
        },
        {
          title: 'Help Center',
          url: '/help-center',
          icon: IconHelp,
        },
      ],
    },
  ],
}

export type { SidebarData, NavGroup, NavItem }
