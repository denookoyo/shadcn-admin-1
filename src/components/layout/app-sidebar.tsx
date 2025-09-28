import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from '@/components/layout/nav-group'
import { NavUser } from '@/components/layout/nav-user'
import { TeamSwitcher } from '@/components/layout/team-switcher'
import { sidebarData } from './data/sidebar-data'
import type { NavCollapsible, NavItem, NavLink } from '@/components/layout/types'

// Keep URLs within known routes to satisfy router literal types
const allowedUrlSet = new Set<string>([
  '/',
  '/marketplace',
  '/marketplace/dashboard',
  '/marketplace/dashboard/listings',
  '/marketplace/dashboard/import',
  '/marketplace/dashboard/labels',
  '/marketplace/dashboard/bookings',
  '/marketplace/dashboard/orders',
  '/marketplace/dashboard/pos',
  '/marketplace/my-orders',
  '/_authenticated/',
  '/_authenticated/apps/',
  '/_authenticated/chats/',
  '/_authenticated/help-center/',
  '/_authenticated/users/',
  '/_authenticated/settings',
  '/_authenticated/settings/account',
  '/_authenticated/settings/appearance',
  '/_authenticated/settings/notifications',
  '/_authenticated/settings/display',
  '/_authenticated/settings/',
])

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>

      <SidebarContent>
        {sidebarData.navGroups.map((group) => {
          const items = group.items.flatMap<NavItem>((item) => {
            if ('items' in item && item.items?.length) {
              const validSub = item.items
                .filter((sub) => allowedUrlSet.has(sub.url as string))
                .map((sub) => ({ ...sub, url: sub.url as NavLink['url'] }))

              if (!validSub.length) return []

              const collapsible: NavCollapsible = {
                title: item.title,
                badge: item.badge,
                icon: item.icon,
                items: validSub,
              }
              return [collapsible]
            }

            if ('url' in item && item.url && allowedUrlSet.has(item.url as string)) {
              const link: NavLink = {
                title: item.title,
                badge: item.badge,
                icon: item.icon,
                url: item.url as NavLink['url'],
              }
              return [link]
            }

            return []
          })

          if (!items.length) return null

          return <NavGroup key={group.title} title={group.title} items={items} />
        })}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
