# Definition of done

Two levels:

- **Per-phase gate** - the exit criteria for phase 0b, 1, 2 or 3. Do not start the next phase until the gate passes.
- **Project release gate** - the conditions for shipping the portfolio.

Cross-cutting checks (build, type check, secrets, JS budget) are written once in
the release gate and referenced by the phases.

How tests are written: [tdd-workflow.md](./tdd-workflow.md).

## Verification

| Method | Use |
| --- | --- |
| Playwright | Admin and public flows against `astro dev`. |
| Unit | Storage, block rules, browser resize, admin access. |
| Build check | Drafts excluded, JS budget, secrets in the client, file and repo size. |
| Manual | Vercel preview, domain, design. |

The admin is local-only; deployed builds have no admin.

## Phase 0b - BlockNote spike (localhost only)

- [x] A Carousel block (add, reorder, remove, alt, caption) with a ~3 MB image saves to JSON and reloads identically. The image uploads through the media picker, is written to disk, and the post renders it.
- [x] `Blocks.astro` renders that JSON, including grouped lists and inline links, to the same HTML on a static page and through `/api/preview`.

Deferred to Phase 1: Vercel preview.

## Phase 1 - MVP

### Admin

- [x] Admin routes work on localhost in dev, and in a locally-run build with `LOCAL_ADMIN=1`.
- [x] `/admin`, `/api` and `/uploads` return 404 on any other host, even with `LOCAL_ADMIN=1`.
- [x] `/admin` lists posts with draft/published state.
- [x] Creating a post produces a `src/content/projects/<slug>.json` entry with every required field (cover is optional; alt is required when a cover is set).
- [x] The body editor accepts every phase 1 block: paragraph, H2/H3, lists, code, image, gallery, carousel, embed, quote, media + text.
- [x] The media picker resizes an image to <= 3000 px and <= 3.5 MB before upload (phase 0b).
- [x] The preview modal matches the production page, including an operable carousel.
- [x] Images can be saved without alt text; the alt field stays available and renders when filled.
- [x] `site`, `home` and `about` are editable at `/admin/settings`.

### Public site

- [x] `/` shows the intro and the featured projects.
- [x] `/projects` lists published projects newest first and filters by tag.
- [x] `/projects/[slug]` shows header, cover, block body, links and previous/next.
- [x] `cover` is the OG image; `summary` is the meta description.
- [x] `/about` shows the about body and portrait.
- [x] `/rss.xml`, `/sitemap-index.xml` and `/404` respond.
- [x] Drafts are excluded from the production build.
- [x] Public pages have no framework hydration; total JS stays under 40 KB gzipped per page (measured ~6.6 KB on a project page).
- [x] The carousel is keyboard operable and never autoplays.
- [x] Embeds require a title; image alt text renders when provided.

### Release

- [ ] Three real projects are edited in the local admin, committed and deployed.

## Phase 2 - video

- [ ] A Video block uploads to R2 through a presigned URL, without passing through a serverless function.
- [ ] The video plays with a poster; captions (`.vtt`) and loop/muted/autoplay options work.
- [ ] The bucket is served from the `media.` subdomain, not `r2.dev`.

## Phase 3 - polish

- [ ] Tag filter, RSS, view transitions, gallery lightbox, per-project OG images and draft autosave work.
- [ ] axe reports no serious or critical issues on public pages.
- [ ] LCP is within budget on a throttled mobile profile.

## Project release gate

- [ ] All phase gates pass.
- [ ] Three real projects are edited in the local admin, committed and deployed.
- [ ] The site is deployed on Vercel Hobby at the production domain.
- [x] `npm run build` and `astro check` pass.
- [x] Public pages have no framework hydration and stay within the JS budget.
- [x] Embeds have a `title`; image alt text renders when provided; the carousel is keyboard operable and never autoplays.
- [x] Every project page sets canonical, title, `summary` as meta description and, when a cover exists, `cover` as OG image.
- [x] Drafts are excluded from the production build.
- [x] No secrets in the client bundle or git.
- [x] The repo is under 1 GB and no file is over 5 MB.

## Not automated

- Vercel preview.
- The 5 MB file cap and the 1 GB repo budget (CI, not Playwright).
- Domain setup and design review.
