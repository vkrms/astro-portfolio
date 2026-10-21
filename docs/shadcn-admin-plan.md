# shadcn-admin integration plan

Source: https://github.com/satnaing/shadcn-admin (MIT, v2.2.1).

## What shadcn-admin is

A Vite SPA: TanStack Router, TanStack Query, Clerk auth, zustand, axios,
react-hook-form, recharts, faker demo data. UI is shadcn/ui (new-york style,
Radix, lucide icons, Tailwind 4, `cva`).

Our admin is Astro server routes (`/admin`, `/admin/edit/[slug]`,
`/admin/settings`) with React islands for the editors, local-only via
`middleware.ts`, file storage via `lib/storage.ts`.

## Approach

Admin area only. Public pages and their CSS/JS do not change.

Do not copy the app. Copy its UI layer and adapt it to Astro routes.

Keep:

- Astro pages, routes, middleware, storage, `/api/*` endpoints.
- Server-rendered data (pages read files, pass props to islands).
- Our theme tokens in `global.css` (brand colors).
- BlockNote editors.

Take from shadcn-admin:

- `components/ui/*` primitives we use: `button`, `badge`, `input`, `textarea`,
  `label`, `checkbox`, `switch`, `select`, `separator`, `dropdown-menu`,
  `alert-dialog`, `dialog`, `sheet`, `tooltip`, `table`, `card`, `tabs`,
  `skeleton`, `sidebar`, `sonner`, `avatar`.
- `components/layout/*`: `app-sidebar`, `nav-group`, `header`, `main`
  (rewritten to drop router and team/user switchers).
- `components/data-table/*`: toolbar, faceted filter, column header,
  pagination, view options.
- `hooks/use-mobile`, `components/confirm-dialog`, `components/skip-to-main`.
- `features/dashboard/*` as a demo page (see step 5).

Drop: TanStack Router/Query, Clerk, auth pages, zustand stores, axios, faker,
tasks/users/chats/apps demo features, command menu, config drawer,
profile dropdown, search, top nav, font/direction providers.

## Dependencies to add

`@radix-ui/react-*` (only for the primitives above), `class-variance-authority`,
`lucide-react`, `@tanstack/react-table`, `sonner`, `tw-animate-css`,
`recharts` (dashboard demo only).

We already have `clsx`, `tailwind-merge`, `zod`. We keep `tailwind-variants`
for the public Astro components; admin uses `cva` as in the source.

Icons: admin uses `lucide-react`; public site keeps `astro-icon` + tabler.

## Steps

### 0. Spike (half a day)

Verify one risk before committing to the plan: an Astro layout renders the
shadcn `SidebarProvider` shell as a `client:load` island and passes page
content as children, with `PostEditor` (`client:only`) nested inside.

- If nested islands work: shell is one React island wrapping `<slot />`.
- If not: shell stays in `Admin.astro`; only the sidebar and header become
  islands, and the layout uses shadcn sidebar CSS classes around them.

Result (2026-10-20): nested islands work. The shell is one `client:load`
island wrapping `<slot />`. The inner `PostEditor` hydrated, and the title and
body kept their values after the shell re-rendered 3 times. No console
errors. Constraints:

- Page islands are separate React roots, so they cannot read the shell's
  context (`useSidebar`, etc.). Pass data as props or use module-level stores.
  `sonner`'s `toast()` should work across roots this way; check it in step 4.
- The shell must keep `children` at a stable position in its tree. Moving it
  to a different parent remounts the slot and resets the editor state.

### 1. Foundation

- Add `@/*` -> `src/*` path alias in `tsconfig.json` (copied files use it).
- Add `components.json` for the shadcn CLI, pointing at `src/styles/admin.css`
  and `src/lib/cn.ts`.
- `src/components/admin/ui/` for primitives (separate from the Astro
  `components/ui/`).
- `admin.css`: import `tw-animate-css`; add `--sidebar-*` tokens (light and
  dark) mapped to our existing tokens; add base rules (`border-border`,
  pointer cursor).
- Theme: keep `ThemeToggle.astro` behavior (`.dark` class + localStorage).
  Port `theme-switch.tsx` to read/write the same key. No `ThemeProvider`.

### 2. Shell

- `AdminShell.tsx`: `SidebarProvider` + `AppSidebar` + `SidebarInset` +
  `Header` (`SidebarTrigger`, title `h1`, action slot).
- Nav data from props (site title, current path), not a static file.
  Items: Posts, Settings. Footer: View site, theme switch.
- Active state from `Astro.url.pathname`, passed as a prop.
- Desktop: `collapsible="icon"` — the sidebar collapses to an icon rail
  (trigger button, `Ctrl/Cmd+B`, `SidebarRail`). Collapsed items show a
  tooltip with their label. Each nav item gets a lucide icon.
- Sidebar open state in the `sidebar_state` cookie, read in `Admin.astro` so
  the first render matches (no layout jump).
- Mobile drawer = shadcn `Sheet`; delete the inline drawer script.
- Keep: skip link, `nav[aria-label="Admin"]`, single `h1`, `main#main`.

### 3. Posts screen

