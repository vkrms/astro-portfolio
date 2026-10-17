# Admin UI spec

The admin is a WordPress-like back office: a fixed left sidebar and a main
column. It is separate from the public site and never renders the public
`Header` or `Footer`.

## Scope

This spec covers the admin shell and the Posts screen. The editor, media
picker, settings forms and auth are separate slices.

## Layout

**Desktop (>= 1024px)**

- Left sidebar: 240px wide, full height, right border, `bg-card`.
- Main column: top bar with the page title and primary action, then the content.
  The main column scrolls; the sidebar does not.
- No public header or footer.

**Mobile (< 1024px)**

- Sidebar hidden. The top bar shows a menu button, the page title and the
  primary action.
- The menu button opens the sidebar as a drawer over the content.
- Escape, the backdrop, or the menu button closes the drawer.
- Focus moves into the drawer on open and returns to the menu button on close.

```
┌──────────────────┬──────────────────────────────────────────────┐
│ Portfolio        │  Posts                          [New post]   │
│                  │                                              │
│ Posts            │  All (3)   Published (2)   Drafts (1)        │
│ Media    Soon    │  ┌─────────────────────────────────────────┐ │
│ Settings Soon    │  │ Title             Status     Date       │ │
│                  │  ├─────────────────────────────────────────┤ │
│                  │  │ My project        Published  Jun 1 2026 │ │
│                  │  │ another-project   Draft      May 3 2026 │ │
│                  │  └─────────────────────────────────────────┘ │
│ View site        │                                              │
│ Theme            │                                              │
└──────────────────┴──────────────────────────────────────────────┘
```

## Sidebar

- Brand: the site title (from `site` settings; `defaultSiteConfig.seo.title`
  until the settings slice). Links to `/admin`.
- Nav (`<nav aria-label="Admin">`):
  - **Posts** -> `/admin`. Active on `/admin` and `/admin/edit/*`.
  - **Media** -> `/admin/media`. Shown with a "Soon" badge and not a link until
    the route exists.
  - **Settings** -> `/admin/settings`. Same "Soon" treatment.
- Footer:
  - **View site** -> `/`.
  - Theme toggle.
  - **Log out** once auth lands.

Active item: `bg-accent text-foreground` and `aria-current="page"`.

## Top bar

- Left: the page title as the single `h1`.
- Right: the primary action. On Posts it is **New post** -> `/admin/edit/new`.
- Mobile: the menu button sits left of the title.

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
  - Published rows include a **View** link to `/projects/<slug>`.
  - Draft rows have no View link.
- Sort: newest first by `date`, same as `listPosts()`.
- No pagination in phase 1.

## States

- **Empty (no posts at all):** "No posts yet" plus **Create your first post** ->
  `/admin/edit/new`.
- **Filtered empty:** "No drafts" or "No published posts" plus **Show all
  posts** -> `/admin`.
- No loading skeleton. The page renders on the server.

## Accessibility

- Landmarks: `<nav aria-label="Admin">` and `<main id="main">`.
- A **Skip to content** link that is visible on focus and targets `#main`.
- One `h1` per page.
- Table headers use `<th scope="col">`.
- Status text is present, not only color.
- Drawer: `aria-expanded`, `aria-controls`, Escape closes it, focus is managed.
- Focus rings use the `ring` token.

## Data and routes

| Route | Data | Notes |
| --- | --- | --- |
| `/admin` | `listPosts()` | All posts; `?status=` filters |
| `/admin/edit/new` | none | Create form |
| `/admin/edit/[slug]` | `readPost(slug)` | Editing a post; later slice |
| `/admin/media` | none | Later slice |
| `/admin/settings` | settings singletons | Later slice |

- `draft` is the only status.
- The title link depends on `/admin/edit/[slug]` supporting existing slugs.
  Until then it returns 404.

## Acceptance criteria

- [ ] `/admin` renders the admin shell: sidebar and main column, with no public
      header or footer.
- [ ] The sidebar shows **Posts**, **Media** (Soon), **Settings** (Soon), and
      **View site**.
- [ ] The current page title is the only `h1`, and the matching sidebar item has
      `aria-current="page"`.
- [ ] The Posts screen has a **New post** action linking to `/admin/edit/new`.
- [ ] With no posts, the empty state shows "No posts yet" and a
      **Create your first post** link.
- [ ] With posts, a table renders the columns Title, Status and Date.
- [ ] Rows are sorted by date, newest first.
- [ ] Status reads "Draft" or "Published" as text.
- [ ] The title links to `/admin/edit/<slug>`.
- [ ] Published rows show a **View** link to `/projects/<slug>`; drafts do not.
- [ ] The All / Published / Drafts filters set `?status=` and show correct
      counts.
- [ ] A filter with no matches shows the filtered-empty state with
      **Show all posts**.
- [ ] Below 1024px the sidebar is hidden; the menu button opens it and Escape
      closes it.
- [ ] The menu button exposes `aria-expanded` and `aria-controls`.
- [ ] A **Skip to content** link moves focus to the main content.
- [ ] Light and dark themes use the design tokens.
- [ ] The list, filters and navigation need no client-side framework.

## Open questions

- Keep Media and Settings as "Soon" items, or hide them until built?
- Add a Tags column?
- Add Delete or Duplicate row actions? (Currently out of scope.)
- Table on mobile: horizontal scroll (current proposal) or stacked rows?
