import {
  Boxes,
  CalendarClock,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  PackageCheck,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from 'lucide-react'

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
    name: 'Ava Merchant',
    email: 'ava@hedgetech.market',
    avatar: '/avatars/logistics-admin.jpg',
  },
  teams: [
    {
      name: 'Hedgetech HQ',
      logo: Store,
      plan: 'Marketplace operator',
    },
    {
      name: 'My Storefront',
      logo: ShoppingBag,
      plan: 'Seller workspace',
    },
  ],
  navGroups: [
    {
      title: 'Command center',
      items: [
        {
          title: 'Team dashboard',
          url: '/_authenticated/',
          icon: LayoutDashboard,
        },
        {
          title: 'Seller cockpit',
          url: '/marketplace/dashboard',
          icon: Store,
        },
        {
          title: 'Marketplace home',
          url: '/marketplace',
          icon: ShoppingBag,
        },
        {
          title: 'Point of sale',
          url: '/marketplace/dashboard/pos',
          icon: CreditCard,
        },
      ],
    },
    {
      title: 'Sell & merchandise',
      items: [
        {
          title: 'Listings & content',
          icon: Boxes,
          items: [
            {
              title: 'All listings',
              url: '/marketplace/dashboard/listings',
            },
            {
              title: 'Bulk import',
              url: '/marketplace/dashboard/import',
            },
            {
              title: 'Labels & packaging',
              url: '/marketplace/dashboard/labels',
            },
          ],
        },
        {
          title: 'Bookings calendar',
          url: '/marketplace/dashboard/bookings',
          icon: CalendarClock,
        },
        {
          title: 'Apps & promotions',
          url: '/_authenticated/apps/',
          icon: Sparkles,
        },
      ],
    },
    {
      title: 'Orders & support',
      items: [
        {
          title: 'Order board',
          url: '/marketplace/dashboard/orders',
          icon: ClipboardList,
        },
        {
          title: 'My buyers',
          url: '/marketplace/my-orders',
          icon: PackageCheck,
        },
        {
          title: 'Support desk',
          url: '/_authenticated/chats/',
          icon: MessageCircle,
        },
        {
          title: 'Knowledge base',
          url: '/_authenticated/help-center/',
          icon: LifeBuoy,
        },
      ],
    },
    {
      title: 'Organization',
      items: [
        {
          title: 'Team members',
          url: '/_authenticated/users/',
          icon: Users,
        },
        {
          title: 'Account settings',
          icon: Settings,
          items: [
            {
              title: 'Profile overview',
              url: '/_authenticated/settings',
            },
            {
              title: 'Account',
              url: '/_authenticated/settings/account',
            },
            {
              title: 'Notifications',
              url: '/_authenticated/settings/notifications',
            },
            {
              title: 'Appearance',
              url: '/_authenticated/settings/appearance',
            },
          ],
        },
      ],
    },
  ],
}

export type { SidebarData, NavGroup, NavItem }