- `PostsTable.tsx` with `@tanstack/react-table`, data from `listPosts()`.
- Columns: Title (+ slug), Status badge, Date, Actions.
- Status filter: keep `?status=` links and counts (server-side, works without
  JS). Add text search and sorting client-side.
- Row actions: a `DropdownMenu` per row (`⋯` button, `aria-label="Actions for
  <title>"`) with Edit, View (published only), Duplicate, Delete.
  Duplicate/Delete stay `POST` forms to `/api/*`; Delete opens
  `ConfirmDialog` instead of `window.confirm`.
- The title link stays a direct link to the editor (main action, one click).
- Mobile (< 768px): keep stacked cards, rendered from the same rows.
- Remove `PostActions.astro` and the `data-confirm` handler.

### 4. Editors

- `PostEditor` and `SettingsEditor`: replace hand-written Tailwind controls with
  `Button`, `Input`, `Textarea`, `Label`, `Checkbox`/`Switch`, `Card`,
  `Dialog` (preview modal), `Tabs` (settings sections, if they fit).
- Replace inline status messages with `sonner` toasts.
- Do not touch BlockNote internals.

### 5. Dashboard demo (`/admin/demo/dashboard`)

Reference only: a sample of what the admin could show later.

- Port `features/dashboard` (overview cards, bar chart, analytics tab, recent
  sales) as `src/components/admin/demo/Dashboard.tsx`, with its demo data.
- Page `src/pages/admin/demo/[page].astro` (`prerender = false`), inside the
  admin shell. Header and `Main` from our shell; drop its top nav, search,
  profile dropdown and config drawer.
- Listed under the sidebar's Demo group (see Decisions). Mark the page "demo" in the
  title so it is not mistaken for real data.
- Covered by `middleware.ts` like the rest of `/admin`.
- `recharts` is imported only here, so it loads only on this page.

### 6. Cleanup and docs

- Update `docs/admin-ui-spec.md`: drop "needs no client-side framework";
  document the new shell, table and toast behavior.
- Add attribution for shadcn-admin (MIT) in `README.md`.
- Check public bundle size is unchanged (admin deps must not leak into
  public pages).

## Tests

- Unit: none new for UI primitives (vendored code). Test any logic we add
  (e.g. nav active-state helper).
- E2E (`tests/phase-1-admin.spec.ts`): keep role-based assertions. Expected
  changes:
  - Row actions move into a dropdown: open it before asserting Edit/View/
    Duplicate/Delete.
  - Delete confirmation: click the dialog button instead of accepting
    `window.confirm`.
  - Drawer test: target the `Sheet` trigger and dialog role.
  - New: collapse the desktop sidebar, reload, it stays collapsed.
  - New: the demo pages are listed under Demo and render.
- Run `npm run test:unit`, `npm run test:e2e`, `npm run build` after each step.

## Commits

One commit per step, for example:

- `chore: add shadcn ui primitives`
- `feat: admin shell with shadcn sidebar`
- `feat: posts data table`
- `refactor: editors use shadcn controls`
- `feat: add admin dashboard demo`
- `docs: update admin ui spec`

## Decisions

- Admin area only; public site unchanged.
- Row actions: dropdown menu.
- Desktop sidebar: collapsible to icons.
- Keep the demo pages (dashboard, tasks, users, chats, apps) under
  `/admin/demo/*`, listed in a collapsible **Demo** group in the sidebar.
- Keep command menu, search, top nav, config drawer and profile dropdown.
- Drop the font and direction providers.

## Implementation notes

Where the build differs from the steps above:

- Code lives in `src/admin/` (not `src/components/admin/ui/`) with the alias
  `@admin/*`. Copied files keep their shadcn-admin paths; only `@/` became
  `@admin/`. The editors stay in `src/components/admin/`.
- `src/admin/lib/router.tsx` replaces TanStack Router: `Link` is an `<a>`, a
  path change is a full page load, a search-only change uses `history`. Search
  values use TanStack's format; routes pass their zod schema to
  `getRouteApi()`.
- Demo data was generated once with faker (same seeds) and stored as JSON.
- The dark theme was later switched off (see below). Layout state
  (`sidebar_state`, `layout_collapsible`, `layout_variant` cookies) is read in
  `Admin.astro` and passed to the shell.
- Demo pages are `client:only` and lazy-loaded per page. Their own `Header` was
  removed (the shell has one), and `Main` renders a `<div>`, so the shell owns
  the single `<main>`.
- CSS: `theme.css` holds the shared tokens. `global.css` excludes `src/admin`
  and `src/components/admin` from Tailwind's scan; `admin.css` includes them.
  Without this, admin utilities were inlined into every public page (public
  inline CSS went from 114 KB with the leak to 45 KB).
- Fixes to shadcn code: sidebar tooltips render only when collapsed (a hidden
  tooltip swallowed Escape in the mobile sheet), and focus returns to the menu
  button when the mobile sheet closes.
- Pinned `@tanstack/react-table@8` and `@hookform/resolvers@5` (versions
  shadcn-admin is written for).
- The dark theme is switched off on the public site and the admin: no toggle,
  no `ThemeProvider`, and the `.dark` class is never added. The `.dark` tokens
  and `dark:` variants remain in the CSS but never apply. To bring it back,
  restore a toggle that sets `.dark` on `<html>`.
