import {
  Bot,
  Boxes,
  ClipboardList,
  CreditCard,
  FileText,
  LifeBuoy,
  PackageCheck,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Users,
  ShieldCheck,
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
          title: 'Marketplace home',
          url: '/marketplace',
          icon: ShoppingBag,
        },
        {
          title: 'Seller cockpit',
          url: '/marketplace/dashboard',
          icon: Store,
        },
        {
          title: 'AI concierge',
          url: '/marketplace/assistant',
          icon: Bot,
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
            {
              title: 'Launch new listing',
              url: '/marketplace/dashboard/listings/new',
            },
          ],
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
          title: 'Track guest orders',
          url: '/marketplace/order/track',
          icon: Search,
        },
        {
          title: 'Guest payments',
          url: '/marketplace/order/pay',
          icon: Receipt,
        },
        {
          title: 'Support desk',
          url: '/marketplace/dashboard/support',
          icon: LifeBuoy,
        },
      ],
    },
    {
      title: 'Organization',
      items: [
        {
          title: 'Team members',
          url: '/users/',
          icon: Users,
        },
        {
          title: 'Seller verification',
          url: '/marketplace/dashboard/verification',
          icon: ShieldCheck,
        },
        {
          title: 'Reports',
          url: '/marketplace/dashboard/reports',
          icon: FileText,
        },
        {
          title: 'Account settings',
          icon: Settings,
          items: [
            {
              title: 'Profile overview',
              url: '/settings',
            },
            {
              title: 'Account',
              url: '/settings/account',
            },
            {
              title: 'Notifications',
              url: '/settings/notifications',
            },
            {
              title: 'Appearance',
              url: '/settings/appearance',
            },
          ],
        },
      ],
    },
  ],
}

export type { SidebarData, NavGroup, NavItem }
