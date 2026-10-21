import { useLayout } from '@admin/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@admin/components/ui/sidebar'
import { navGroups, siteNavGroup } from './data/sidebar-data'
import { NavGroup } from './nav-group'

export function AppSidebar({ siteTitle }: { siteTitle: string }) {
  const { collapsible, variant } = useLayout()
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' tooltip={siteTitle} asChild>
              <a href='/admin'>
                <span className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary font-semibold text-sidebar-primary-foreground'>
                  {siteTitle.charAt(0)}
                </span>
                <span className='truncate font-semibold'>{siteTitle}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <nav aria-label='Admin' className='flex min-h-0 flex-1 flex-col'>
        <SidebarContent>
          {navGroups.map((group) => (
            <NavGroup key={group.title} {...group} />
          ))}
        </SidebarContent>
        <SidebarFooter>
          <NavGroup {...siteNavGroup} />
        </SidebarFooter>
      </nav>
      <SidebarRail />
    </Sidebar>
  )
}
