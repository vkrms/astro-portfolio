import { type LinkProps } from '@admin/lib/router'

type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
  /** Also active on paths under this prefix (e.g. Posts on /admin/edit/*). */
  activePrefix?: string
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to'] | (string & {}) })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  items: NavItem[]
}

export type { NavGroup, NavItem, NavCollapsible, NavLink }
