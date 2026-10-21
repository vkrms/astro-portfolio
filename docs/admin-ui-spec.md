# Admin UI spec

The admin is a WordPress-like back office: a collapsible left sidebar and a main
column. It is separate from the public site and never renders the public
`Header` or `Footer`.

The UI is built from [shadcn-admin](https://github.com/satnaing/shadcn-admin)
(MIT): shadcn/ui primitives, its sidebar layout and data table, in
`src/admin/`. See `docs/shadcn-admin-plan.md`.

## Scope

This spec covers the admin shell and the Posts screen, including row actions.
The editor, media picker and settings forms are separate slices.

## Post editor

The editor follows the WordPress post screen: the title is a borderless heading
above the body, the BlockNote body owns the main column, and post settings sit in
a right sidebar.

- **Title:** a borderless, auto-growing text field at the top of the main column.
  Enter does not add a newline. Placeholder: **Add title**.
- **Body:** BlockNote fills the main column and has a minimum height of about
  60% of the viewport.
- **Sidebar, Publish:** Draft and Featured checkboxes, Save, Preview.
- **Sidebar, Post settings:** Excerpt (the stored `summary`), Slug and Date.
- **Mobile:** the sidebar stacks below the body.
- The preview opens in a centered dialog and initializes the carousel script.
- Save keeps you on the editor and shows a **Saved.** toast. A new post (or a
  changed slug) updates the address bar to `/admin/edit/<slug>`. Save errors
  from the server show as a toast. The embed-title check shows
  inline, next to Save.

## Layout

The shell is one React island (`AdminShell`, `client:load`) around every admin
page. Page islands render inside it as separate React roots.

**Desktop (>= 768px)**

- Left sidebar, `inset` variant: 16rem wide, `bg-sidebar`.
- Collapsible to an icon rail (3rem). Toggle with the menu button, `Ctrl/Cmd+B`
  or the rail on the sidebar edge. Collapsed items show a tooltip.
- The open state is stored in the `sidebar_state` cookie and read on the
  server, so a reload keeps it without a layout jump.
- Main column: sticky top bar, then the page content.

**Mobile (< 768px)**

- The sidebar is a modal sheet. The menu button in the top bar opens it.
- Escape, the overlay, or a nav link closes it.
- Focus moves into the sheet on open and returns to the menu button on close.

```
┌──────────────────┬──────────────────────────────────────────────┐
│ P  Portfolio     │ [≡] Posts       [Search ⌘K] [New post] ☀ ⚙ AD │
│                  │                                              │
│ Content          │  All (3)   Published (2)   Drafts (1)        │
│   Posts          │  [Filter posts...]                           │
│   Settings       │  ┌─────────────────────────────────────────┐ │
│ Examples         │  │ Title ⇅           Status   Date ⇅    ⋯  │ │
│   Demo  ›        │  ├─────────────────────────────────────────┤ │
│                  │  │ My project        Published Jun 1 2026 ⋯ │ │
│                  │  │ another-project   Draft     May 3 2026 ⋯ │ │
│ Site             │  └─────────────────────────────────────────┘ │
│   View site      │                                              │
└──────────────────┴──────────────────────────────────────────────┘
```

## Sidebar

- Header: the site title (from `site` settings) with its first letter as a
  logo. Links to `/admin`.
- Nav (`<nav aria-label="Admin">`), from `src/admin/components/layout/data/sidebar-data.ts`:
  - **Content:** **Posts** -> `/admin` (active on `/admin` and
    `/admin/edit/*`), **Settings** -> `/admin/settings`.
  - **Examples:** **Demo**, a collapsible group with the shadcn-admin example
    pages: Dashboard, Tasks, Users, Chats, Apps -> `/admin/demo/<name>`.
  - **Site** (footer): **View site** -> `/`.
- Media is hidden until its route exists.

Active item: `data-active` styling and `aria-current="page"`.

## Top bar

- Menu button (toggles the sidebar; `aria-expanded`).
- The page title as the single `h1`.
- Right side:
  - **Search** (`Ctrl/Cmd+K`): command menu with the nav pages and theme
    commands.
  - The primary action, if any. On Posts it is **New post** ->
    `/admin/edit/new`.
  - Theme switch: Light, Dark, System. Uses the same `theme` key in
    localStorage as the public site.
  - Settings drawer: theme, sidebar variant (inset, floating, sidebar) and
    layout (default, compact, full). Stored in cookies, read on the server.
  - Profile menu. Demo only: the admin has no accounts.

## Posts screen (`/admin`)

- Heading **Posts** with the **New post** action.
- Filters: **All**, **Published**, **Drafts**. These are links, not JavaScript.
  - `?status=published`
  - `?status=draft`
  - no `status` means all.
- Counts: `All (n)`, `Published (n)`, `Drafts (n)`. Counts come from the full
  list, not the filtered list.
- Table (`<table>` with a caption or `aria-label`):
  - **Title**: links to `/admin/edit/<slug>`. The slug is shown below the title
    in muted text.
  - **Status**: a badge with the text **Published** or **Draft**. Not color
    alone.
  - **Date**: `FormattedDate`, muted.
  - **Actions**: a `⋯` menu button labelled `Actions for <title>`, with:
    - **Edit** -> `/admin/edit/<slug>`.
    - **View** -> `/projects/<slug>` (published only).
    - **Duplicate** -> `POST /api/duplicate` with `slug`. Creates
      `<slug>-copy` (then `-copy-2`, `-copy-3`, ...) as a draft, then redirects
      to `/admin`. Media files are shared, not copied.
    - **Delete** -> `POST /api/delete` with `slug`, after a confirmation
      dialog.
      Deletes the JSON file and redirects to `/admin`. Media cleanup is out of
      scope.
- Sort: newest first by `date`, same as `listPosts()`. Title and Date headers
  can re-sort the list on the client.
- **Filter posts:** a text field that filters by title or slug on the client.
- No pagination in phase 1.

## Responsive rules

| Width | Sidebar | Posts list |
| --- | --- | --- |
| >= 768px | inset, collapsible to icons | table |
| < 768px | modal sheet | stacked cards |

Below 768px, each row renders as a card: title, slug, status, date, and the same
actions menu. Both the table and the cards come from the same data; CSS shows
one at a time.

## States

- **Empty (no posts at all):** "No posts yet" plus **Create your first post** ->
  `/admin/edit/new`.
- **Filtered empty:** "No drafts" or "No published posts" plus **Show all
  posts** -> `/admin`.
- No loading skeleton. The page renders on the server; the table hydrates for
  search, sorting and the actions menu.

## Accessibility

- Landmarks: `<nav aria-label="Admin">` and `<main id="main">`.
- A **Skip to content** link that is visible on focus and targets `#main`.
- One `h1` per page.
- Table headers use `<th scope="col">`.
- Status text is present, not only color.
- Menu button: `aria-expanded`. Mobile sheet: Escape closes it, focus is
  managed.
- Destructive actions are labelled **Delete** and ask for confirmation.
- Focus rings use the `ring` token.

## Data and routes

| Route | Data | Notes |
| --- | --- | --- |
| `/admin` | `listPosts()` | All posts; `?status=` filters |
| `/admin/edit/new` | none | Create form |
| `/admin/edit/[slug]` | `readPost(slug)` | Editing a post; later slice |
| `POST /api/duplicate` | `duplicatePost(slug)` | Copy as a draft |
| `POST /api/delete` | `deletePost(slug)` | Remove the JSON file |
| `/admin/settings` | settings singletons | Site, home, about |
| `/admin/demo/[page]` | demo JSON | shadcn-admin examples; 404 for unknown pages |
| `/admin/media` | none | Later slice |

- `draft` is the only status.
- The title link depends on `/admin/edit/[slug]` supporting existing slugs.
  Until then it returns 404.

## Acceptance criteria

- [x] `/admin` renders the admin shell: sidebar and main column, with no public
      header or footer.
- [x] The sidebar shows **Posts**, **Settings**, **Demo** and **View site**.
      Media is not rendered.
- [x] The current page title is the only `h1`, and Posts has
      `aria-current="page"`.
- [x] The Posts screen has a **New post** action linking to `/admin/edit/new`.
- [x] With no posts, the empty state shows "No posts yet" and a
      **Create your first post** link.
- [x] With posts, a table renders the columns Title, Status, Date and Actions.
- [x] Rows are sorted by date, newest first.
- [x] Status reads "Draft" or "Published" as text.
- [x] The title links to `/admin/edit/<slug>`.
- [x] The actions menu shows **View** -> `/projects/<slug>` for published posts
      only.
- [x] Every actions menu has **Edit**, **Duplicate** and **Delete**.
- [x] Duplicate creates a draft copy with a unique `<slug>-copy` slug.
- [x] Delete asks for confirmation, removes the post, and returns to `/admin`.
- [x] The All / Published / Drafts filters set `?status=` and show correct
      counts.
- [x] A filter with no matches shows the filtered-empty state with
      **Show all posts**.
- [x] On desktop the sidebar collapses to icons and stays collapsed after a
      reload.
- [x] Below 768px the sidebar is a sheet; the menu button opens it, Escape
      closes it and focus returns to the menu button.
- [x] Below 768px rows render as stacked cards with the same data and actions.
- [x] A **Skip to content** link moves focus to the main content.
- [x] Light and dark themes use the design tokens.
- [x] The demo pages are listed under **Demo** and render at
      `/admin/demo/<name>`.

## Decisions

- Media is hidden until its route exists.
- The Tags column is deferred.
- Duplicate and Delete are included, in a row actions menu.
- Below 768px, table rows render as stacked cards.
- The admin uses React (shadcn/ui). The public site stays free of client
  frameworks.
- shadcn-admin's font and text-direction settings are not included.
