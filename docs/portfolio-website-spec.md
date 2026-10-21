# Portfolio Website Spec

Oct 16, 2026 · @Pavel

## Overview

A personal portfolio on Astro where each project post is composed from media blocks in a custom BlockNote editor at `/admin`. Posts and images live in the Git repo, and the whole stack runs on free tiers at $0/month.

**Goals**

- Write and edit posts in the browser on localhost; publish by committing and pushing.
- Compose posts from blocks: rich text, image, gallery, carousel, embed, quote, media + text. Video arrives in phase 2.
- Keep posts as JSON files and images as files in the repo. No database, no third-party CMS.
- Ship static HTML with no framework hydration on public pages; only small inline scripts (theme, mobile menu, carousel).

**Not in scope for phase 1:** video hosting, multiple editors, comments, i18n, anything commercial.

## Key decisions

The stack is Astro + a self-built admin using BlockNote + Vercel Hobby, with Cloudflare R2 added for video in phase 2.

| Area | Decision | Reason |
| --- | --- | --- |
| Framework | Astro (currently 6.4.8), static pages plus a few on-demand routes | Static HTML for speed; on-demand routes exist only for the local admin |
| Package manager | npm, with `package-lock.json` committed | One lockfile, no extra tooling |
| Editor | Custom admin at `/admin` built on [BlockNote](https://www.blocknotejs.org/) (React, MPL-2.0) | Block editor with slash menu and drag handles; full control over the UI |
| Storage | One JSON file per post in `src/content/projects/` | BlockNote's own block format: lossless save and reload, simple renderer |
| Saving | The local admin writes JSON and images into the working tree | Content stays in the repo; you commit and push when ready |
| Access | Admin and API routes only on localhost: always in dev, and in a locally-run build with `LOCAL_ADMIN=1` | No remote write surface; a deploy cannot edit content |
| Images | Committed to the repo, optimized by `astro:assets` at build time | No image service bill; AVIF/WebP and responsive sizes for free |
| Video (phase 2) | Cloudflare R2, uploaded straight from the browser | 10 GB free, no egress fees, bypasses function size limits |
| Hosting | Vercel Hobby for the static site | Free; the admin runs locally and is not deployed |
| Monthly cost | $0 | Every service stays inside its free tier |

## Editor and admin

The CMS is a local admin app inside the Astro project: a BlockNote editor in the browser plus a few API routes that save posts and upload images. It runs only on localhost; the deployed site is static.

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
- Admin screens: post list, post editor (fields panel + BlockNote body), media picker.
- Pinned BlockNote version, since pre-1.0 releases can change the block format; upgrades are deliberate.

## Content model

One JSON file per post in `src/content/projects`, plus three settings singletons. A shared Zod schema in `src/lib/schema.ts` is the source of truth: the admin API validates every save, and reading a malformed file throws so the build fails instead of rendering an empty page. The files are plain, versioned JSON: the admin is the normal way to edit them, but a person or an AI agent can also edit them directly when that is more convenient.

**`projects`** (one JSON file per post, named by slug)

| Field | Type | Rules |
| --- | --- | --- |
| `title` | string | Required, ≤ 128 chars |
| `slug` | from filename | Lowercase, hyphenated; renaming moves the file |
| `summary` | string | Required, ≤ 280 chars; used for cards and meta description (search engines truncate longer text) |
| `date` | ISO date | Required; sorts the list |
| `cover` | image path | Optional; also the OG image when set |
| `coverAlt` | string | Optional; used when `cover` is set |
| `tags` | string\[\] | Optional; shown on cards and used by the `/projects` filter. The MVP publishes one post tagged `real deal`. |
| `role` | string | Optional, e.g. "Design and front end" |
| `client` | string | Optional |
| `links` | {label, url}\[\] | Optional: live site, repo, case study |
| `featured` | boolean | Shows on the home page |
| `draft` | boolean | Excluded from production builds |
| `body` | BlockNote block array | Validated against the shared block schema |
| `schemaVersion` | number | Bumped if the block format changes, so old posts can be migrated |

**Singletons** (JSON in `src/content/settings/`): `site` (name, tagline, social links, SEO defaults), `home` (intro text, ordered featured list). The admin edits these with the same tools.

**File layout**

```
src/
  lib/
    schema.ts            Zod schemas shared by storage, the admin and the build
    storage.ts  settings.ts  admin-access.ts  resize.ts  upload.ts
  blocks/
    schema.ts            custom block definitions, shared by editor and site
    render/              Astro renderers: Blocks, Image, Gallery, Carousel,
                         Embed, Quote, MediaText
  content/
    projects/
      my-project.json
    settings/
      site.json  home.json
  assets/
    uploads/
      my-project/
        cover.jpg  shot-01.jpg
  admin/                 React editor app (islands), loaded only on /admin
  pages/
    admin/               on-demand admin pages
    api/                 on-demand admin API routes
```

## Block library

Text blocks come from BlockNote's defaults; media blocks are custom blocks defined in `src/blocks/schema.ts`. Each block type maps by name to an Astro renderer in `src/blocks/render/`.

| Block | Source | Editor UI | Renders as | Client JS | Phase |
| --- | --- | --- | --- | --- | --- |
| Paragraph, H2–H3, bullet/numbered list, code | BlockNote default | Inline text with bold, italic, code, links | Native HTML | None | 1 |
| Image | Custom | Media picker, alt, caption, width: inline / wide / full | `<Picture>` with AVIF + WebP and srcset | None | 1 |
| Gallery | Custom | Thumbnail grid: add, drag to reorder, remove; alt + caption per image; columns 2–4 | CSS grid | None | 1 |
| Carousel | Custom | Same item editor as Gallery, plus aspect ratio | CSS scroll-snap track with prev/next | Small inline script | 1 |
| Embed | Custom | URL field (YouTube, Vimeo, Figma, CodePen), aspect ratio | Thumbnail facade; iframe loads on click | Tiny click handler | 1 |
| Quote | Custom (inline content) | Quote text, attribution field | `<blockquote>` | None | 1 |
| Media + text | Custom | Image, alt, inline text, image side | Two columns, stacks on mobile | None | 1 |
| Video | Custom | Upload to R2, poster, captions (.vtt), loop / muted / autoplay | Native `<video>` | None | 2 |

**List-type blocks.** BlockNote props can only hold strings, numbers and booleans ([docs](https://www.blocknotejs.org/docs/custom-schemas/custom-blocks)). Gallery and Carousel therefore keep their items in one string prop, `items`, holding a JSON array of `{src, alt, caption}`. The block's own React UI edits that array, so you never see the JSON. The save API and the renderer parse it and validate it with Zod.

**One renderer, two uses.** `Blocks.astro` walks the block tree, groups consecutive list items into `<ul>`/`<ol>`, and renders inline styles and links. Public pages use it at build time; the admin's preview modal uses the same component through an on-demand route, so preview matches production.

**Accessibility rules:** image alt text is optional (the save is not blocked) and renders when provided; the carousel is keyboard operable and never autoplays; embeds get a title attribute.

## Media pipeline

Images go through the admin API into the repo and are optimized at build time; video goes straight from the browser to Cloudflare R2 in phase 2.

**Phase 1: images**

- The media picker resizes each image in the browser before upload: long edge ≤ 3000 px, re-encoded as JPEG or WebP, target ≤ 3.5 MB. Vercel Functions reject request bodies over 4.5 MB ([Vercel](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)), so this keeps every upload under the limit.
- `POST /api/media` writes the file under `src/assets/uploads/<project-slug>/` and returns `/uploads/<project-slug>/<file>`.
- Saving the post writes the JSON that points at those paths. Uploads stay in the working tree until you commit; an abandoned upload can be deleted.
- Until a post is saved, the editor and the preview show the browser's local copy of a new image.
- Astro only optimizes images kept under `src/` ([Astro docs](https://docs.astro.build/en/guides/images/)). `CmsImage.astro` resolves stored paths to imported assets and renders `<Picture>` with AVIF and WebP at up to 5 widths.
- On-demand renders, such as the admin preview, serve the original file, so editing never touches a hosted image service.
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

All public pages are prerendered. The admin pages and API routes run on demand and are only reachable on localhost.

| Route | Content | Rendering |
| --- | --- | --- |
| `/` | Intro, featured projects grid | Static |
| `/projects` | All published projects, newest first, tag filter | Static |
| `/projects/[slug]` | Project post: header, cover, block body, links, next/previous | Static |
| `/rss.xml`, `/sitemap-index.xml`, `/404` | Feed, sitemap, not-found page | Static |
| `/admin` | Post list with draft/published state | Local only |
| `/admin/edit/[slug]` | Fields panel, BlockNote body, preview modal | Local only |
| `/admin/settings` | Site and home singletons | Local only |
| `GET /api/posts`, `GET /api/posts/[slug]` | Read posts from disk | Local only |
| `POST /api/save` | Validate, then write post JSON + images | Local only |
| `POST /api/media` | Store an image under `src/assets/uploads/` | Local only |
| `POST /api/preview` | Render posted JSON with the site's components | Local only |
| `POST /api/video-upload` | Presigned R2 upload URL (phase 2) | Local only |

Each project page uses its `cover` as the Open Graph image and `summary` as the meta description. The admin reads the working tree, so a saved post appears before you build. Deployed builds contain only prerendered public pages; admin paths return 404.

## Editing workflow

Editing happens on your machine. Save writes the post JSON and images into the working tree; nothing is sent to a host and nothing is committed for you.

1. Run `npm run dev` and open `http://localhost:1892/admin`.
2. Create or open a project. Metadata fields sit above the BlockNote body.
3. Type `/` or use the side menu to insert blocks: Image, Carousel, and the text blocks. Drag the handle to reorder.
4. Add images through the media picker. They are resized in the browser and written under `src/assets/uploads/`.
5. Open the preview modal to see the post rendered by the site's own components.
6. Keep `draft` on while writing. Drafts are written but excluded from production builds.
7. Turn `draft` off and save. Then commit and push; the host rebuilds and the post is live.

If you run a production build locally and want the admin, start the server with `LOCAL_ADMIN=1`. The admin still only answers on localhost.

**Local development:** the storage layer (`src/lib/storage.ts`) writes files straight to disk. The admin works offline; you commit and push as usual.

## Hosting and deployment

Vercel Hobby is the host for the static site. The admin runs locally, so any static host works; Vercel remains the intended choice.

|  | Vercel Hobby | Render free |
| --- | --- | --- |
| Static pages | Yes | Yes (static site) |
| Admin API routes | Not needed; the admin runs locally | Not needed |
| Request body limit | 4.5 MB per function call | Not checked |
| Bandwidth | 100 GB/month ([limits](https://vercel.com/docs/limits)) | Not checked |
| Terms | Personal, non-commercial use only | Not checked |

**Environment variables**

| Variable | Purpose |
| --- | --- |
| `LOCAL_ADMIN` | `1` enables the admin on a locally-run production build. Ignored unless the request host is localhost. |
| `SITE_URL` | Canonical site URL for the sitemap and absolute links. |
| `DEPLOY_ADAPTER` | Optional; force an adapter for a manual deploy. |
| `R2_*` (phase 2) | Account ID, access key, secret, bucket name for presigned uploads. |

**Security**

- The admin is not deployed. Middleware returns 404 for `/admin`, `/api` and `/uploads` unless the request is on localhost and either the dev server or `LOCAL_ADMIN=1` is active.
- The host check applies even when `LOCAL_ADMIN=1` is set, so a deploy that leaks the flag still cannot write.
- State-changing API calls also pass Astro's `checkOrigin` guard, so another page cannot post to the local dev server.
- The deployed site has no admin credentials, no repository token and no server-side writes.

**Build:** `astro build` with `@astrojs/vercel`. Public pages prerender; `/admin/*` and `/api/*` set `prerender = false`. Those routes are wrapped by the localhost middleware and return 404 in production. A build that excludes the adapter has no admin routes at all.

A portfolio used to find work is usually treated as personal use, but confirm against Vercel's fair-use terms. If the site starts selling services directly, plan a move to Vercel Pro or Cloudflare.

## Phases

Building the admin is the largest piece of work, so Phase 0b proved the risky parts first.

1. **Phase 0b: BlockNote spike** (2–3 days, localhost only). Pass these checks:
   - A custom Carousel block with its item editor (add, reorder, remove, alt, caption), including a ~3 MB image, saves to JSON and reloads identically. The image uploads through the media picker, is written to disk, and the post renders it.
   - `Blocks.astro` renders that JSON, including grouped lists and inline links, to the same HTML on a static page and through `/api/preview`.

   The admin writes local files from the start; there is no remote write path.
2. **Phase 1: MVP.** Post list, editor with all phase 1 blocks, media picker with resizing, preview, settings singletons, public pages and base design. Posts carry tags and at least one published post uses `real deal`. Every visitor-facing page and modal is confirmed by the owner from [design-review.md](./design-review.md). Done when 3 real projects are edited locally, committed and deployed.
3. **Phase 2: video.** R2 bucket and custom subdomain, presigned uploads, Video block.
4. **Phase 3: polish.** View transitions, gallery lightbox, autosave of unsaved drafts in the browser.

Acceptance criteria for each phase and for the release are in [definition-of-done.md](./definition-of-done.md).

## Implementation status

The admin is local-only. Deployed builds serve static pages only.

**Done**

- Package manager switched to npm; `package-lock.json` is committed and `allowScripts` covers `esbuild`, `workerd` and `sharp`.
- Astro is pinned at 6.4.8.
- The shell carries over: `Header`, `Footer`, `ThemeToggle`, `Base`, `BaseHead`, the `ui/` and `space/` primitives, `CmsImage.astro` and the `Carousel` renderer.
- Phase 0b: BlockNote editor at `/admin/edit/[slug]` with a custom Carousel block (slash menu, media picker, add/reorder/remove, alt, caption, aspect ratio).
- A custom Image block on the same media pipeline, with alt and caption fields; alt text is optional and renders when provided.
- Every Phase 1 block is implemented: paragraph, H2/H3, lists, code, image, gallery, carousel, embed, quote and media + text. The slash menu puts the media blocks first and hides anything the renderer cannot draw.
- Gallery, quote, media + text and embed blocks share one item/image editor pattern; carousel slides, gallery images and media + text images expose alt fields, and embeds require a title.
- `site` and `home` settings singletons are editable at `/admin/settings`.
- Public home shows the configured intro and featured projects; `/rss.xml` is generated.
- Posts carry tags; `/projects` filters by them client-side (static pages cannot read a query string at build time), including multi-word tags. The published `this-is-a-post` is tagged `real deal`.
- Post covers render on `/projects/[slug]` and produce a 1200x630 OG image; canonical and meta description come from the route and `summary`.
- Storage validates posts on read and write with Zod, so a malformed JSON file fails the build with the field name.
- The generated sitemap excludes `/admin`, `/api`, `/uploads` and the `/home` redirect.
- Browser-side resize (long edge <= 3000 px, <= 3.5 MB) and local uploads under `src/assets/uploads/`.
- `Blocks.astro` renders paragraphs, headings, grouped lists, code, images, galleries, carousels, embeds, quotes and media + text; `/api/preview` produces the same HTML as the static page.
- React runs as a runtime dependency on `@astrojs/react` 5.x, which keeps the React plugin on Vite 7 (Astro 6.4.8).
- Editing project JSON clears Astro's dev route cache, so a new post appears on `/projects/<slug>` without a server restart.
- Admin and API routes are gated to localhost by `src/middleware.ts`: dev on localhost, or a locally-run build with `LOCAL_ADMIN=1`. Off localhost they return 404.
- `npm run build`, `npx astro check`, the unit tests and the Playwright tests all pass.

**Decisions locked**

- BlockNote UI kit: `@blocknote/shadcn`.
- Package manager: npm.
- Astro 6.4.8.
- Admin: local-only, no auth. Publishing is a manual commit and push.

**Awaiting owner sign-off**

- Every visitor-facing page and modal: [design-review.md](./design-review.md).

**Deferred or not built yet**

- Deploy adapter: `astro.config.mjs` still auto-detects Vercel, Cloudflare, Netlify and Node; pinning `@astrojs/vercel` is deferred. Vercel Hobby remains the intended host.
- Phase 1 release: three real projects still need to be edited, committed and deployed.
- Phase 2 (R2 video) and Phase 3 (view transitions, lightbox, autosave, axe/LCP) are untouched.
- Server env vars: `LOCAL_ADMIN` for local production builds, `SITE_URL`, `DEPLOY_ADAPTER`, and `R2_*` in phase 2. `.env.example` documents them.
- Publishing is manual: save in the admin, then commit and push. The host rebuilds.

## Risks and open questions

The biggest risk is now scope: you own the admin, so every editor feature is code you write and maintain.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Admin scope creeps | Phase 1 slips | Fixed phase 1 feature list; everything else waits for phase 3 |
| BlockNote is pre-1.0 | An upgrade changes the block format | Pin the version, `schemaVersion` in every post, a migration script per format change |
| Editor schema and renderer drift | A block saves but won't render | One shared `schema.ts`; Zod validation on save and at build |
| Admin accidentally exposed | Someone could write to a deployment | Host check in middleware; admin paths return 404 off localhost |
| Forgetting to push | A saved post stays local | The post list shows drafts; commit and push after editing |
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
