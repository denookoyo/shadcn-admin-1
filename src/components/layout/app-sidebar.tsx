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
import type { NavLink } from '@/components/layout/types'

// Keep URLs within known routes to satisfy router literal types
const allowedUrls = [
  "/", "/marketplace", "/clerk", "/forgot-password", "/otp", "/sign-in", "/sign-in-2", "/sign-up",
  "/401", "/403", "/404", "/500", "/503", "/settings", "/apps", "/chats",
  "/delivery", "/drivers", "/fleet", "/warehouse",
  "/marketplace/dashboard", "/marketplace/dashboard/orders",
  "/settings/account", "/settings/appearance", "/settings/billing", "/settings/integrations",
  "/settings/notifications", "/settings/security", "/settings/team", "/settings/plans", "/settings/profile",
  "/settings/password", "/settings/email", "/settings/connected-accounts", "/settings/domains",
  "/settings/api-keys", "/settings/logs", "/settings/usage", "/settings/support", "/settings/feedback"
] as const

type AllowedUrl = typeof allowedUrls[number]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>

      <SidebarContent>
        {sidebarData.navGroups.map((group) => (
          <NavGroup
            key={group.title}
            title={group.title}
            items={
              group.items
                .map((item) => {
                  if (allowedUrls.includes(item.url as AllowedUrl)) {
                    return {
                      ...item,
                      url: item.url as AllowedUrl,
                      items: undefined,
                    }
                  }
                  return undefined
                })
                .filter(Boolean) as NavLink[]
            }
          />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
