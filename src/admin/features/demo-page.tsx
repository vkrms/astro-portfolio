import { lazy, Suspense } from 'react'

// shadcn-admin example pages, kept as reference for future admin features.
// Each page is a separate chunk, so recharts etc. load only where used.
const pages = {
  dashboard: lazy(() =>
    import('./dashboard').then((m) => ({ default: m.Dashboard }))
  ),
  tasks: lazy(() => import('./tasks').then((m) => ({ default: m.Tasks }))),
  users: lazy(() => import('./users').then((m) => ({ default: m.Users }))),
  chats: lazy(() => import('./chats').then((m) => ({ default: m.Chats }))),
  apps: lazy(() => import('./apps').then((m) => ({ default: m.Apps }))),
}

export type DemoPageName = keyof typeof pages

export const demoPageNames = Object.keys(pages) as DemoPageName[]

export default function DemoPage({ page }: { page: DemoPageName }) {
  const Page = pages[page]
  return (
    <Suspense>
      <Page />
    </Suspense>
  )
}
