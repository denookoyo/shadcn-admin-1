import {
  Bot,
  Boxes,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  PackageCheck,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
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
          url: '/',
          icon: LayoutDashboard,
        },
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
        {
          title: 'Analytics & insights',
          url: '/marketplace/dashboard/analytics',
          icon: TrendingUp,
        },
        {
          title: 'Bookings calendar',
          url: '/marketplace/dashboard/bookings',
          icon: CalendarClock,
        },
        {
          title: 'Apps & promotions',
          icon: Sparkles,
          items: [
            {
              title: 'Browse apps',
              url: '/_authenticated/apps/',
            },
            {
              title: 'Telegram automation',
              url: '/_authenticated/apps/telegram',
            },
            {
              title: 'WhatsApp automation',
              url: '/_authenticated/apps/whatsapp',
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
          url: '/chats/',
          icon: MessageCircle,
        },
        {
          title: 'Knowledge base',
          url: '/help-center/',
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
