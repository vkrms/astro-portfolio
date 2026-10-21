import { type ReactNode } from 'react'
import { LocationProvider } from '@admin/lib/router'
import { cn } from '@admin/lib/utils'
import { LayoutProvider } from '@admin/context/layout-provider'
import { SearchProvider } from '@admin/context/search-provider'
import { ConfigDrawer } from '@admin/components/config-drawer'
import { ProfileDropdown } from '@admin/components/profile-dropdown'
import { Search } from '@admin/components/search'
import { SkipToMain } from '@admin/components/skip-to-main'
import { Button } from '@admin/components/ui/button'
import { SidebarInset, SidebarProvider } from '@admin/components/ui/sidebar'
import { Toaster } from '@admin/components/ui/sonner'
import { AppSidebar } from './app-sidebar'
import { Header } from './header'
import { Main } from './main'

type AdminShellProps = {
  title: string
  action?: { label: string; href: string }
  siteTitle: string
  /** Request path + search, so the server render matches the client. */
  href: string
  /** Initial layout state from cookies, read in Admin.astro. */
  sidebarOpen: boolean
  collapsible?: string
  variant?: string
  /** The page renders its own <Main> (shadcn-admin demo pages). */
  bare?: boolean
  children?: ReactNode
}

/**
 * The admin layout: one island that wraps every admin page. Page islands
 * render inside `children` as separate React roots, so they cannot read the
 * shell's context. Keep `children` at a fixed place in this tree; moving it
 * remounts the page content and resets editor state.
 */
export default function AdminShell({
  title,
  action,
  siteTitle,
  href,
  sidebarOpen,
  collapsible,
  variant,
  bare,
  children,
}: AdminShellProps) {
  return (
    <LocationProvider value={href}>
      <SearchProvider>
        <LayoutProvider
          initialCollapsible={collapsible}
          initialVariant={variant}
        >
          <SidebarProvider defaultOpen={sidebarOpen}>
            <SkipToMain />
            <AppSidebar siteTitle={siteTitle} />
            <SidebarInset
              className={cn(
                '@container/content',
                'has-data-[layout=fixed]:h-svh',
                'peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]'
              )}
            >
              <Header fixed>
                <h1 className='truncate text-lg font-semibold'>{title}</h1>
                <div className='ms-auto flex items-center gap-2'>
                  <Search className='max-sm:hidden' />
                  {action && (
                    <Button asChild size='sm'>
                      <a href={action.href}>{action.label}</a>
                    </Button>
                  )}
                  <ConfigDrawer />
                  <ProfileDropdown />
                </div>
              </Header>
              <main
                id='main'
                tabIndex={-1}
                className='flex min-h-0 flex-1 flex-col outline-none'
              >
                {bare ? children : <Main>{children}</Main>}
              </main>
            </SidebarInset>
            <Toaster />
          </SidebarProvider>
        </LayoutProvider>
      </SearchProvider>
    </LocationProvider>
  )
}
