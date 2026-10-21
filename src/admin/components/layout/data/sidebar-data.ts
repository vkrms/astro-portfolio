import {
  AppWindow,
  ExternalLink,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ListTodo,
  MessagesSquare,
  Settings,
  Users,
} from 'lucide-react'
import { type NavGroup } from '../types'

export const navGroups: NavGroup[] = [
  {
    title: 'Content',
    items: [
      {
        title: 'Posts',
        url: '/admin',
        icon: FileText,
        activePrefix: '/admin/edit',
      },
      { title: 'Settings', url: '/admin/settings', icon: Settings },
    ],
  },
  {
    title: 'Examples',
    items: [
      {
        title: 'Demo',
        icon: FlaskConical,
        items: [
          {
            title: 'Dashboard',
            url: '/admin/demo/dashboard',
            icon: LayoutDashboard,
          },
          { title: 'Tasks', url: '/admin/demo/tasks', icon: ListTodo },
          { title: 'Users', url: '/admin/demo/users', icon: Users },
          { title: 'Chats', url: '/admin/demo/chats', icon: MessagesSquare },
          { title: 'Apps', url: '/admin/demo/apps', icon: AppWindow },
        ],
      },
    ],
  },
]

export const siteNavGroup: NavGroup = {
  title: 'Site',
  items: [{ title: 'View site', url: '/', icon: ExternalLink }],
}
