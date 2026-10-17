# Portfolio Website Spec

Oct 16, 2026 · @Pavel

## Overview

A personal portfolio on Astro where each project post is composed from media blocks in a custom BlockNote editor at `/admin`. Posts and images live in the Git repo, and the whole stack runs on free tiers at $0/month.

**Goals**

- Write, edit and publish posts from a browser on the live site, with no IDE involved.
- Compose posts from blocks: rich text, image, gallery, carousel, embed, quote, media + text. Video arrives in phase 2.
- Keep posts as JSON files and images as files in the repo. No database, no third-party CMS.
- Ship static HTML with no framework hydration on public pages; only small inline scripts (theme, mobile menu, carousel).

**Not in scope for phase 1:** video hosting, multiple editors, comments, i18n, anything commercial.

## Key decisions

The stack is Astro + a self-built admin using BlockNote + Vercel Hobby, with Cloudflare R2 added for video in phase 2.

| Area | Decision | Reason |
| --- | --- | --- |
| Framework | Astro (currently 6.4.8), static pages plus a few on-demand routes | Static HTML for speed; on-demand routes run the admin and its API |
| Package manager | npm, with `package-lock.json` committed | One lockfile, no extra tooling |
| Editor | Custom admin at `/admin` built on [BlockNote](https://www.blocknotejs.org/) (React, MPL-2.0) | Block editor with slash menu and drag handles; full control over the UI |
| Storage | One JSON file per post in `src/content/projects/` | BlockNote's own block format: lossless save and reload, simple renderer |
| Saving | Admin API commits to GitHub through the GitHub API | Content stays in the repo; every save is a reviewable commit |
| Login | One admin password, signed session cookie | Simplest secure option for a single editor |
| Images | Committed to the repo, optimized by `astro:assets` at build time | No image service bill; AVIF/WebP and responsive sizes for free |
| Video (phase 2) | Cloudflare R2, uploaded straight from the browser | 10 GB free, no egress fees, bypasses function size limits |
| Hosting | Vercel Hobby | Free, runs the admin's API routes |
| Monthly cost | $0 | Every service stays inside its free tier |

## Editor and admin

The CMS is a small admin app inside the Astro project: a BlockNote editor in the browser plus a few API routes that log you in, save posts and upload images. TinaCMS was dropped after the phase 0 spike because its editing UI didn't fit.

The admin shell and posts table are specified in [admin-ui-spec.md](./admin-ui-spec.md).

|  | BlockNote (chosen) | Editor.js | Gutenberg standalone |
| --- | --- | --- | --- |
| Feel | Notion-style: slash menu, drag handles, side menu | Plain block list with a "+" toolbar | The WordPress editor itself |
| Custom blocks | React components via `createReactBlockSpec` | Vanilla JS plugin per block | WordPress block API, heaviest to learn |
| Output | JSON block tree | JSON block list | HTML with block comments |
| License | Core packages MPL-2.0 ([npm](https://www.npmjs.com/package/@blocknote/core)) | Apache-2.0 | GPL-2.0+ |
| Status | Active, v0.56 (pre-1.0) | Active | Active, but standalone use is a side path |

**Packages:** `@blocknote/core`, `@blocknote/react` and the `@blocknote/shadcn` UI kit, all MPL-2.0. The `xl-` packages (AI, PDF/Word export, multi-column) are GPL-3.0 or paid ([BlockNote](https://www.blocknotejs.org/)) and are not used.

**How the admin is built**

- `/admin` is an on-demand Astro page that loads the editor as a React island (`client:only`). React ships only to the admin, never to public pages.
- One shared module, `src/blocks/schema.ts`, defines the custom blocks once. The editor, the save validation and the site renderer all import it.
- Admin screens: post list, post editor (fields panel + BlockNote body), media picker, login.
- Pinned BlockNote version, since pre-1.0 releases can change the block format; upgrades are deliberate.

## Content model

One JSON file per post in an Astro content collection, `projects`, plus three singletons. A Zod schema in `src/content.config.ts` is the source of truth: the admin API validates every save against it, and the build fails on bad data.

**`projects`** (one JSON file per post, named by slug)

| Field | Type | Rules |
| --- | --- | --- |
| `title` | string | Required, ≤ 80 chars |
| `slug` | from filename | Lowercase, hyphenated; renaming moves the file |
| `summary` | string | Required, ≤ 160 chars; used for cards and meta description |
| `date` | ISO date | Required; sorts the list |
| `cover` | image path | Required; also the OG image |
| `coverAlt` | string | Required |
| `tags` | string\[\] | Optional; drives the filter on `/projects` |
| `role` | string | Optional, e.g. "Design and front end" |
| `client` | string | Optional |
| `links` | {label, url}\[\] | Optional: live site, repo, case study |
| `featured` | boolean | Shows on the home page |
| `draft` | boolean | Excluded from production builds |
| `body` | BlockNote block array | Validated against the shared block schema |
| `schemaVersion` | number | Bumped if the block format changes, so old posts can be migrated |

**Singletons** (JSON in `src/content/settings/`): `site` (name, tagline, social links, SEO defaults), `home` (intro text, ordered featured list), `about` (BlockNote body, portrait image). The admin edits these with the same tools.

**File layout**

```
src/
  content.config.ts      Zod schemas for projects and settings
  blocks/
    schema.ts            custom block definitions, shared by editor and site
    render/              Astro renderers: Blocks, InlineContent, Image, Gallery,
                         Carousel, Embed, Quote, MediaText, Video
  content/
    projects/
      my-project.json
    settings/
      site.json  home.json  about.json
  assets/
    uploads/
      my-project/
        cover.jpg  shot-01.jpg
  admin/                 React editor app (islands), loaded only on /admin
  pages/
    admin/               on-demand admin pages
    api/                 on-demand admin API routes
  lib/
    auth.ts  github.ts  storage.ts
```

## Block library

Text blocks come from BlockNote's defaults; media blocks are custom blocks defined in `src/blocks/schema.ts`. Each block type maps by name to an Astro renderer in `src/blocks/render/`.

| Block | Source | Editor UI | Renders as | Client JS | Phase |
| --- | --- | --- | --- | --- | --- |
| Paragraph, H2–H3, bullet/numbered list, code | BlockNote default | Inline text with bold, italic, code, links | Native HTML | None | 1 |
| Image | Custom | Media picker, alt (required), caption, width: inline / wide / full | `<Picture>` with AVIF + WebP and srcset | None | 1 |
| Gallery | Custom | Thumbnail grid: add, drag to reorder, remove; alt + caption per image; columns 2–4 | CSS grid | None | 1 |
| Carousel | Custom | Same item editor as Gallery, plus aspect ratio | CSS scroll-snap track with prev/next | Small inline script | 1 |
| Embed | Custom | URL field (YouTube, Vimeo, Figma, CodePen), aspect ratio | Thumbnail facade; iframe loads on click | Tiny click handler | 1 |
| Quote | Custom (inline content) | Quote text, attribution field | `<blockquote>` | None | 1 |
| Media + text | Custom | Image, alt, inline text, image side | Two columns, stacks on mobile | None | 1 |
| Video | Custom | Upload to R2, poster, captions (.vtt), loop / muted / autoplay | Native `<video>` | None | 2 |

**List-type blocks.** BlockNote props can only hold strings, numbers and booleans ([docs](https://www.blocknotejs.org/docs/custom-schemas/custom-blocks)). Gallery and Carousel therefore keep their items in one string prop, `items`, holding a JSON array of `{src, alt, caption}`. The block's own React UI edits that array, so you never see the JSON. The save API and the renderer parse it and validate it with Zod.

**One renderer, two uses.** `Blocks.astro` walks the block tree, groups consecutive list items into `<ul>`/`<ol>`, and renders inline styles and links. Public pages use it at build time; the admin's preview pane uses the same component through an on-demand route, so preview matches production.

**Accessibility rules:** alt text is required on every image (save is blocked without it); the carousel is keyboard operable and never autoplays; embeds get a title attribute.

## Media pipeline

Images go through the admin API into the repo and are optimized at build time; video goes straight from the browser to Cloudflare R2 in phase 2.

**Phase 1: images**

- The media picker resizes each image in the browser before upload: long edge ≤ 3000 px, re-encoded as JPEG or WebP, target ≤ 3.5 MB. Vercel Functions reject request bodies over 4.5 MB ([Vercel](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)), so this keeps every upload under the limit.
- `POST /api/media` stores the file in the repo as a Git blob (GitHub's create-blob API) and returns its SHA plus the path it will get, `/uploads/<project-slug>/<file>`. Nothing is committed yet.
- Saving the post builds one Git tree with the post JSON and all new image blobs, then makes a single commit. A post never points at a missing file, and an upload you abandon leaves no commit behind.
- Until a post is saved, the editor and the preview show the browser's local copy of a new image.
- Astro only optimizes images kept under `src/` ([Astro docs](https://docs.astro.build/en/guides/images/)). `CmsImage.astro` (built and tested in the spike) resolves stored paths to imported assets and renders `<Picture>` with AVIF and WebP at up to 5 widths.
- On-demand renders, such as the admin preview, serve the original file, so editing never touches Vercel's metered image service.
- Repo budget: keep it under about 1 GB. A GitHub Action fails any commit that adds a file over 5 MB.

**Phase 2: video**

|  | [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/) | [Neon Object Storage](https://neon.com/guides/best-s3-compatible-object-storage-saas-and-ai-agents-2026) |
| --- | --- | --- |
| Free storage | 10 GB/month | 5 GB per project |
| Free egress | Unlimited, no egress fees | 5 GB per project |
| Status | Generally available | Beta, new projects in us-east-2 only ([docs](https://neon.com/docs/storage/overview)) |
| Fit | Built for serving public files | Built for app files that branch with a Postgres database |

R2 wins: 5 GB of egress is roughly 100 plays of a 50 MB clip, which a portfolio could exhaust in a month.

- Bucket `portfolio-media`, public through a custom subdomain such as `media.<your-domain>`. The default `r2.dev` URL is for testing only.
- The Video block asks `POST /api/video-upload` for a presigned R2 URL, then uploads the file directly from the browser. Video never passes through a Vercel Function, so the 4.5 MB limit doesn't apply.
- Encode H.264 MP4 at up to 1080p, ≤ 50 MB per clip, with a poster JPEG. Adaptive streaming would need a paid service and is out of scope.

## Site structure

All public pages are prerendered. The admin pages and API routes run on demand and, except login, require a valid session.

| Route | Content | Rendering |
| --- | --- | --- |
| `/` | Intro, featured projects grid | Static |
| `/projects` | All published projects, newest first, tag filter | Static |
| `/projects/[slug]` | Project post: header, cover, block body, links, next/previous | Static |
| `/about` | About text and portrait | Static |
| `/rss.xml`, `/sitemap-index.xml`, `/404` | Feed, sitemap, not-found page | Static |
| `/admin/login` | Password form | On demand |
| `/admin` | Post list with draft/published state, straight from GitHub | On demand, auth |
| `/admin/edit/[slug]` | Fields panel, BlockNote body, preview pane | On demand, auth |
| `/admin/settings` | Site, home and about singletons | On demand, auth |
| `POST /api/login`, `POST /api/logout` | Start or end the session | On demand |
| `GET /api/posts`, `GET /api/posts/[slug]` | Read posts from the latest `main`, with each file's SHA | On demand, auth |
| `POST /api/save` | Validate, then commit post JSON + new images | On demand, auth |
| `POST /api/media` | Store an image as a Git blob | On demand, auth |
| `POST /api/preview` | Render posted JSON with the site's components | On demand, auth |
| `POST /api/video-upload` | Presigned R2 upload URL (phase 2) | On demand, auth |

Each project page uses its `cover` as the Open Graph image and `summary` as the meta description. The admin reads from GitHub, not from the deployed build, so a post saved a minute ago shows up before the rebuild finishes.

## Editing workflow

Every save in the admin becomes one Git commit on `main`, made by the admin API through the GitHub API, and Vercel rebuilds the site from it within a few minutes.

&#91;embedded content: editing and publishing flow · 5 steps, R2 in phase 2\]

The dashed loop is the preview: the admin sends the unsaved post to `/api/preview`, which renders it with the same components as the live site. R2 joins in phase 2 to serve video files.

1. Open `https://<your-domain>/admin` and log in with the admin password. The session lasts 30 days.
2. Create or open a project. Metadata fields sit on the left; the BlockNote body fills the middle.
3. Type `/` or use the side menu to insert blocks: Image, Gallery, Carousel, Embed, Quote, Media + text. Drag the handle to reorder.
4. Add images through the media picker. They are resized in the browser and stored as Git blobs.
5. Toggle the preview pane to see the post rendered by the site's own components.
6. Keep `draft` on while writing. Saving still commits, but the production build skips drafts.
7. Turn `draft` off and save to publish. Vercel rebuilds and the post is live in a few minutes.

If the post changed on GitHub since you opened it, for example from another tab, the save is refused rather than overwriting. The admin then offers to reload.

**Local development:** with `astro dev`, the storage layer (`src/lib/storage.ts`) writes files straight to disk instead of calling GitHub, and login is skipped only in dev mode, never based on the request's host. The same admin works offline; you commit and push as usual.

## Hosting and deployment

Vercel Hobby is the host, because the admin needs on-demand functions. Render's free static hosting could serve the public site, but not the admin.

|  | Vercel Hobby | Render free |
| --- | --- | --- |
| Static pages | Yes | Yes (static site) |
| Admin API routes | Yes, via `@astrojs/vercel` | Needs a web service, which sleeps when idle (approximate, not checked) |
| Request body limit | 4.5 MB per function call | Not checked |
| Bandwidth | 100 GB/month ([limits](https://vercel.com/docs/limits)) | Not checked |
| Terms | Personal, non-commercial use only | Not checked |

**Environment variables** (server-only, never exposed to the browser)

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD_HASH` | scrypt hash of the admin password, made with a one-line script in the repo |
| `SESSION_SECRET` | 32+ random bytes for signing the session cookie |
| `GITHUB_TOKEN` | Fine-grained token: this one repo only, Contents read and write, nothing else |
| `GITHUB_REPO`, `GITHUB_BRANCH` | `vkrms/astro-portfolio`, `main` |
| `R2_*` (phase 2) | Account ID, access key, secret, bucket name for presigned uploads |

**Security**

- Session cookie: signed, `HttpOnly`, `Secure`, `SameSite=Strict`, 30-day expiry. Every admin route and API call checks it.
- State-changing API calls also check that the `Origin` header matches the site.
- Login compares hashes in constant time and waits about 1 second after a failure, which makes brute-forcing a long password impractical.
- The GitHub token can only touch this repo; if it leaks, revoke it on GitHub and set a new one.

**Build:** `astro build` with `@astrojs/vercel`. Public pages prerender; `/admin/*` and `/api/*` set `prerender = false`. GitHub rejects single files over 100 MB, which the 5 MB image rule keeps far away.

A portfolio used to find work is usually treated as personal use, but confirm against Vercel's fair-use terms. If the site starts selling services directly, plan a move to Vercel Pro or Cloudflare.

## Phases

Building the admin is now the largest piece of work, so a new spike proves the risky parts before anything is polished. The first spike's Astro setup, `CmsImage` and Carousel renderer carry over; TinaCMS is removed.

1. **Phase 0b: BlockNote spike** (2–3 days, localhost only). Pass these checks:
   - A custom Carousel block with its item editor (add, reorder, remove, alt, caption), including a ~3 MB image, saves to JSON and reloads identically. The image uploads through the media picker, is written to disk, and the post renders it.
   - `Blocks.astro` renders that JSON, including grouped lists and inline links, to the same HTML on a static page and through `/api/preview`.

   GitHub commits and stale-SHA handling are deferred to Phase 1; Phase 0b uses the local disk storage path.
2. **Phase 1: MVP.** Login, post list, editor with all phase 1 blocks, media picker with resizing, preview, settings singletons, public pages and base design. Done when 3 real projects are published from the browser.
3. **Phase 2: video.** R2 bucket and custom subdomain, presigned uploads, Video block.
4. **Phase 3: polish.** Tag filter, RSS, view transitions, gallery lightbox, per-project OG images, autosave of unsaved drafts in the browser.

Acceptance criteria for each phase and for the release are in [definition-of-done.md](./definition-of-done.md).

## Implementation status

As of the TinaCMS removal (commit `b8bd753`), the repo is a clean Astro base for Phase 0b.

**Done**

- TinaCMS removed: config, collections, generated admin, content, Tina pages and the Tina block library are gone.
- Package manager switched to npm; `package-lock.json` is committed and `allowScripts` covers `esbuild`, `workerd` and `sharp`.
- Astro is pinned at 6.4.8.
- The shell carries over: `Header`, `Footer`, `ThemeToggle`, `Base`, `BaseHead`, the `ui/` and `space/` primitives, `CmsImage.astro` and the `Carousel` renderer.
- Phase 0b: BlockNote editor at `/admin/edit/[slug]` with a custom Carousel block (slash menu, media picker, add/reorder/remove, alt, caption, aspect ratio).
- A custom Image block on the same media pipeline, with alt and caption fields; the save is refused while any image lacks alt text.
- The slash menu exposes only blocks the renderer supports, so nothing can be saved and then dropped from the page.
- Browser-side resize (long edge <= 3000 px, <= 3.5 MB) and local uploads under `src/assets/uploads/`.
- `Blocks.astro` renders paragraphs, headings, grouped lists, code, links and carousels; `/api/preview` produces the same HTML as the static page.
- React runs as a runtime dependency on `@astrojs/react` 5.x, which keeps the React plugin on Vite 7 (Astro 6.4.8).
- Editing project JSON clears Astro's dev route cache, so a new post appears on `/projects/<slug>` without a server restart.
- `npm run build`, `npx astro check`, the unit tests and the Phase 0b Playwright tests all pass.

**Decisions locked**

- BlockNote UI kit: `@blocknote/shadcn`.
- Package manager: npm.
- Astro 6.4.8.

**Deferred or not built yet**

- Deploy adapter: `astro.config.mjs` still auto-detects Vercel, Cloudflare, Netlify and Node; pinning `@astrojs/vercel` is deferred. Vercel Hobby remains the intended host.
- Settings singletons and the Zod schema in `src/content.config.ts`. Until they exist, `src/lib/config.ts` holds a temporary `defaultSiteConfig`.
- Auth, GitHub commits and stale-SHA handling: `src/lib/auth.ts`, `src/lib/github.ts`, `/admin/login`. Phase 0b is local and unauthenticated.
- Remaining Phase 1 blocks (Gallery, Embed, Quote, Media + text) and the `/about` and `/rss.xml` routes.
- Server env vars: `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH` (and `R2_*` in phase 2). `.env.example` currently defines only `SITE_URL` and the optional `DEPLOY_ADAPTER`.


## Risks and open questions

The biggest risk is now scope: you own the admin, so every editor feature is code you write and maintain.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Admin scope creeps | Phase 1 slips | Fixed phase 1 feature list; everything else waits for phase 3 |
| BlockNote is pre-1.0 | An upgrade changes the block format | Pin the version, `schemaVersion` in every post, a migration script per format change |
| Editor schema and renderer drift | A block saves but won't render | One shared `schema.ts`; Zod validation on save and at build |
| GitHub token leaks | Someone can write to the repo | Fine-grained token, one repo, contents only; server-side only; revoke and rotate |
| Password brute-forced | Admin taken over | Long random password, hashed, delay after failures, `SameSite=Strict` cookie |
| Image over 4.5 MB | Upload fails | Resize in the browser before upload; clear error if still too large |
| Repo grows from images | Slower clones and builds | 5 MB cap in CI; move originals to R2 past about 1 GB |
| Site becomes commercial | Breaks Vercel Hobby terms | Move to Vercel Pro or Cloudflare |

**Open questions**

- [ ] Domain name, for the site and the `media.` subdomain?
- [ ] Design direction: references, colors, type?
- [ ] Which 3 projects go in first?
- [ ] Tags as a filter, or one chronological list?

## Sources

- [BlockNote](https://www.blocknotejs.org/)
- [BlockNote custom blocks](https://www.blocknotejs.org/docs/custom-schemas/custom-blocks)
- [@blocknote/core on npm](https://www.npmjs.com/package/@blocknote/core)
- [Vercel: function body size limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)
- [Vercel limits](https://vercel.com/docs/limits)
- [Astro images guide](https://docs.astro.build/en/guides/images/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Neon Storage overview](https://neon.com/docs/storage/overview)
- [Neon object storage comparison](https://neon.com/guides/best-s3-compatible-object-storage-saas-and-ai-agents-2026)
