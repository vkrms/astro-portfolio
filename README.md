# Portfolio Website

A personal portfolio built on [Astro](https://astro.build). Each project post is
composed from media blocks (rich text, image, gallery, carousel, embed, quote,
media + text) in a custom admin; posts and images live in this Git repo, and the
whole stack runs on free tiers at $0/month.

> **Status: mid-migration.** The TinaCMS starter has been removed. The admin is
> being rebuilt on [BlockNote](https://www.blocknotejs.org/). `SPIKE.md` records
> the completed phase-0 spike whose `CmsImage` and Carousel renderer carry over.

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

## Layout

```
src/
  components/
    ui/ space/   design-system primitives
    media/       CmsImage — resolves repo uploads to astro:assets
    mdx/         Carousel and MDX renderers
  layouts/       Base layout (Head + Header + Footer)
  pages/         routes
  lib/           shared helpers
  styles/        Tailwind v4 entry
```

## Environment

Copy `.env.example` to `.env` and fill in what you need. `SITE_URL` feeds the
canonical URLs, sitemap and OpenGraph tags.
