# Portfolio Website

A personal portfolio built on [Astro](https://astro.build). Each project post is
composed from media blocks (rich text, image, gallery, carousel, embed, quote,
media + text) in a custom admin; posts and images live in this Git repo, and the
whole stack runs on free tiers at $0/month.

> The admin is a local-only [BlockNote](https://www.blocknotejs.org/) app. Content
> is edited in the browser on localhost and published by committing and pushing.

## Getting started

Install dependencies from the committed `package-lock.json`, then start the dev
server:

```sh
npm install
npm run dev
```

| Script | Does |
| --- | --- |
| `npm run dev` | Start the Astro dev server |
| `npm run build` | Build the static site |
| `npm run preview` | Preview the build locally |

## Publishing

The admin writes posts and images into `src/content/` and `src/assets/`. The
deployed site is static, so publishing means committing and pushing; the host
rebuilds from `main`. Drafts are excluded from the build. The admin itself is
not deployed — it only answers on localhost (set `LOCAL_ADMIN=1` to run it from
a local production build).

## Layout

```
src/
  admin/         admin UI from shadcn-admin (import as @admin/*)
  blocks/        block schema and the Blocks.astro renderer
  components/
    ui/ space/   design-system primitives
    media/       CmsImage — resolves repo uploads to astro:assets
    mdx/         Carousel renderer
    admin/       post and settings editor islands
  layouts/       Base layout and Admin layout
  pages/         routes (public pages, admin, API)
  lib/           shared helpers
  scripts/       shared client scripts (carousel)
  styles/        Tailwind v4 entries: global.css (public), admin.css (admin),
                 theme.css (shared tokens)
```

## Admin UI

The admin shell, UI primitives and data table come from
[shadcn-admin](https://github.com/satnaing/shadcn-admin) by Sat Naing (MIT),
adapted to Astro routes. A small shim in `src/admin/lib/router.tsx` replaces
TanStack Router. The original example pages (dashboard, tasks, users, chats,
apps) are kept under `/admin/demo/*` as reference. Add more shadcn components
with `npx shadcn add <name>`; `components.json` points them at `src/admin`.

## Environment

Copy `.env.example` to `.env` and fill in what you need. `SITE_URL` feeds the
canonical URLs, sitemap and OpenGraph tags.
